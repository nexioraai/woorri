// CLIQUET — UNE FEUILLE GARDE UNE SORTIE VISIBLE : LA FLÈCHE NATIVE.
//
// HISTOIRE, en deux temps : DET-037 a posé un ✕ dessiné (demande propriétaire,
// capture Apple à l'appui) ; puis, JUGÉ À L'ÉCRAN le 2026-09-09, le ✕ a été
// RETIRÉ par le même propriétaire — la flèche native redevient l'unique
// sortie, standard et suffisante. Ce cliquet verrouille l'état ARBITRÉ :
//   1. une feuille est bien MODALE (elle monte du bas) ;
//   2. AUCUN contrôle de fermeture dessiné n'est émis (le ✕ ne revient pas
//      par accident) — et la flèche native n'est PAS supprimée ;
//   3. une feuille garde son en-tête (il porte la flèche), une carte sans
//      titre masque le sien.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emitProject } from "../src/emit-project.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOC = join(
  HERE, "..", "..", "..", "slices", "validation-appareil", "validation-appareil.air.json",
);

interface Ecran {
  id: string;
  presentation?: string;
  showsScreenTitle?: boolean;
  dismissLabel?: { locale: string; text: string }[];
}
const base = JSON.parse(readFileSync(DOC, "utf8")) as { screens: Ecran[] };
const feuilles = base.screens.filter((s) => s.presentation === "sheet");
const cartes = base.screens.filter((s) => s.presentation !== "sheet");

const nav = (doc: unknown): string =>
  emitProject(doc).files.get("navigation.tsx") ?? "";

// Options émises pour UN écran, isolées de la ligne qui les porte.
const optionsDe = (source: string, screenId: string): string =>
  new RegExp(`name="${screenId}"[^\\n]*\\n\\s*options=\\{\\{([^\\n]*)\\}\\}`).exec(source)?.[1] ?? "";

describe("cliquet — une feuille offre une sortie visible", () => {
  it("le document de l'appareil fournit bien de quoi discriminer", () => {
    expect(feuilles.length).toBeGreaterThan(0);
    expect(cartes.length).toBeGreaterThan(0);
  });

  it("chaque FEUILLE est émise MODALE", () => {
    const source = nav(base);
    for (const f of feuilles) {
      expect(optionsDe(source, f.id), f.id).toContain('presentation: "modal"');
    }
  });

  it("AUCUN ✕ dessiné, et la flèche native n'est PAS supprimée", () => {
    const source = nav(base);
    expect(source).not.toContain("FermerFeuille");
    expect(source).not.toContain("headerRight");
    expect(source).not.toContain("headerBackVisible");
  });

  it("CONTRÔLE NÉGATIF — une CARTE n'est pas modale", () => {
    const source = nav(base);
    for (const c of cartes) {
      expect(optionsDe(source, c.id), c.id).not.toContain("modal");
    }
  });

  it("une FEUILLE garde son en-tête natif même sans titre", () => {
    const source = nav(base);
    const sansTitre = feuilles.filter((f) => f.showsScreenTitle === false);
    expect(sansTitre.length).toBeGreaterThan(0);
    for (const f of sansTitre) {
      const o = optionsDe(source, f.id);
      // Titre VIDE, et surtout : l'en-tête n'est PAS masqué.
      expect(o, f.id).toContain('title: ""');
      expect(o, f.id).not.toContain("headerShown: false");
    }
  });

  it("CONTRÔLE NÉGATIF — une CARTE sans titre masque bien son en-tête", () => {
    // Sans ce contrôle, un émetteur qui n'masquerait plus jamais l'en-tête
    // passerait le test précédent sans rien prouver.
    const source = nav(base);
    const carteSansTitre = cartes.filter((c) => c.showsScreenTitle === false);
    expect(carteSansTitre.length).toBeGreaterThan(0);
    for (const c of carteSansTitre) {
      expect(optionsDe(source, c.id), c.id).toContain("headerShown: false");
    }
  });
});
