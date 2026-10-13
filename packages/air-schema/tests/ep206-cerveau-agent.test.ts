// ════════════════════════════════════════════════════════════════════
//  EP-206 · LE CERVEAU DE L'AGENT — SES SIX REFUS, ÉPROUVÉS.
//
// AIR 1.38.0. Le cerveau est l'opération qui transforme des MOTS en CHOIX.
// Décider que « envoie 5000 à Awa » correspond à telle opération demande un
// modèle de langue ; le moteur n'en embarque aucun et n'appelle pas le
// réseau. Le cerveau est donc une API DÉCLARÉE comme les autres.
//
// IL NOMME SES CLÉS. Il aurait été plus court d'imposer des noms — `texte`,
// `operation` — et de les chercher dans la réponse. Ç'aurait été une
// convention que personne n'a demandée, invisible au document, et fausse le
// jour où un service nomme ses champs autrement. Le document DIT quelle clé
// porte quoi — et donc chaque nom doit être VÉRIFIÉ, sinon l'erreur
// n'apparaîtrait qu'à la première phrase prononcée par une personne réelle.
//
// Les preuves vont DANS LES DEUX SENS : un cerveau correct passe, un cerveau
// fautif est refusé avec son code.
// ════════════════════════════════════════════════════════════════════
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  migrateAirDocument,
  assertValidAir,
  validateAir,
  AIR_SCHEMA_VERSION,
  type ProjectAir,
} from "../src/index.ts";

const RACINE = new URL("../../../", import.meta.url).pathname;

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

/** L'opération qui AGIT — le pouvoir de l'agent. */
const POUVOIR = {
  id: "apiop_envoyer_argent",
  name: "Envoyer de l'argent",
  method: "POST" as const,
  path: "/v1/transferts",
  sends: ["destinataire", "montant"],
  returns: [{ key: "reference", type: "string" as const }],
};

/** L'opération qui RÉFLÉCHIT — le cerveau. Elle n'est pas un pouvoir. */
const CERVEAU_OP = {
  id: "apiop_interpreter",
  name: "Interpréter une demande",
  method: "POST" as const,
  path: "/v1/comprendre",
  sends: ["mots", "catalogue"],
  returns: [
    { key: "operation", type: "string" as const },
    { key: "valeurs", type: "string" as const },
  ],
};

const UNE_API = {
  id: "api_service",
  name: "Service",
  domain: "api.exemple-service.com",
  auth: { kind: "header_secret" as const, headerName: "X-Api-Key", secretEnvName: "SERVICE_KEY" },
  operations: [POUVOIR, CERVEAU_OP],
};

const CERVEAU = {
  operationId: "apiop_interpreter",
  wordsInput: "mots",
  catalogueInput: "catalogue",
  choiceOutput: "operation",
  inputsOutput: "valeurs",
};

const avec = (agent: unknown, api: unknown = UNE_API): ProjectAir => {
  const air = copie(lire());
  const domaine = (api as { domain: string }).domain;
  return {
    ...air,
    network: { ...air.network, allowedDomains: [...air.network.allowedDomains, domaine] },
    apis: [api],
    agent,
  } as ProjectAir;
};

const AGENT = { allowedOperations: ["apiop_envoyer_argent"], confirmBeforeAct: true };

describe("EP-206 ① · la version est montée, et la migration ne casse rien", () => {
  it("le format est en 1.38.0", () => {
    expect(AIR_SCHEMA_VERSION).toBe("1.38.0");
  });

  it("un document RÉEL du corpus, écrit avant, reste valide", () => {
    // Sans entrée de migration, TOUS les documents deviendraient invalides.
    // Cette preuve est la seule qui compte pour les 31 documents existants.
    expect(codes(lire())).toEqual([]);
  });

  it("un agent SANS cerveau reste valide — 1.37.0 n'a pas changé de sens", () => {
    expect(codes(avec(AGENT))).toEqual([]);
  });

  it("un agent AVEC un cerveau correctement déclaré est valide", () => {
    // Si ce test échouait, tous les refus ci-dessous seraient des faux
    // positifs : ils refuseraient un document déjà refusé pour autre chose.
    expect(codes(avec({ ...AGENT, brain: CERVEAU }))).toEqual([]);
  });

  it("ET IL PASSE LE SCHÉMA — les identifiants portent leurs préfixes", () => {
    // Même cliquet qu'en EP-204 : `validateAir` ne juge pas la FORME des
    // identifiants. Une fixture qui ne passe pas le schéma décrit un document
    // impossible, et ne prouve rien sur un vrai.
    expect(() => assertValidAir(avec({ ...AGENT, brain: CERVEAU }))).not.toThrow();
  });

  it("le catalogue d'entrée est OPTIONNEL — un service déjà configuré n'en a pas besoin", () => {
    const sansCatalogue = { ...CERVEAU };
    delete (sansCatalogue as { catalogueInput?: string }).catalogueInput;
    expect(codes(avec({ ...AGENT, brain: sansCatalogue }))).toEqual([]);
  });
});

describe("EP-206 ② · LES SIX REFUS", () => {
  it("⑦ un cerveau INTROUVABLE est refusé", () => {
    // La parole ne mènerait nulle part, et le bouton de micro ne répondrait
    // jamais.
    expect(
      codes(avec({ ...AGENT, brain: { ...CERVEAU, operationId: "apiop_inexistante" } })),
    ).toContain("AIR_AGENT_BRAIN_UNKNOWN");
  });

  it("⑧ un cerveau AMBIGU est refusé — on ne saurait pas qui réfléchit", () => {
    // Même raison que pour les pouvoirs : l'unicité d'un identifiant n'est
    // garantie QUE par API.
    const air = copie(lire());
    const seconde = {
      ...UNE_API,
      id: "api_autre",
      name: "Autre service",
      domain: "api.exemple-autre.com",
    };
    const deux = {
      ...air,
      network: {
        ...air.network,
        allowedDomains: [
          ...air.network.allowedDomains,
          "api.exemple-service.com",
          "api.exemple-autre.com",
        ],
      },
      apis: [UNE_API, seconde],
      agent: { ...AGENT, brain: CERVEAU },
    } as ProjectAir;
    expect(codes(deux)).toContain("AIR_AGENT_BRAIN_AMBIGUOUS");
  });

  it("⑨ une clé d'ENTRÉE que l'opération n'envoie pas est refusée", () => {
    // L'appel se construirait sans les mots, et le cerveau répondrait à une
    // question vide.
    expect(
      codes(avec({ ...AGENT, brain: { ...CERVEAU, wordsInput: "phrase" } })),
    ).toContain("AIR_AGENT_BRAIN_INPUT_UNKNOWN");
  });

  it("⑨bis la clé du CATALOGUE est vérifiée aussi, quand elle est là", () => {
    expect(
      codes(avec({ ...AGENT, brain: { ...CERVEAU, catalogueInput: "liste" } })),
    ).toContain("AIR_AGENT_BRAIN_INPUT_UNKNOWN");
  });

  it("⑩ une clé de SORTIE que l'opération ne rend pas est refusée", () => {
    // Le serveur lirait une clé que le service ne rend pas.
    expect(
      codes(avec({ ...AGENT, brain: { ...CERVEAU, choiceOutput: "choix" } })),
    ).toContain("AIR_AGENT_BRAIN_OUTPUT_UNKNOWN");
  });

  it("⑩bis une sortie qui n'est pas du TEXTE est refusée", () => {
    // Un identifiant d'opération et des valeurs en JSON sont du texte.
    // Déclarés en nombre, ils seraient refusés par le connecteur à
    // l'exécution — mieux vaut le dire ici qu'à la première phrase.
    const api = {
      ...UNE_API,
      operations: [
        POUVOIR,
        {
          ...CERVEAU_OP,
          returns: [
            { key: "operation", type: "number" as const },
            { key: "valeurs", type: "string" as const },
          ],
        },
      ],
    };
    expect(codes(avec({ ...AGENT, brain: CERVEAU }, api))).toContain(
      "AIR_AGENT_BRAIN_OUTPUT_NOT_TEXT",
    );
  });

  it("⑪ UN CERVEAU QUI EST AUSSI UN POUVOIR est refusé — réfléchir n'est pas agir", () => {
    // Sans ce refus, l'agent pourrait « agir » en appelant son propre
    // interprète, et la liste de ses pouvoirs cesserait de décrire ce qu'il
    // fait au monde.
    expect(
      codes(
        avec({
          allowedOperations: ["apiop_envoyer_argent", "apiop_interpreter"],
          confirmBeforeAct: true,
          brain: CERVEAU,
        }),
      ),
    ).toContain("AIR_AGENT_BRAIN_IS_A_POWER");
  });
});

describe("EP-206 ③ · le cerveau ne dispense d'aucun refus de 1.37.0", () => {
  it("un pouvoir inconnu reste refusé, cerveau ou pas", () => {
    expect(
      codes(avec({ allowedOperations: ["apiop_inexistante"], confirmBeforeAct: true, brain: CERVEAU })),
    ).toContain("AIR_AGENT_OPERATION_UNKNOWN");
  });

  it("LA PAROLE EST REFUSÉE TANT QUE RIEN N'ENREGISTRE — même avec l'oreille", () => {
    // Mesure du 2026-10-13 : UNE capacité sur vingt-et-une est implémentée
    // côté appareil, et c'est `auth`. `voiceInput` induit donc le microphone
    // et ne l'utilise jamais : une permission de trop, ce qu'un magasin
    // rejette. Le refus nomme l'alternative — on ÉCRIT à l'agent.
    const air = avec({
      allowedOperations: ["apiop_envoyer_argent"],
      confirmBeforeAct: true,
      voiceInput: true,
      brain: CERVEAU,
    });
    expect(codes(air)).toContain("AIR_AGENT_VOICE_NOT_SERVABLE");
  });

  it("SANS `voiceInput`, tout le reste marche — l'agent n'a pas besoin de la parole", () => {
    // C'est la moitié qui compte : le refus ci-dessus ne coûte RIEN de ce que
    // l'agent sait faire. On lui écrit, il comprend, il propose, il agit.
    expect(
      codes(avec({ allowedOperations: ["apiop_envoyer_argent"], confirmBeforeAct: true, brain: CERVEAU })),
    ).toEqual([]);
  });

  it("la voix sans l'oreille reste refusée AUSSI — les deux refus coexistent", () => {
    expect(
      codes(
        avec({
          allowedOperations: ["apiop_envoyer_argent"],
          confirmBeforeAct: true,
          voiceInput: true,
          brain: CERVEAU,
        }),
      ),
    ).toContain("AIR_AGENT_VOICE_WITHOUT_AUDIO");
  });
});
