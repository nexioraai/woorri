// EP-149 — LA GRAMMAIRE TROP COMPLEXE : une contrainte de TRANSPORT.
//
// Le run EP-148 a essuyé six dégradations refusées. La mesure a montré que ce
// n'est PAS la taille — 2 à 5 Ko par segment — mais deux choses distinctes :
// une incompatibilité non déclarée (`maxItems`), et une limite de complexité.
import { describe, expect, it } from "vitest";
import { makeLevels } from "../../../benchmarks/air-emission/schema-levels.mjs";
import { CONTRAINTES_GRAMMAIRE, degraderGrammaire } from "../../../benchmarks/air-emission/adaptateur-anthropic.mjs";

const compter = (o: unknown, clef: string): number => {
  if (Array.isArray(o)) return o.reduce<number>((a, x) => a + compter(x, clef), 0);
  if (o !== null && typeof o === "object") {
    return Object.entries(o).reduce<number>(
      (a, [k, v]) => a + (k === clef ? 1 : 0) + compter(v, clef),
      0,
    );
  }
  return 0;
};

/** Un schéma qui porte les quatre familles de contraintes en cause. */
const SCHEMA = {
  type: "object",
  properties: {
    liste: { type: "array", minItems: 3, maxItems: 12, items: { type: "string", pattern: "^[a-z]+$" } },
    compte: { type: "integer", minimum: 1, maximum: 99 },
    nom: { type: "string", minLength: 2, maxLength: 40 },
  },
} as const;

describe("EP-149 · l'incompatibilité est DÉCLARÉE, plus seulement subie", () => {
  it("`maxItems` figure aux contraintes du dialecte — sixième écart", () => {
    // Il existait DANS LES FAITS depuis le premier run : deux niveaux de
    // l'échelle le gardaient et se faisaient refuser. Il n'était nommé nulle
    // part. Le nommer, c'est ce qui permet de le retirer une fois pour toutes.
    expect(CONTRAINTES_GRAMMAIRE.maxItemsSupporte).toBe(false);
  });

  it("la grammaire canonique en sort débarrassée, dès le premier envoi", () => {
    const { grammaire } = degraderGrammaire(SCHEMA) as { grammaire: unknown };
    expect(compter(grammaire, "maxItems")).toBe(0);
  });

  it("l'écart est RAPPORTÉ, jamais silencieux", () => {
    const { ecarts } = degraderGrammaire(SCHEMA) as { ecarts: string[] };
    expect(ecarts.some((e) => e.includes("maxItems"))).toBe(true);
  });

  it("ce que le service ACCEPTE n'est pas touché — on ne dégrade pas au hasard", () => {
    const { grammaire } = degraderGrammaire(SCHEMA) as { grammaire: unknown };
    // Les motifs et les longueurs survivent : ils n'ont jamais été refusés.
    expect(compter(grammaire, "pattern")).toBe(1);
    expect(compter(grammaire, "minLength")).toBe(1);
  });
});

describe("EP-149 · l'échelle dégrade dans l'ordre de ce qui est REFUSÉ", () => {
  // EP-151 — l'échelle REÇOIT les contraintes du dialecte : elle ne les devine
  // plus. Les tests la nourrissent donc explicitement.
  const niveaux = makeLevels(SCHEMA, CONTRAINTES_GRAMMAIRE) as { name: string; schema: unknown }[];

  it("le PREMIER niveau neutralise les deux incompatibilités connues", () => {
    // Avant : il retirait les bornes numériques — jamais refusées — et gardait
    // `maxItems` jusqu'au troisième. Deux appels perdus par segment.
    expect(niveaux[0]!.name).toBe("incompatibilites-connues");
    expect(compter(niveaux[0]!.schema, "maxItems")).toBe(0);
    // EP-151 — les bornes numériques aussi, désormais : elles étaient
    // déclarées et non honorées, ce qui a coûté le run EP-150.
    expect(compter(niveaux[0]!.schema, "maximum")).toBe(0);
    expect(compter(niveaux[0]!.schema, "minItems")).toBe(1);
    const min = JSON.stringify(niveaux[0]!.schema).match(/"minItems":(\d+)/);
    expect(min?.[1], "minItems doit être ramené à 1").toBe("1");
  });

  it("les niveaux suivants attaquent la COMPLEXITÉ, dans l'ordre du coût", () => {
    // « Schema is too complex » sur les écrans : les motifs sont le poste le
    // plus lourd d'un compilateur de grammaire, donc ils partent en dernier —
    // ce sont eux qui portent le plus de sens.
    // EP-151 — un niveau de moins : les bornes numériques ont rejoint le
    // premier, puisqu'elles étaient déclarées incompatibles depuis toujours.
    expect(niveaux.map((n) => n.name)).toEqual([
      "incompatibilites-connues",
      "sans-longueurs",
      "sans-patterns",
    ]);
    expect(compter(niveaux[2]!.schema, "pattern")).toBe(0);
  });

  it("chaque niveau retire STRICTEMENT plus que le précédent", () => {
    const poids = niveaux.map((n) => JSON.stringify(n.schema).length);
    for (let i = 1; i < poids.length; i += 1) {
      expect(poids[i]!, niveaux[i]!.name).toBeLessThanOrEqual(poids[i - 1]!);
    }
  });

  it("AUCUN niveau ne touche à la STRUCTURE — seules les contraintes tombent", () => {
    // Ce que la passe refuse de faire : alléger le contrat pour tenir dans le
    // transport. Les propriétés et les types survivent à tous les niveaux.
    for (const n of niveaux) {
      const s = JSON.stringify(n.schema);
      for (const propriete of ["liste", "compte", "nom"]) expect(s, n.name).toContain(propriete);
      expect(compter(n.schema, "type"), n.name).toBe(compter(SCHEMA, "type"));
    }
  });
});
