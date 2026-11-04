/**
 * AUCUN MESSAGE AFFICHÉ NE VIENT D'AILLEURS QUE DE NOS PHRASES.
 *
 * ── TROIS FOIS LE MÊME DÉFAUT, EN TROIS JOURS.
 *
 *   « Load failed »                                  (Safari, 2026-11-03)
 *   « The string did not match the expected pattern » (2026-11-03)
 *   « terminated »                                    (2026-11-04, 15:42)
 *
 * Le dernier s'est affiché en jaune au milieu de l'écran d'accueil, seul,
 * à quelqu'un qui venait de décrire son application. Il n'a rien
 * construit et n'a rien compris.
 *
 * ── LA CAUSE N'ÉTAIT PAS LE MOT, C'ÉTAIT LA FORME DE LA GARDE.
 *
 * L'ancienne `phraseLisible` reconnaissait TROIS phrases réseau connues
 * et rendait `brut` pour tout le reste :
 *
 *     if (/load failed|failed to fetch|networkerror/iu.test(brut)) …
 *     return brut === '' ? 'Une erreur est survenue.' : brut
 *
 * Une LISTE NOIRE. Elle ne pouvait que perdre : chaque navigateur, chaque
 * version de Node, chaque fournisseur invente ses propres mots. «
 * terminated » est celui d'undici quand la connexion amont lâche — il
 * n'était dans aucune liste parce qu'on ne l'avait jamais vu.
 *
 *   « Une liste noire sera contournée un jour, et pas par malice — par
 *     une tournure à laquelle personne n'avait pensé. »
 *
 * Donc l'inverse, comme pour le SQL de M2 : ce qui N'EST PAS reconnu ne
 * s'affiche PAS. Le texte brut part au journal du navigateur, où un
 * développeur le lira — jamais à l'écran, où personne ne peut rien en
 * faire.
 */

/** Ce qu'on dit quand le réseau a lâché. */
export const CONNEXION_PERDUE =
  'La connexion s’est interrompue. Vérifiez votre réseau et réessayez — ' +
  'rien n’a été perdu.'

/** Ce qu'on dit quand on ne sait pas. Et on ne prétend pas savoir. */
export const ECHEC_INCONNU =
  'Quelque chose n’a pas abouti. Réessayez — si ça recommence, dites-le-nous.'

/**
 * LES CAUSES RECONNUES, et chacune a SA phrase.
 *
 * Elles ne sont pas là pour filtrer : elles sont là pour dire quelque
 * chose d'UTILE quand on sait de quoi il s'agit. Tout le reste tombe sur
 * `ECHEC_INCONNU`, qui est une vraie réponse et pas un aveu.
 */
const CAUSES: readonly { readonly motif: RegExp; readonly phrase: string }[] = [
  {
    // Safari « Load failed », Chrome « Failed to fetch », Firefox
    // « NetworkError », undici « terminated » / « fetch failed ».
    motif: /load failed|failed to fetch|networkerror|network request failed|terminated|fetch failed|socket hang up|econnreset/iu,
    phrase: CONNEXION_PERDUE,
  },
  {
    motif: /abort|timeout|timed out|etimedout/iu,
    phrase:
      'C’est plus long que prévu et la demande a été interrompue. ' +
      'Réessayez — c’est souvent passager.',
  },
  {
    motif: /429|rate.?limit|too many requests/iu,
    phrase: 'Trop de demandes à la fois. Attendez une minute et réessayez.',
  },
  {
    motif: /unauthorized|401|jwt|session/iu,
    phrase: 'Votre session a expiré. Reconnectez-vous et reprenez.',
  },
]

/**
 * LA PHRASE À AFFICHER — et c'est TOUJOURS une des nôtres.
 *
 * ── CE QUI PASSE QUAND MÊME, ET C'EST VOULU.
 *
 * Un message qui est DÉJÀ une de nos phrases traverse : nos routes
 * rendent des `error` écrits en français, et les remplacer par
 * « quelque chose n'a pas abouti » perdrait l'information utile qu'on
 * avait pris la peine d'écrire.
 *
 * La reconnaissance est simple et ne peut pas se tromper dans le mauvais
 * sens : un texte venu d'une bibliothèque anglaise ne contient pas de
 * lettres accentuées ni de guillemets français. Au pire on remplace une
 * de nos phrases par une phrase plus générale — jamais l'inverse.
 */
export function phraseErreur(err: unknown): string {
  const brut = err instanceof Error ? err.message : String(err ?? '')
  if (brut.trim() === '') return ECHEC_INCONNU
  for (const c of CAUSES) if (c.motif.test(brut)) return c.phrase
  if (estUneDeNosPhrases(brut)) return brut
  // ── LE BRUT VA AU JOURNAL, PAS À L'ÉCRAN.
  //
  // Il est la seule chose utile pour qui cherche la cause, et la seule
  // chose inutile pour qui attend son application.
  if (typeof console !== 'undefined') console.warn('[erreur masquée]', brut)
  return ECHEC_INCONNU
}

/**
 * EST-CE UNE PHRASE DE CHEZ NOUS ?
 *
 * Nos messages sont des phrases françaises : ils portent un accent, une
 * apostrophe typographique ou un guillemet français, et ils finissent
 * par une ponctuation. Un `TypeError: terminated` n'a rien de tout ça.
 */
export function estUneDeNosPhrases(texte: string): boolean {
  const t = texte.trim()
  if (t.length < 12 || t.length > 400) return false
  if (!/[éèêàâîôûùçÉÈÊÀÂÎÔÛÙÇ’«»]/u.test(t)) return false
  // Un identifiant technique traîne souvent dans un message de
  // bibliothèque traduit à moitié. S'il y en a un, ce n'est pas de nous.
  if (/\b[A-Z][a-z]+Error\b|\bat \w+\.|https?:\/\/|\{|\}/u.test(t)) return false
  return /[.!?…]$/u.test(t)
}
