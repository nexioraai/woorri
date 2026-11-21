import 'server-only'
/**
 * L'ABONNEMENT D'UNE APPLICATION PAR CARTE — l'activation automatique (décision 9A, 2026-11-20).
 *
 * « Un paiement arrive → Deribfy l'enregistre, l'abonnement devient actif, le
 * compteur repart. Je n'interviens jamais. » (propriétaire)
 *
 *   ouvrirPaiementAppli()  la page de paiement Stripe, 20 $ US / mois
 *                          (STRIPE_PRICE_APPLICATION), marquée APPLICATION ;
 *   traiterFactureAppli()  une facture payée d'une appli → enregistrer_paiement
 *                          (source automatique, fournisseur stripe, référence =
 *                          la facture : reçue deux fois, comptée une fois) ;
 *   clientDuCompte()       UNE fiche Stripe par compte Deribfy (décision 7A),
 *                          retrouvée avant d'en créer une.
 *
 * Les avis d'une appli ne touchent JAMAIS aux sites : la marque
 * `deribfy_type = application` les aiguille (webhook).
 */
import { interrupteurOuvert } from './interrupteur'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'
import { abonnementDeFacture, finDePeriode } from './facture-stripe'

export const TYPE_APPLICATION = 'application'

/** La fiche Stripe du compte : lue, ou créée UNE fois (clé d'idempotence par compte). */
export async function clientDuCompte(proprietaire: string, email: string): Promise<string> {
  const lu = await supabaseAdmin.from('comptes_stripe').select('customer_id').eq('owner_id', proprietaire).maybeSingle()
  if (lu.error !== null) throw new Error('comptes_stripe illisible : ' + lu.error.message)
  if (lu.data !== null) return (lu.data as { customer_id: string }).customer_id
  const c = await getStripe().customers.create(
    { email, metadata: { deribfy_owner_id: proprietaire } },
    { idempotencyKey: `deribfy_compte_${proprietaire}` },
  )
  // Deux demandes simultanées : la clé d'idempotence rend la MÊME fiche ; la
  // contrainte de la table garde une seule ligne.
  await supabaseAdmin.from('comptes_stripe').upsert({ owner_id: proprietaire, customer_id: c.id }, { onConflict: 'owner_id', ignoreDuplicates: true })
  return c.id
}

export type OuverturePaiement = { readonly ok: true; readonly url: string } | { readonly ok: false; readonly status: number; readonly erreur: string }

export async function ouvrirPaiementAppli(o: { app: string; proprietaire: string; email: string; origine: string }): Promise<OuverturePaiement> {
  const prix = (process.env.STRIPE_PRICE_APPLICATION ?? '').trim()
  if (!/^price_[A-Za-z0-9]+$/u.test(prix)) return { ok: false, status: 503, erreur: 'Le paiement par carte des applications n’est pas configuré.' }
  const client = await clientDuCompte(o.proprietaire, o.email)
  const marque = { deribfy_type: TYPE_APPLICATION, deribfy_app_id: o.app, deribfy_owner_id: o.proprietaire }
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: client,
    line_items: [{ price: prix, quantity: 1 }],
    client_reference_id: o.app,
    metadata: marque,
    subscription_data: { metadata: marque },
    success_url: `${o.origine}/atelier/${o.app}?paiement=recu`,
    cancel_url: `${o.origine}/atelier/${o.app}?paiement=annule`,
  })
  if (session.url === null) return { ok: false, status: 502, erreur: 'Stripe n’a pas rendu de page de paiement.' }
  return { ok: true, url: session.url }
}

/** Le portail Stripe du compte (résilier, changer de carte, factures). */
export async function ouvrirPortail(o: { proprietaire: string; email: string; retour: string }): Promise<string> {
  const client = await clientDuCompte(o.proprietaire, o.email)
  const p = await getStripe().billingPortal.sessions.create({ customer: client, return_url: o.retour })
  return p.url
}

export type ResultatFacture =
  | { readonly traitee: false }
  | { readonly traitee: true; readonly ok: true; readonly statut: string; readonly jusquAu: string | null }
  | { readonly traitee: true; readonly ok: false; readonly erreur: string }

/** Une facture payée : est-ce une appli ? Si oui, l'enregistrer. Ne lève jamais. */
export async function traiterFactureAppli(facture: unknown): Promise<ResultatFacture> {
  const ab = abonnementDeFacture(facture)
  if (ab.metadata.deribfy_type !== TYPE_APPLICATION) return { traitee: false }
  const f = facture as { id?: string; amount_paid?: number; currency?: string }
  const app = ab.metadata.deribfy_app_id ?? ''
  const proprietaire = ab.metadata.deribfy_owner_id ?? ''
  if (typeof f.id !== 'string' || app === '' || proprietaire === '') {
    return { traitee: true, ok: false, erreur: 'facture d’application sans identifiant, appli ou compte' }
  }
  if ((f.currency ?? '').toLowerCase() !== 'usd') {
    return { traitee: true, ok: false, erreur: `facture d’application en ${String(f.currency)} — attendu USD` }
  }
  const r = await supabaseAdmin.rpc('enregistrer_paiement', {
    p_source: 'automatique', p_fournisseur: 'stripe', p_reference: f.id,
    p_app: app, p_owner: proprietaire, p_objet: 'abonnement',
    p_montant: (f.amount_paid ?? 0) / 100, p_devise: 'USD', p_jusqu_au: finDePeriode(facture), p_saisi_par: 'stripe',
  })
  if (r.error !== null) return { traitee: true, ok: false, erreur: r.error.message }
  const d = r.data as { statut: string; jusqu_au: string | null }
  return { traitee: true, ok: true, statut: d.statut, jusquAu: d.jusqu_au }
}

// ── L'INTERRUPTEUR DU PAIEMENT PAR CARTE (décision du propriétaire, 2026-11-20).
//
// « Je ne veux pas qu'un client paie par un chemin jamais prouvé. » Le réglage
// `abonnement_carte` (table quota_reglages) décide :
//   vide ou ABSENT   → éteint pour tous (le défaut, et la clé n'existe pas
//                      tant que le SQL qui l'ajoute n'est pas appliqué) ;
//   « tous »         → allumé pour tous ;
//   une liste        → allumé pour ces comptes seulement (adresses ou
//                      identifiants, séparés par des virgules) : le compte
//                      d'essai du paiement de preuve.
// Une lecture qui échoue ÉTEINT : on ne paie jamais par un chemin incertain.
export async function abonnementCarteOuvert(proprietaire: string, email: string | null): Promise<boolean> {
  return interrupteurOuvert('abonnement_carte', proprietaire, email)
}

export const PHRASE_CARTE_FERMEE = 'Le paiement par carte des applications n’est pas encore ouvert.'
