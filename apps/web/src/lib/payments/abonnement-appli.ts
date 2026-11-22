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
import { abonnementDeFacture, finDePeriode, prixDeFacture } from './facture-stripe'

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

/**
 * UN SEUL ABONNEMENT EN COURS PAR APPLI (2026-11-21). Si l'activation tarde, ou
 * échoue, l'atelier propose encore « Publier » → Stripe : sans ce garde, un
 * second clic ouvrait un SECOND abonnement, prélevé chaque mois. Ces états
 * comptent comme « en cours » ; `canceled` et `incomplete_expired`, non.
 */
export const ETATS_ABONNEMENT_EN_COURS: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'])
export const PHRASE_ABONNEMENT_EN_COURS = 'Cette application a déjà un abonnement en cours chez Stripe : rien n’est prélevé une seconde fois. Si l’activation tarde, rechargez la page dans une minute.'

export async function ouvrirPaiementAppli(o: { app: string; proprietaire: string; email: string; origine: string }): Promise<OuverturePaiement> {
  const prix = (process.env.STRIPE_PRICE_APPLICATION ?? '').trim()
  if (!/^price_[A-Za-z0-9]+$/u.test(prix)) return { ok: false, status: 503, erreur: 'Le paiement par carte des applications n’est pas configuré.' }
  const client = await clientDuCompte(o.proprietaire, o.email)
  // Une liste illisible lève : la route répond 502, aucune page ne s'ouvre.
  const abonnements = await getStripe().subscriptions.list({ customer: client, status: 'all', limit: 100 })
  const enCours = abonnements.data.find((s) => s.metadata?.deribfy_app_id === o.app && ETATS_ABONNEMENT_EN_COURS.has(s.status))
  if (enCours !== undefined) {
    console.warn(`[abonnement] appli ${o.app} : abonnement déjà en cours ${enCours.id} (${enCours.status}), aucune page ouverte`)
    return { ok: false, status: 409, erreur: PHRASE_ABONNEMENT_EN_COURS }
  }
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

/**
 * LE PRIX DE L'ABONNEMENT D'UNE APPLI, LU CHEZ STRIPE (2026-11-21).
 *
 * Ce que le client voit sur « Publier » AVANT de partir chez Stripe est le
 * prix que Stripe facturera : il n'est écrit nulle part dans le code. Lu au
 * plus une fois toutes les dix minutes par instance. Illisible → `null`, et
 * l'écran n'envoie personne chez Stripe.
 */
export type PrixAppli = { readonly montant: number; readonly devise: string }
let prixEnCache: { readonly lu: number; readonly valeur: PrixAppli | null } | null = null
export async function lirePrixAppli(): Promise<PrixAppli | null> {
  const id = (process.env.STRIPE_PRICE_APPLICATION ?? '').trim()
  if (!/^price_[A-Za-z0-9]+$/u.test(id)) return null
  if (prixEnCache !== null && Date.now() - prixEnCache.lu < 600_000) return prixEnCache.valeur
  try {
    const p = await getStripe().prices.retrieve(id)
    const valeur = typeof p.unit_amount === 'number' && typeof p.currency === 'string'
      ? { montant: p.unit_amount / 100, devise: p.currency.toUpperCase() }
      : null
    prixEnCache = { lu: Date.now(), valeur }
    return valeur
  } catch (e) {
    console.error('[abonnement] prix Stripe illisible', e instanceof Error ? e.message : e)
    return null
  }
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

/**
 * LA MARQUE D'UNE FACTURE (F1, 2026-11-21 ; partagée le 2026-11-22 avec le
 * cycle de vie) : l'instantané de la facture d'abord, l'ABONNEMENT s'il manque.
 * Lève seulement si Stripe ne répond pas.
 */
export async function marqueAppli(facture: unknown): Promise<{ readonly marque: Readonly<Record<string, string>>; readonly abonnement: string | null }> {
  const ab = abonnementDeFacture(facture)
  if (ab.metadata.deribfy_type === TYPE_APPLICATION || ab.id === null) return { marque: ab.metadata, abonnement: ab.id }
  const sub = await getStripe().subscriptions.retrieve(ab.id)
  return { marque: (sub.metadata ?? {}) as Record<string, string>, abonnement: ab.id }
}

/**
 * Une facture payée : est-ce une appli ? Si oui, l'enregistrer.
 *
 * LE FILET DE LA MARQUE (2026-11-21). La marque se lit d'abord sur l'instantané
 * de la facture (`parent.subscription_details.metadata`). Jamais vu en
 * production pour une appli : si cet instantané manquait, la facture partait
 * dans le chemin des domaines, qui s'arrêtait sans rien écrire — un client
 * payé, rien d'activé, AUCUNE alerte. Désormais, sans marque sur la facture,
 * l'ABONNEMENT fait foi ; et une facture au prix des applis qui n'en porte
 * nulle part est une erreur dite (anomalie + courriel), jamais un silence.
 * Lève seulement si Stripe ne répond pas (le webhook rend 500, Stripe renvoie).
 */
export async function traiterFactureAppli(facture: unknown): Promise<ResultatFacture> {
  const { marque, abonnement } = await marqueAppli(facture)
  const ab = { id: abonnement }
  if (marque.deribfy_type !== TYPE_APPLICATION) {
    const prixApp = (process.env.STRIPE_PRICE_APPLICATION ?? '').trim()
    if (prixApp !== '' && prixDeFacture(facture) === prixApp) {
      return { traitee: true, ok: false, erreur: `facture au prix des applications sans marque Deribfy (abonnement ${String(ab.id)})` }
    }
    return { traitee: false }
  }
  const f = facture as { id?: string; amount_paid?: number; currency?: string }
  const app = marque.deribfy_app_id ?? ''
  const proprietaire = marque.deribfy_owner_id ?? ''
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
