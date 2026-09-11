// ÉTAPE ④ (mission Elite A++++, 2026-09-11) — VALIDATION AVANT ÉMISSION.
//
// EP-004 : `validerPlan` ne vivait qu'en campagne — `emitProject` pouvait
// émettre un plan incohérent. Désormais le VRAI chemin est :
// document → plan → validation du plan → émission. La sévérité appartient
// au DIAGNOSTIC (aucun drapeau d'appelant) : `bloquant` refuse l'émission,
// `qualite` reste la barre de la campagne payante — mesuré sur corpus réel,
// 21 documents gelés portent des défauts qualité et DOIVENT rester émissibles.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrateAirDocument, projectAirSchema } from "@deribfy/air-schema";
import { emitProject } from "../src/emit-project.ts";
import { planifierComposition, validerPlan } from "../src/plan-composition.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const lireAir = (rel: string) =>
  projectAirSchema.parse(
    migrateAirDocument(
      JSON.parse(readFileSync(join(HERE, "..", "..", "..", rel), "utf8")) as Record<string, unknown>,
    ),
  );

describe("étape ④ — aucune émission d'un plan incohérent", () => {
  it("un chrome DUPLIQUÉ refuse l'émission (EMIT_PLAN_INVALIDE)", () => {
    const air = lireAir("slices/marketa/marketa.air.json");
    const ecranRecherche = air.screens.find((s) =>
      s.blocks.some((b) => b.blockType === "search_entry"),
    );
    expect(ecranRecherche).toBeDefined();
    const double = {
      ...air,
      screens: air.screens.map((s) =>
        s.id === ecranRecherche?.id
          ? {
              ...s,
              blocks: [
                ...s.blocks,
                {
                  ...s.blocks.find((b) => b.blockType === "search_entry"),
                  id: "blk_double_recherche",
                } as (typeof s.blocks)[number],
              ],
            }
          : s,
      ),
    };
    expect(() => emitProject(double)).toThrow(/EMIT_PLAN_INVALIDE.*PLAN_CHROME_DUPLIQUE/s);
  });

  it("NON-RÉGRESSION — un document GELÉ à défauts qualité reste émissible", () => {
    // dougplace porte PLAN_APERCU_SANS_SUITE (mesuré, antérieur à 1.21) :
    // défaut de QUALITÉ, refusé en campagne, jamais un motif d'inémission.
    const air = lireAir("slices/dougplace/dougplace.air.json");
    const diags = validerPlan(planifierComposition(air));
    expect(diags.some((d) => d.severite === "qualite")).toBe(true);
    expect(diags.some((d) => d.severite === "bloquant")).toBe(false);
    const { files } = emitProject(air);
    expect(files.size).toBeGreaterThan(50);
  });

  it("CLIQUET — chaque diagnostic du plan porte sa sévérité, sans troisième valeur", () => {
    const air = lireAir("slices/dougplace/dougplace.air.json");
    for (const d of validerPlan(planifierComposition(air))) {
      expect(["bloquant", "qualite"]).toContain(d.severite);
    }
  });

  it("CLIQUET — aucun drapeau d'appelant ne contourne la validation", () => {
    const source = readFileSync(join(HERE, "..", "src", "emit-project.ts"), "utf8");
    // La validation est inconditionnelle : pas d'option, pas d'env, pas de
    // garde autour de l'appel à validerPlan.
    expect(source).toContain("validerPlan(plan)");
    expect(/options\.[a-zA-Z]*[Pp]lan|process\.env/.test(source)).toBe(false);
  });

  it("CLIQUET — la campagne payante garde la barre HAUTE (qualité comprise)", () => {
    const emitV3 = readFileSync(
      join(HERE, "..", "..", "..", "benchmarks", "air-emission", "emit-v3.mjs"),
      "utf8",
    );
    expect(emitV3).toContain("validerPlan(");
    // Le chemin campagne ne filtre PAS par sévérité : tout diagnostic refuse.
    expect(emitV3.includes('severite === "bloquant"')).toBe(false);
  });
});
