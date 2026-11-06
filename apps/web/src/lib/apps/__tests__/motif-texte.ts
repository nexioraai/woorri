/**
 * CONSTRUIRE UN MOTIF DE TEXTE QUI SURVIT À UNE REFORMULATION.
 *
 * ── LA FAMILLE, MESURÉE : QUATRE FOIS EN UN JOUR.
 *
 * Un contrôle qui cherche `/lien vers un document/` dans une consigne
 * rougit le jour où la phrase passe à la ligne entre « un » et
 * « document ». Le texte n'a pas changé de sens, seulement de largeur —
 * et la gate envoie chercher un défaut qui n'existe pas.
 *
 * Les quatre du 2026-11-05 :
 *
 *   EP-319 ⑥bis  « N'ÉCRIS AUCUN BANDEAU » + « La page en porte déjà un »
 *   EP-352 ④     « lien vers un » / « document »
 *   EP-276 ⑦     « identifiant de » / « base de données »   ← écrite EN
 *                 corrigeant les trois autres
 *   EP-301       « DANS LA » / « CHAÎNE », séparées par un `//`
 *
 * ── CE QUE ÇA COÛTE, ET POURQUOI C'EST PIRE QU'UN SIMPLE ROUGE.
 *
 * « Un test vert en local et rouge en CI est PIRE qu'un test rouge : on
 * finit par ne plus lire le CI du tout. » Un rouge sur du code juste
 * apprend à réparer le test au lieu de le lire. C'est l'érosion de la
 * confiance dans la gate, pas une panne.
 *
 * ── LA RÉPONSE : LA TOLÉRANCE VIENT DE LA CONSTRUCTION.
 *
 * L'auteur écrit la phrase telle qu'elle se lit. `motifTexte` remplace
 * chaque blanc par « au moins un blanc », et tout le reste est échappé —
 * donc une phrase ne peut pas devenir une expression régulière par
 * accident.
 */

/** Ce qui sépare deux mots dans un texte replié : du blanc, et parfois un
 *  marqueur de commentaire si la phrase vit dans un bloc `//`. */
const SEPARATEUR = '[\\s]+'
const SEPARATEUR_COMMENTAIRE = '[\\s/*]+'

const echapper = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')

/**
 * UN MOTIF QUI TOLÈRE LES REPLIS — rien d'autre.
 *
 * `motifTexte('lien vers un document')` accepte la phrase sur une ligne,
 * sur deux, ou avec deux espaces. Il n'accepte PAS d'autres mots entre :
 * ce n'est pas une fenêtre, c'est une tolérance au blanc.
 *
 * `dansCommentaire` élargit le séparateur aux marqueurs `//` et `*`, pour
 * une phrase qui vit dans un bloc de commentaire replié.
 */
export function motifTexte(phrase: string, dansCommentaire = false): RegExp {
  const sep = dansCommentaire ? SEPARATEUR_COMMENTAIRE : SEPARATEUR
  const corps = phrase
    .trim()
    .split(/\s+/u)
    .map(echapper)
    .join(sep)
  return new RegExp(corps, 'u')
}

/**
 * DEUX FRAGMENTS, DANS L'ORDRE, AVEC N'IMPORTE QUOI ENTRE.
 *
 * ── POURQUOI UNE FENÊTRE EST PARFOIS NÉCESSAIRE, ET COMMENT NE PAS LA
 *    RENDRE PIÈGEUSE.
 *
 * Quand le trou porte autre chose que du blanc — de la ponctuation de
 * gabarit, une virgule, une structure — `motifTexte` ne suffit pas. Mais
 * une fenêtre COURTE se périme : le texte grossit de quinze signes et
 * elle ne suit plus.
 *
 * Celle-ci est large par défaut. Une fenêtre trop large ne rend pas un
 * faux rouge : elle rend un contrôle un peu moins précis, ce qui est le
 * bon côté où se tromper.
 */
export function motifEntre(avant: string, apres: string, fenetre = 400): RegExp {
  return new RegExp(
    `${motifTexte(avant).source}[\\s\\S]{0,${String(fenetre)}}${motifTexte(apres).source}`,
    'u',
  )
}
