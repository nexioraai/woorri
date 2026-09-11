// (3) RE-JUGEMENT DE LA SÉRIE ARCHIVÉE contre le contrat CORRIGÉ (post-D6
// O-1 + invariant O-2 + D6 payer) — la matrice ÉPINGLÉE telle qu'elle est
// sortie, pas telle qu'on l'aurait préférée : les TROIS tirages portent
// une transition déclenchée par une lecture → T2 REPASSE AU ROUGE. Le vert
// pré-D6 était partiellement dû au trou O-2 — c'est le résultat annoncé
// comme souhaitable : le contrat corrigé est PLUS STRICT que celui qui
// avait donné le vert.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { jugerSortieP0 } from "../../../benchmarks/air-emission/passe0.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const DOSSIER = join(R, "benchmarks", "air-emission", "results");

describe("matrice de re-jugement (archives scellées, contrat courant)", () => {
  const archives = readdirSync(DOSSIER).filter((f) => f.startsWith("dry-run-p0.")).sort();
  it("les trois archives existent — la série est le témoin de variance R8", () => {
    expect(archives).toHaveLength(3);
  });
  it("MATRICE — pré-D6 : FAIL·PASS·PASS ; post-D6+O-2 : FAIL·FAIL·FAIL (transition par lecture)", () => {
    const attendus = [
      { avant: "FAIL", apres: "FAIL" },
      { avant: "PASS", apres: "FAIL" },
      { avant: "PASS", apres: "FAIL" },
    ];
    // Le brief kaviva, tel qu'archivé dans la campagne (données de test).
    const brief = "institut de beauté — brief kaviva (l'observation 2.3 n'entre pas dans ce verdict)";
    for (const [i, f] of archives.entries()) {
      const a = JSON.parse(readFileSync(join(DOSSIER, f), "utf8")) as {
        sortieBrute: string;
        verdict: { ok: boolean; critereKaviva?: { pass: boolean } };
      };
      const avant = a.verdict.ok && a.verdict.critereKaviva?.pass === true ? "PASS" : "FAIL";
      const v = jugerSortieP0(a.sortieBrute, brief);
      const apres = v.ok && v.critereKaviva?.pass === true ? "PASS" : "FAIL";
      expect(avant, `tirage ${String(i + 1)} avant`).toBe(attendus[i]?.avant);
      expect(apres, `tirage ${String(i + 1)} après`).toBe(attendus[i]?.apres);
      // La cause du rouge est NOMMÉE : la transition par lecture, pas autre chose.
      expect(v.diagnostics.map((d) => d.code)).toContain("MODELE_TRANSITION_DECLENCHEE_PAR_LECTURE");
    }
  });
});
