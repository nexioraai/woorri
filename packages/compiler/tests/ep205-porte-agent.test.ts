/**
 * EP-205 · LA PORTE DE L'AGENT — ET LA CONFIRMATION QUI NE SE CONTOURNE PAS.
 *
 * Mesure du 2026-10-13 : `agent.allowedOperations` était lu par le format, par
 * le validateur et par le runtime — et appliqué par PERSONNE. Les routes du
 * connecteur sont ouvertes à tout appelant authentifié ; y brancher l'agent
 * aurait rendu `allowedOperations` décoratif.
 *
 * LE PIÈGE QUE CES PREUVES VISENT. `confirmBeforeAct: true` se lit « demande
 * avant d'agir ». L'appliquer dans l'écran — une boîte « êtes-vous sûr ? » —
 * aurait été naturel, et ç'aurait été une promesse SANS SERRURE : le serveur
 * est joignable directement, et un appel bien formé avec le jeton de la
 * personne agirait sans jamais passer par l'écran.
 *
 * On mesure donc l'acte DEPUIS LE SERVEUR, par la porte, sans écran du tout.
 * C'est exactement le chemin qu'emprunterait quelqu'un qui veut contourner.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";
import { compileBackend } from "../src/compile-backend.ts";
import type { ProjectAir } from "@deribfy/air-schema";
// ── LE BINAIRE EST DÉCODÉ, ET LA DÉCISION EST UNIQUE (2026-10-17).
//
// Les faces de police embarquées voyagent en base64 dans la carte de fichiers.
// Écrire ce base64 EN TEXTE produit un fichier présent, non vide et INVALIDE —
// et une famille introuvable ne lève pas : elle retombe en silence sur la
// police système. NEUF écrivains existaient ; `fichiers-binaires.ts` est le
// seul endroit où la décision vit.
import { estBinaire } from "../../../packages/compiler/src/fichiers-binaires.ts";

const ICI = dirname(fileURLToPath(import.meta.url));
const DOC = join(ICI, "..", "..", "..", "slices", "tontine", "tontine.air.json");
const SECRET = "secret-de-jeton-pour-la-preuve";
/** Le même séparateur que la charge signée par le serveur émis. */
const NUL = "\u0000";

const API = {
  id: "api_sms",
  name: "Envoi de SMS",
  domain: "api.exemple-sms.com",
  auth: { kind: "header_secret" as const, headerName: "X-Api-Key", secretEnvName: "SMS_API_KEY" },
  operations: [
    {
      id: "apiop_envoyer",
      name: "Envoyer un message",
      method: "POST" as const,
      path: "/v2/messages",
      sends: ["destinataire", "texte"],
      returns: [{ key: "identifiant", type: "string" as const }],
    },
    {
      // DÉCLARÉE à l'API, mais PAS dans les pouvoirs de l'agent. C'est elle
      // qui permet de mesurer que `allowedOperations` sert vraiment.
      id: "apiop_supprimer",
      name: "Supprimer un message",
      method: "DELETE" as const,
      path: "/v2/messages/{identifiant}",
      sends: ["identifiant"],
      returns: [{ key: "supprime", type: "boolean" as const }],
    },
  ],
};

const avecAgent = (agent: Record<string, unknown>): ProjectAir => {
  const base = JSON.parse(readFileSync(DOC, "utf8")) as ProjectAir;
  return {
    ...base,
    backend: { kind: "genere", stack: "fastify" },
    network: {
      ...base.network,
      allowedDomains: [...base.network.allowedDomains, "api.exemple-sms.com"],
    },
    apis: [API],
    agent,
  } as ProjectAir;
};

const emis = (agent: Record<string, unknown>): Map<string, string> =>
  new Map(compileBackend(avecAgent(agent)).files);

/** Un jeton d'identité HS256, comme celui que le serveur émis sait lire. */
const jeton = (id: string, droits: readonly string[]): string => {
  const b64 = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString("base64url");
  const tete = b64({ alg: "HS256", typ: "JWT" });
  const corps = b64({
    sub: id,
    email: id + "@exemple.test",
    exp: Math.floor(Date.now() / 1000) + 600,
    // La clé est `rights` — MESURÉE dans `appelant.ts`, pas supposée. Mon
    // premier jet avait écrit `droits`, et le serveur refusait à juste titre.
    app_metadata: { rights: droits },
  });
  const sig = createHmac("sha256", SECRET).update(tete + "." + corps).digest("base64url");
  return tete + "." + corps + "." + sig;
};

interface Reponse {
  readonly statut: number;
  readonly corps: Record<string, unknown>;
}

interface Appel {
  readonly route: string;
  readonly methode: string;
  readonly jeton?: string;
  readonly corps?: unknown;
}

/**
 * DÉMARRER LE SERVEUR ÉMIS, ET LUI PARLER EN HTTP.
 *
 * Fastify est injecté sans ouvrir de port (`app.inject`) : on mesure le vrai
 * routage, les vrais gardes et le vrai code émis, sans dépendre d'un port
 * libre ni d'une attente. Le `fetch` global est remplacé pour que l'appel au
 * tiers n'aille nulle part — ce qui est mesuré ici est la PORTE, pas le
 * réseau.
 */
function parler(agent: Record<string, unknown>, appels: readonly Appel[]): readonly Reponse[] {
  const dossier = mkdtempSync(join(tmpdir(), "deribfy-agent-"));
  try {
    for (const [chemin, contenu] of emis(agent)) {
      const cible = join(dossier, chemin);
      mkdirSync(dirname(cible), { recursive: true });
      writeFileSync(cible, estBinaire(cible) ? Buffer.from(contenu, "base64") : contenu);
    }
    const racine = join(ICI, "..", "..", "..");
    writeFileSync(
      join(dossier, "pilote.mjs"),
      [
        "globalThis.fetch = async () => ({",
        "  ok: true, status: 200,",
        "  json: async () => ({ identifiant: 'm-1', supprime: true }),",
        "});",
        "const { construire } = await import('./src/serveur.ts');",
        "const app = await construire();",
        "const appels = " + JSON.stringify(appels) + ";",
        "const sorties = [];",
        "for (const a of appels) {",
        "  const r = await app.inject({",
        "    method: a.methode,",
        "    url: a.route,",
        "    headers: a.jeton === undefined ? {} : { authorization: `Bearer ${a.jeton}` },",
        "    ...(a.corps === undefined ? {} : { payload: a.corps }),",
        "  });",
        "  let corps = {};",
        "  try { corps = r.json(); } catch { corps = { brut: r.body }; }",
        "  sorties.push({ statut: r.statusCode, corps });",
        "}",
        "await app.close();",
        "console.log('@@' + JSON.stringify(sorties));",
      ].join("\n"),
    );
    // `node_modules` EMPRUNTÉ à la racine, comme les gates : une preuve qui
    // télécharge ne mesure plus le code, elle mesure le réseau.
    execFileSync("ln", ["-s", join(racine, "node_modules"), join(dossier, "node_modules")]);
    const sortie = execFileSync(process.execPath, [join(dossier, "pilote.mjs")], {
      encoding: "utf8",
      cwd: dossier,
      timeout: 60_000,
      env: {
        ...process.env,
        NODE_ENV: "test",
        AIR_JWT_SECRET: SECRET,
        SMS_API_KEY: "cle-du-tiers",
        DB_FICHIER: join(dossier, "donnees.sqlite"),
        NODE_OPTIONS: "",
      },
    });
    const ligne = sortie.split("\n").find((l) => l.startsWith("@@"));
    return JSON.parse((ligne ?? "@@[]").slice(2)) as readonly Reponse[];
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

const AGENT_CONFIRME = { allowedOperations: ["apiop_envoyer"], confirmBeforeAct: true };
const AGENT_DIRECT = { allowedOperations: ["apiop_envoyer"], confirmBeforeAct: false };

describe("EP-205 ① · l'agent a SA porte, et elle n'existe que s'il est déclaré", () => {
  it("un document avec API mais SANS agent n'émet aucune porte d'agent", () => {
    const base = JSON.parse(readFileSync(DOC, "utf8")) as ProjectAir;
    const sans = compileBackend({
      ...base,
      backend: { kind: "genere", stack: "fastify" },
      network: {
        ...base.network,
        allowedDomains: [...base.network.allowedDomains, "api.exemple-sms.com"],
      },
      apis: [API],
    });
    expect([...sans.files.keys()]).not.toContain("src/api/agent.ts");
    expect([...sans.files.keys()]).toContain("src/api/connecteur.ts");
  });

  it("un agent déclaré émet sa porte, et le serveur la branche", () => {
    const f = emis(AGENT_CONFIRME);
    expect([...f.keys()]).toContain("src/api/agent.ts");
    expect(f.get("src/serveur.ts") ?? "").toContain("agentRoutes(app)");
  });

  it("la porte ne porte AUCUNE branche pour une opération non autorisée", () => {
    const porte = emis(AGENT_CONFIRME).get("src/api/agent.ts") ?? "";
    expect(porte).toContain('case "apiop_envoyer"');
    // `supprimer` est déclarée à l'API, et absente des pouvoirs de l'agent.
    expect(porte).not.toContain('case "apiop_supprimer"');
  });

  it("le catalogue ne dit RIEN du fournisseur", () => {
    const porte = emis(AGENT_CONFIRME).get("src/api/agent.ts") ?? "";
    // La personne qui parle à l'agent n'a pas à savoir par quel service il
    // passe : ni le domaine, ni le nom de la variable de secret.
    expect(porte).not.toContain("api.exemple-sms.com");
    expect(porte).not.toContain("SMS_API_KEY");
  });
});

describe("EP-205 ② · LE RÉVEIL EXIGE UNE IDENTITÉ", () => {
  it("sans jeton, le catalogue est refusé", () => {
    const [r] = parler(AGENT_CONFIRME, [{ route: "/air/v1/agent", methode: "GET" }]);
    expect(r?.statut).toBe(403);
    expect(r?.corps.error).toBe("AIR_APPELANT_REQUIS");
  });

  it("avec un jeton, le catalogue nomme les pouvoirs — et PAS les autres", () => {
    const [r] = parler(AGENT_CONFIRME, [
      { route: "/air/v1/agent", methode: "GET", jeton: jeton("p1", []) },
    ]);
    expect(r?.statut).toBe(200);
    const ops = r?.corps.operations as { id: string; nom: string }[];
    expect(ops.map((o) => o.id)).toEqual(["apiop_envoyer"]);
    expect(ops[0]?.nom).toBe("Envoyer un message");
    expect(r?.corps.confirmationRequise).toBe(true);
  });
});

describe("EP-205 ③ · LA CONFIRMATION EST TENUE PAR LE SERVEUR, PAS PAR L'ÉCRAN", () => {
  it("AGIR SANS CONFIRMATION EST REFUSÉ — même avec un jeton valide", () => {
    // C'est LA preuve de ce lot. Cet appel est exactement ce que ferait
    // quelqu'un qui contourne l'écran : un acte bien formé, une identité
    // vraie, et aucune confirmation.
    const [r] = parler(AGENT_CONFIRME, [
      {
        route: "/air/v1/agent/act",
        methode: "POST",
        jeton: jeton("p1", []),
        corps: { operation: "apiop_envoyer", entrees: { destinataire: "+1", texte: "x" } },
      },
    ]);
    expect(r?.statut).toBe(403);
    expect(r?.corps.error).toBe("AIR_AGENT_CONFIRMATION_REQUISE");
  });

  it("une intention obtenue PUIS utilisée agit", () => {
    const j = jeton("p1", []);
    const entrees = { destinataire: "+1", texte: "x" };
    const [intention] = parler(AGENT_CONFIRME, [
      {
        route: "/air/v1/agent/intention",
        methode: "POST",
        jeton: j,
        corps: { operation: "apiop_envoyer", entrees },
      },
    ]);
    expect(intention?.statut).toBe(200);
    // Le résumé est le NOM que le document donne : le moteur n'invente pas de
    // phrase, il n'a pas la langue de la personne.
    expect(intention?.corps.resume).toBe("Envoyer un message");
    const [acte] = parler(AGENT_CONFIRME, [
      {
        route: "/air/v1/agent/act",
        methode: "POST",
        jeton: j,
        corps: { operation: "apiop_envoyer", entrees, intention: intention?.corps.intention },
      },
    ]);
    expect(acte?.statut, JSON.stringify(acte?.corps)).toBe(200);
    expect(acte?.corps.identifiant).toBe("m-1");
  });

  it("CHANGER LES ENTRÉES APRÈS AVOIR CONFIRMÉ est refusé", () => {
    // Sans ce lien, on confirmerait « envoyer 10 » et on agirait
    // « envoyer 10000 ».
    const j = jeton("p1", []);
    const [intention] = parler(AGENT_CONFIRME, [
      {
        route: "/air/v1/agent/intention",
        methode: "POST",
        jeton: j,
        corps: { operation: "apiop_envoyer", entrees: { destinataire: "+1", texte: "petit" } },
      },
    ]);
    const [acte] = parler(AGENT_CONFIRME, [
      {
        route: "/air/v1/agent/act",
        methode: "POST",
        jeton: j,
        corps: {
          operation: "apiop_envoyer",
          entrees: { destinataire: "+1", texte: "ENORME" },
          intention: intention?.corps.intention,
        },
      },
    ]);
    expect(acte?.statut).toBe(403);
    expect(acte?.corps.error).toBe("AIR_AGENT_CONFIRMATION_INVALIDE");
  });

  it("REJOUER LA CONFIRMATION DE QUELQU'UN D'AUTRE est refusé", () => {
    // Sans le lien à l'appelant, la confirmation d'une personne servirait à
    // une autre.
    const entrees = { destinataire: "+1", texte: "x" };
    const [intention] = parler(AGENT_CONFIRME, [
      {
        route: "/air/v1/agent/intention",
        methode: "POST",
        jeton: jeton("p1", []),
        corps: { operation: "apiop_envoyer", entrees },
      },
    ]);
    const [acte] = parler(AGENT_CONFIRME, [
      {
        route: "/air/v1/agent/act",
        methode: "POST",
        jeton: jeton("p2", []),
        corps: { operation: "apiop_envoyer", entrees, intention: intention?.corps.intention },
      },
    ]);
    expect(acte?.statut).toBe(403);
    expect(acte?.corps.error).toBe("AIR_AGENT_CONFIRMATION_INVALIDE");
  });

  it("une intention EXPIRÉE est refusée", () => {
    // Fabriquée à la main avec une échéance passée, signée CORRECTEMENT : ce
    // qui est mesuré ici est l'échéance, pas la signature.
    const j = jeton("p1", []);
    const entrees = { destinataire: "+1", texte: "x" };
    const echeance = Math.floor(Date.now() / 1000) - 10;
    const charge = ["apiop_envoyer", JSON.stringify(entrees), "p1", String(echeance)].join(NUL);
    const sig = createHmac("sha256", SECRET).update(charge).digest("base64url");
    const [acte] = parler(AGENT_CONFIRME, [
      {
        route: "/air/v1/agent/act",
        methode: "POST",
        jeton: j,
        corps: { operation: "apiop_envoyer", entrees, intention: String(echeance) + "." + sig },
      },
    ]);
    expect(acte?.statut).toBe(403);
    expect(acte?.corps.error).toBe("AIR_AGENT_CONFIRMATION_EXPIREE");
  });

  it("un agent SANS confirmation agit directement — et n'a pas de route d'intention", () => {
    // Le document commande : exiger une confirmation qu'il ne demande pas
    // serait un refus inventé par le moteur.
    const porte = emis(AGENT_DIRECT).get("src/api/agent.ts") ?? "";
    expect(porte).not.toContain("/air/v1/agent/intention");
    const [acte] = parler(AGENT_DIRECT, [
      {
        route: "/air/v1/agent/act",
        methode: "POST",
        jeton: jeton("p1", []),
        corps: { operation: "apiop_envoyer", entrees: { destinataire: "+1", texte: "x" } },
      },
    ]);
    expect(acte?.statut, JSON.stringify(acte?.corps)).toBe(200);
  });
});

describe("EP-205 ④ · UNE OPÉRATION HORS DES POUVOIRS N'EST PAS ATTEIGNABLE", () => {
  it("`supprimer` est déclarée à l'API, et refusée à l'agent", () => {
    const [r] = parler(AGENT_DIRECT, [
      {
        route: "/air/v1/agent/act",
        methode: "POST",
        jeton: jeton("p1", []),
        corps: { operation: "apiop_supprimer", entrees: { identifiant: "m-1" } },
      },
    ]);
    expect(r?.statut).toBe(403);
    expect(r?.corps.error).toBe("AIR_AGENT_OPERATION_NON_AUTORISEE");
  });
});

describe("EP-205 ⑤ · LE DROIT EXIGÉ PAR LE DOCUMENT EST TENU", () => {
  /**
   * LE DROIT VIENT DU DOCUMENT, ET SON ABSENCE ARRÊTE TOUT.
   *
   * Si ce document cessait un jour de déclarer un droit, des preuves qui
   * passent `undefined` partout resteraient VERTES en ne mesurant plus rien.
   * On lève donc, plutôt que de laisser un test vide se faire passer pour une
   * garantie.
   */
  const DROIT = ((): string => {
    const air = JSON.parse(readFileSync(DOC, "utf8")) as ProjectAir;
    const d = air.access?.rights[0]?.id;
    if (d === undefined) {
      throw new Error(
        "le document de preuve ne déclare aucun droit : ces preuves ne " +
          "mesureraient rien, il faut en choisir un autre.",
      );
    }
    return d;
  })();

  it("le document de preuve déclare bien un droit — sinon ce test ne mesure rien", () => {
    expect(typeof DROIT).toBe("string");
  });

  it("sans le droit, l'agent ne se réveille pas", () => {
    const agent = { ...AGENT_DIRECT, requiredRightId: DROIT };
    const [r] = parler(agent, [
      { route: "/air/v1/agent", methode: "GET", jeton: jeton("p1", []) },
    ]);
    expect(r?.statut).toBe(403);
    expect(r?.corps.error).toBe("AIR_AGENT_DROIT_REQUIS");
  });

  it("avec le droit, il se réveille", () => {
    const agent = { ...AGENT_DIRECT, requiredRightId: DROIT };
    const [r] = parler(agent, [
      { route: "/air/v1/agent", methode: "GET", jeton: jeton("p1", [DROIT]) },
    ]);
    expect(r?.statut).toBe(200);
  });

  it("ET l'acte aussi — un droit tenu à la porte d'entrée seulement ne tient rien", () => {
    // Le piège : garder le droit sur le catalogue et l'oublier sur l'acte.
    // L'écran n'aurait pas montré l'agent, et l'acte serait passé quand même.
    const agent = { ...AGENT_DIRECT, requiredRightId: DROIT };
    const [r] = parler(agent, [
      {
        route: "/air/v1/agent/act",
        methode: "POST",
        jeton: jeton("p1", []),
        corps: { operation: "apiop_envoyer", entrees: { destinataire: "+1", texte: "x" } },
      },
    ]);
    expect(r?.statut).toBe(403);
    expect(r?.corps.error).toBe("AIR_AGENT_DROIT_REQUIS");
  });
});
