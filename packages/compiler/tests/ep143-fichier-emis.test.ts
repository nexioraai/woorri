// EP-143 · CLIQUET D'ÉMISSION — le fichier est LIVRÉ, pas seulement calculé.
//
// La dernière porte par laquelle une obligation resterait dans le moteur :
// être dérivée, être rendue… et ne jamais sortir avec l'application.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyAirMigrations, AIR_MIGRATIONS } from "@deribfy/air-schema";
import { emitProject } from "../src/emit-project.ts";

import { requis } from "./helpers.ts";
const R = join(import.meta.dirname, "..", "..", "..");
const charger = (f: string): unknown =>
  applyAirMigrations(
    JSON.parse(readFileSync(join(R, "benchmarks", "air-emission", "results", f), "utf8")),
    AIR_MIGRATIONS,
  );

// DEUX TAILLES : 16 écrans et 23 écrans, deux domaines.
const PETIT = charger("kaviva-spa.2026-09-11T23-00-50-047Z.attempt2.air.json");
const GRAND = charger("marketplace-africain.2026-09-12T15-27-32-324Z.attempt2.air.json");

describe("EP-143 · le fichier sort avec l'application", () => {
  it("PUBLICATION.md figure parmi les fichiers émis, sur les deux tailles", () => {
    for (const [nom, doc] of [["petit", PETIT], ["grand", GRAND]] as const) {
      const { files } = emitProject(doc);
      expect(files.has("PUBLICATION.md"), nom).toBe(true);
      expect(requis(files.get("PUBLICATION.md"), "files.getPUBLICATION.md").length, nom).toBeGreaterThan(400);
    }
  });

  it("il est à la RACINE — celui qui ouvre le dossier doit le voir", () => {
    const { files } = emitProject(GRAND);
    expect([...files.keys()].filter((f) => f.endsWith("PUBLICATION.md")))
      .toEqual(["PUBLICATION.md"]);
  });

  it("son contenu est celui de CETTE application, pas un texte générique", () => {
    const petit = requis(emitProject(PETIT).files.get("PUBLICATION.md"), "emitProjectPETIT.files.getPUBLICATION.md");
    const grand = requis(emitProject(GRAND).files.get("PUBLICATION.md"), "emitProjectGRAND.files.getPUBLICATION.md");
    expect(petit).not.toBe(grand);
    // Chacun nomme son application.
    expect(petit).toContain("Publier «");
    expect(grand).toContain("Publier «");
  });

  it("l'émission est DÉTERMINISTE — deux passages, même octet", () => {
    expect(emitProject(GRAND).files.get("PUBLICATION.md"))
      .toBe(emitProject(GRAND).files.get("PUBLICATION.md"));
  });
});
