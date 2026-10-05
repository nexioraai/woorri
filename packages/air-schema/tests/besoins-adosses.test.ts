import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { migrateAirDocument, assertValidAir } from "../src/index.ts";

// ============================================================
// UN BESOIN DÉCLARÉ PORTÉ EST-IL VRAIMENT ADOSSÉ À QUELQUE CHOSE ?
//
// `intent.needs` est la MESURE du format : chaque besoin du domaine sort
// `satisfied` — avec les nœuds qui le portent — ou `unexpressible` avec motif.
// C'est ce qui répond à « ce format sait-il dire ce que ce métier demande ? ».
//
// Cette mesure était entièrement SUR PAROLE. Rien ne vérifiait que les nœuds
// nommés existaient, donc rien ne distinguait un besoin réellement porté d'un
// identifiant inventé. Un score construit là-dessus se gonfle tout seul.
//
// ── CE QUE L'ABSENCE DE CE CLIQUET A COÛTÉ, ET C'EST DE MOI.
//
// En portant SGD, j'ai classé le besoin des écrans calculés `unexpressible`,
// motif : « il n'existe aucun nœud pour décrire une agrégation ». Mesure du
// 2026-10-04 : faux sur les quatre étages — un slot, une action
// `lifecycle/screen_open` et une liaison le disent, le compilateur les émet
// sous `slotInvocations`, le runtime écrit la sortie dans la prop du bloc.
// Trois écrans affichaient donc à l'utilisateur « cet écran agrège des
// chiffres : il ne montre aucune table » — une excuse, pour un manque qui
// n'existait pas.
//
// Ce cliquet ne rattrape PAS ce sens-là : on ne peut pas prouver qu'un manque
// déclaré est réel. Il ferme l'autre sens, le seul mécanisable — une
// satisfaction doit être adossée à des nœuds qui existent.
// ============================================================

const RACINE = new URL("../../../", import.meta.url).pathname;

// ── CE QUE CES TESTS TOUCHENT DU DOCUMENT, ET RIEN DE PLUS.
//
// La première version lisait le document `as any`. Le lint du dépôt l'a refusé,
// et il a raison : `any` éteint le typage à l'endroit même où ces tests
// manipulent la structure à la main. Un champ renommé ne les aurait pas fait
// broncher — ils auraient muté une propriété inexistante et continué de passer.
// On déclare donc la forme réellement touchée. Elle est partielle par
// construction : ce qui n'est pas écrit ici n'est pas manipulé.
interface DocTest {
  screens: { id: string; requiredRightId?: string }[];
  navigation: { entryScreenId: string; routes: { id: string }[] };
  entities: { fields: { id: string }[] }[];
  access?: {
    rights: { id: string }[];
    roles: { id: string }[];
    defaultRoleId: string;
  };
  intent: {
    needs: {
      id: string;
      resolution:
        | { kind: "satisfied"; nodeIds: string[] }
        | { kind: "unexpressible"; reason: string; nodeIds?: undefined };
    }[];
  };
}

const lire = (): DocTest =>
  JSON.parse(readFileSync(RACINE + "slices/gestion/gestion.air.json", "utf8")) as DocTest;

/** Le document rendu au contrat d'entrée du validateur, sans passer par `any`. */
const brut = (doc: DocTest) => doc as unknown as Record<string, unknown>;

/**
 * La prémisse d'un test, rendue EXPLICITE.
 *
 * `find` et l'indexation rendent `undefined`, et c'est ce que `any` masquait :
 * un test pouvait muter une propriété d'un objet absent et continuer de passer,
 * ne mesurant plus rien. Ici, une prémisse fausse ÉCHOUE, et elle dit laquelle.
 */
function exige<T>(valeur: T | undefined, quoi: string): T {
  if (valeur === undefined) throw new Error(`prémisse absente du document : ${quoi}`);
  return valeur;
}

/** Un besoin déclaré PORTÉ, avec ses nœuds — la prémisse de presque tout ici. */
function unPorte(doc: DocTest, aumoins = 1) {
  const n = exige(
    doc.intent.needs.find(
      (x) => x.resolution.kind === "satisfied" && x.resolution.nodeIds.length >= aumoins,
    ),
    `un besoin porté par au moins ${aumoins} nœud(s)`,
  );
  if (n.resolution.kind !== "satisfied") throw new Error("inatteignable");
  return n.resolution;
}

/** Les diagnostics du document, LUS plutôt que subis. */
function diagnostiquer(doc: DocTest): string[] {
  try {
    assertValidAir(migrateAirDocument(brut(doc)));
    return [];
  } catch (e) {
    const liste = (e as { diagnostics?: { code: string }[] }).diagnostics;
    if (liste === undefined) throw e;
    return liste.map((d) => d.code);
  }
}

describe("un besoin porté est adossé (AIR, cliquet)", () => {
  it("le document de gestion porte AU MOINS 12 besoins, et chacun tient", () => {
    // Ce test vaut par son document : SGD est en production, et ses besoins
    // viennent de ses incidents. Un document fabriqué pour le test mesurerait
    // ma capacité à écrire un cas qui passe.
    const doc = lire();
    const portes = doc.intent.needs.filter((n) => n.resolution.kind === "satisfied");
    // ── CLIQUET MONOTONE, ET C'EST DÉLIBÉRÉ.
    //
    // Un nombre FIGÉ casse à chaque progrès : ce test a été mis à jour trois
    // fois en deux jours — 9, puis 10, puis 11 — et chaque mise à jour était
    // un geste mécanique, donc un geste qu'on finit par expédier sans lire.
    //
    // Ce qui doit alerter n'est pas qu'un besoin DE PLUS soit porté : c'est
    // qu'un besoin cesse de l'être. Le compte peut donc monter librement, et
    // toute BAISSE fait échouer le test — une régression du format, ou un
    // document amputé, se voit alors immédiatement.
    expect(portes.length).toBeGreaterThanOrEqual(12);
    expect(diagnostiquer(doc)).not.toContain("AIR_NEED_NODE_UNKNOWN");
  });

  it("un nœud inventé dans un `satisfied` est refusé", () => {
    const doc = lire();
    unPorte(doc).nodeIds = ["slot_qui_nexiste_pas"];

    expect(diagnostiquer(doc)).toContain("AIR_NEED_NODE_UNKNOWN");
  });

  it("un seul nœud faux parmi des vrais suffit — on ne vérifie pas que le premier", () => {
    const doc = lire();
    const porte = unPorte(doc, 2);
    porte.nodeIds = [...porte.nodeIds, "ent_inventee"];

    expect(diagnostiquer(doc)).toContain("AIR_NEED_NODE_UNKNOWN");
  });

  it("un besoin `unexpressible` n'est PAS tenu de nommer des nœuds", () => {
    // Un manque n'a rien à adosser — c'est sa définition. Si ce cliquet exigeait
    // des nœuds ici, il pousserait à déclarer `satisfied` pour se taire.
    const doc = lire();
    const absent = exige(
      doc.intent.needs.find((n) => n.resolution.kind === "unexpressible"),
      "un besoin inexprimable",
    );
    expect(absent.resolution.nodeIds).toBeUndefined();
    expect(diagnostiquer(doc)).not.toContain("AIR_NEED_NODE_UNKNOWN");
  });

  it("les nœuds de TOUTES les collections comptent, pas seulement les écrans", () => {
    // Le premier inventaire que j'ai écrit pour mesurer ce trou omettait les
    // champs, les routes et les tests attendus — il accusait 106 documents sur
    // 111 de mentir. C'était l'inventaire qui était faux. Le cliquet doit donc
    // reconnaître un champ, une route et un test attendu comme des nœuds.
    const doc = lire();
    const champ = exige(exige(doc.entities[0], "une entité").fields[0], "un champ").id;
    const route = exige(doc.navigation.routes[0], "une route").id;
    const droit = exige(exige(doc.access, "le bloc access").rights[0], "un droit").id;
    unPorte(doc).nodeIds = [champ, route, droit];

    expect(diagnostiquer(doc)).not.toContain("AIR_NEED_NODE_UNKNOWN");
  });

  it("deux droits ne peuvent pas porter le même identifiant", () => {
    // OMISSION DE 1.28.0, fermée le même jour : les ids de droits et de rôles
    // ne rejoignaient pas la passe d'unicité.
    //
    // J'avais d'abord écrit ce test avec un droit prenant l'id d'un ÉCRAN. Zod
    // l'a refusé avant le validateur : `rightIdSchema` impose le préfixe
    // `right_`, et tous les préfixes du format sont disjoints — cette collision
    // est IMPOSSIBLE par construction. La prémisse était fausse ; le trou,
    // lui, était réel et il est ici : rien n'empêchait `access.rights` de
    // déclarer deux fois le même droit, et `requiredRightId` aurait désigné
    // celui des deux que le lecteur voudrait bien lire.
    const doc = lire();
    const acces = exige(doc.access, "le bloc access");
    acces.rights.push({ ...exige(acces.rights[0], "un droit") });

    expect(diagnostiquer(doc)).toContain("AIR_DUP_ID");
  });

  it("deux rôles ne peuvent pas porter le même identifiant", () => {
    const doc = lire();
    const acces = exige(doc.access, "le bloc access");
    acces.roles.push({ ...exige(acces.roles[0], "un rôle") });

    expect(diagnostiquer(doc)).toContain("AIR_DUP_ID");
  });
});
