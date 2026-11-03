/**
 * UNE GARDE CORRÉLÉE À SA PANNE — la troisième règle générale du 2026-11-03.
 *
 * ── LA RÈGLE, telle que le propriétaire l'a durcie.
 *
 *   UNE GARDE QUI SE TAIT PRÉCISÉMENT QUAND CE QU'ELLE GARDE ÉCHOUE EST
 *   PIRE QU'UNE GARDE ABSENTE : SON VERT SE LIT COMME UNE PREUVE.
 *
 * J'avais écrit « le juge se taira puisqu'il ne verra aucune table à
 * garder » — en le présentant comme une lacune. Ce n'en est pas une. Le
 * silence est CORRÉLÉ à la panne, et c'est ce qui le rend dangereux.
 *
 * ── LA CHAÎNE, TELLE QU'ELLE SE DÉROULE.
 *
 *   la lecture du cahier échoue
 *     → `entites: []` au lieu de `illisible: true`
 *       → la règle 6 ne s'échange pas : l'œuvre reçoit « écris des valeurs
 *         d'exemple plausibles »
 *         → aucune table déclarée
 *           → `jugerPersistance([], …)` rend `[]`
 *             → VERT
 *
 * Le juge ne dit pas « je n'ai pas pu vérifier ». Il dit « rien à
 * reprocher ». Et comme l'œuvre est en mémoire, elle s'assemble, se monte,
 * ses contrôles vivent, ses exigences sont couvertes : les six juges sont
 * verts sur une application dont tout le travail saisi disparaîtra.
 *
 * ── CE QUE ÇA CHANGE POUR L'ORDRE DES LOTS.
 *
 * Le prochain lot n'est PAS du polissage. C'est celui qui rend le juge de
 * persistance CROYABLE. Sans lui, le juge certifie les œuvres amnésiques —
 * il ne les attrape pas, il les signe.
 *
 * Et la forme du lot découle de la chaîne : rendre `illisible: true` et
 * `entites: []` DISCERNABLES en aval, puis faire que le juge distingue
 * « rien à garder » (un résultat) de « je n'ai pas pu savoir » (une perte).
 * Un troisième état, pas une liste vide.
 *
 * ── LA QUESTION À POSER DEVANT TOUTE GARDE.
 *
 * « Qu'est-ce qui la rend muette, et est-ce que ça ressemble à la panne
 * qu'elle guette ? » Si oui, son silence doit être un ÉTAT, jamais un vide.
 */
export const REGLE_GARDE_CORRELEE =
  'Une garde qui se taît précisément quand ce qu’elle garde échoue est pire ' +
  'qu’une garde absente : son vert se lit comme une preuve.'

/** Ce qui transforme un silence en certificat, dans l'ordre où ça arrive. */
export const CHAINE_DU_SILENCE: readonly string[] = [
  'la lecture du cahier échoue',
  '`entites: []` arrive en aval, indiscernable de « cette œuvre n’a pas besoin de base »',
  'la règle 6 ne s’échange pas : le modèle reçoit « écris des valeurs d’exemple »',
  'aucune table déclarée, donc `jugerPersistance` rend une liste vide',
  'VERT — et le vert certifie l’œuvre amnésique au lieu de l’interdire',
]

/**
 * LA QUESTION, et elle se pose avant d'écrire la garde, pas après.
 *
 * Posée après, elle arrive quand le vert est déjà en production et que
 * quelqu'un s'en sert comme d'une preuve.
 */
export const QUESTION_DEVANT_UNE_GARDE =
  'Qu’est-ce qui la rend muette, et est-ce que ça ressemble à la panne ' +
  'qu’elle guette ? Si oui, son silence doit être un ÉTAT, jamais un vide.'
