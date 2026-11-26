/**
 * LA PHRASE D'UN SITE ÉCHU (2026-11-26) — mot pour mot celle du propriétaire.
 * Partagée par le serveur (refus 403), le navigateur (refus de la base) et
 * le bandeau « Renouveler ». Aucune dépendance : importable partout.
 */
export const PHRASE_SITE_ECHU = 'L’abonnement de ce site est arrivé à échéance. Renouvelez-le pour reprendre les modifications. Votre site reste en ligne.'
export const CODE_SITE_ECHU = 'SITE_ECHU'

/** Un refus venu de la base (déclencheur n° 10) ou d'une route (403 `SITE_ECHU`). */
export function estRefusSiteEchu(x: unknown): boolean {
  if (typeof x === 'string') return x.includes(CODE_SITE_ECHU)
  if (x === null || typeof x !== 'object') return false
  const o = x as { code?: unknown; message?: unknown; error?: unknown }
  return o.code === CODE_SITE_ECHU || [o.message, o.error].some((v) => typeof v === 'string' && v.includes(CODE_SITE_ECHU))
}
