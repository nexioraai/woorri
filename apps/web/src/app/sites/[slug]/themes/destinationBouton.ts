import type { Site } from './shared'
import { resolveSiteBaseUrl } from './shared'

// ============================================================================
// LOT 18 — LE BOUTON PRINCIPAL MÈNE OÙ IL DIT.
//
// MESURÉ le 2026-11-10 sur la CPA : « Consulter les appels d'offres » menait
// à `#contact`. Les quatre thèmes calculaient la destination SANS lire le
// libellé : boutique → `#shop`, sinon → `#contact`. Un bouton qui annonce une
// page et en ouvre une autre fait perdre le visiteur dès l'accueil.
//
// UNE RÈGLE, POUR LES QUATRE THÈMES : un site qui publie des appels d'offres
// ET dont le bouton parle d'appels d'offres (dans l'une des quatre langues
// des sites) envoie vers `/appels-offres`. Sinon, rien ne change.
// ============================================================================

const PARLE_D_APPELS_D_OFFRES = /appels?\s+d['’]\s*offres|tenders?|licitaci|مناقص/iu

export function destinationDuBouton(
  site: Pick<Site, 'publishes_tenders'> & Parameters<typeof resolveSiteBaseUrl>[0],
  host: string | null,
  libelle: string,
  boutique: boolean,
): string {
  if (site.publishes_tenders === true && PARLE_D_APPELS_D_OFFRES.test(libelle)) {
    return `${resolveSiteBaseUrl(site, host)}/appels-offres`
  }
  return boutique ? '#shop' : '#contact'
}

/**
 * LOT 18 — l'entrée « Contact » du menu mène à la VRAIE page `/contact`
 * (indexable, avec son titre et sa canonique), plus à l'ancre de l'accueil.
 */
export function lienContact(site: Parameters<typeof resolveSiteBaseUrl>[0], host: string | null): string {
  return `${resolveSiteBaseUrl(site, host)}/contact`
}

/** LOT 21 — « Accueil » mène à l'adresse du site, plus à l'ancre `#home`. */
export function lienAccueil(site: Parameters<typeof resolveSiteBaseUrl>[0], host: string | null): string {
  return resolveSiteBaseUrl(site, host)
}

/** LOT 21 — « À propos » et « Services » sont de vraies pages, plus des ancres. */
export function lienSection(site: Parameters<typeof resolveSiteBaseUrl>[0], host: string | null, quoi: 'a-propos' | 'services'): string {
  return `${resolveSiteBaseUrl(site, host)}/${quoi}`
}
