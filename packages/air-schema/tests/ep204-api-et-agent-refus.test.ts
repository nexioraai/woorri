// ════════════════════════════════════════════════════════════════════
//  LES NEUF REFUS DE L'API ET DE L'AGENT — ENFIN ÉPROUVÉS.
//
// Mesure qui a commandé ce fichier (2026-10-13) : les trois refus de l'API
// (1.36.0) et les six de l'agent (1.37.0) existaient UNIQUEMENT dans le
// fichier qui les écrit. Cherchés dans tout le dépôt, leurs codes ne
// figuraient que dans `validate.ts` et dans la portée de réparation. AUCUN
// test ne les éprouvait.
//
// Un refus non éprouvé n'est pas un refus : c'est une intention. Il peut
// avoir été écrit avec une faute de frappe dans le code, une condition
// inversée, ou porter sur un champ qui n'existe plus — et rien ne le dirait.
//
// Les preuves vont DANS LES DEUX SENS : un document correct passe, un
// document fautif est refusé AVEC SON CODE. Ne prouver que le refus
// laisserait passer un validateur qui refuse tout.
// ════════════════════════════════════════════════════════════════════
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  migrateAirDocument,
  assertValidAir,
  validateAir,
  type ProjectAir,
} from "../src/index.ts";

const RACINE = new URL("../../../", import.meta.url).pathname;

/** Un document RÉEL du corpus — pas un squelette écrit pour la preuve. */
const lire = (): ProjectAir =>
  assertValidAir(
    migrateAirDocument(
      JSON.parse(readFileSync(RACINE + "slices/gestion/gestion.air.json", "utf8")) as Record<
        string,
        unknown
      >,
    ),
  );

const copie = (air: ProjectAir): ProjectAir => JSON.parse(JSON.stringify(air)) as ProjectAir;
const codes = (air: ProjectAir): string[] => validateAir(air).map((d) => d.code);

/** Une API minimale mais COMPLÈTE, posée sur un document réel. */
const UNE_API = {
  id: "sms",
  name: "Envoi de SMS",
  domain: "api.exemple-sms.com",
  auth: { kind: "header_secret" as const, headerName: "X-Api-Key", secretEnvName: "SMS_API_KEY" },
  operations: [
    {
      id: "envoyer",
      name: "Envoyer un message",
      method: "POST" as const,
      path: "/v2/messages",
      sends: ["destinataire", "texte"],
      returns: [{ key: "identifiant", type: "string" as const }],
    },
  ],
};

/** Le document, plus une API déclarée proprement — y compris son domaine. */
const avecApi = (api: unknown = UNE_API): ProjectAir => {
  const air = copie(lire());
  const domaine = (api as { domain?: string }).domain;
  return {
    ...air,
    network: {
      ...air.network,
      allowedDomains:
        domaine === undefined
          ? air.network.allowedDomains
          : [...air.network.allowedDomains, domaine],
    },
    apis: [api],
  } as ProjectAir;
};

describe("EP-204 ① · le point de départ est SAIN — sinon on ne prouve rien", () => {
  it("le document réel, sans API, est valide", () => {
    expect(codes(lire())).toEqual([]);
  });

  it("le même document AVEC une API correctement déclarée reste valide", () => {
    // Si ce test échouait, tous les refus ci-dessous seraient des faux
    // positifs : ils refuseraient un document déjà refusé pour autre chose.
    expect(codes(avecApi())).toEqual([]);
  });
});

describe("EP-204 ② · LES TROIS REFUS DE L'API (1.36.0)", () => {
  it("un domaine NON déclaré au réseau est refusé", () => {
    // Une application ne joint pas un hôte que le document ne déclare pas :
    // sinon la liste des domaines autorisés ne dirait plus la vérité sur ce
    // que l'application atteint.
    const air = copie(lire());
    const fautif = { ...air, apis: [UNE_API] } as ProjectAir;
    expect(codes(fautif)).toContain("AIR_API_DOMAIN_UNDECLARED");
  });

  it("deux opérations du MÊME nom dans une API sont refusées", () => {
    const api = { ...UNE_API, operations: [UNE_API.operations[0], UNE_API.operations[0]] };
    expect(codes(avecApi(api))).toContain("AIR_API_OPERATION_DUPLICATE");
  });

  it("un segment de chemin que `sends` n'annonce pas est refusé", () => {
    // L'appel se construirait avec un trou, découvert à l'exécution — chez la
    // personne, pas chez nous.
    const api = {
      ...UNE_API,
      operations: [{ ...UNE_API.operations[0], path: "/v2/messages/{identifiant}" }],
    };
    expect(codes(avecApi(api))).toContain("AIR_API_PATH_PARAM_UNDECLARED");
  });

  it("le même segment, ANNONCÉ, passe — le refus ne refuse pas tout", () => {
    const api = {
      ...UNE_API,
      operations: [
        {
          ...UNE_API.operations[0],
          path: "/v2/messages/{identifiant}",
          sends: ["identifiant", "destinataire", "texte"],
        },
      ],
    };
    expect(codes(avecApi(api))).toEqual([]);
  });
});

describe("EP-204 ③ · LES SIX REFUS DE L'AGENT (1.37.0)", () => {
  const avecAgent = (agent: unknown, api: unknown = UNE_API): ProjectAir =>
    ({ ...avecApi(api), agent } as ProjectAir);

  it("un agent AVEC une API et une opération connue est valide", () => {
    expect(
      codes(avecAgent({ allowedOperations: ["envoyer"], confirmBeforeAct: true })),
    ).toEqual([]);
  });

  it("① une opération INCONNUE est refusée", () => {
    // Un agent autorisé sur une opération inexistante serait un agent dont on
    // CROIT connaître les pouvoirs.
    expect(
      codes(avecAgent({ allowedOperations: ["inexistante"], confirmBeforeAct: true })),
    ).toContain("AIR_AGENT_OPERATION_UNKNOWN");
  });

  it("② un agent SANS aucune API est refusé — il n'aurait aucune main", () => {
    const air = copie(lire());
    const fautif = {
      ...air,
      agent: { allowedOperations: ["envoyer"], confirmBeforeAct: true },
    } as ProjectAir;
    expect(codes(fautif)).toContain("AIR_AGENT_NO_API");
  });

  it("③ la même opération autorisée DEUX FOIS est refusée", () => {
    expect(
      codes(avecAgent({ allowedOperations: ["envoyer", "envoyer"], confirmBeforeAct: true })),
    ).toContain("AIR_AGENT_OPERATION_DUPLICATE");
  });

  it("④ un droit INCONNU est refusé — sinon le bouton mentirait", () => {
    expect(
      codes(
        avecAgent({
          allowedOperations: ["envoyer"],
          confirmBeforeAct: true,
          requiredRightId: "droit_qui_nexiste_pas",
        }),
      ),
    ).toContain("AIR_AGENT_RIGHT_UNKNOWN");
  });

  it("⑤ LA VOIX SANS L'OREILLE est refusée", () => {
    // `voiceInput` sans la capacité `audio_capture` donnerait un bouton de
    // micro dans une application qui n'a pas le droit d'enregistrer : refusé
    // au premier appui, et personne ne saurait pourquoi.
    const air = avecAgent({
      allowedOperations: ["envoyer"],
      confirmBeforeAct: true,
      voiceInput: true,
    });
    expect(air.capabilities.some((c) => c.capability === "audio_capture")).toBe(false);
    expect(codes(air)).toContain("AIR_AGENT_VOICE_WITHOUT_AUDIO");
  });

  it("⑥ UNE OPÉRATION AMBIGUË est refusée — le trou trouvé le 2026-10-13", () => {
    // L'unicité d'un identifiant d'opération est garantie PAR API : le refus
    // AIR_API_OPERATION_DUPLICATE compte dans un ensemble créé à l'intérieur
    // de la boucle par API. Deux API peuvent donc déclarer chacune une
    // opération « envoyer » — et le document ci-dessous est, à juste titre,
    // VALIDE côté API.
    //
    // Mais `agent.allowedOperations` ne nomme QUE l'opération. Avant ce refus,
    // le validateur aplatissait toutes les API en un seul ensemble et
    // acceptait : l'agent recevait un pouvoir que personne ne savait désigner
    // — celui d'une API anodine, ou celui d'une API qui déplace de l'argent.
    const air = copie(lire());
    const seconde = {
      ...UNE_API,
      id: "courriel",
      name: "Envoi de courriel",
      domain: "api.exemple-mail.com",
    };
    const deux = {
      ...air,
      network: {
        ...air.network,
        allowedDomains: [
          ...air.network.allowedDomains,
          "api.exemple-sms.com",
          "api.exemple-mail.com",
        ],
      },
      apis: [UNE_API, seconde],
    } as ProjectAir;
    // Les DEUX API sont déclarées correctement : aucun refus côté API.
    expect(codes(deux).filter((c) => c.startsWith("AIR_API_"))).toEqual([]);
    // L'agent, lui, est refusé.
    const avec = {
      ...deux,
      agent: { allowedOperations: ["envoyer"], confirmBeforeAct: true },
    } as ProjectAir;
    expect(codes(avec)).toContain("AIR_AGENT_OPERATION_AMBIGUOUS");
  });

  it("⑥bis renommer lève l'ambiguïté — le refus se répare, il ne condamne pas", () => {
    const air = copie(lire());
    const seconde = {
      ...UNE_API,
      id: "courriel",
      name: "Envoi de courriel",
      domain: "api.exemple-mail.com",
      operations: [{ ...UNE_API.operations[0], id: "envoyer_courriel" }],
    };
    const avec = {
      ...air,
      network: {
        ...air.network,
        allowedDomains: [
          ...air.network.allowedDomains,
          "api.exemple-sms.com",
          "api.exemple-mail.com",
        ],
      },
      apis: [UNE_API, seconde],
      agent: { allowedOperations: ["envoyer", "envoyer_courriel"], confirmBeforeAct: true },
    } as ProjectAir;
    expect(codes(avec)).toEqual([]);
  });
});
