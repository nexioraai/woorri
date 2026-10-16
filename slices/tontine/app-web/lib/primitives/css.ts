// ════════════════════════════════════════════════════════════════════
//  DES STYLES REACT NATIVE VERS DU CSS — LE CŒUR DU PORTAGE WEB.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI CE MODULE EXISTE, ET POURQUOI IL EST SI PETIT.
//
// La feuille de styles du design system (`@deribfy/primitives/styles`) est
// écrite en objets React Native. Mesure du 2026-10-05 : elle emploie
// 38 propriétés, dont SIX seulement n'existent pas en CSS — les raccourcis
// `paddingHorizontal`, `paddingVertical` et leurs frères.
//
// Tout le reste — `backgroundColor`, `fontSize`, `borderRadius`, `gap`,
// `alignItems` — porte déjà le nom CSS. C'est la conséquence d'une décision
// ancienne du dépôt (D-021) : les primitives ne contiennent AUCUN style en dur,
// et toutes les valeurs viennent des jetons. La feuille est donc du vocabulaire
// commun, pas du React Native déguisé.
//
// ── LES TROIS PIÈGES, ET AUCUN N'EST COSMÉTIQUE.
//
// ① UN NOMBRE N'EST PAS UNE LONGUEUR. React Native lit `padding: 12` comme
//    douze points ; le web lit `padding: 12` comme une erreur et l'ignore en
//    silence. Une marge qui disparaît sans message est le pire des deux
//    mondes : la page s'affiche, et elle est fausse.
//
// ② `flex: 1` NE VEUT PAS DIRE LA MÊME CHOSE. En React Native il signifie
//    « prends toute la place restante » ; en CSS c'est `flex: 1 1 0%`, qui
//    n'est équivalent que si la base vaut zéro. Écrire `flex: 1` en CSS donne
//    bien `1 1 0%` — mais seulement depuis que la spécification l'a précisé,
//    et le dire ici évite qu'on « corrige » un jour en `flex-grow: 1`, qui ne
//    serait PAS la même chose.
//
// ③ UNE VUE EST UNE COLONNE. React Native empile ses enfants verticalement par
//    défaut ; le web, horizontalement. C'est la différence qui casse une mise
//    en page entière sans qu'aucune propriété ne soit fausse — et c'est pour
//    cela qu'elle est appliquée par le composant `Vue`, pas ici.

/** Une déclaration de style, telle que la feuille du design system l'écrit. */
export type StyleRN = Readonly<Record<string, string | number | undefined>>;

/**
 * Les propriétés dont un NOMBRE n'est PAS une longueur.
 *
 * Liste FERMÉE, et c'est le bon sens de la fermeture : ajouter une unité là où
 * il n'en faut pas rend la déclaration invalide, donc ignorée — et une
 * propriété ignorée ne dit rien, elle se contente de ne pas s'appliquer.
 */
const SANS_UNITE = new Set([
  "flex",
  "flexGrow",
  "flexShrink",
  "opacity",
  "zIndex",
  "fontWeight",
  "lineHeight",
  "order",
  "flexOrder",
]);

/**
 * Les raccourcis que React Native connaît et que le CSS ignore.
 *
 * `marginStart` et `marginEnd` rendent les propriétés LOGIQUES et non `left` /
 * `right` : l'application déclare `rtlSupported` au contrat, et une marge
 * physique se tromperait de côté en arabe.
 */
const RACCOURCIS: Readonly<Record<string, readonly string[]>> = {
  paddingHorizontal: ["paddingLeft", "paddingRight"],
  paddingVertical: ["paddingTop", "paddingBottom"],
  marginHorizontal: ["marginLeft", "marginRight"],
  marginVertical: ["marginTop", "marginBottom"],
  paddingStart: ["paddingInlineStart"],
  paddingEnd: ["paddingInlineEnd"],
  marginStart: ["marginInlineStart"],
  marginEnd: ["marginInlineEnd"],
  // POSITIONNEMENT LOGIQUE. React Native écrit `end: 0` là où le CSS écrit
  // `inset-inline-end`. Laisser passer `end` tel quel donnerait une propriété
  // que le navigateur ignore — et un élément positionné qui ne l'est pas se
  // repère seulement à l'œil, sur le bon appareil, dans la bonne langue.
  start: ["insetInlineStart"],
  end: ["insetInlineEnd"],
};

/** `backgroundColor` → `background-color`. */
const enTiret = (nom: string): string => nom.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const valeur = (nom: string, v: string | number): string =>
  typeof v === "number" && !SANS_UNITE.has(nom) ? String(v) + "px" : String(v);

/**
 * Une déclaration React Native en propriétés CSS.
 *
 * Rend un objet de style React — donc des clés en camelCase, que React
 * convertit lui-même. On ne produit PAS de chaîne CSS : passer par une chaîne
 * obligerait à échapper les valeurs, et une valeur mal échappée dans un
 * attribut `style` est une porte d'injection.
 */
export function versCss(...styles: readonly (StyleRN | false | null | undefined)[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const style of styles) {
    if (style === undefined || style === null || style === false) continue;
    for (const [nom, v] of Object.entries(style)) {
      if (v === undefined) continue;
      const cibles = RACCOURCIS[nom];
      if (cibles === undefined) {
        out[nom] = valeur(nom, v);
        continue;
      }
      // ── LE RACCOURCI NE DOIT PAS ÉCRASER UNE PROPRIÉTÉ PLUS PRÉCISE.
      //
      // `{ paddingHorizontal: 8, paddingLeft: 16 }` est une déclaration
      // légitime : le raccourci pose le cas général, la propriété précise
      // l'exception. L'ordre d'écriture décide, exactement comme en CSS.
      for (const cible of cibles) out[cible] = valeur(cible, v);
    }
  }
  return out;
}

/** La même chose, en texte — pour une balise `<style>` ou un attribut. */
export function versTexteCss(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([nom, v]) => `${enTiret(nom)}: ${v}`)
    .join("; ");
}
