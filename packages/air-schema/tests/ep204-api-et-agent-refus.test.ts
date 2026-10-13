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
/**
 * UN AGENT A BESOIN DE SON SERVEUR ET D'UNE IDENTITE — SINON IL EST REFUSE.
 *
 * Mesure du 2026-10-13 : mes fixtures declaraient des agents SANS backend ni
 * integration d'authentification. Le validateur les acceptait, et les deux
 * nouveaux refus (AIR_AGENT_SANS_SERVEUR_GENERE, AIR_AGENT_SANS_IDENTITE_
 * VERIFIEE) les ont fait tomber — a juste titre : un tel agent monte son
 * bouton et echoue a chaque appui.
 *
 * Cette aide ajoute le MINIMUM COHERENT, et rien de plus : le serveur qui
 * porte les routes, son adresse, et l'identite qui delivre le jeton.
 */
const avecServeurEtIdentite = (air: ProjectAir): ProjectAir => {
  const domaineServeur = "api.gestion.test";
  const domaineAuth = "api.gestion-auth.test";
  return {
    ...air,
    backend: { kind: "genere", stack: "fastify", domain: domaineServeur },
    network: {
      ...air.network,
      allowedDomains: [...air.network.allowedDomains, domaineServeur, domaineAuth],
    },
    capabilities: [
      ...air.capabilities,
      ...(air.capabilities.some((c) => c.capability === "auth")
        ? []
        // `capabilityRequestSchema` est STRICT : `capability` et, au plus,
        // `config`. Mon premier jet ajoutait `reason`, que le schema refuse —
        // et c'est le schema qui avait raison : la raison d'une PERMISSION se
        // declare sur la permission, pas sur la capacite.
        : [{ capability: "auth" as const }]),
    ],
    integrations: [
      ...air.integrations,
      {
        id: "intg_auth_agent",
        capability: "auth",
        // `providerClass` est EXIGE par le schema, et je l'avais oublie. La
        // valeur est celle qu'emploient les documents reels du corpus : la
        // forme d'une integration ne s'invente pas, elle se lit.
        providerClass: "managed_auth",
        config: [
          { key: "url", value: `https://${domaineAuth}` },
          { key: "provider", value: "air_http" },
        ],
      },
    ],
  };
};

const UNE_API = {
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

  it("ET IL PASSE LE SCHÉMA — pas seulement les contrôles sémantiques", () => {
    // MESURE DU 2026-10-13, TROUVÉE EN AJOUTANT LA VARIANTE AU CORPUS.
    //
    // `validateAir` vérifie les RELATIONS entre les parties du document ; il
    // ne vérifie PAS la forme des identifiants. Mes fixtures portaient
    // « envoyer » et « sms » là où le schéma exige « apiop_ » et « api_ » :
    // elles décrivaient des documents IMPOSSIBLES, et les refus mesurés
    // ci-dessous l'étaient sur du sable.
    //
    // Cette preuve est le cliquet : une fixture qui ne passe pas le schéma
    // ne prouve rien sur un vrai document.
    expect(() => assertValidAir(avecApi())).not.toThrow();
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
    ({ ...avecServeurEtIdentite(avecApi(api)), agent } as ProjectAir);

  it("un agent AVEC une API et une opération connue est valide", () => {
    expect(
      codes(avecAgent({ allowedOperations: ["apiop_envoyer"], confirmBeforeAct: true })),
    ).toEqual([]);
  });

  it("① une opération INCONNUE est refusée", () => {
    // Un agent autorisé sur une opération inexistante serait un agent dont on
    // CROIT connaître les pouvoirs.
    expect(
      codes(avecAgent({ allowedOperations: ["apiop_inexistante"], confirmBeforeAct: true })),
    ).toContain("AIR_AGENT_OPERATION_UNKNOWN");
  });

  it("② un agent SANS aucune API est refusé — il n'aurait aucune main", () => {
    const air = copie(lire());
    const fautif = {
      ...air,
      agent: { allowedOperations: ["apiop_envoyer"], confirmBeforeAct: true },
    } as ProjectAir;
    expect(codes(fautif)).toContain("AIR_AGENT_NO_API");
  });

  it("③ la même opération autorisée DEUX FOIS est refusée", () => {
    expect(
      codes(avecAgent({ allowedOperations: ["apiop_envoyer", "apiop_envoyer"], confirmBeforeAct: true })),
    ).toContain("AIR_AGENT_OPERATION_DUPLICATE");
  });

  it("④ un droit INCONNU est refusé — sinon le bouton mentirait", () => {
    expect(
      codes(
        avecAgent({
          allowedOperations: ["apiop_envoyer"],
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
      allowedOperations: ["apiop_envoyer"],
      confirmBeforeAct: true,
      voiceInput: true,
    });
    expect(air.capabilities.some((c) => c.capability === "audio_capture")).toBe(false);
    expect(codes(air)).toContain("AIR_AGENT_VOICE_WITHOUT_AUDIO");
  });

  it("UN AGENT SANS SERVEUR GÉNÉRÉ est refusé — ses routes sont ÉMISES", () => {
    // MESURE QUI A POSÉ CE REFUS, ET ELLE CORRIGE UNE AFFIRMATION À MOI.
    // J'avais dit que le validateur ne laisserait pas déclarer un agent sans
    // son serveur. VÉRIFIÉ : il l'ACCEPTAIT. Le bouton se montait, le port
    // restait inerte, et chaque appui échouait sur AIR_AGENT_ABSENT.
    const sansServeur = { ...avecApi(), agent: { allowedOperations: ["apiop_envoyer"], confirmBeforeAct: true } } as ProjectAir;
    expect(codes(sansServeur)).toContain("AIR_AGENT_SANS_SERVEUR_GENERE");
  });

  it("UN SERVEUR SANS ADRESSE est refusé — il n'y aurait rien à joindre", () => {
    // Un chemin relatif marcherait sur le web servi par le même hôte, et
    // NULLE PART sur un téléphone.
    const base = avecServeurEtIdentite(avecApi());
    const sansAdresse = {
      ...base,
      backend: { kind: "genere", stack: "fastify" },
      agent: { allowedOperations: ["apiop_envoyer"], confirmBeforeAct: true },
    } as ProjectAir;
    expect(codes(sansAdresse)).toContain("AIR_AGENT_SERVEUR_SANS_ADRESSE");
  });

  it("UN AGENT SANS IDENTITÉ VÉRIFIABLE est refusé — tout serait 403", () => {
    // Sans intégration `auth` portant une `url`, l'application tombe sur la
    // session LOCALE, qui ne produit aucun jeton. L'agent compilerait,
    // s'afficherait, et ne servirait à rien — mesuré le jour même sur la
    // variante du corpus, dont l'intégration portait `baseUrl` et non `url`.
    const air = avecApi();
    const sansIdentite = {
      ...air,
      backend: { kind: "genere", stack: "fastify", domain: "api.gestion.test" },
      network: { ...air.network, allowedDomains: [...air.network.allowedDomains, "api.gestion.test"] },
      agent: { allowedOperations: ["apiop_envoyer"], confirmBeforeAct: true },
    } as ProjectAir;
    expect(codes(sansIdentite)).toContain("AIR_AGENT_SANS_IDENTITE_VERIFIEE");
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
      id: "api_courriel",
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
      ...avecServeurEtIdentite(deux),
      agent: { allowedOperations: ["apiop_envoyer"], confirmBeforeAct: true },
    } as ProjectAir;
    expect(codes(avec)).toContain("AIR_AGENT_OPERATION_AMBIGUOUS");
  });

  it("⑥bis renommer lève l'ambiguïté — le refus se répare, il ne condamne pas", () => {
    const air = copie(lire());
    const seconde = {
      ...UNE_API,
      id: "api_courriel",
      name: "Envoi de courriel",
      domain: "api.exemple-mail.com",
      operations: [{ ...UNE_API.operations[0], id: "apiop_envoyer_courriel" }],
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
      agent: { allowedOperations: ["apiop_envoyer", "apiop_envoyer_courriel"], confirmBeforeAct: true },
    };
    expect(codes(avecServeurEtIdentite(avec as ProjectAir))).toEqual([]);
  });
});
