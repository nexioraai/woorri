// EP-132 · CLIQUET — LA LEÇON D'EP-131 APPLIQUÉE D'AVANCE.
//
// « Corriger un étage ne ferme pas une famille » : DET-017 avait retiré le
// titre de `ScreenShell`, il est revenu par le bloc d'en-tête. La question à
// poser après toute correction est donc : PAR QUEL AUTRE CHEMIN le même
// défaut pourrait-il entrer ?
//
// Ici le chemin est visible : tout endroit qui rend un média sans passer par
// la décision. Il y en avait DEUX — la primitive d'image, et la carte de
// grille, qui portait son propre `<Image>`. Ce test les tient tous les deux
// et interdit le troisième.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../src");

describe("EP-132 · aucun média rendu hors de la décision", () => {
  it("chaque <Image> est précédé d'un appel à decisionMedia dans son fichier", () => {
    for (const f of readdirSync(SRC)) {
      if (!f.endsWith(".tsx")) continue;
      const code = readFileSync(join(SRC, f), "utf8");
      const images = (code.match(/<Image\b/g) ?? []).length;
      if (images === 0) continue;
      const decisions = (code.match(/decisionMedia\(/g) ?? []).length;
      expect(decisions, `${f} rend ${String(images)} média(s)`).toBeGreaterThanOrEqual(images);
    }
  });

  it("aucun <Image> sans onError : un échec silencieux est un rectangle vide", () => {
    for (const f of readdirSync(SRC)) {
      if (!f.endsWith(".tsx")) continue;
      const code = readFileSync(join(SRC, f), "utf8");
      for (const bloc of code.split(/<Image\b/).slice(1)) {
        const balise = bloc.slice(0, bloc.indexOf("/>"));
        expect(balise.includes("onError"), `${f} : un <Image> sans onError`).toBe(true);
      }
    }
  });
});
