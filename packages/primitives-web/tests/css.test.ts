import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { versCss, versTexteCss } from "../src/css.ts";

// ════════════════════════════════════════════════════════════════════
//  L'ADAPTATEUR DE STYLES — LA PIÈCE QUI SE PROUVE.
//
// Les composants web se regardent ; l'adaptateur se MESURE. C'est lui qui
// décide si une marge existe ou disparaît, et une marge qui disparaît sans
// message est le pire des deux mondes : la page s'affiche, et elle est fausse.
// ════════════════════════════════════════════════════════════════════

describe("un nombre devient une longueur", () => {
  it("les dimensions prennent des pixels", () => {
    // React Native lit `padding: 12` comme douze points. Le web lit `12`
    // comme une erreur et l'IGNORE EN SILENCE.
    expect(versCss({ padding: 12 })).toEqual({ padding: "12px" });
    expect(versCss({ fontSize: 17, borderRadius: 8 })).toEqual({
      fontSize: "17px",
      borderRadius: "8px",
    });
  });

  it("mais `flex`, `opacity` et `fontWeight` n'en prennent PAS", () => {
    // Ajouter une unité là où il n'en faut pas rend la déclaration invalide,
    // donc ignorée — et une propriété ignorée ne dit rien, elle se contente de
    // ne pas s'appliquer.
    expect(versCss({ flex: 1 })).toEqual({ flex: "1" });
    expect(versCss({ opacity: 0.6 })).toEqual({ opacity: "0.6" });
    expect(versCss({ fontWeight: 700 })).toEqual({ fontWeight: "700" });
    expect(versCss({ zIndex: 2 })).toEqual({ zIndex: "2" });
  });

  it("une valeur déjà textuelle passe telle quelle", () => {
    expect(versCss({ width: "100%", backgroundColor: "#0f6b58" })).toEqual({
      width: "100%",
      backgroundColor: "#0f6b58",
    });
  });
});

describe("les raccourcis que le CSS ne connaît pas", () => {
  it("`paddingHorizontal` devient gauche ET droite", () => {
    expect(versCss({ paddingHorizontal: 16 })).toEqual({
      paddingLeft: "16px",
      paddingRight: "16px",
    });
  });

  it("`paddingVertical` devient haut ET bas", () => {
    expect(versCss({ paddingVertical: 8 })).toEqual({
      paddingTop: "8px",
      paddingBottom: "8px",
    });
  });

  it("`end` devient un positionnement LOGIQUE, pas `right`", () => {
    // React Native écrit `end: 0` ; le CSS l'ignorerait. Un élément positionné
    // qui ne l'est pas se repère seulement à l'œil, sur le bon appareil, dans
    // la bonne langue — c'est-à-dire presque jamais.
    expect(versCss({ end: 0 })).toEqual({ insetInlineEnd: "0px" });
    expect(versCss({ start: 8 })).toEqual({ insetInlineStart: "8px" });
  });

  it("`marginStart` rend une propriété LOGIQUE, pas `left`", () => {
    // L'application déclare `rtlSupported` au contrat : une marge PHYSIQUE se
    // tromperait de côté en arabe.
    expect(versCss({ marginStart: 4 })).toEqual({ marginInlineStart: "4px" });
    expect(versCss({ marginEnd: 4 })).toEqual({ marginInlineEnd: "4px" });
  });

  it("une propriété PRÉCISE écrite après un raccourci l'emporte", () => {
    // Le raccourci pose le cas général, la propriété précise l'exception.
    // L'ordre d'écriture décide, exactement comme en CSS.
    expect(versCss({ paddingHorizontal: 8, paddingLeft: 16 })).toEqual({
      paddingLeft: "16px",
      paddingRight: "8px",
    });
  });
});

describe("plusieurs styles se fondent, comme un tableau React Native", () => {
  it("le dernier gagne", () => {
    expect(versCss({ color: "red" }, { color: "blue" })).toEqual({ color: "blue" });
  });

  it("les entrées fausses sont ignorées — c'est l'idiome `cond && style`", () => {
    // ── LE DRAPEAU EST UN PARAMÈTRE, ET C'EST LE LINT QUI A RAISON.
    //
    // Écrit en constante, il se replie : `const actif = false` rend la branche
    // morte, et le test ne mesure plus que la moitié de l'idiome. En paramètre,
    // les DEUX cas sont éprouvés — c'est ce que les blocs font réellement :
    // `tone === "success" && s.badgeSuccess`.
    const avec = (actif: boolean) => versCss({ color: "red" }, actif && { color: "blue" });
    expect(avec(false)).toEqual({ color: "red" });
    expect(avec(true)).toEqual({ color: "blue" });
    expect(versCss({ color: "red" }, undefined, null)).toEqual({ color: "red" });
  });

  it("une valeur `undefined` ne masque pas celle d'avant", () => {
    // Sinon un style conditionnel EFFACERAIT la valeur de base au lieu de la
    // laisser, et le défaut serait invisible : la propriété disparaîtrait.
    expect(versCss({ color: "red" }, { color: undefined })).toEqual({ color: "red" });
  });
});

describe("le rendu en texte", () => {
  it("camelCase devient tiret", () => {
    expect(versTexteCss({ backgroundColor: "#fff", paddingLeft: "8px" })).toBe(
      "background-color: #fff; padding-left: 8px",
    );
  });
});

describe("SUR LA VRAIE FEUILLE DU DESIGN SYSTEM", () => {
  // Ce test vaut par sa source : la feuille réelle, pas un échantillon. Un cas
  // écrit ici mesurerait ma capacité à écrire un cas qui passe.
  const RACINE = new URL("../../../", import.meta.url).pathname;
  const source = readFileSync(RACINE + "packages/primitives/src/styles.ts", "utf8");

  it("toutes les propriétés employées sont traduisibles", () => {
    // ── LE CLIQUET QUI COMPTE.
    //
    // Une propriété React Native qui n'existe pas en CSS et qu'on ne traduit
    // pas serait émise telle quelle : le navigateur l'ignorerait EN SILENCE.
    // Ce test liste ce que la feuille emploie et vérifie qu'aucune de ces
    // propriétés n'est inconnue du web.
    //
    // Si le design system en ajoute une — `elevation`, `shadowOffset`,
    // `textAlignVertical` — ce test échoue, et c'est exactement ce qu'on veut :
    // la cible web doit apprendre à la rendre avant que quiconque l'emploie.
    // ── LE CRIBLE A ÉTÉ FAUX D'ABORD, ET IL FAUT LE DIRE.
    //
    // Première version : `:\s*[^,{\n]`. Or `\s` traverse les retours à la
    // ligne — un nom de style suivi d'une accolade en fin de ligne
    // (`shellTitle: {`) était donc pris pour une propriété, et le test
    // accusait 89 propriétés inconnues qui n'en étaient pas.
    //
    // `[ \t]*` reste sur la ligne, et `[^,{\s]` exige une vraie valeur. Un
    // instrument de mesure se vérifie avant sa mesure.
    const employees = new Set(
      [...source.matchAll(/^[ \t]{4,}([a-zA-Z]+):[ \t]*[^,{\s]/gm)].flatMap((m) => m[1] ?? []),
    );
    // Celles que `versCss` traduit explicitement.
    const traduites = new Set([
      "paddingHorizontal", "paddingVertical", "marginHorizontal", "marginVertical",
      "paddingStart", "paddingEnd", "marginStart", "marginEnd", "start", "end",
    ]);
    // Celles qui portent déjà leur nom CSS.
    const communes = new Set([
      "backgroundColor", "alignItems", "fontSize", "color", "justifyContent", "minHeight",
      "borderRadius", "fontWeight", "flexDirection", "borderWidth", "borderColor", "gap",
      "flex", "width", "padding", "marginBottom", "marginTop", "minWidth", "textAlign",
      "overflow", "height", "alignSelf", "opacity", "borderStyle", "flexWrap", "maxWidth",
      "position", "top", "bottom", "left", "right", "zIndex", "lineHeight", "letterSpacing",
      "textTransform", "fontStyle", "borderTopWidth", "borderBottomWidth", "flexGrow",
      "flexShrink", "aspectRatio", "maxHeight", "textDecorationLine", "fontFamily",
      "borderTopColor", "borderBottomColor", "margin", "paddingTop", "paddingBottom",
      "paddingLeft", "paddingRight", "marginLeft", "marginRight",
      // L'ANNEAU DE FOCUS (2026-10-16). Les quatre portent deja leur nom CSS
      // — `outline-width`, `outline-style`, `outline-color`, `outline-offset`.
      // Elles ne sont pas inscrites ici sur parole : le test qui suit PROUVE
      // que `versCss` les rend correctement, unite comprise.
      "outlineWidth", "outlineStyle", "outlineColor", "outlineOffset",
    ]);
    const inconnues = [...employees].filter((p) => !traduites.has(p) && !communes.has(p));
    expect(inconnues, "propriétés que la cible web ne sait pas rendre").toEqual([]);
  });

  it("L ANNEAU DE FOCUS se traduit vraiment, unité comprise", () => {
    // ── POURQUOI CE TEST ET PAS SEULEMENT L'INSCRIPTION AU CRIBLE.
    //
    // Ajouter un nom à la liste des « communes » est une AFFIRMATION : « le
    // web sait rendre ceci ». Tant qu'elle n'est pas mesurée, elle vaut une
    // supposition — et une propriété mal rendue est ignorée EN SILENCE par le
    // navigateur, ce qui est exactement le défaut que ce fichier existe pour
    // empêcher.
    //
    // Le piège réel est l'unité : `outlineWidth: 3` sans `px` est une
    // déclaration invalide, donc jetée, donc aucun anneau — et la page
    // s'affiche quand même.
    // ── POURQUOI ON NE L'IMPORTE PAS, ET COMMENT ON RESTE HONNETE.
    //
    // Importer `@deribfy/primitives/styles` tire `./feuille.ts`, donc
    // `react-native`, donc du Flow que l'outillage de ce paquet ne sait pas
    // lire — MESURE : « Flow is not supported », node_modules/react-native/
    // index.js:1. C'est exactement pour cela que ce fichier lit la feuille en
    // TEXTE au-dessus.
    //
    // La chaine de preuve se fait donc en deux maillons, et aucun n'est une
    // parole : le crible ci-dessus lit la VRAIE feuille et constate qu'elle
    // emploie ces quatre proprietes ; ce test-ci verifie que `versCss` les
    // rend. Les valeurs sont celles de la feuille — relues dans sa source.
    const bloc = /focusAnneau: \{[\s\S]*?\}/u.exec(source)?.[0] ?? "";
    expect(bloc, "l anneau a disparu de la feuille").not.toBe("");
    const nombre = (nom: string): number => {
      const m = new RegExp(nom + ":\\s*(\\d+)", "u").exec(bloc);
      expect(m, nom + " n est plus un nombre dans la feuille").not.toBeNull();
      return Number(m?.[1]);
    };
    const css = versCss({
      outlineWidth: nombre("outlineWidth"),
      outlineStyle: "solid",
      outlineColor: "#FA5D1E",
      outlineOffset: nombre("outlineOffset"),
    });
    expect(css.outlineWidth, "largeur sans unité : déclaration invalide, anneau invisible").toMatch(
      /^\d+px$/u,
    );
    expect(css.outlineOffset, "décalage sans unité : l anneau collerait à l élément").toMatch(
      /^\d+px$/u,
    );
    expect(css.outlineStyle).toBe("solid");
    // ET LA COULEUR VIENT DES JETONS DANS LA FEUILLE — on le mesure sur sa
    // source, pas sur la valeur qu on vient de passer soi-meme.
    expect(bloc, "la couleur de l anneau ne vient plus des jetons").toMatch(
      /outlineColor: c\.primary/u,
    );
    expect(css.outlineColor, "une couleur ne doit PAS recevoir d unité").not.toMatch(/px/u);
    // ET LE TEXTE FINAL, tel qu'un attribut `style` le recevrait.
    expect(versTexteCss(css)).toMatch(/outline-width: 3px/u);
  });
});
