import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { migrateAirDocument, assertValidAir } from "../src/index.ts";

// ════════════════════════════════════════════════════════════════════
//  AGIR AU NOM D'UN AUTRE — CE QU'UNE PROCURATION DOIT TENIR.
//
// ── LE MANQUE QU'UN SEUL MÉTIER POUVAIT RÉVÉLER.
//
// AIR 1.28.0 sait dire « cette personne a ce droit ». Il ne savait pas dire
// « AU NOM DE QUI ». SGD ne pouvait pas le montrer : un employé y agit toujours
// pour lui-même.
//
// Mesuré le 2026-10-05 sur le cahier des charges d'une tontine camerounaise :
// un membre sans smartphone remet son argent en espèces à un MANDATAIRE, qui
// cotise à sa place, encaisse son tour, et signe un reçu de décharge. Sans
// `delegation`, la colonne « mandataire » existe dans les données et RIEN ne
// l'autorise ni ne l'encadre.
//
// Une délégation MAL déclarée est pire qu'absente : elle se lit comme une
// procuration encadrée, et n'encadre rien. D'où ces quatre refus.
// ════════════════════════════════════════════════════════════════════

const RACINE = new URL("../../../", import.meta.url).pathname;

interface DocTest {
  airSchemaVersion: string;
  entities: { id: string; fields: { id: string; type: string; referencesEntityId?: string }[] }[];
  access?: {
    rights: { id: string; name: string; label: { locale: string; text: string }[] }[];
    roles: { id: string; rightIds: string[]; grantsAllRights?: boolean }[];
    defaultRoleId: string;
    delegation?: {
      subjectEntityId: string;
      holderFieldId: string;
      delegatableRightIds: string[];
    };
  };
}

const lire = (): DocTest =>
  JSON.parse(readFileSync(RACINE + "slices/tontine/tontine.air.json", "utf8")) as DocTest;

const brut = (doc: DocTest) => doc as unknown as Record<string, unknown>;

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

/** La prémisse d'un test, rendue explicite. */
function exige<T>(valeur: T | undefined, quoi: string): T {
  if (valeur === undefined) throw new Error(`prémisse absente du document : ${quoi}`);
  return valeur;
}

describe("la tontine, telle qu'elle est produite", () => {
  it("déclare un mandat et passe", () => {
    // Ce test vaut par son document : il vient d'un cahier des charges écrit
    // par un tiers, pour un métier que nous ne connaissions pas. Un document
    // fabriqué ici mesurerait ma capacité à écrire un cas qui passe.
    const doc = lire();
    expect(exige(doc.access, "le bloc access").delegation).toBeDefined();
    expect(() => assertValidAir(migrateAirDocument(brut(doc)))).not.toThrow();
  });

  it("ne délègue qu'UN droit, pas tous", () => {
    // « Ce mandataire peut tout faire pour moi » est une procuration générale
    // que personne ne signe en connaissance de cause. Le cahier décrit le
    // mandat pour l'argent remis en espèces, rien d'autre.
    const d = exige(exige(lire().access, "access").delegation, "la délégation");
    expect(d.delegatableRightIds).toEqual(["right_encaisser_cash"]);
  });
});

describe("ce qu'une délégation ne peut pas dire", () => {
  it("elle ne porte pas sur une entité inconnue", () => {
    const doc = lire();
    exige(doc.access?.delegation, "la délégation").subjectEntityId = "ent_fantome";
    expect(diagnostiquer(doc)).toContain("AIR_DELEGATION_SUJET_INCONNU");
  });

  it("le mandataire d'une personne est une PERSONNE", () => {
    // Un champ qui désignerait autre chose — une tontine, un lieu — ferait d'un
    // objet le mandataire d'un humain, et la garde ne garderait rien.
    const doc = lire();
    const sujet = exige(
      doc.entities.find((e) => e.id === "ent_utilisateurs"),
      "l'entité des personnes",
    );
    const autre = exige(
      sujet.fields.find((f) => f.type !== "reference"),
      "un champ qui n'est pas une référence",
    );
    exige(doc.access?.delegation, "la délégation").holderFieldId = autre.id;
    expect(diagnostiquer(doc)).toContain("AIR_DELEGATION_PORTEUR_INVALIDE");
  });

  it("un champ absent de l'entité est refusé", () => {
    const doc = lire();
    exige(doc.access?.delegation, "la délégation").holderFieldId = "fld_qui_nexiste_pas";
    expect(diagnostiquer(doc)).toContain("AIR_DELEGATION_PORTEUR_INVALIDE");
  });

  it("on ne délègue pas un droit qui n'existe pas", () => {
    const doc = lire();
    exige(doc.access?.delegation, "la délégation").delegatableRightIds = ["right_invente"];
    expect(diagnostiquer(doc)).toContain("AIR_DELEGATION_DROIT_INCONNU");
  });

  it("on ne délègue pas un droit qu'AUCUN rôle n'accorde", () => {
    // ── LE REFUS LE PLUS UTILE, ET LE MOINS ÉVIDENT.
    //
    // Une procuration sur un pouvoir que le mandant n'a pas est VIDE : le
    // mandataire exercerait au nom d'autrui plus que son mandant. C'est le cas
    // qui se lit le mieux comme une protection, et qui n'en est pas une.
    const doc = lire();
    const acces = exige(doc.access, "access");
    // Un droit COMPLET : le schéma exige `name` (lisible par machine) et
    // `label` (montré à l'humain). Ma première version n'en posait que l'id,
    // et le test échouait sur la FORME avant d'atteindre la règle qu'il mesure.
    acces.rights.push({
      id: "right_orphelin",
      name: "orphelin",
      label: [{ locale: "fr", text: "Droit que personne ne porte" }],
    });
    // On retire aussi `grantsAllRights` au Président, sans quoi il porte tout
    // et le droit ne serait pas orphelin.
    for (const r of acces.roles) delete r.grantsAllRights;
    exige(acces.delegation, "la délégation").delegatableRightIds = ["right_orphelin"];

    expect(diagnostiquer(doc)).toContain("AIR_DELEGATION_DROIT_SANS_PORTEUR");
  });

  it("un droit accordé par `grantsAllRights` EST porté", () => {
    // Le Président porte tout sans qu'on l'énumère : le refus ci-dessus ne doit
    // pas se déclencher sur un droit qu'il possède par ce chemin.
    const doc = lire();
    const acces = exige(doc.access, "access");
    acces.rights.push({
      id: "right_nouveau",
      name: "nouveau",
      label: [{ locale: "fr", text: "Droit porté par le seul Président" }],
    });
    exige(acces.delegation, "la délégation").delegatableRightIds = ["right_nouveau"];

    expect(diagnostiquer(doc)).not.toContain("AIR_DELEGATION_DROIT_SANS_PORTEUR");
  });
});

describe("l'ajout est additif", () => {
  it("un document SANS délégation reste valide", () => {
    // Un métier sans mandataire — SGD — ne doit pas bouger parce qu'un autre
    // métier, ailleurs, en a besoin.
    const doc = lire();
    delete exige(doc.access, "access").delegation;
    expect(() => assertValidAir(migrateAirDocument(brut(doc)))).not.toThrow();
  });

  it("le document de gestion, qui n'en déclare aucune, passe toujours", () => {
    const gestion = JSON.parse(
      readFileSync(RACINE + "slices/gestion/gestion.air.json", "utf8"),
    ) as Record<string, unknown>;
    expect(() => assertValidAir(migrateAirDocument(gestion))).not.toThrow();
  });
});
