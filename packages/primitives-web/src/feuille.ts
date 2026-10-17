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
 * LE RÔLE DE FAMILLE, RÉSOLU EN PILE CSS (web).
 *
 * Le web n'a pas le problème du natif : une pile de polices se DÉGRADE, et le
 * navigateur prend la première présente. On nomme donc plusieurs candidats par
 * rôle, et la pile finit toujours par un générique qui existe partout.
 *
 * `undefined` pour `systeme` : ne pas poser `font-family` laisse la pile du
 * document, que `emit-web` fixe déjà sur la pile système — c'est le meilleur
 * rendu et le comportement d'avant 1.6.0.
 */
export const familleDe = (role: "systeme" | "serif" | "mono"): string | undefined => {
  if (role === "systeme") return undefined;
  if (role === "serif") return 'Georgia, "Noto Serif", "Times New Roman", serif';
  return 'Menlo, Consolas, "Roboto Mono", monospace';
};
