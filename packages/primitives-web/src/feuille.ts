// LA COUTURE DE LA FEUILLE, CÔTÉ WEB — l'identité, et c'est tout.
//
// Le web n'a pas de registre de styles : `versCss` lit les objets directement.
// La fonction rend donc son argument, inchangé. Elle n'est pas vide de sens
// pour autant : c'est elle qui permet à `styles.ts` — la feuille COMMUNE, celle
// qui porte tous les jetons — d'être émise telle quelle pour le web.
//
// Voir `@deribfy/primitives/feuille` pour la raison d'être de cette couture.
export const creerFeuille = <T extends Record<string, object>>(feuille: T): T => feuille;
