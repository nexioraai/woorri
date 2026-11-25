import 'server-only'
/**
 * PUBLIER UN SITE, CARTE OU MOBILE MONEY (lot L5, 2026-11-25).
 *
 * La MÊME fenêtre « Publier » que les applis : « Carte bancaire » (Stripe, le
 * chemin de toujours) et « Mobile money » (MoneRails), au prix unique tiré du
 * prix NET du type de site par la formule de l'appli —
 *   Vitrine  6 000 net → 7 000 FCFA ;  Boutique 9 000 net → 10 500 FCFA ;
 * le Dropshipping se paie par carte SEULEMENT.
 *
 * L'ÉCHÉANCE (décision du propriétaire, 2026-11-25, règle du 2026-11-18) : un
 * site payé en mobile money reste en ligne ; à l'approche de l'échéance (3
 * jours) puis après, le rappel s'affiche AU PROPRIÉTAIRE SEUL ; après
 * l'échéance, ses modifications s'arrêtent (déclencheur en base). La pause du
 * jour 30 vient avec le chantier « abonnement non renouvelé ».
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { prixDuSite } from '@/lib/payments/prix-abonnement'
import { mobileMoneyPermis, type ProduitDeribfy } from '@/lib/payments/moyens-par-produit'
import { lireTarifMobileMoney, mobileMoneyOuvert, prixNetSitePourMode } from '@/lib/payments/mobile-money/encaissement'
import type { MoyenPublication } from '@/lib/apps/compteur-phrases'

export const PHRASE_SITE_CARTE_SEULEMENT = 'Ce type de site se paie par carte bancaire.'

/** Le produit Deribfy d'un type de site (`sites.mode`). */
export function produitDuMode(mode: unknown): ProduitDeribfy | null {
  return mode === 1 ? 'vitrine' : mode === 2 ? 'boutique' : mode === 3 ? 'dropshipping' : null
}

/** Le rappel au propriétaire : 3 jours avant l'échéance, puis après. `null` : rien à dire. */
export const JOURS_RAPPEL = 3
export type Rappel = 'bientot' | 'echu' | null
export function rappelDe(payeJusquAu: string | null, maintenantMs: number = Date.now()): Rappel {
  if (payeJusquAu === null) return null
  const fin = Date.parse(payeJusquAu)
  if (!Number.isFinite(fin)) return null
  if (fin <= maintenantMs) return 'echu'
  return fin - maintenantMs <= JOURS_RAPPEL * 86_400_000 ? 'bientot' : null
}

export type EtatPublicationSite = {
  readonly enLigne: boolean
  readonly lien: string
  readonly moyens: readonly MoyenPublication[]
  /** L'échéance d'un site payé en mobile money, ou `null`. */
  readonly payeJusquAu: string | null
  readonly rappel: Rappel
}

/** Ce que « Publier » propose pour CE site, et où il en est. */
export async function etatPublicationSite(
  site: { readonly id: string; readonly slug: string; readonly mode: unknown; readonly published: unknown; readonly subscription_status?: unknown },
  proprietaire: string,
  email: string | null,
): Promise<EtatPublicationSite> {
  const produit = produitDuMode(site.mode)
  const [carte, mm, ab] = await Promise.all([
    Promise.resolve(prixDuSite(site.mode, process.env).ok),
    (async () => produit !== null && mobileMoneyPermis(produit) && (await mobileMoneyOuvert(proprietaire, email))
      && (await lireTarifMobileMoney()).ok && (await prixNetSitePourMode(site.mode)) !== null)(),
    supabaseAdmin.from('site_abonnements').select('paye_jusqu_au').eq('site_id', site.id).maybeSingle(),
  ])
  const moyens: MoyenPublication[] = []
  if (carte) moyens.push('carte')
  if (mm) moyens.push('mobile_money')
  // L'échéance ne vaut que pour un site ENCORE publié par le mobile money.
  const enMobileMoney = site.subscription_status === 'mobile_money'
  const payeJusquAu = enMobileMoney && ab.error === null && ab.data !== null ? String((ab.data as { paye_jusqu_au: string }).paye_jusqu_au) : null
  return {
    enLigne: site.published === true,
    lien: `https://${site.slug}.deribfy.app`,
    moyens,
    payeJusquAu,
    rappel: rappelDe(payeJusquAu),
  }
}
