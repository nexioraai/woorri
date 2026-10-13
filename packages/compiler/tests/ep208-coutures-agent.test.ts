/**
 * EP-208 · LES DEUX BOUTS DE L'AGENT PARLENT LA MÊME LANGUE.
 *
 * Mesure du 2026-10-13, et c'est elle qui a commandé tout ce lot : le serveur
 * émis lit l'identité dans un en-tête `Authorization: Bearer` — six de ses
 * routes l'exigent. L'application émise envoyait un COOKIE, et pour
 * l'écriture RIEN DU TOUT. Les deux bouts ne se rencontraient jamais : les
 * filtres de visibilité, le connecteur et l'agent étaient injoignables.
 *
 * Ces preuves tiennent les trois coutures :
 *   ① les ADRESSES — une adresse inventée d'un côté ne se voit qu'à
 *     l'exécution, chez la personne ;
 *   ② l'IDENTITÉ — le jeton part, et il est relu à chaque appel ;
 *   ③ le refus NOMMÉ quand une session ne peut pas produire de jeton.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBackend } from "../src/compile-backend.ts";
import { OPERATIONS_AGENT, urlProtocoleAgent } from "../src/resolve-lock.ts";
import { creerPortAgentHttp } from "../runtime/agent-http.ts";
import { creerTransportEcritureHttp } from "../runtime/ecriture-http.ts";
import type { ProjectAir } from "@deribfy/air-schema";

const ICI = dirname(fileURLToPath(import.meta.url));
const DOC = join(ICI, "..", "..", "..", "slices", "tontine", "tontine.air.json");

const API = {
  id: "api_service",
  name: "Service",
  domain: "api.exemple-service.com",
  auth: { kind: "header_secret" as const, headerName: "X-Api-Key", secretEnvName: "SERVICE_KEY" },
  operations: [
    {
      id: "apiop_envoyer",
      name: "Envoyer",
      method: "POST" as const,
      path: "/v1/envois",
      sends: ["texte"],
      returns: [{ key: "reference", type: "string" as const }],
    },
    {
      id: "apiop_interpreter",
      name: "Interpréter",
      method: "POST" as const,
      path: "/v1/comprendre",
      sends: ["mots"],
      returns: [
        { key: "operation", type: "string" as const },
        { key: "valeurs", type: "string" as const },
      ],
    },
  ],
};

const porte = (agent: Record<string, unknown>): string => {
  const base = JSON.parse(readFileSync(DOC, "utf8")) as ProjectAir;
  const { files } = compileBackend({
    ...base,
    backend: { kind: "genere", stack: "fastify" },
    network: {
      ...base.network,
      allowedDomains: [...base.network.allowedDomains, "api.exemple-service.com"],
    },
    apis: [API],
    agent,
  } as ProjectAir);
  return files.get("src/api/agent.ts") ?? "";
};

const AVEC_CERVEAU = {
  allowedOperations: ["apiop_envoyer"],
  confirmBeforeAct: true,
  brain: {
    operationId: "apiop_interpreter",
    wordsInput: "mots",
    choiceOutput: "operation",
    inputsOutput: "valeurs",
  },
};
const SANS_CERVEAU = { allowedOperations: ["apiop_envoyer"], confirmBeforeAct: true };

describe("EP-208 ① · LES ADRESSES — une seule source, les deux bouts", () => {
  it("le serveur émis écrit EXACTEMENT les chemins du protocole", () => {
    // Une adresse inventée à l'émission est une adresse que personne ne sert,
    // et l'écart ne se découvre qu'à l'exécution.
    const source = porte(AVEC_CERVEAU);
    for (const op of Object.values(OPERATIONS_AGENT)) {
      expect(source, op.chemin).toContain(JSON.stringify(op.chemin));
    }
  });

  it("les trois chemins sont DISTINCTS — sinon deux routes se recouvriraient", () => {
    const chemins = Object.values(OPERATIONS_AGENT).map((o) => o.chemin);
    expect(new Set(chemins).size).toBe(chemins.length);
  });

  it("une barre finale ne produit pas une adresse DIFFÉRENTE", () => {
    // `//air/v1/agent` est une URL VALIDE et un autre chemin : certains
    // serveurs la servent, d'autres rendent 404, et le défaut ne se voit
    // qu'en production.
    expect(urlProtocoleAgent("https://x.test/", "catalogue")).toBe("https://x.test/air/v1/agent");
    expect(urlProtocoleAgent("https://x.test///", "agir")).toBe(
      "https://x.test/air/v1/agent/act",
    );
  });

  it("sans cerveau, le serveur n'émet PAS la route pour parler", () => {
    expect(porte(SANS_CERVEAU)).not.toContain(OPERATIONS_AGENT.parler.chemin);
  });
});

describe("EP-208 ② · L'IDENTITÉ VOYAGE — c'est le défaut que ce lot répare", () => {
  /** Un `fetch` témoin : on observe ce qui part, pas ce qu'on espère. */
  const temoin = () => {
    const vus: { url: string; entetes: Record<string, string>; corps: unknown }[] = [];
    const precedent = globalThis.fetch;
    globalThis.fetch = ((url: string, init: Record<string, unknown>) => {
      vus.push({
        url,
        entetes: (init.headers ?? {}) as Record<string, string>,
        corps: init.body ?? null,
      });
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ operations: [], confirmationRequise: false, voix: false }),
      });
    }) as unknown as typeof globalThis.fetch;
    return { vus, rendre: () => (globalThis.fetch = precedent) };
  };

  it("le port de l'agent envoie le jeton en `Authorization: Bearer`", async () => {
    const t = temoin();
    try {
      const port = creerPortAgentHttp({
        urls: { catalogue: "https://x.test/air/v1/agent", agir: "https://x.test/air/v1/agent/act" },
        jeton: () => "jeton-1",
      });
      await port.catalogue();
      expect(t.vus[0]?.entetes.authorization).toBe("Bearer jeton-1");
    } finally {
      t.rendre();
    }
  });

  it("LE JETON EST RELU À CHAQUE APPEL — un jeton capturé serait expiré", async () => {
    // Le service qui l'a délivré le rafraîchit. Capturer au montage donnerait
    // une application qui marche une heure puis refuse, sans rien dire.
    const t = temoin();
    try {
      let courant = "jeton-1";
      const port = creerPortAgentHttp({
        urls: { catalogue: "https://x.test/air/v1/agent", agir: "https://x.test/air/v1/agent/act" },
        jeton: () => courant,
      });
      await port.catalogue();
      courant = "jeton-2";
      await port.catalogue();
      expect(t.vus.map((v) => v.entetes.authorization)).toEqual([
        "Bearer jeton-1",
        "Bearer jeton-2",
      ]);
    } finally {
      t.rendre();
    }
  });

  it("sans jeton, AUCUN en-tête vide n'est envoyé", async () => {
    // Un « Bearer » sans rien derrière ferait répondre un refus
    // incompréhensible ; mieux vaut ne rien envoyer et laisser le serveur
    // dire « identité requise ».
    const t = temoin();
    try {
      const port = creerPortAgentHttp({
        urls: { catalogue: "https://x.test/air/v1/agent", agir: "https://x.test/air/v1/agent/act" },
        jeton: () => undefined,
      });
      await port.catalogue();
      expect(t.vus[0]?.entetes.authorization).toBeUndefined();
    } finally {
      t.rendre();
    }
  });

  it("LE TRANSPORT D'ÉCRITURE porte le jeton aussi — 37 filtres en dépendent", async () => {
    // C'est la moitié oubliée : les routes de lecture du serveur émis filtrent
    // par appelant. Sans jeton, elles répondaient « je ne sais pas qui vous
    // êtes » à une application qui savait très bien.
    const t = temoin();
    try {
      const transport = creerTransportEcritureHttp(() => "jeton-ecriture");
      await transport("https://x.test/air/v1/entities/x/rows", "POST", { a: 1 });
      expect(t.vus[0]?.entetes.authorization).toBe("Bearer jeton-ecriture");
      expect(t.vus[0]?.entetes["content-type"]).toBe("application/json");
    } finally {
      t.rendre();
    }
  });
});

describe("EP-208 ③ · CE QUI NE PEUT PAS ÊTRE FAIT EST REFUSÉ, PAS SIMULÉ", () => {
  it("parler sans cerveau déclaré rend un refus NOMMÉ, sans appeler", async () => {
    // Appeler une adresse que le serveur n'émet pas rendrait un 404, que
    // l'écran afficherait comme une panne.
    const precedent = globalThis.fetch;
    let appels = 0;
    globalThis.fetch = (() => {
      appels += 1;
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }) as unknown as typeof globalThis.fetch;
    try {
      const port = creerPortAgentHttp({
        urls: { catalogue: "https://x.test/air/v1/agent", agir: "https://x.test/air/v1/agent/act" },
        jeton: () => "j",
      });
      const r = await port.parler("bonjour");
      expect(r.ok).toBe(false);
      expect(!r.ok && r.code).toBe("AIR_AGENT_SANS_CERVEAU");
      expect(appels).toBe(0);
    } finally {
      globalThis.fetch = precedent;
    }
  });

  it("une réponse ILLISIBLE est un refus nommé, pas un écran vide", async () => {
    const precedent = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ pas: "ce qu'on attend" }),
      })) as unknown as typeof globalThis.fetch;
    try {
      const port = creerPortAgentHttp({
        urls: { catalogue: "https://x.test/air/v1/agent", agir: "https://x.test/air/v1/agent/act" },
        jeton: () => "j",
      });
      const r = await port.catalogue();
      expect(!r.ok && r.code).toBe("AIR_AGENT_REPONSE_ILLISIBLE");
    } finally {
      globalThis.fetch = precedent;
    }
  });

  it("le CODE du serveur est transmis tel quel — jamais une phrase fabriquée", async () => {
    const precedent = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "AIR_AGENT_DROIT_REQUIS", message: "..." }),
      })) as unknown as typeof globalThis.fetch;
    try {
      const port = creerPortAgentHttp({
        urls: { catalogue: "https://x.test/air/v1/agent", agir: "https://x.test/air/v1/agent/act" },
        jeton: () => "j",
      });
      const r = await port.catalogue();
      expect(!r.ok && r.code).toBe("AIR_AGENT_DROIT_REQUIS");
    } finally {
      globalThis.fetch = precedent;
    }
  });
});
