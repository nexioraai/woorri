/**
 * UN NOM ENREGISTRÉ, JAMAIS PUBLIÉ (2026-11-22).
 *
 * Le nom d'adresse se choisit au premier « Publier », AVANT le paiement. Tant
 * que l'appli n'a JAMAIS été en ligne, ce nom n'a jamais servi d'adresse :
 * personne ne l'a reçu, aucun lien ne pointe vers lui. Il peut donc changer
 * (« Changer l'adresse ») et se libère à la suppression.
 *
 * Dès qu'elle a été en ligne UNE fois, la règle EP-308 reprend : le nom ne
 * change plus et ne se recycle jamais (pierre tombale). « Jamais publiée » se
 * lit sur DEUX colonnes : pas de jeton (pas en ligne maintenant) ET pas de
 * `publie_le` (jamais mise en ligne — un remboursement retire le jeton mais
 * garde la date). MESURÉ en production le 2026-11-22 : les 4 noms vivants
 * ont tous un `publie_le`, et tout jeton en a un.
 */
export function jamaisPubliee(ligne: { readonly publication_jeton?: unknown; readonly publie_le?: unknown }): boolean {
  const vide = (v: unknown): boolean => v === null || v === undefined || v === ''
  return vide(ligne.publication_jeton) && vide(ligne.publie_le)
}

/** Le nom peut-il encore changer ? Un nom enregistré, sur une appli jamais publiée. */
export function nomModifiable(ligne: { readonly publication_slug?: unknown; readonly publication_jeton?: unknown; readonly publie_le?: unknown }): boolean {
  return typeof ligne.publication_slug === 'string' && ligne.publication_slug !== '' && jamaisPubliee(ligne)
}

export const PHRASE_NOM_FIGE = 'Cette application a déjà été en ligne : son adresse ne change plus.'
export const PHRASE_SANS_NOM = 'Aucune adresse n’est encore choisie : « Publier » la demande.'
