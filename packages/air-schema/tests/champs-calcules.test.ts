import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { migrateAirDocument, assertValidAir } from "../src/index.ts";

// ════════════════════════════════════════════════════════════════════
//  UN CHAMP QUI EST LE RÉSULTAT D'AUTRES LIGNES (AIR 1.31.0).
//
// ── LE MÊME BESOIN DANS LES DEUX MÉTIERS.
//
// SGD : « le stock n'est jamais stocké : il se calcule en rejouant les
// mouvements d'entrée et de sortie ». Un stock ÉCRIT diverge de son historique
// sans que rien ne le signale — et personne ne s'en aperçoit avant l'inventaire.
//
// Tontine : « les primes d'enchères sont versées et bloquées dans la cagnotte
// d'intérêts ». Une cagnotte écrite se désaccorde des transactions qui la
// composent, et cela se découvre à la répartition finale — au pire moment.
// ════════════════════════════════════════════════════════════════════

const RACINE = new URL("../../../", import.meta.url).pathname;

interface Champ {
  id: string;
  name: string;
  type: string;
  required: boolean;
  derived?: { kind: string; relationId: string; fieldId?: string };
}
interface DocTest {
  entities: { id: string; fields: Champ[] }[];
  relations: { id: string; fromEntityId: string; toEntityId: string }[];
  screens: {
    id: string;
    blocks: { id: string; blockType: string; entityId?: string; props?: { key: string; value: unknown }[] }[];
  }[];
}

const lire = (f: string): DocTest => JSON.parse(readFileSync(RACINE + f, "utf8")) as DocTest;
const TONTINE = "slices/tontine/tontine.air.json";
const GESTION = "slices/gestion/gestion.air.json";
const brut = (doc: DocTest) => doc as unknown as Record<string, unknown>;

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

function exige<T>(valeur: T | undefined, quoi: string): T {
  if (valeur === undefined) throw new Error(`prémisse absente : ${quoi}`);
  return valeur;
}

const calcule = (doc: DocTest, entite: string, champ: string) =>
  exige(
    doc.entities.find((e) => e.id === entite)?.fields.find((f) => f.id === champ),
    `${entite}.${champ}`,
  );

describe("les documents réels, tels qu'ils sont produits", () => {
  it("le stock de SGD est la somme de ses mouvements", () => {
    const f = calcule(lire(GESTION), "ent_articles", "fld_articles_stock");
    expect(f.derived).toEqual({
      kind: "sum",
      relationId: "rel_mouvements_article",
      fieldId: "fld_mouvements_quantite",
    });
  });

  it("la cagnotte de la tontine est la somme des primes d'enchères", () => {
    const f = calcule(lire(TONTINE), "ent_tontines", "fld_tontines_cagnotte_interets_cumulee");
    expect(f.derived).toEqual({
      kind: "sum",
      relationId: "rel_transaction_tontine",
      fieldId: "fld_transactions_montant_enchere",
    });
  });

  it("UN RÉSULTAT NE SE SAISIT PAS, donc il n'est jamais requis", () => {
    // Exiger la saisie d'une valeur calculée serait demander à quelqu'un de
    // taper ce que la machine sait déjà — et d'en répondre.
    expect(calcule(lire(GESTION), "ent_articles", "fld_articles_stock").required).toBe(false);
    expect(
      calcule(lire(TONTINE), "ent_tontines", "fld_tontines_cagnotte_interets_cumulee").required,
    ).toBe(false);
  });

  it("les deux documents passent", () => {
    for (const f of [TONTINE, GESTION]) {
      expect(() => assertValidAir(migrateAirDocument(brut(lire(f)))), f).not.toThrow();
    }
  });
});

describe("ce qu'un champ calculé ne peut pas dire", () => {
  it("une relation qui n'existe pas est refusée", () => {
    const doc = lire(GESTION);
    calcule(doc, "ent_articles", "fld_articles_stock").derived = {
      kind: "sum",
      relationId: "rel_inventee",
      fieldId: "fld_mouvements_quantite",
    };
    expect(diagnostiquer(doc)).toContain("AIR_DERIVE_RELATION_INCONNUE");
  });

  it("UNE RELATION QUI NE PART PAS DE CETTE ENTITÉ est refusée", () => {
    // ── LE REFUS LE PLUS SOURNOIS À ATTRAPER AUTREMENT.
    //
    // Agréger par une relation étrangère donnerait LE MÊME CHIFFRE pour toutes
    // les lignes — un stock identique pour chaque article. Cela se repère tard,
    // et se croit longtemps.
    const doc = lire(GESTION);
    const etrangere = exige(
      doc.relations.find((r) => r.fromEntityId !== "ent_articles"),
      "une relation qui ne part pas des articles",
    );
    calcule(doc, "ent_articles", "fld_articles_stock").derived = {
      kind: "count",
      relationId: etrangere.id,
    };
    expect(diagnostiquer(doc)).toContain("AIR_DERIVE_RELATION_ETRANGERE");
  });

  it("sommer un champ absent de l'entité visée est refusé", () => {
    const doc = lire(GESTION);
    calcule(doc, "ent_articles", "fld_articles_stock").derived = {
      kind: "sum",
      relationId: "rel_mouvements_article",
      fieldId: "fld_articles_nom",
    };
    expect(diagnostiquer(doc)).toContain("AIR_DERIVE_CHAMP_INCONNU");
  });

  it("SOMMER DU TEXTE est refusé", () => {
    // Une somme ne se fait que sur des nombres ; sommer autre chose produirait
    // un chiffre qui ne veut rien dire, et qu'on afficherait quand même.
    const doc = lire(GESTION);
    const texte = exige(
      doc.entities.find((e) => e.id === "ent_mouvements")?.fields.find((f) => f.type === "string"),
      "un champ texte des mouvements",
    );
    calcule(doc, "ent_articles", "fld_articles_stock").derived = {
      kind: "sum",
      relationId: "rel_mouvements_article",
      fieldId: texte.id,
    };
    expect(diagnostiquer(doc)).toContain("AIR_DERIVE_CHAMP_NON_NUMERIQUE");
  });

  it("`count` n'a pas besoin de champ, et reste valide", () => {
    const doc = lire(GESTION);
    calcule(doc, "ent_articles", "fld_articles_stock").derived = {
      kind: "count",
      relationId: "rel_mouvements_article",
    };
    const d = diagnostiquer(doc);
    expect(d).not.toContain("AIR_DERIVE_CHAMP_INCONNU");
    expect(d).not.toContain("AIR_DERIVE_RELATION_ETRANGERE");
  });
});

describe("un champ calculé ne se met JAMAIS dans un formulaire", () => {
  it("un `fieldIds` qui le propose à la saisie est refusé", () => {
    // ── LA GARDE EST SUR LE FORMULAIRE, ET NON SUR L'ACTION.
    //
    // Une mutation ne déclare PAS quels champs elle écrit : elle écrit ce que
    // le formulaire de son écran porte. C'est donc là qu'un champ calculé
    // devient saisissable, et donc là qu'il faut le refuser. J'avais d'abord
    // posé la garde sur l'action — elle n'avait rien à inspecter.
    const doc = lire(GESTION);
    exige(doc.screens[0], "un premier écran").blocks.push({
      id: "blk_formulaire_fautif",
      blockType: "form",
      entityId: "ent_articles",
      props: [
        { key: "fieldIds", value: ["fld_articles_nom", "fld_articles_stock"] },
        { key: "submitLabel", value: "Enregistrer" },
      ],
    });
    expect(diagnostiquer(doc)).toContain("AIR_DERIVE_SAISI");
  });

  it("un formulaire qui ne propose QUE des champs saisissables passe", () => {
    const doc = lire(GESTION);
    exige(doc.screens[0], "un premier écran").blocks.push({
      id: "blk_formulaire_correct",
      blockType: "form",
      entityId: "ent_articles",
      props: [
        { key: "fieldIds", value: ["fld_articles_nom"] },
        { key: "submitLabel", value: "Enregistrer" },
      ],
    });
    expect(diagnostiquer(doc)).not.toContain("AIR_DERIVE_SAISI");
  });
});
