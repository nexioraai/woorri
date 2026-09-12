// EP-132 — LES TROIS MUTATIONS EXIGÉES, sur la DÉCISION elle-même.
//
// FORME DE LA PREUVE, DITE FRANCHEMENT : le harnais de rendu de ce dépôt ne
// se charge pas (react-native est distribué en Flow, le bundler de test le
// refuse — dette préexistante, hors périmètre). Aucun test ne peut donc
// monter un composant et observer un pixel. C'est précisément pourquoi la
// décision a été extraite du JSX : ce qui est décidé est prouvé ici en
// entier, et la primitive n'a plus qu'à obéir — ce que vérifie le cliquet
// de `media-sans-echec.test.ts`, qui interdit tout média rendu hors d'elle.
import { describe, expect, it } from "vitest";
import { decisionMedia } from "../src/media-repli.ts";

describe("EP-132 · un média joignable s'affiche normalement", () => {
  it("rend l'image, et rien d'autre", () => {
    const d = decisionMedia({ uri: "https://h.example/a.png", texte: "T", echec: false });
    expect(d).toEqual({ rend: "image", uri: "https://h.example/a.png" });
  });
});

describe("EP-132 · un média injoignable produit l'état prescrit", () => {
  it("rend le repli, porteur du texte que le document fournit déjà", () => {
    const d = decisionMedia({ uri: "https://h.example/a.png", texte: "T", echec: true });
    expect(d).toEqual({ rend: "repli", texte: "T" });
  });

  it("le repli ne peut pas inventer de texte — il ne porte que le document", () => {
    const d = decisionMedia({ uri: "https://h.example/a.png", texte: "", echec: true });
    // Le registre rend le champ de titre NON optionnel : ce cas ne devrait
    // pas exister. S'il survient, la place reste tenue, muette, jamais
    // remplie d'une phrase écrite par le moteur.
    expect(d).toEqual({ rend: "repli", texte: "" });
  });
});

describe("EP-132 · un écran sans média n'est pas affecté", () => {
  it("aucun média promis ⇒ aucun repli, même en cas d'échec", () => {
    expect(decisionMedia({ texte: "T", echec: false })).toEqual({ rend: "aucun" });
    expect(decisionMedia({ texte: "T", echec: true })).toEqual({ rend: "aucun" });
  });

  it("une valeur vide n'est pas un média manquant — comportement INCHANGÉ", () => {
    expect(decisionMedia({ uri: "", texte: "T", echec: false })).toEqual({ rend: "aucun" });
    expect(decisionMedia({ uri: "   ", texte: "T", echec: true })).toEqual({ rend: "aucun" });
  });
});
