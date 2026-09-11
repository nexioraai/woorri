// F3 (confrontation #9, 2026-09-11) — LE TEXTE LIBRE MEURT À P0.
//
// Le seul texte libre du système : le brief (campagne) et sa copie AIR
// `intent.request`. Ce cliquet STATIQUE échoue si un module moteur ou une
// dérivation se met à LIRE ce texte — c'est la moitié mécanisable
// AUJOURD'HUI du test de suppression ; l'autre moitié (produire le modèle,
// retirer le brief, re-dériver, comparer les plans) est inscrite comme
// CRITÈRE DE FERMETURE DE R2 (les dérivations P2 n'existent pas encore).
//
// État MESURÉ à l'écriture : aucun module moteur ne lit `intent.request`
// (une seule occurrence, en commentaire, dans fidelity/intent.ts ; la
// définition du schéma dans air.ts n'est pas une lecture).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");

const PAQUETS_MOTEUR = [
  "compiler", "fidelity", "blocks", "primitives",
  "execution-contract", "capability-registry", "repair",
];

function sourcesSous(racine: string): string[] {
  const out: string[] = [];
  const marcher = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) marcher(p);
      else if (/\.(ts|tsx|mjs)$/.test(e) && !e.endsWith(".d.mts")) out.push(p);
    }
  };
  marcher(racine);
  return out;
}

const sansCommentaires = (src: string) =>
  src
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");

describe("F3 — aucun lecteur du texte libre après P0", () => {
  it("aucun paquet MOTEUR ne lit `intent.request` (le seul texte libre de l'AIR)", () => {
    for (const paquet of PAQUETS_MOTEUR) {
      for (const f of sourcesSous(join(R, "packages", paquet, "src"))) {
        const code = sansCommentaires(readFileSync(f, "utf8"));
        expect(code.includes("intent.request"), f).toBe(false);
        expect(code.includes(".requestLocale"), f).toBe(false);
      }
    }
  });

  it("les DÉRIVATIONS ne connaissent ni brief, ni intentions, ni texte de demande", () => {
    for (const module of ["obligations-passes.mjs", "modele-metier.mjs"]) {
      const code = sansCommentaires(
        readFileSync(join(R, "benchmarks", "air-emission", module), "utf8"),
      );
      for (const interdit of ["INTENTIONS", "intention.text", "DEMANDE DU CLIENT", "intent.request"]) {
        expect(code.includes(interdit), `${module} lit « ${interdit} »`).toBe(false);
      }
      // Pureté : aucune E/S — le modèle entre, des artefacts sortent.
      expect(code.includes("node:fs"), module).toBe(false);
      expect(code.includes("fetch("), module).toBe(false);
    }
  });

  it("le runtime embarqué ignore jusqu'à l'existence du brief", () => {
    // Les copies embarquées sont ce que l'app EXÉCUTE : le texte libre n'y
    // a aucune existence — ni le champ, ni la section intent.
    const embarque = readFileSync(
      join(R, "packages", "compiler", "src", "embedded-assets.generated.ts"),
      "utf8",
    );
    expect(embarque.includes("intent.request")).toBe(false);
  });
});
