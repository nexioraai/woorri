// ÉTAPE ① (mission Elite A++++, 2026-09-11) — SCELLER PLAN → RUNTIME.
//
// EP-001 : `modeListe`/`tailleApercu` étaient calculés DEUX fois — par le
// planner à l'émission ET par le runtime au rendu. Deux calculs d'une même
// décision, convergence non contractuelle : le jour où l'un change sans
// l'autre, l'app rend autre chose que ce que le plan a validé.
//
// Le contrat scellé ici : le planner DÉCIDE, `screens/*.data.ts` TRANSPORTE
// (`composition`), le runtime LIT. Ces tests prouvent les trois maillons et
// cliquettent l'interdiction de reconstruire.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrateAirDocument, projectAirSchema } from "@deribfy/air-schema";
import { emitProject } from "../src/emit-project.ts";
import { planifierComposition } from "../src/plan-composition.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOUGPLACE = join(HERE, "..", "..", "..", "slices", "dougplace", "dougplace.air.json");

// Document RÉEL (archétype marketplace) : accueil-fleuve + catalogue-fenêtre.
// Le même chemin fail-closed que la production juge ce document.
// Parse par le SCHÉMA (même juge que la production) — typé, pas de `any`.
const AIR = projectAirSchema.parse(
  migrateAirDocument(JSON.parse(readFileSync(DOUGPLACE, "utf8")) as Record<string, unknown>),
);

function donneesEcran(files: ReadonlyMap<string, string>, screenId: string) {
  const source = files.get(`screens/${screenId}.data.ts`);
  expect(source).toBeDefined();
  const m = /export const screenData: AirScreenData = (.*);\n$/s.exec(source ?? "");
  expect(m).not.toBeNull();
  return JSON.parse(m?.[1] ?? "null") as {
    composition: {
      role: string;
      defile: boolean;
      sections: Record<string, { zone: string; mode?: string; apercu?: number }>;
    };
  };
}

describe("étape ① — le plan est transporté jusqu'au runtime", () => {
  const { files } = emitProject(AIR);
  const plan = planifierComposition(AIR);

  it("chaque écran émis transporte EXACTEMENT la décision du planner", () => {
    for (const ecran of plan.ecrans) {
      const data = donneesEcran(files, ecran.screenId);
      expect(data.composition.role).toBe(ecran.role);
      expect(data.composition.defile).toBe(ecran.defile);
      for (const section of ecran.sections) {
        const transporte = data.composition.sections[section.blockId];
        expect(transporte, `${ecran.screenId}.${section.blockId}`).toBeDefined();
        expect(transporte?.zone).toBe(section.zone);
        expect(transporte?.mode).toBe(section.mode);
        expect(transporte?.apercu).toBe(section.apercu);
      }
    }
  });

  it("chaque liste transportée porte un mode ; un aperçu porte sa taille", () => {
    // Le runtime REFUSE une liste sans décision (AIR_RUNTIME_COMPOSITION_MISSING) :
    // l'émission doit donc toujours la fournir — vérifié sur le document réel.
    for (const ecran of plan.ecrans) {
      const data = donneesEcran(files, ecran.screenId);
      for (const section of ecran.sections) {
        if (section.blockType !== "list") continue;
        const transporte = data.composition.sections[section.blockId];
        expect(transporte?.mode).toBeDefined();
        if (transporte?.mode === "apercu") {
          expect(typeof transporte.apercu).toBe("number");
        }
      }
    }
  });

  it("CLIQUET — le runtime embarqué ne reconstruit plus la décision", () => {
    const runtime = files.get("lib/runtime/air-runtime.tsx") ?? "";
    expect(runtime.length).toBeGreaterThan(0);
    // Ni le calcul du mode ni celui de la taille d'aperçu n'existent côté
    // runtime : la seule source est `screen.composition` (plan transporté).
    expect(runtime.includes("modeListe")).toBe(false);
    expect(runtime.includes("tailleApercu")).toBe(false);
    expect(runtime.includes("screen.composition")).toBe(true);
    expect(runtime.includes("AIR_RUNTIME_COMPOSITION_MISSING")).toBe(true);
  });

  it("CLIQUET — un écran hors plan est un refus net, pas un repli", () => {
    // Le repli silencieux `?? { role: "page", … }` a été supprimé : si le
    // planner ne couvre pas un écran, l'émission doit refuser (pipeline), pas
    // inventer une décision par défaut. Prouvé par lecture du source émetteur.
    const source = readFileSync(join(HERE, "..", "src", "emit-project.ts"), "utf8");
    expect(source.includes("EMIT_PLAN_ECRAN_MANQUANT")).toBe(true);
    expect(/plan\.ecrans\.find\([^)]*\) \?\? \{/.test(source)).toBe(false);
  });
});
