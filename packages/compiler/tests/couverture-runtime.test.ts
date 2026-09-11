// CLIQUET — LA CHAÎNE registre → émission → imports → runtime EST FERMÉE.
//
// Classe de défaut MESURÉE (SearchEntryBlock, 2026-09-10) : un bloc
// enregistré, émis, utilisé par le runtime — et ABSENT de son import. Le
// typecheck du paquet ne couvre pas runtime/ ; seul le tsc de l'app émise
// l'attrapait, après un build annulé. Ce cliquet ferme la chaîne pour TOUT
// bloc, présent et futur — pas un test « SearchEntryBlock » de plus.
import { describe, expect, it } from "vitest";
import { BLOCKS } from "../../blocks/src/definitions.ts";
import { WRAPPER_BY_BLOCK_TYPE } from "../src/emit-project.ts";
import { EMBEDDED_ASSETS } from "../src/embedded-assets.generated.ts";

const RUNTIME = EMBEDDED_ASSETS["lib/runtime/air-runtime.tsx"] ?? "";
const COMPONENTS = EMBEDDED_ASSETS["lib/blocks/components.tsx"] ?? "";

describe("couverture runtime — la chaîne est fermée maillon par maillon", () => {
  it("① chaque bloc du registre a son wrapper d'émission — et réciproquement", () => {
    const registre = new Set(BLOCKS.map((b) => b.id));
    const cables = new Set(Object.keys(WRAPPER_BY_BLOCK_TYPE));
    expect([...registre].sort()).toEqual([...cables].sort());
  });

  it("② chaque wrapper émis EXISTE dans le runtime embarqué", () => {
    for (const wrapper of Object.values(WRAPPER_BY_BLOCK_TYPE)) {
      expect(RUNTIME, wrapper).toContain(`export function ${wrapper}(`);
    }
  });

  it("③ tout composant de bloc UTILISÉ par le runtime est IMPORTÉ par lui", () => {
    // Le maillon exact qui a cassé : utilisé sans être importé.
    const imported = /import\s*\{([^}]*)\}\s*from\s*"\.\.\/blocks\/components"/.exec(RUNTIME)?.[1] ?? "";
    const noms = new Set(imported.split(",").map((x) => x.trim()).filter(Boolean));
    const utilises = new Set([...RUNTIME.matchAll(/<([A-Z][A-Za-z]*Block)\b/g)].map((m) => m[1] ?? ""));
    for (const u of utilises) {
      expect(noms.has(u), `${u} utilisé par le runtime sans import`).toBe(true);
    }
    expect(utilises.size).toBeGreaterThan(4);
  });

  it("④ tout composant importé par le runtime est EXPORTÉ par les blocs embarqués", () => {
    const imported = /import\s*\{([^}]*)\}\s*from\s*"\.\.\/blocks\/components"/.exec(RUNTIME)?.[1] ?? "";
    for (const nom of imported.split(",").map((x) => x.trim()).filter((x) => x.endsWith("Block"))) {
      expect(COMPONENTS, nom).toContain(`export function ${nom}(`);
    }
  });

  it("CONTRÔLE NÉGATIF — la sonde ③ VOIT un usage non importé", () => {
    const faux = RUNTIME + "\nconst x = <FantomeBlock />;";
    const utilises = new Set([...faux.matchAll(/<([A-Z][A-Za-z]*Block)\b/g)].map((m) => m[1] ?? ""));
    expect(utilises.has("FantomeBlock")).toBe(true);
    const imported = /import\s*\{([^}]*)\}\s*from\s*"\.\.\/blocks\/components"/.exec(faux)?.[1] ?? "";
    expect(imported.includes("FantomeBlock")).toBe(false);
  });
});
