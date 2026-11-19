/**
 * UN PRIX STRIPE PAR PLAN (2026-11-19).
 *
 * MESURÉ : le paiement d'un site envoyait UN SEUL prix (`STRIPE_PRICE_ID`,
 * 15 CAD) quel que soit le plan. Qui choisissait Vitrine, affichée 10, était
 * facturé 15. Le prix suit désormais le type du site (`sites.mode`), en dollars
 * US comme la page Tarifs : Vitrine 10, Boutique 15, Dropshipping 20.
 *
 * FERMÉ PAR DÉFAUT : un mode inconnu ou une variable absente REFUSE le
 * paiement, avec ce qui manque. Jamais un prix « par défaut » : c'est
 * exactement le défaut qu'on ferme.
 *
 * L'Application a son prix (20 $ US) dans Stripe pour après Dary ; avant, elle
 * s'active à la main (`docs/elite-protocol/PLAN_QUOTA_ACTIVATION.md`). Il n'est
 * donc lu nulle part ici.
 */
export const VARIABLE_PRIX_PAR_MODE = {
  1: 'STRIPE_PRICE_VITRINE',
  2: 'STRIPE_PRICE_BOUTIQUE',
  3: 'STRIPE_PRICE_DROPSHIPPING',
} as const

export type PrixDuSite = { readonly ok: true; readonly prix: string } | { readonly ok: false; readonly motif: string }

export function prixDuSite(mode: unknown, env: Readonly<Record<string, string | undefined>>): PrixDuSite {
  if (mode !== 1 && mode !== 2 && mode !== 3) {
    return { ok: false, motif: `type de site inconnu (${String(mode)}) : aucun prix ne lui correspond` }
  }
  const nom = VARIABLE_PRIX_PAR_MODE[mode]
  const prix = (env[nom] ?? '').trim()
  if (!/^price_[A-Za-z0-9]+$/u.test(prix)) {
    return { ok: false, motif: `${nom} est absente ou mal formée : le prix de ce plan n'est pas configuré` }
  }
  return { ok: true, prix }
}
