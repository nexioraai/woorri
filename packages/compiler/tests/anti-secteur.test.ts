// C7 (confrontation #12) — ANTI-SECTORIALITÉ.
//
// Dérivations : PROUVÉ (agnostic.test + audits + suppression-texte).
// P0/prompt : les références sectorielles DÉCISIONNELLES de la règle 19
// (table Restaurant/Boutique/Réservation → destinations) et de la règle 25
// (liste de domaines de référence) sont RETIRÉES — ce cliquet interdit leur
// retour. L'ABLATION DYNAMIQUE (prompt A vs B sur génération réelle) coûte
// des appels payants : P0 anti-sectoriel reste UNKNOWN tant qu'elle n'a pas
// été exécutée (R8) — ce test n'en prétend PAS la preuve.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");

describe("C7 — aucun routeur sectoriel dans les chemins décisionnels", () => {
  it("le prompt du générateur ne porte plus de table secteur → destinations", () => {
    const src = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    // La table retirée (règle 19) ne doit pas revenir, sous aucune graphie.
    expect(src).not.toMatch(/·\s*Restaurant\s*:/);
    expect(src).not.toMatch(/·\s*Boutique\s*:/);
    expect(src).not.toMatch(/·\s*Réservation\s*:/);
    // La liste de domaines de la règle 25 non plus.
    expect(src).not.toContain("catalogue, marketplace, restauration, livraison, réservation");
    // La règle 19 raisonne désormais en STRUCTURE (racines de parcours).
    expect(src).toContain("RACINE d'un parcours");
  });

  it("les DÉRIVATIONS ne contiennent aucun nom de secteur", () => {
    for (const module of ["modele-metier.mjs", "obligations-passes.mjs"]) {
      const src = readFileSync(join(R, "benchmarks", "air-emission", module), "utf8")
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
        .join("\n");
      for (const secteur of [
        "marketplace", "restaurant", "reservation", "réservation", "boutique",
        "social", "education", "éducation", "livraison", "automobile", "saas",
        "hotel", "hôtel", "immobilier",
      ]) {
        expect(src.toLowerCase().includes(secteur), `${module}: « ${secteur} »`).toBe(false);
      }
    }
  });

  it("le MOTEUR ne contient aucun nom d'application générée dans ses décisions", () => {
    for (const paquet of ["compiler", "execution-contract", "fidelity", "blocks"]) {
      const grep = ["dougplace", "marketa", "kaviva"];
      const marcher = (d: string): string[] => {
        return readdirSync(d).flatMap((e) => {
          const p = join(d, e);
          // Les fichiers GÉNÉRÉS embarquent des sources en chaînes (leurs
          // commentaires y sont indissociables du code) — leurs SOURCES,
          // elles, sont scannées ; le miroir généré est exclu.
          if (e.endsWith(".generated.ts")) return [];
          return statSync(p).isDirectory() ? marcher(p) : /\.(ts|tsx)$/.test(e) ? [p] : [];
        });
      };
      for (const f of marcher(join(R, "packages", paquet, "src"))) {
        const code = readFileSync(f, "utf8")
          .split("\n")
          .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
          .join("\n")
          .toLowerCase();
        for (const nom of grep) expect(code.includes(nom), `${f}: ${nom}`).toBe(false);
      }
    }
  });
});
