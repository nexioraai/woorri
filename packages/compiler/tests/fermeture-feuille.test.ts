// CLIQUET — UNE FEUILLE OFFRE UNE SORTIE VISIBLE, ET SON MOT VIENT DU DOCUMENT.
//
// Défaut RÉEL vu à l'écran (SM-A175F, 2026-09-09) : la feuille de connexion
// montait du bas et RIEN n'indiquait comment en sortir — pas d'en-tête, pas de
// signe. iOS fournit le glissement vers le bas ; Android ne fournit rien pour
// une pile native. La demande du propriétaire, capture Apple à l'appui, était
// explicite : « tirer vers le bas pour fermer ou cliqué x en haut à droite ».
//
// Trois faits verrouillés, chacun avec son contrôle négatif :
//   1. une feuille GARDE son en-tête natif (c'est lui qui porte le ✕), même
//      quand le document refuse le titre — sinon le contrôle n'a nulle part
//      où se poser, précisément sur les écrans qui en ont le plus besoin ;
//   2. le contrôle est ÉMIS pour une feuille, et pour elle seule ;
//   3. le mot annoncé vient du DOCUMENT (F3) — absent du document, absent de
//      l'artefact : le moteur n'écrit aucun mot à sa place.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emitProject } from "../src/emit-project.ts";
import { EMBEDDED_ASSETS } from "../src/embedded-assets.generated.ts";

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

  it("chaque FEUILLE émet son contrôle de fermeture", () => {
    const source = nav(base);
    for (const f of feuilles) {
      expect(optionsDe(source, f.id), f.id).toContain("<FermerFeuille");
    }
  });

  it("CONTRÔLE NÉGATIF — aucune CARTE n'en reçoit", () => {
    const source = nav(base);
    for (const c of cartes) {
      expect(optionsDe(source, c.id), c.id).not.toContain("FermerFeuille");
    }
  });

  it("une feuille n'offre QU'UNE sortie : le ✕, jamais la flèche de retour", () => {
    // Vu à l'écran au premier build : la pile native dessinait sa flèche de
    // retour À GAUCHE pendant que le ✕ s'affichait à droite. Deux contrôles
    // pour un seul geste — la demande était d'en avoir un.
    const source = nav(base);
    for (const f of feuilles) {
      expect(optionsDe(source, f.id), f.id).toContain("headerBackVisible: false");
    }
  });

  it("CONTRÔLE NÉGATIF — une CARTE garde sa flèche de retour", () => {
    const source = nav(base);
    for (const c of cartes) {
      expect(optionsDe(source, c.id), c.id).not.toContain("headerBackVisible");
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

describe("cliquet — F3 : le mot vient du document, jamais du moteur", () => {
  it("le libellé émis est EXACTEMENT celui du document", () => {
    const source = nav(base);
    for (const f of feuilles.filter((s) => s.dismissLabel !== undefined)) {
      const mot = f.dismissLabel?.[0]?.text ?? "";
      expect(mot.length).toBeGreaterThan(0);
      expect(optionsDe(source, f.id), f.id).toContain(`label=${JSON.stringify(mot)}`);
    }
  });

  it("CONTRÔLE NÉGATIF — sans déclaration, AUCUN libellé n'est inventé", () => {
    const sansMot = {
      ...base,
      screens: base.screens.map((s) => {
        if (s.presentation !== "sheet") return s;
        const copie = { ...s };
        delete copie.dismissLabel;
        return copie;
      }),
    };
    const source = nav(sansMot);
    for (const f of feuilles) {
      const o = optionsDe(source, f.id);
      // Le contrôle est toujours là — la sortie reste possible…
      expect(o, f.id).toContain("<FermerFeuille");
      // …mais aucun mot n'est annoncé à sa place.
      expect(o, f.id).not.toContain("label=");
    }
  });

  it("le composant embarqué n'écrit lui-même aucun mot", () => {
    const source = EMBEDDED_ASSETS["lib/runtime/fermer-feuille.tsx"] ?? "";
    expect(source.length).toBeGreaterThan(0);
    // Il REÇOIT un libellé, il n'en fabrique pas.
    expect(source).toContain("accessibilityLabel={label}");
    // Les seuls littéraux du CODE (hors commentaires) restent techniques :
    // aucune chaîne porteuse d'espace ou de diacritique latin.
    const code = source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const litteraux = [...code.matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)].map((m) => m[1] ?? m[2] ?? "");
    expect(litteraux.filter((l) => /[ À-ɏ…]/.test(l))).toEqual([]);
  });
});
