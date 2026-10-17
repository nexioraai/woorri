import type { Graisse, Graisses } from "@deribfy/primitives/contracts";
// LA COUTURE DE LA FEUILLE, CÔTÉ WEB — l'identité, et c'est tout.
//
// Le web n'a pas de registre de styles : `versCss` lit les objets directement.
// La fonction rend donc son argument, inchangé. Elle n'est pas vide de sens
// pour autant : c'est elle qui permet à `styles.ts` — la feuille COMMUNE, celle
// qui porte tous les jetons — d'être émise telle quelle pour le web.
//
// Voir `@deribfy/primitives/feuille` pour la raison d'être de cette couture.
export const creerFeuille = <T extends Record<string, object>>(feuille: T): T => feuille;

/**
 * LA POLICE D'UN RÔLE DE TEXTE — CÔTÉ WEB.
 *
 * ── CE QUI DIFFÈRE DU NATIF, ET POURQUOI LA FORME CHANGE.
 *
 * Le web n'a pas le problème du natif. Les trois faces sont déclarées en
 * `@font-face` sous UNE famille, chacune avec sa `font-weight` : le navigateur
 * choisit la bonne face lui-même, et `font-weight: 600` est servi par la face
 * SemiBold sans aucune synthèse. On rend donc famille ET graisse ensemble —
 * là où le natif doit choisir l'une ou l'autre.
 *
 * La pile finit par un GÉNÉRIQUE. Si la face embarquée ne se charge pas, le
 * navigateur prend Georgia, puis n'importe quel serif : le CARACTÈRE de la
 * police survit, même dégradé. C'est ce qu'un `fontFamily` natif ne sait pas
 * faire — d'où la face embarquée là-bas.
 */
/**
 * ── LA GRAISSE VIENT DU JETON, PAS DE CETTE FONCTION (correction du jour).
 *
 * J'avais écrit `"600"` et `"700"` en littéral ici. L'Oracle l'a vu — sa
 * dimension D mesure « zéro style en dur » et elle est passée à
 * `non_conforme` : « 1 valeur(s) en dur : lib/primitives/feuille.ts:
 * typographie fontWeight=700 ». Il avait raison, et c'est exactement le genre
 * de valeur que les jetons existent pour porter.
 *
 * Cette couture décide LAQUELLE des deux propriétés poser — famille nommée OU
 * graisse — ce qui est une connaissance de plateforme. La VALEUR de la graisse
 * n'en est pas une : elle arrive de la feuille, qui lit les jetons.
 */
export interface StyleDePolice {
  readonly fontFamily?: string;
  readonly fontWeight?: Graisse;
}



const PILE_SERIF = '"DeribfySerif", Georgia, "Times New Roman", serif';
const PILE_MONO = '"DeribfySerif", Menlo, Consolas, monospace';

export const styleDePolice = (
  role: "systeme" | "serif" | "mono",
  poids: "regular" | "semibold" | "bold",
  graisses: Graisses,
): StyleDePolice => {
  const graisse = poids === "regular" ? undefined : graisses[poids];
  if (role === "systeme") return graisse === undefined ? {} : { fontWeight: graisse };
  const pile = role === "serif" ? PILE_SERIF : PILE_MONO;
  return graisse === undefined ? { fontFamily: pile } : { fontFamily: pile, fontWeight: graisse };
};
