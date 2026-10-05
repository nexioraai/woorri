import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { migrateAirDocument, assertValidAir } from "../src/index.ts";

// ════════════════════════════════════════════════════════════════════
//  QUELLES VALEURS PASSENT PAR L'ARGENT MOBILE ? (AIR 1.33.0)
//
// ── D'OÙ VIENT CE LOT, ET CE QU'IL N'EST PAS DEVENU.
//
// Le propriétaire attend une tontine au Cameroun, au Sénégal, au Tchad et au
// Mali, et a posé la contrainte : « il y a Orange Money au Cameroun mais pas
// au Tchad où il y a Moov Money et Airtel Money ».
//
// J'ai d'abord écrit un catalogue des opérateurs par pays, pour refuser un
// opérateur absent du pays. Le cliquet EP-201 l'a REFUSÉ — la loi du dépôt
// interdit une table pays → moyen de paiement, même dans l'élicitation : « la
// devise se déduit, le moyen de paiement JAMAIS ».
//
// Le cliquet avait raison. Un opérateur se lance, fusionne, se retire ; une
// table recopiée dans le moteur serait fausse au premier changement, et une
// table périmée REFUSE un document valide — ce qui coûte plus cher que de ne
// rien vérifier.
//
// ── CE QUI RESTE, ET C'EST LE DÉFAUT QUI SE MESURAIT VRAIMENT.
//
// Le cahier des charges portait une énumération de trois valeurs : deux
// opérateurs, et un encaissement en espèces à la séance. AUCUN étage ne savait
// laquelle était laquelle. Le format exige désormais une partition
// EXHAUSTIVE — chaque valeur est argent mobile, ou hors réseau.
//
// Changer de pays ne coûte donc que de changer les VALEURS du document : le
// moteur n'a jamais nommé un opérateur, et il continue de ne pas le faire.
// ════════════════════════════════════════════════════════════════════

const RACINE = new URL("../../../", import.meta.url).pathname;
const TONTINE = "slices/tontine/tontine.air.json";

interface Doc {
  integrations: {
    id: string;
    capability?: string;
    mobileMoney?: {
      operatorFieldId: string;
      operatorValues: string[];
      offNetworkValues: string[];
    };
  }[];
  entities: { id: string; fields: { id: string; type: string; enumValues?: string[] }[] }[];
}

const lire = (): Doc => JSON.parse(readFileSync(RACINE + TONTINE, "utf8")) as Doc;

function diagnostiquer(doc: Doc): string[] {
  try {
    assertValidAir(migrateAirDocument(doc));
    return [];
  } catch (e) {
    const liste = (e as { diagnostics?: { code: string }[] }).diagnostics;
    if (liste === undefined) throw e;
    return liste.map((d) => d.code);
  }
}

/** Le nœud d'argent mobile du document réel — prémisse de tous les tests. */
function noeud(doc: Doc) {
  const intg = doc.integrations.find((i) => i.mobileMoney !== undefined);
  if (intg?.mobileMoney === undefined) throw new Error("prémisse absente : aucun nœud mobileMoney");
  return { intg, mm: intg.mobileMoney };
}

describe("le document réel de la tontine", () => {
  it("classe les valeurs du cahier des charges, sans les renommer", () => {
    const { mm } = noeud(lire());
    // Les valeurs sont celles de l'énumération PostgreSQL du propriétaire.
    // Les réécrire pour faire plaisir au validateur aurait été sortir du
    // cahier des charges.
    expect(mm.operatorValues).toEqual(["ORANGE_CMR", "MTN_CMR"]);
    expect(mm.offNetworkValues).toEqual(["CASH"]);
  });

  it("est valide tel qu'il est produit", () => {
    expect(diagnostiquer(lire())).toEqual([]);
  });

  it("couvre EXACTEMENT l'énumération, sans reste ni surplus", () => {
    const doc = lire();
    const { mm } = noeud(doc);
    const champ = doc.entities.flatMap((e) => e.fields).find((f) => f.id === mm.operatorFieldId);
    const valeurs = champ?.enumValues ?? [];
    expect(valeurs.length).toBeGreaterThan(0);
    expect([...valeurs].sort()).toEqual(
      [...mm.operatorValues, ...mm.offNetworkValues].sort(),
    );
  });
});

describe("LE MOTEUR NE NOMME AUCUN PAYS NI AUCUN OPÉRATEUR", () => {
  it("le document change de marché en changeant ses VALEURS, pas le moteur", () => {
    // La réponse à « une tontine au Cameroun, au Sénégal, au Tchad, au Mali » :
    // le même format, les mêmes contrôles, d'autres valeurs. Aucune ligne du
    // moteur ne connaît l'un de ces pays — c'est le cliquet EP-201 qui
    // l'exige, et ce test montre que la contrainte n'empêche rien.
    const doc = lire();
    const { mm } = noeud(doc);
    const champ = doc.entities.flatMap((e) => e.fields).find((f) => f.id === mm.operatorFieldId);
    if (champ === undefined) throw new Error("prémisse absente : champ du moyen de paiement");
    champ.enumValues = ["MOOV_TCD", "AIRTEL_TCD", "ESPECES"];
    mm.operatorValues = ["MOOV_TCD", "AIRTEL_TCD"];
    mm.offNetworkValues = ["ESPECES"];
    expect(diagnostiquer(doc)).toEqual([]);
  });
});

describe("ce que le validateur REFUSE", () => {
  it("une valeur de l'énumération NON CLASSÉE est REFUSÉE", () => {
    const doc = lire();
    // `CASH` existe toujours dans l'énumération et ne désigne plus rien : le
    // défaut exact que portait le cahier des charges avant ce lot.
    noeud(doc).mm.offNetworkValues = [];
    expect(diagnostiquer(doc)).toContain("AIR_ARGENT_MOBILE_VALEUR_NON_CLASSEE");
  });

  it("une valeur à la fois argent mobile et hors réseau est REFUSÉE", () => {
    const doc = lire();
    noeud(doc).mm.offNetworkValues = ["CASH", "ORANGE_CMR"];
    expect(diagnostiquer(doc)).toContain("AIR_ARGENT_MOBILE_VALEUR_AMBIGUE");
  });

  it("un classement qui porte sur une valeur inexistante est REFUSÉ", () => {
    const doc = lire();
    noeud(doc).mm.operatorValues = ["ORANGE_CMR", "MTN_CMR", "VALEUR_ABSENTE"];
    expect(diagnostiquer(doc)).toContain("AIR_ARGENT_MOBILE_VALEUR_INCONNUE");
  });

  it("un champ inconnu est REFUSÉ", () => {
    const doc = lire();
    noeud(doc).mm.operatorFieldId = "fld_inexistant";
    expect(diagnostiquer(doc)).toContain("AIR_ARGENT_MOBILE_CHAMP_INCONNU");
  });

  it("un champ qui n'est pas une énumération est REFUSÉ", () => {
    const doc = lire();
    const { mm } = noeud(doc);
    const libre = doc.entities
      .flatMap((e) => e.fields)
      .find((f) => f.type !== "enum" && f.id !== mm.operatorFieldId);
    if (libre === undefined) throw new Error("prémisse absente : aucun champ non-enum");
    mm.operatorFieldId = libre.id;
    expect(diagnostiquer(doc)).toContain("AIR_ARGENT_MOBILE_CHAMP_NON_ENUM");
  });

  it("le nœud posé sans la capacité qui l'emploie est REFUSÉ", () => {
    const doc = lire();
    delete noeud(doc).intg.capability;
    expect(diagnostiquer(doc)).toContain("AIR_ARGENT_MOBILE_SANS_CAPACITE");
  });
});
