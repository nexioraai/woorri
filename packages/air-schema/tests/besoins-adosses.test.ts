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
const lire = () =>
  JSON.parse(readFileSync(RACINE + "slices/gestion/gestion.air.json", "utf8")) as Record<
    string,
    unknown
  >;

/** Les diagnostics du document, LUS plutôt que subis. */
function diagnostiquer(doc: unknown): string[] {
  try {
    assertValidAir(migrateAirDocument(doc as Record<string, unknown>));
    return [];
  } catch (e) {
    const liste = (e as { diagnostics?: { code: string }[] }).diagnostics;
    if (liste === undefined) throw e;
    return liste.map((d) => d.code);
  }
}

describe("un besoin porté est adossé (AIR, cliquet)", () => {
  it("le document de gestion déclare 9 besoins portés, et chacun tient", () => {
    // Ce test vaut par son document : SGD est en production, et ses besoins
    // viennent de ses incidents. Un document fabriqué pour le test mesurerait
    // ma capacité à écrire un cas qui passe.
    const doc = lire() as any;
    const portes = doc.intent.needs.filter((n: any) => n.resolution.kind === "satisfied");
    expect(portes.length).toBe(9);
    expect(diagnostiquer(doc)).not.toContain("AIR_NEED_NODE_UNKNOWN");
  });

  it("un nœud inventé dans un `satisfied` est refusé", () => {
    const doc = lire() as any;
    const porte = doc.intent.needs.find((n: any) => n.resolution.kind === "satisfied");
    porte.resolution.nodeIds = ["slot_qui_nexiste_pas"];

    expect(diagnostiquer(doc)).toContain("AIR_NEED_NODE_UNKNOWN");
  });

  it("un seul nœud faux parmi des vrais suffit — on ne vérifie pas que le premier", () => {
    const doc = lire() as any;
    const porte = doc.intent.needs.find(
      (n: any) => n.resolution.kind === "satisfied" && n.resolution.nodeIds.length > 1,
    );
    porte.resolution.nodeIds = [...porte.resolution.nodeIds, "ent_inventee"];

    expect(diagnostiquer(doc)).toContain("AIR_NEED_NODE_UNKNOWN");
  });

  it("un besoin `unexpressible` n'est PAS tenu de nommer des nœuds", () => {
    // Un manque n'a rien à adosser — c'est sa définition. Si ce cliquet exigeait
    // des nœuds ici, il pousserait à déclarer `satisfied` pour se taire.
    const doc = lire() as any;
    const absent = doc.intent.needs.find((n: any) => n.resolution.kind === "unexpressible");
    expect(absent).toBeDefined();
    expect(absent.resolution.nodeIds).toBeUndefined();
    expect(diagnostiquer(doc)).not.toContain("AIR_NEED_NODE_UNKNOWN");
  });

  it("les nœuds de TOUTES les collections comptent, pas seulement les écrans", () => {
    // Le premier inventaire que j'ai écrit pour mesurer ce trou omettait les
    // champs, les routes et les tests attendus — il accusait 106 documents sur
    // 111 de mentir. C'était l'inventaire qui était faux. Le cliquet doit donc
    // reconnaître un champ, une route et un test attendu comme des nœuds.
    const doc = lire() as any;
    const champ = doc.entities[0].fields[0].id;
    const route = doc.navigation.routes[0].id;
    const droit = doc.access.rights[0].id;
    const porte = doc.intent.needs.find((n: any) => n.resolution.kind === "satisfied");
    porte.resolution.nodeIds = [champ, route, droit];

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
    const doc = lire() as any;
    doc.access.rights.push({ ...doc.access.rights[0] });

    expect(diagnostiquer(doc)).toContain("AIR_DUP_ID");
  });

  it("deux rôles ne peuvent pas porter le même identifiant", () => {
    const doc = lire() as any;
    doc.access.roles.push({ ...doc.access.roles[0] });

    expect(diagnostiquer(doc)).toContain("AIR_DUP_ID");
  });
});
