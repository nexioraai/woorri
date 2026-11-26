/**
 * « RENOUVELER » DEPUIS L'ÉDITEUR (2026-11-26) — le bouton du bandeau d'un site
 * échu ramène au tableau de bord, qui ouvre la fenêtre de renouvellement.
 */
const PARAM = 'renouveler'
const FORME_SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/u

export function lienRenouveler(slug: string): string {
  return `/dashboard?${PARAM}=${encodeURIComponent(slug)}`
}

/** Le site à renouveler demandé par l'adresse, ou `null`. */
export function lireRenouveler(recherche: string): string | null {
  const v = new URLSearchParams(recherche).get(PARAM)
  return v !== null && FORME_SLUG.test(v) ? v : null
}
