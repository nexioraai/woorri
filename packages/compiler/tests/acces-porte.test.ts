import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { migrateAirDocument, assertValidAir } from "@deribfy/air-schema";
import { compileProject } from "../src/index.ts";
import {
  droitsDuRole,
  peutAgir,
  peutOuvrir,
  peutAgirPour,
  premierEcranAccessible,
  raisonDuRefus,
  type AccesData,
} from "../runtime/acces.ts";

// ════════════════════════════════════════════════════════════════════
//  LA PORTE DE CHACUN — LE CALCUL, ÉPROUVÉ SEUL.
//
// Le modèle est celui de SGD, en production : un propriétaire qui voit tout, un
// employé qui ne voit que ce qu'on lui a accordé, et un écran de réglages sans
// droit — celui par lequel on entre quand on n'a encore rien.
// ════════════════════════════════════════════════════════════════════

const ACCES: AccesData = {
  droits: ["right_recherche", "right_mouvements", "right_rentabilite"],
  roles: [
    { id: "role_proprietaire", rightIds: [], grantsAllRights: true },
    { id: "role_employe", rightIds: [] },
  ],
  defaultRoleId: "role_employe",
  parEcran: {
    scr_recherche: "right_recherche",
    scr_mouvements: "right_mouvements",
    scr_rentabilite: "right_rentabilite",
  },
  parAction: { act_transfert: "right_mouvements" },
};

// L'ordre du document : les destinations principales d'abord, puis le reste.
const CANDIDATS = ["scr_recherche", "scr_mouvements", "scr_rentabilite", "scr_parametres"];
const SECOURS = "scr_parametres";

describe("les droits d'un rôle", () => {
  it("celui qui dirige a TOUT, sans qu'on les lui énumère", () => {
    // `grantsAllRights` existe pour que le patron n'ait pas à être recopié à
    // chaque nouveau domaine — une liste à tenir à jour finit désaccordée.
    expect(droitsDuRole(ACCES, "role_proprietaire")).toEqual(ACCES.droits);
  });

  it("l'employé part de RIEN — liste blanche, vide par défaut", () => {
    expect(droitsDuRole(ACCES, "role_employe")).toEqual([]);
  });

  it("un rôle inconnu n'ouvre rien, et ne lève pas", () => {
    // Le rôle peut venir de la session, donc d'ailleurs. Lever ferait tomber
    // l'application ; rendre « rien » est la réponse juste ET la plus sûre.
    expect(droitsDuRole(ACCES, "role_venu_dailleurs")).toEqual([]);
  });
});

describe("ouvrir un écran", () => {
  it("un écran sans droit déclaré reste ouvert à tous", () => {
    // Comportement de toute version antérieure à 1.28.0 : l'absence de champ
    // ne doit JAMAIS fermer, sinon la montée de contrat casse l'existant.
    expect(peutOuvrir(ACCES, [], "scr_parametres")).toBe(true);
    expect(peutOuvrir(ACCES, undefined, "scr_parametres")).toBe(true);
  });

  it("un écran réservé exige SON droit, pas un autre", () => {
    expect(peutOuvrir(ACCES, ["right_recherche"], "scr_recherche")).toBe(true);
    expect(peutOuvrir(ACCES, ["right_recherche"], "scr_rentabilite")).toBe(false);
  });

  it("une session MUETTE ferme — l'ignorance n'est pas une autorisation", () => {
    expect(peutOuvrir(ACCES, undefined, "scr_recherche")).toBe(false);
  });

  it("un geste réservé se refuse même sur un écran ouvert", () => {
    // Dans SGD, inventaire, vente et transfert partagent le MÊME écran de scan
    // et ne font pas la même chose au stock : trois droits, trois actions.
    expect(peutOuvrir(ACCES, [], "scr_parametres")).toBe(true);
    expect(peutAgir(ACCES, [], "act_transfert")).toBe(false);
    expect(peutAgir(ACCES, ["right_mouvements"], "act_transfert")).toBe(true);
  });
});

describe("la raison du refus distingue deux causes qu'on confondrait", () => {
  it("session muette ≠ droit absent", () => {
    // La confusion coûte cher en diagnostic : « droit absent » envoie chercher
    // dans les rôles, « session muette » dans l'intégration. L'une des deux
    // pistes est toujours la mauvaise.
    expect(raisonDuRefus(ACCES, undefined, "scr_recherche")).toBe("session_muette");
    expect(raisonDuRefus(ACCES, [], "scr_recherche")).toBe("droit_absent");
    expect(raisonDuRefus(ACCES, ["right_recherche"], "scr_recherche")).toBe("aucune");
  });

  it("un écran libre n'a aucune raison de refus, même session muette", () => {
    expect(raisonDuRefus(ACCES, undefined, "scr_parametres")).toBe("aucune");
  });
});

describe("LE BESOIN, mot pour mot : le PREMIER écran que ses droits lui ouvrent", () => {
  it("le propriétaire arrive sur la première destination du document", () => {
    const tout = droitsDuRole(ACCES, "role_proprietaire");
    expect(premierEcranAccessible(ACCES, CANDIDATS, tout, SECOURS)).toBe("scr_recherche");
  });

  it("l'employé qui n'a QUE la rentabilité y arrive — pas sur les réglages", () => {
    // C'est tout l'objet : l'ordre du document est respecté, mais on SAUTE ce
    // qui est fermé au lieu de s'y cogner.
    expect(premierEcranAccessible(ACCES, CANDIDATS, ["right_rentabilite"], SECOURS)).toBe(
      "scr_rentabilite",
    );
  });

  it("l'employé sans aucun droit atterrit sur l'écran de secours, jamais dehors", () => {
    // ── LE DÉFAUT FONDATEUR, ARRIVÉ EN PRODUCTION DANS SGD.
    //
    // L'application ouvrait sur le tableau de bord. Un employé dont les droits
    // n'étaient pas encore accordés était mis dehors DÈS L'OUVERTURE — à la
    // connexion, puis à chaque lancement de l'app installée sur son téléphone.
    // Le propriétaire ne pouvait pas le rencontrer : il voit tout.
    expect(premierEcranAccessible(ACCES, CANDIDATS, [], SECOURS)).toBe(SECOURS);
  });

  it("une session muette atterrit aussi sur le secours — fermé, mais jamais dehors", () => {
    expect(premierEcranAccessible(ACCES, CANDIDATS, undefined, SECOURS)).toBe(SECOURS);
  });

  it("l'ORDRE du document décide, et rien d'autre", () => {
    // Mêmes droits, ordre inversé : la destination change. C'est la preuve que
    // le calcul lit l'intention de l'auteur et n'applique aucune préférence du
    // moteur.
    //
    // PREMIÈRE VERSION DE CE TEST, ET ELLE NE PROUVAIT RIEN : elle inversait
    // CANDIDATS en entier, ce qui mettait `scr_parametres` — l'écran SANS
    // droit, ouvert à tous — en tête. La réponse était donc « scr_parametres »
    // quels que soient les droits, et le test mesurait la règle d'ouverture au
    // lieu de l'ordre. On compare maintenant deux ordres des seuls écrans
    // RÉSERVÉS, le secours restant hors de la liste.
    const droits = ["right_recherche", "right_rentabilite"];
    const unSens = ["scr_recherche", "scr_rentabilite"];
    const lAutre = ["scr_rentabilite", "scr_recherche"];
    expect(premierEcranAccessible(ACCES, unSens, droits, SECOURS)).toBe("scr_recherche");
    expect(premierEcranAccessible(ACCES, lAutre, droits, SECOURS)).toBe("scr_rentabilite");
  });
});

// ════════════════════════════════════════════════════════════════════
//  LES DEUX BRANCHES DE L'ÉMISSION — ET LE CORPUS GELÉ NE DOIT PAS BOUGER.
//
// Le calcul est éprouvé ci-dessus, seul. Reste à prouver qu'il ARRIVE dans
// l'application — c'est le défaut de la journée : une vérité qui s'arrête au
// moteur. Et son symétrique : un document SANS droits doit produire exactement
// ce qu'il produisait avant, sinon les 28 applications du corpus bougent parce
// qu'une autre application, ailleurs, a des employés.
// ════════════════════════════════════════════════════════════════════

const R = new URL("../../../", import.meta.url).pathname;

describe("l'émission porte les droits, et SEULEMENT quand il y en a", () => {
  const compiler = (chemin: string) => {
    const doc: unknown = JSON.parse(readFileSync(R + chemin, "utf8"));
    return compileProject(assertValidAir(migrateAirDocument(doc)));
  };

  it("un document AVEC droits : le navigateur RÉSOUT la porte", () => {
    const { files } = compiler("slices/gestion/gestion.air.json");
    const nav = files.get("navigation.tsx") ?? "";
    expect(files.has("acces.data.ts"), "le modèle d'accès n'est pas émis").toBe(true);
    expect(nav).toContain("premierEcranAccessible");
    // `key` EST la règle : React Navigation ne lit `initialRouteName` qu'au
    // MONTAGE. Sans elle, la destination recalculée après une connexion
    // n'aurait aucun effet — le besoin dit « APRÈS CONNEXION ».
    expect(nav).toContain("key={depart}");
    expect(nav).toContain("initialRouteName={depart}");
  });

  it("un document AVEC droits : chaque écran réservé porte le SIEN", () => {
    const { files } = compiler("slices/gestion/gestion.air.json");
    const data = files.get("screens/scr_rentabilite.data.ts") ?? "";
    expect(data).toContain('"requiredRightId":"right_rentabilite"');
  });

  it("un document SANS droits : rien n'est ajouté, l'entrée reste FIGÉE", () => {
    // Le corpus est gelé. Une destination résolue là où personne n'a d'employé
    // serait une dérive gratuite — et le gate `app_compile` l'a déjà dit une
    // fois aujourd'hui, en refusant 28 applications sur 28.
    const { files } = compiler("packages/golden-corpus/corpus-v3/resto-quartier.air.json");
    const nav = files.get("navigation.tsx") ?? "";
    expect(files.has("acces.data.ts"), "fichier d'accès émis sans accès").toBe(false);
    expect(nav).not.toContain("premierEcranAccessible");
    expect(nav).not.toContain("key={depart}");
    expect(nav).toMatch(/initialRouteName="scr_[a-z_]+"/);
  });

  it("un document SANS droits : aucune donnée d'écran ne porte de droit", () => {
    const { files } = compiler("packages/golden-corpus/corpus-v3/resto-quartier.air.json");
    const avecDroit = [...files.entries()].filter(
      ([f, c]) => f.endsWith(".data.ts") && c.includes("requiredRightId"),
    );
    expect(avecDroit.map(([f]) => f)).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════
//  AGIR AU NOM D'UN AUTRE — LE CALCUL (AIR 1.29.0).
//
// Trois conditions, et aucune ne se devine : le document déclare un mandat, le
// droit est sur la liste blanche, et le mandant a DÉSIGNÉ cette personne.
// ════════════════════════════════════════════════════════════════════

const AVEC_MANDAT: AccesData = {
  ...ACCES,
  delegation: {
    subjectEntityId: "ent_personnes",
    holderFieldId: "fld_personnes_mandataire",
    delegatableRightIds: ["right_mouvements"],
  },
};

describe("agir au nom d'un autre", () => {
  it("le mandataire désigné, avec le droit, PEUT agir", () => {
    expect(
      peutAgirPour(AVEC_MANDAT, ["right_mouvements"], "right_mouvements", "u_paul", "u_paul"),
    ).toBe(true);
  });

  it("sans délégation déclarée, PERSONNE n'agit pour personne", () => {
    // L'absence n'est pas une permission tacite.
    expect(peutAgirPour(ACCES, ["right_mouvements"], "right_mouvements", "u_paul", "u_paul")).toBe(
      false,
    );
  });

  it("un droit HORS de la liste blanche ne se délègue pas", () => {
    // « Ce mandataire peut tout faire pour moi » est une procuration générale
    // que personne ne signe en connaissance de cause.
    expect(
      peutAgirPour(AVEC_MANDAT, ["right_rentabilite"], "right_rentabilite", "u_paul", "u_paul"),
    ).toBe(false);
  });

  it("ON NE SE NOMME PAS MANDATAIRE SOI-MÊME", () => {
    // C'est le mandant qui désigne, et l'application ne fait que lire ce qu'il
    // a désigné. Quelqu'un qui n'est pas désigné n'agit pas, même avec le droit.
    expect(
      peutAgirPour(AVEC_MANDAT, ["right_mouvements"], "right_mouvements", "u_jean", "u_paul"),
    ).toBe(false);
  });

  it("UN MANDAT TRANSMET UN POUVOIR, IL N'EN CRÉE PAS", () => {
    // Quelqu'un qui n'a pas le droit de cotiser ne l'acquiert pas en cotisant
    // pour autrui — sinon la délégation serait une porte dérobée vers des
    // droits qu'on n'a pas.
    expect(peutAgirPour(AVEC_MANDAT, [], "right_mouvements", "u_paul", "u_paul")).toBe(false);
  });

  it("une session muette n'agit pour personne", () => {
    expect(
      peutAgirPour(AVEC_MANDAT, undefined, "right_mouvements", "u_paul", "u_paul"),
    ).toBe(false);
  });

  it("sans mandant désigné, rien ne se délègue", () => {
    expect(
      peutAgirPour(AVEC_MANDAT, ["right_mouvements"], "right_mouvements", "u_paul", undefined),
    ).toBe(false);
  });
});

describe("l'émission porte le mandat, et seulement s'il y en a un", () => {
  it("la tontine : `delegation` atteint l'application", () => {
    const doc: unknown = JSON.parse(
      readFileSync(R + "slices/tontine/tontine.air.json", "utf8"),
    );
    const { files } = compileProject(assertValidAir(migrateAirDocument(doc)));
    const data = files.get("acces.data.ts") ?? "";
    expect(data).toContain('"delegation"');
    expect(data).toContain('"fld_utilisateurs_mandataire"');
    expect(data).toContain('"right_encaisser_cash"');
  });

  it("la gestion, qui n'en déclare aucun, n'en reçoit aucun", () => {
    const doc: unknown = JSON.parse(
      readFileSync(R + "slices/gestion/gestion.air.json", "utf8"),
    );
    const { files } = compileProject(assertValidAir(migrateAirDocument(doc)));
    expect(files.get("acces.data.ts") ?? "").not.toContain("delegation");
  });
});
