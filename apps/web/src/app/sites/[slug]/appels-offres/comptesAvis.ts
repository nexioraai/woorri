import { etatVisible, type AvisCycle } from './cycleDeVie'
import { partagerArchive } from './archiver'

// ============================================================
// LOT 5bis — LES QUATRE COMPTEURS DE LA PAGE DES APPELS D'OFFRES.
//
// UN CHIFFRE AFFICHE EST UN CHIFFRE MESURE. Ces quatre nombres se DEDUISENT
// des avis reels. Aucun n'est saisissable : un compteur qu'on peut ecrire a
// la main est un compteur qui ment le jour ou personne ne le met a jour --
// et sur un portail d'Etat, « 4 appels d'offres actifs » quand il n'y en a
// aucun fait perdre son temps a un fournisseur qui prepare un dossier.
//
// « CLOTURE PROCHAINE » SE DECIDE SUR L'ECHEANCE, pas sur un drapeau. Un
// avis dont la remise tombe dans moins de sept jours est urgent, qu'on
// l'ait coche ou non.
//
// LE MOMENT EST RECU, jamais lu de l'horloge : deux lectures dans un meme
// rendu peuvent tomber de part et d'autre d'une echeance, et la carte
// « ouverts » dirait 3 pendant que le tableau en montre 2.
// ============================================================

export type ComptesAvis = {
  /** Tout ce qui n'est ni clos ni attribue : la procedure court encore. */
  actifs: number
  /** Ouverts aux offres MAINTENANT — une procedure en preparation n'en est pas. */
  ouverts: number
  /** Ouverts dont l'echeance tombe dans moins de `JOURS_URGENCE` jours. */
  clotureProchaine: number
  /** Clos ou attribues des annees PRECEDENTES — ce que montre l'archive. */
  archives: number
}

/** Sept jours : une semaine pour reunir un dossier, c'est deja court. */
export const JOURS_URGENCE = 7

export function compterAvis<T extends AvisCycle>(avis: T[], maintenant: Date): ComptesAvis {
  let actifs = 0, ouverts = 0, clotureProchaine = 0
  const termines: T[] = []

  for (const a of avis) {
    const e = etatVisible(a, maintenant)
    if (e === 'clos' || e === 'attribue') { termines.push(a); continue }
    actifs += 1
    if (e !== 'ouvert') continue
    ouverts += 1
    if (a.remise_le === null) continue
    const d = new Date(a.remise_le)
    if (Number.isNaN(d.getTime())) continue
    const jours = (d.getTime() - maintenant.getTime()) / 86400000
    if (jours >= 0 && jours <= JOURS_URGENCE) clotureProchaine += 1
  }

  // L'archive est la MEME notion que la page d'archive : meme fonction,
  // jamais un second calcul. Deux definitions de « archive » finiraient par
  // diverger, et c'est le compteur qu'on ne regarde pas qui aurait tort.
  const { archives } = partagerArchive(termines, maintenant)
  return { actifs, ouverts, clotureProchaine, archives: archives.length }
}

/**
 * Les jours restants avant une echeance. `null` si l'avis n'en a pas, ou si
 * elle est passee -- « -3 jours restants » n'informe personne.
 *
 * ARRONDI AU JOUR ENTIER. EPSS affiche « 32.406850914144 jours restants » :
 * un nombre a douze decimales sur un portail d'Etat dit au lecteur que
 * personne n'a relu la page.
 */
export function joursRestants(remiseLe: string | null, maintenant: Date): number | null {
  if (!remiseLe) return null
  const d = new Date(remiseLe)
  if (Number.isNaN(d.getTime())) return null
  const jours = Math.ceil((d.getTime() - maintenant.getTime()) / 86400000)
  return jours >= 0 ? jours : null
}
