// EP-151 — LA SIXIÈME OCCURRENCE : deux listes portant la même information.
//
// L'échelle de dégradation et les contraintes du dialecte se déclaraient
// séparément. Le dialecte en nommait trois, le premier niveau en honorait
// deux — et la troisième coûtait un appel refusé par segment, invisible tant
// qu'on ne lisait pas les deux listes côte à côte.
import { describe, expect, it } from "vitest";
import {
  CONTRAINTES_GRAMMAIRE,
  degradationsPourEchelle,
  degraderGrammaire,
} from "../../../benchmarks/air-emission/adaptateur-anthropic.mjs";
import { incompatibilitesDe, makeLevels } from "../../../benchmarks/air-emission/schema-levels.mjs";

import { requis } from "./helpers.ts";
const compter = (o: unknown, clef: string): number => {
  if (Array.isArray(o)) return o.reduce<number>((a, x) => a + compter(x, clef), 0);
  if (o !== null && typeof o === "object") {
    return Object.entries(o).reduce<number>((a, [k, v]) => a + (k === clef ? 1 : 0) + compter(v, clef), 0);
  }
  return 0;
};

const SCHEMA = {
  type: "object",
  properties: {
    liste: { type: "array", minItems: 3, maxItems: 12, items: { type: "string", pattern: "^[a-z]+$" } },
    compte: { type: "integer", minimum: 1, maximum: 99, multipleOf: 1 },
    nom: { type: "string", minLength: 2, maxLength: 40 },
  },
} as const;

describe("EP-151 · LE CLIQUET — toute contrainte déclarée est honorée au PREMIER niveau", () => {
  it("chaque incompatibilité du dialecte a disparu du niveau 0", () => {
    // C'est LE test que la passe devait produire : il aurait vu, avant le run
    // EP-150, que les bornes numériques étaient déclarées et non appliquées.
    const [niveau0] = degradationsPourEchelle(SCHEMA) as { name: string; schema: unknown }[];
    const { clefs } = incompatibilitesDe(CONTRAINTES_GRAMMAIRE) as { clefs: string[] };
    expect(clefs.length).toBeGreaterThan(0);
    for (const clef of clefs) {
      expect(compter(requis(niveau0, "niveau0").schema, clef), `« ${clef} » déclarée incompatible, encore présente`).toBe(0);
    }
  });

  it("le clamp déclaré est appliqué lui aussi", () => {
    const [niveau0] = degradationsPourEchelle(SCHEMA) as { schema: unknown }[];
    if (CONTRAINTES_GRAMMAIRE.minItemsMax === 1) {
      const restants = JSON.stringify(requis(niveau0, "niveau0").schema).match(/"minItems":([2-9]|\d\d)/g) ?? [];
      expect(restants).toEqual([]);
    }
  });

  it("LES DEUX CHEMINS dérivent de la MÊME source — plus de seconde liste", () => {
    // `degraderGrammaire` et l'échelle traitaient les incompatibilités chacun
    // de son côté. Ils lisent désormais la même déclaration.
    const { grammaire } = degraderGrammaire(SCHEMA) as { grammaire: unknown };
    const [niveau0] = degradationsPourEchelle(SCHEMA) as { schema: unknown }[];
    const { clefs } = incompatibilitesDe(CONTRAINTES_GRAMMAIRE) as { clefs: string[] };
    for (const clef of clefs) {
      expect(compter(grammaire, clef), `grammaire canonique · ${clef}`).toBe(0);
      expect(compter(requis(niveau0, "niveau0").schema, clef), `niveau 0 · ${clef}`).toBe(0);
    }
  });

  it("l'échelle REFUSE de deviner : sans contraintes, elle jette", () => {
    // Sans cela, un appelant distrait recréerait la seconde liste par défaut.
    // Le cast est délibéré : on simule un appelant JavaScript distrait, que le
    // type empêche en TypeScript mais que rien n'arrête au banc.
    expect(() => makeLevels(SCHEMA, undefined as unknown as { minItemsMax: number })).toThrow(/EP-151/);
  });

  it("une contrainte AJOUTÉE au dialecte est honorée sans toucher à l'échelle", () => {
    // La preuve que la dérivation tient : on déclare, et le niveau 0 suit.
    const { clefs } = incompatibilitesDe({
      minItemsMax: 1,
      bornesNumeriquesEntiers: false,
      maxItemsSupporte: false,
    }) as { clefs: string[] };
    expect(clefs).toContain("maxItems");
    expect(clefs).toContain("maximum");
    expect(clefs).toContain("multipleOf");
  });
});

describe("EP-151 · l'échelle garde son rôle, et rien de plus", () => {
  const niveaux = degradationsPourEchelle(SCHEMA) as { name: string; schema: unknown }[];

  it("trois niveaux : compatibilité, puis complexité en deux temps", () => {
    expect(niveaux.map((n) => n.name)).toEqual([
      "incompatibilites-connues",
      "sans-longueurs",
      "sans-patterns",
    ]);
  });

  it("les motifs partent EN DERNIER — ils portent le plus de sens", () => {
    expect(compter(requis(niveaux[0], "niveaux0").schema, "pattern")).toBe(1);
    expect(compter(requis(niveaux[1], "niveaux1").schema, "pattern")).toBe(1);
    expect(compter(requis(niveaux[2], "niveaux2").schema, "pattern")).toBe(0);
  });

  it("AUCUN niveau ne touche à la structure — le contrat ne paie pas le transport", () => {
    for (const n of niveaux) {
      const s = JSON.stringify(n.schema);
      for (const propriete of ["liste", "compte", "nom"]) expect(s, n.name).toContain(propriete);
    }
  });
});
