// ============================================================================
// LE TÉLÉPHONE D'UN SITE GÉNÉRÉ — une seule source pour le moteur.
//
// MESURÉ le 2026-11-10 sur le site de la CPA (Tchad) : « +1 235 22 51 00 00 »
// affiché, `tel:+1 235 22 51 00 00` en lien. Deux causes dans le moteur :
//
// ① LE GÉNÉRATEUR DONNAIT « +1 » PAR DÉFAUT. `getPhonePrefix` rendait `+1`
//    pour tout pays absent de sa courte liste, et l'appel rendait `+1` quand
//    la localisation manquait : un site du Gabon, du Maroc ou du Togo recevait
//    un numéro nord-américain. Désormais : un préfixe CONNU, ou AUCUN — on ne
//    devine jamais.
//
// ② LES LIENS `tel:` GARDAIENT LES ESPACES. Un lien d'appel n'accepte que
//    `+` et des chiffres.
//
// Et un FILET après génération : un « +1 » collé devant l'indicatif du pays
// (« +1 235 … » pour le Tchad) est retiré. C'est exactement l'erreur observée.
// ============================================================================

/** Indicatifs connus, repérés dans la localisation déclarée du commerce. */
const INDICATIFS: [RegExp, string][] = [
  [/tchad|chad/i, '+235'], [/cameroun|cameroon/i, '+237'], [/s[ée]n[ée]gal/i, '+221'],
  [/\bmali\b/i, '+223'], [/\bniger\b/i, '+227'], [/burkina/i, '+226'],
  [/c[ôo]te d['’]ivoire|ivory coast/i, '+225'], [/\bgabon\b/i, '+241'], [/\btogo\b/i, '+228'],
  [/b[ée]nin/i, '+229'], [/guin[ée]e(?!.*(bissau|[ée]quatoriale|equatorial))/i, '+224'],
  [/congo.*(kinshasa|rdc|d[ée]mocratique)|\brdc\b|\bdrc\b/i, '+243'], [/congo/i, '+242'],
  [/centrafri|central african/i, '+236'], [/maroc|morocco/i, '+212'], [/alg[ée]rie|algeria/i, '+213'],
  [/tunisie|tunisia/i, '+216'], [/nigeria/i, '+234'], [/ghana/i, '+233'], [/soudan|sudan/i, '+249'],
  [/canada/i, '+1'], [/[ée]tats-unis|united states|\busa\b/i, '+1'],
  [/france/i, '+33'], [/belgique|belgium/i, '+32'], [/suisse|switzerland/i, '+41'],
]

/** L'indicatif du pays, ou `null` si on ne le sait pas — JAMAIS « +1 » par défaut. */
export function indicatifDuPays(localisation: string | null | undefined): string | null {
  if (!localisation) return null
  return INDICATIFS.find(([motif]) => motif.test(localisation))?.[1] ?? null
}

/**
 * Retire un « +1 » parasite collé devant l'indicatif attendu :
 * « +1 235 22 51 00 00 » → « +235 22 51 00 00 » quand l'indicatif est +235.
 * Ne touche à rien d'autre.
 */
export function corrigerIndicatif(telephone: string, indicatif: string | null): string {
  if (!indicatif || indicatif === '+1') return telephone
  const chiffres = indicatif.slice(1)
  const m = new RegExp(`^\\s*\\+1[\\s.-]*(${chiffres})\\b`).exec(telephone)
  return m ? telephone.replace(m[0], `+${chiffres}`) : telephone
}

/** Le lien d'appel : `+` et chiffres seulement. `null` si le numéro est vide. */
export function lienTel(telephone: string | null | undefined): string | null {
  const brut = (telephone ?? '').replace(/[^+\d]/g, '')
  return brut.replace(/\D/g, '').length >= 6 ? `tel:${brut}` : null
}
