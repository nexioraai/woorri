import 'server-only'
/**
 * LE LOT DE MODIFICATIONS, PAYÉ PAR LE CLIENT (décision du propriétaire, 2026-11-24).
 *
 * Jusqu'ici, un lot ne s'activait qu'à la main (/admin). Il se paie désormais
 * comme l'abonnement, par la même fenêtre : « Carte bancaire » (Stripe, un
 * paiement UNIQUE au prix `STRIPE_PRICE_LOT`) ou « Mobile money » (MoneRails,
 * prix unique tiré de `lot_prix_xaf` par la formule de l'abonnement).
 *
 * Le lot s'ajoute à un abonnement EN COURS (la base le refuse sinon :
 * PAIEMENT_LOT_SANS_ABONNEMENT) : on le dit avant tout paiement. Chaque moyen
 * est FERMÉ PAR DÉFAUT : carte sans prix Stripe configuré, mobile money sans
 * prix du lot réglé → non proposé.
 *
 * L'argent reçu, `enregistrer_paiement(objet = 'lot')` ajoute `lot_taille`
 * modifications au compteur ; rien n'est publié (l'appli est déjà abonnée).
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'
import { lireCompteur } from '@/lib/apps/quota'
import { lireReglagesTexte } from '@/lib/apps/quota'
import { abonnementCarteOuvert, clientDuCompte, TYPE_APPLICATION } from '@/lib/payments/abonnement-appli'
import { lireLotXaf, lireTarifMobileMoney, mobileMoneyOuvert } from '@/lib/payments/mobile-money/encaissement'
import { mobileMoneyPermis } from '@/lib/payments/moyens-par-produit'
import type { MoyenPublication } from '@/lib/apps/compteur-phrases'

export const OBJET_LOT = 'lot'
export const PHRASE_LOT_SANS_ABONNEMENT = 'Un lot de modifications s’ajoute à un abonnement en cours : abonnez-vous d’abord par « Publier ».'
export const PHRASE_LOT_CARTE_NON_CONFIGUREE = 'Le paiement par carte des lots de modifications n’est pas configuré.'

/** Le prix Stripe du lot (paiement unique), ou `null` s'il n'est pas configuré. */
export function prixStripeLot(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const p = (env.STRIPE_PRICE_LOT ?? '').trim()
  return /^price_[A-Za-z0-9]+$/u.test(p) ? p : null
}

export type EtatLot =
  | { readonly possible: false; readonly raison: string }
  | { readonly possible: true; readonly taille: number; readonly moyens: readonly MoyenPublication[] }

/** Ce que « Ajouter des modifications » propose à ce compte, pour cette appli. */
export async function etatDuLot(app: string, proprietaire: string, email: string | null): Promise<EtatLot | null> {
  const c = await lireCompteur(app, proprietaire)
  if (c === null) return null
  if (c.exempte || !c.actif) return { possible: false, raison: PHRASE_LOT_SANS_ABONNEMENT }
  const [carte, mm, taille] = await Promise.all([
    abonnementCarteOuvert(proprietaire, email).then((o) => o && prixStripeLot() !== null),
    (async () => mobileMoneyPermis('application') && (await mobileMoneyOuvert(proprietaire, email)) && (await lireTarifMobileMoney()).ok && (await lireLotXaf()) !== null)(),
    lireReglagesTexte(['lot_taille']).then((v) => Number((v?.lot_taille ?? '').trim())),
  ])
  const moyens: MoyenPublication[] = []
  if (carte) moyens.push('carte')
  if (mm) moyens.push('mobile_money')
  return { possible: true, taille: Number.isInteger(taille) && taille > 0 ? taille : 0, moyens }
}

/** Ouvre la page Stripe d'un paiement UNIQUE pour un lot. */
export async function ouvrirPaiementLot(o: { app: string; proprietaire: string; email: string; origine: string }): Promise<{ ok: true; url: string } | { ok: false; status: number; erreur: string }> {
  const prix = prixStripeLot()
  if (prix === null) return { ok: false, status: 503, erreur: PHRASE_LOT_CARTE_NON_CONFIGUREE }
  const client = await clientDuCompte(o.proprietaire, o.email)
  const marque: Record<string, string> = { deribfy_type: TYPE_APPLICATION, deribfy_objet: OBJET_LOT, deribfy_app_id: o.app, deribfy_owner_id: o.proprietaire }
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer: client,
    line_items: [{ price: prix, quantity: 1 }],
    client_reference_id: o.app,
    metadata: marque,
    payment_intent_data: { metadata: marque },
    success_url: `${o.origine}/atelier/${o.app}?lot=recu`,
    cancel_url: `${o.origine}/atelier/${o.app}?lot=annule`,
  })
  if (session.url === null) return { ok: false, status: 502, erreur: 'Stripe n’a pas rendu de page de paiement.' }
  return { ok: true, url: session.url }
}

export type ResultatSessionLot =
  | { readonly traitee: false }
  | { readonly traitee: true; readonly ok: true; readonly statut: string; readonly app: string }
  | { readonly traitee: true; readonly ok: false; readonly erreur: string }

/**
 * UNE SESSION STRIPE PAYÉE D'UN LOT → `enregistrer_paiement(objet = 'lot')`.
 * Pas un lot Deribfy : non traitée (le chemin boutique continue). Session non
 * payée : rien. La référence est l'identifiant de la session : rejouée, « déjà
 * enregistré ».
 */
export async function traiterSessionLot(session: unknown): Promise<ResultatSessionLot> {
  const s = session as { id?: string; payment_status?: string; amount_total?: number; currency?: string; metadata?: Record<string, string> | null }
  const m = s.metadata ?? {}
  if (m.deribfy_type !== TYPE_APPLICATION || m.deribfy_objet !== OBJET_LOT) return { traitee: false }
  const app = m.deribfy_app_id ?? ''
  const proprietaire = m.deribfy_owner_id ?? ''
  if (typeof s.id !== 'string' || app === '' || proprietaire === '') return { traitee: true, ok: false, erreur: 'session de lot sans identifiant, appli ou compte' }
  if (s.payment_status !== 'paid') return { traitee: true, ok: false, erreur: `session de lot non payée (${String(s.payment_status)})` }
  if ((s.currency ?? '').toLowerCase() !== 'usd') return { traitee: true, ok: false, erreur: `session de lot en ${String(s.currency)} — attendu USD` }
  const r = await supabaseAdmin.rpc('enregistrer_paiement', {
    p_source: 'automatique', p_fournisseur: 'stripe', p_reference: s.id,
    p_app: app, p_owner: proprietaire, p_objet: OBJET_LOT,
    p_montant: (s.amount_total ?? 0) / 100, p_devise: 'USD', p_jusqu_au: null, p_saisi_par: 'stripe',
  })
  if (r.error !== null) return { traitee: true, ok: false, erreur: r.error.message }
  return { traitee: true, ok: true, statut: (r.data as { statut?: string } | null)?.statut ?? 'enregistre', app }
}
