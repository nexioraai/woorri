import { PHRASE_SITE_ECHU } from '@/lib/sites/site-echu'
/** LE RAPPEL D'UN SITE PAYÉ EN MOBILE MONEY (lot L5, 2026-11-25) — au propriétaire seul, jamais à ses clients. */
/** Le rappel au propriétaire, en mots simples ; `null` hors période de rappel. */
export function phraseRappel(e: { readonly payeJusquAu: string; readonly rappel: 'bientot' | 'echu' | null }): string | null {
  const jour = new Date(e.payeJusquAu).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  if (e.rappel === 'bientot') return `Votre abonnement se termine le ${jour}. Renouvelez-le pour continuer à modifier votre site.`
  if (e.rappel === 'echu') return PHRASE_SITE_ECHU
  return null
}
