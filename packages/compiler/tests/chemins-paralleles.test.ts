// ÉTAPE ⑥ (mission Elite A++++, 2026-09-11) — UNE CHAÎNE OFFICIELLE.
//
// EP-006 : `construire-fixture` (constructeur parallèle de document, 2
// destructions mesurées DET-031) est NEUTRALISÉ — l'exécuter refuse, seul
// l'import de ses constantes reste permis. EP-007 : les 6 générateurs
// historiques sont ARCHIVÉS dans attic/ (aucun consommateur vivant,
// démontré par grep avant le geste). EP-012 : l'écriture d'app passe par
// l'écrivain UNIQUE (élagage compris) partout où le patron ne wipe pas déjà.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");

describe("étape ⑥ — les chemins parallèles sont neutralisés", () => {
  it("CLIQUET — construire-fixture REFUSE l'exécution et n'écrit plus rien", () => {
    const source = readFileSync(
      join(R, "slices", "validation-appareil", "construire-fixture.mjs"),
      "utf8",
    );
    expect(source).toContain("NEUTRALISÉ");
    expect(source).toContain("process.exit(1)");
    expect(source).not.toContain("writeFileSync");
  });

  it("CLIQUET — les générateurs historiques vivent dans attic/, plus à la racine", () => {
    const racine = readdirSync(join(R, "benchmarks", "air-emission"));
    for (const legacy of [
      "emit.mjs", "emit-v2.mjs", "emit-slice2.mjs",
      "replay-roundtrip.mjs", "replay-v2.mjs", "simulate-fix-v2.mjs",
    ]) {
      expect(racine, legacy).not.toContain(legacy);
      expect(existsSync(join(R, "benchmarks", "air-emission", "attic", legacy)), legacy).toBe(true);
    }
    expect(existsSync(join(R, "benchmarks", "air-emission", "attic", "README.md"))).toBe(true);
    // La chaîne officielle, elle, reste à la racine.
    expect(racine).toContain("emit-v3.mjs");
  });

  it("CLIQUET — les scripts d'émission au patron simple passent par l'écrivain unique", () => {
    for (const script of [
      "slices/marketa/emettre.mjs",
      "slices/dougplace/emettre.mjs",
      "slices/marketplace-artisans/emettre.mjs",
      "slices/resto-riche/build-air.mjs",
    ]) {
      const source = readFileSync(join(R, script), "utf8");
      expect(source, script).toContain("ecrire-app.mjs");
      expect(source, script).not.toContain("mkdirSync(p.slice");
    }
    // Les scripts qui WIPENT leur app avant d'écrire sont immunisés contre la
    // classe EP-012 par construction — consigné, pas consolidé de force.
    for (const wipe of [
      "slices/validation-appareil/emettre.mjs",
      "slices/restaurant/run-slice.mjs",
      "slices/conteneurs/run-slice.mjs",
    ]) {
      const source = readFileSync(join(R, wipe), "utf8");
      expect(source, wipe).toContain("rmSync(");
    }
  });
});
