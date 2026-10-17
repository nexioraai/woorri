// SOURCE DE TOKENS UNIQUE (ARCHITECTURE §22, ROADMAP Phase 3) — schéma STRICT
// de `tokens.json`. Provenance des valeurs (aucune inventée) :
//   - `brand` : palette produit officielle (CLAUDE.md, bloc @theme de
//     apps/web/src/app/globals.css) ;
//   - `web` : variables background/foreground light/dark de globals.css ;
//   - `color`/`space`/`radius`/`font` : jeu sémantique RN éprouvé au banc
//     P-003 (D-021 — StyleSheet + tokens maison).
// Le sens du flux est JSON → codegen → (CSS web, thème RN) — jamais l'inverse
// (vigilance consignée en D-021).
import { z } from "zod";

// 1.5.0 — `size.measure` : la LARGEUR DE LISIBILITÉ du contenu, avec son
// consommateur réel (`AppShell`, propriétaire unique de la géométrie).
//
// POURQUOI 1.5.0 ET NON 1.4.0 : le registre du cliquet de surface décrit
// déjà `size.controlHeight` comme l'ajout « 1.4.0 » (2026-09-09), alors que
// ce littéral était resté à 1.3.0 — le numéro avait dérivé. Reprendre 1.4.0
// écrirait un faux dans le registre. Cette dérive est SIGNALÉE, pas
// réécrite : renommer un ajout déjà consigné sort du périmètre.
//
// 1.3.0 — l'échelle typographique gagne `display`, un cran au-dessus de
// `heading`, avec son consommateur réel (accroche de l'écran d'accueil).
export const DESIGN_TOKENS_VERSION = "1.6.0";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const dimension = z.number().int().positive();

// Palette par schéma : light et dark portent EXACTEMENT les mêmes clés
// (objet strict partagé — une clé manquante ou en trop est une erreur).
const paletteSchema = z.strictObject({
  bg: hexColor,
  surface: hexColor,
  text: hexColor,
  muted: hexColor,
  primary: hexColor,
  onPrimary: hexColor,
  border: hexColor,
  error: hexColor,
  success: hexColor,
  warn: hexColor,
  badgeBg: hexColor,
});

export const designTokensSchema = z.strictObject({
  tokensVersion: z.literal(DESIGN_TOKENS_VERSION),
  brand: z.strictObject({
    accent: hexColor,
    bgDeep: hexColor,
    blue: hexColor,
    gold: hexColor,
    prune: hexColor,
  }),
  web: z.strictObject({
    background: z.strictObject({ light: hexColor, dark: hexColor }),
    foreground: z.strictObject({ light: hexColor, dark: hexColor }),
  }),
  color: z.strictObject({ light: paletteSchema, dark: paletteSchema }),
  space: z.strictObject({
    // `xxs` (v2) : le pas fin qu'exigeait le badge, jusque-là écrit en dur.
    xxs: dimension,
    xs: dimension,
    sm: dimension,
    md: dimension,
    lg: dimension,
    xl: dimension,
  }),
  radius: z.strictObject({ sm: dimension, md: dimension, lg: dimension }),
  font: z.strictObject({
    /**
     * LA FAMILLE DE CARACTÈRES — un RÔLE, jamais un nom de police (1.6.0).
     *
     * ── LE DÉFAUT, MESURÉ LE 2026-10-17.
     *
     * Ce groupe ne portait que des TAILLES : 12/14/17/22/34. Aucune famille.
     * Les 22 applications s'écrivaient donc dans la police par défaut de la
     * plateforme — la même pour un spa, un chantier et une salle de concert.
     * La typographie est le premier marqueur d'identité visuelle, et c'était
     * le seul que le moteur ne savait pas exprimer.
     *
     * ── POURQUOI UN RÔLE ET PAS UN NOM, ET C'EST UNE MESURE.
     *
     * Aucun nom de police n'existe sur les deux plateformes à la fois : iOS
     * porte Georgia, Palatino, Menlo ; Android porte Noto Serif, Roboto,
     * monospace. Poser un NOM dans le jeton, c'était garantir un repli muet
     * sur l'une des deux — une police absente ne lève pas, elle retombe en
     * silence sur la police système, et l'identité disparaît sans rien dire.
     *
     * Le jeton porte donc le RÔLE, et la couture de plateforme
     * (`primitives/feuille.ts` et son équivalent web) le résout en une
     * famille RÉELLEMENT présente. C'est le joint qui existe déjà pour le
     * moteur de styles : aucun joint nouveau.
     *
     * ── POURQUOI CES TROIS RÔLES, ET PAS DIX.
     *
     * Chacun a un consommateur réel dans le catalogue de thèmes — la règle
     * posée par DET-023, qui a écarté `elevation` et `motion` faute d'usage.
     * `systeme` est l'actuel, donc le défaut : un projet qui ne dit rien ne
     * change pas d'un pixel.
     */
    famille: z.enum(["systeme", "serif", "mono"]),
    label: dimension,
    body: dimension,
    title: dimension,
    heading: dimension,
    /**
     * DISPLAY (1.3.0) — un cran AU-DESSUS de `heading`, pour la PREMIÈRE
     * phrase qu'une personne lit. Ajouté avec son consommateur réel (l'écran
     * d'accueil produit), jamais « au cas où » : c'est la règle que DET-023 a
     * posée quand `elevation`/`motion` ont été écartés.
     */
    display: dimension,
  }),
  // DESIGN SYSTEM v2 (P-007, Phase 10) — trois groupes AJOUTÉS, chacun avec
  // un consommateur RÉEL dans les primitives ; aucun token « au cas où ».
  // `fontWeight` et `space.xxs` suppriment les 9 valeurs de style en dur
  // mesurées (DET-022) ; `opacity` tokenise l'opacité d'état désactivé.
  // Ce qui n'a PAS été ajouté et pourquoi : `elevation`, `motion`,
  // `breakpoint`/`density` n'ont AUCUN consommateur dans le design system
  // v1 — les introduire serait spéculatif (arbitrage consigné, DET-023).
  fontWeight: z.strictObject({
    semibold: z.string().regex(/^[1-9]00$/),
    bold: z.string().regex(/^[1-9]00$/),
  }),
  opacity: z.strictObject({ disabled: z.number().gt(0).lt(1) }),
  // Cible tactile minimale (grille A++ dimension A, D-039). 48 satisfait
  // SIMULTANÉMENT les deux normes — 44 pt (iOS HIG) et 48 dp (Material) —
  // ce qui évite toute ramification `Platform.OS` : le code généré reste
  // strictement identique sur les deux plateformes (propriété prouvée au
  // scorecard du slice 1).
  // `controlHeight` (2026-09-09, jugement propriétaire « les boutons ne sont
  // pas premium ») : la hauteur d'un CONTRÔLE PRINCIPAL — au-dessus du
  // minimum tactile, qui reste la borne basse de TOUTES les surfaces.
  // `measure` (1.4.0) — LA LARGEUR DE LISIBILITÉ DU CONTENU.
  //
  // DET-023 avait écarté `breakpoint`/`density` faute de consommateur. Celui
  // -ci en a un, et il répare un défaut MESURÉ : `maxWidth` n'apparaissait
  // nulle part dans le moteur. L'application générée était donc une mise en
  // page de téléphone ÉTIRÉE sur un écran de bureau — sur 1440 px, une ligne
  // de liste fait 1440 px, le titre à l'extrême gauche, le montant à
  // l'extrême droite, et un désert au milieu. Jugement du propriétaire
  // (2026-10-13), capture à l'appui : « visuellement nul ».
  //
  // PROVENANCE DE LA VALEUR, pas une invention : 768, soit le `max-w-3xl`
  // que SGD applique réellement à ses pages de contenu (mesuré dans
  // `src/app/clients/page.tsx` — `mx-auto max-w-3xl px-4 py-8`). SGD est la
  // référence que le propriétaire oppose aux applications générées ; copier
  // SA mesure vaut mieux qu'en choisir une.
  //
  // UNE SEULE RÈGLE POUR LES DEUX CIBLES, et c'est l'intérêt du nombre : sur
  // un téléphone de 390 px, une borne à 768 ne mord jamais ; sur une
  // tablette en paysage et sur un écran de bureau, elle borne. Aucune
  // ramification de plateforme, aucune nouvelle couture.
  size: z.strictObject({
    tapTarget: dimension,
    controlHeight: dimension,
    measure: dimension,
  }),
});

export type DesignTokens = z.infer<typeof designTokensSchema>;
export type TokenPalette = z.infer<typeof paletteSchema>;
