// ════════════════════════════════════════════════════════════════════
//  STUB — `react-native-svg`, pour que les tests de PRIMITIVES se chargent.
// ════════════════════════════════════════════════════════════════════
//
// ── CE QU'IL RÉPARE, ET COMMENT LE DÉFAUT S'EST MONTRÉ.
//
// `react-native-svg` est un module NATIF : hors d'un appareil il n'a rien à
// dessiner, et son code publié n'est pas transformable en node. Mesuré :
// « SyntaxError: Unexpected token 'typeof' ».
//
// LE DÉFAUT N'ÉTAIT PAS UN ÉCHEC, IL ÉTAIT UN SILENCE. Depuis que `Anneau`
// importe ce paquet, DEUX fichiers de test de ce paquet cessaient de se
// CHARGER — dont `primitives.test.tsx`, celui qui juge les primitives, et
// `contracts-ratchet.test.ts`, le cliquet des contrats. `vitest` affichait
// « 22 passed » et « 0 test » sur chacun : un vert qui ne mesurait plus rien.
//
// Trouvé en recensant les configs qui neutralisent `react-native` APRÈS avoir
// réparé `packages/blocks` — la discipline du chemin d'entrée, pas la chance.
//
// ── LE STUB NE DÉCIDE RIEN.
//
// Comme les deux autres stubs de ce dossier, il conserve TOUTES les props
// qu'on lui passe : il remplace le DESSIN, jamais la DONNÉE. `strokeDashoffset`
// est la seule valeur qui porte l'angle de l'arc, et les contrôles D11 la
// lisent sur ces nœuds — un stub qui jetterait ses props rendrait le montage
// vert et aveugle.
import { createElement, type PropsWithChildren } from "react";

type Props = PropsWithChildren<Record<string, unknown>>;

const noeud =
  (nom: string) =>
  ({ children, ...reste }: Props) =>
    createElement(nom, reste, children);

/** Le conteneur. Rend un nœud hôte portant ses props telles quelles. */
const Svg = noeud("svg");
export default Svg;

export const Circle = noeud("circle");
export const Path = noeud("path");
export const Rect = noeud("rect");
export const Line = noeud("line");
export const G = noeud("g");
export const Text = noeud("text");
export const Defs = noeud("defs");
export const LinearGradient = noeud("linearGradient");
export const Stop = noeud("stop");
