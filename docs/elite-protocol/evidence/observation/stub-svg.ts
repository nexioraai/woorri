// ════════════════════════════════════════════════════════════════════
//  STUB — `react-native-svg`, pour que l'anneau soit MESURABLE au montage.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI UN STUB, ET POURQUOI IL N'AFFAIBLIT RIEN.
//
// `react-native-svg` est un module NATIF : hors d'un appareil, il n'a rien à
// dessiner. Le monter tel quel fait échouer le transformateur — mesuré :
// « SyntaxError: Unexpected token 'typeof' ».
//
// Les quatre autres stubs de ce dossier existent pour la même raison, et la
// même discipline s'applique : LE STUB NE DÉCIDE RIEN. Il conserve TOUTES les
// props qu'on lui passe, et c'est précisément ce qui rend la proportion
// mesurable — `strokeDashoffset` est la seule valeur qui porte l'angle de
// l'arc, et le contrôle D11 la lit sur ces nœuds.
//
// Un stub qui jetterait les props rendrait le montage vert et aveugle. Celui-ci
// les laisse toutes passer : il ne fait que remplacer le DESSIN, pas la DONNÉE.
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
