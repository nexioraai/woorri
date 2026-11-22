/**
 * LE CYCLE DE VIE STRIPE D'UNE APPLICATION — de bout en bout PAR LA ROUTE (2026-11-22).
 *
 * Chaque avis est CONSTRUIT puis SIGNÉ ici, avec la vraie vérification de
 * signature du SDK Stripe et un secret factice : la route le reçoit comme elle
 * recevrait celui de Stripe. Aucune clé, aucun appel réseau.
 *
 * Ce que ce fichier NE PEUT PAS voir : la vraie base. Elle est jouée par un
 * double en mémoire qui suit la règle des deux fonctions SQL ; leur vrai
 * comportement (verrou, doublon, dépublication) est prouvé sur un Postgres
 * jetable par scripts/preuve-quota-sql.mjs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'

vi.mock('server-only', () => ({}))
const SECRET = 'whsec_factice_signe_localement'

type Ligne = { reference: string; app: string; objet: string; jusqu_au: number; saisi_par?: string }
const etat = vi.hoisted(() => ({
  paiementsDeFacture: {} as Record<string, string>,
  factures: {} as Record<string, Record<string, unknown>>,
  abonnements: {} as Record<string, { id: string; status: string; metadata: Record<string, string> }>,
  annulesChezStripe: [] as string[],
  registre: [] as Ligne[],
  finDePeriode: {} as Record<string, number>,
  depubliees: [] as string[],
  rpc: [] as string[],
  alertes: [] as { type: string; details: Record<string, unknown> }[],
  // La publication après paiement a ses propres tests (publier-apres-paiement) : ici, on note l'appel.
  publications: [] as string[],
  // Le journal du double FIDÈLE (projection honorée, filtres et écritures capturés).
  pg: { filtres: {}, projections: {}, ecritures: {} } as { filtres: Record<string, [string, string, unknown][]>; projections: Record<string, string>; ecritures: Record<string, { op: string; charge?: unknown }[]> },
  maintenant: 1_800_000_000_000,
}))

vi.mock('@/lib/stripe', async () => {
  const S = (await import('stripe')).default
  const vrai = new S('cle_factice_jamais_appelee')
  return {
    getStripe: () => ({
      webhooks: vrai.webhooks,
      invoicePayments: { list: async (p: { payment: { payment_intent: string } }) => ({ data: etat.paiementsDeFacture[p.payment.payment_intent] ? [{ invoice: etat.paiementsDeFacture[p.payment.payment_intent] }] : [] }) },
      invoices: { retrieve: async (id: string) => etat.factures[id] },
      subscriptions: {
        retrieve: async (id: string) => etat.abonnements[id] ?? { id, status: 'active', metadata: {} },
        cancel: async (id: string) => { etat.annulesChezStripe.push(id); etat.abonnements[id] = { ...etat.abonnements[id], status: 'canceled' }; return etat.abonnements[id] },
      },
    }),
  }
})

// La base : la règle d'enregistrer_paiement et d'annuler_paiement_stripe, en mémoire.
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom } = await import('@/lib/testing/postgrest')
  // Le journal des avis : un identifiant est « déjà traité » s'il a été INSÉRÉ plus tôt.
  const dejaNote = (id: unknown) => (etat.pg.ecritures.stripe_avis_traites ?? []).some((e) => e.op === 'insert' && (e.charge as { evenement?: unknown } | undefined)?.evenement === id)
  const from = creerFrom({
    stripe_avis_traites: { reponse: (f) => { const id = [...f].reverse().find((x) => x[0] === 'eq' && x[1] === 'evenement')?.[2]; return { data: dejaNote(id) ? { evenement: id } : null, error: null } } },
    sites: { reponse: { data: [], error: null } },
  }, etat.pg)
  const rpc = async (nom: string, a: Record<string, unknown>) => {
    etat.rpc.push(nom)
    if (nom === 'enregistrer_paiement') {
      if (etat.registre.some((l) => l.reference === a.p_reference)) return { data: { statut: 'deja_enregistre' }, error: null }
      const fin = Date.parse(String(a.p_jusqu_au))
      etat.registre.push({ reference: String(a.p_reference), app: String(a.p_app), objet: 'abonnement', jusqu_au: fin })
      etat.finDePeriode[String(a.p_app)] = Math.max(etat.finDePeriode[String(a.p_app)] ?? 0, fin)
      return { data: { statut: 'enregistre', jusqu_au: a.p_jusqu_au }, error: null }
    }
    if (nom === 'annuler_paiement_stripe') {
      const paye = etat.registre.find((l) => l.reference === a.p_facture && l.objet === 'abonnement')
      if (paye === undefined) return { data: { statut: 'paiement_inconnu' }, error: null }
      const ref = `annulation:${String(a.p_facture)}`
      const deja = etat.registre.find((l) => l.reference === ref)
      if (deja !== undefined) return { data: { statut: 'deja_annule', derniere: deja.saisi_par?.endsWith(':derniere') }, error: null }
      const derniere = paye.jusqu_au >= (etat.finDePeriode[paye.app] ?? 0)
      etat.registre.push({ reference: ref, app: paye.app, objet: 'annulation', jusqu_au: etat.maintenant, saisi_par: `stripe:${String(a.p_motif)}:${derniere ? 'derniere' : 'ancienne'}` })
      if (derniere) { etat.finDePeriode[paye.app] = etat.maintenant; etat.depubliees.push(paye.app) }
      return { data: { statut: 'annule', derniere }, error: null }
    }
    return { data: null, error: { message: 'rpc inconnue ' + nom } }
  }
  return { supabaseAdmin: { rpc, from, auth: { admin: { getUserById: async () => ({ data: { user: null }, error: null }) } } } }
})
vi.mock('@/lib/anomaly', () => ({ logAnomaly: async (a: { type: string; details?: Record<string, unknown> }) => { etat.alertes.push({ type: a.type, details: a.details ?? {} }) } }))
vi.mock('@/lib/payments/publier-apres-paiement', () => ({ publierApresPaiement: async (p: { app: string }) => { etat.publications.push(p.app); return 'publiee' } }))
vi.mock('@/lib/domains/provision', () => ({ provisionDomain: async () => { throw new Error('le chemin des domaines ne doit pas être pris') } }))
vi.mock('@/lib/domains/renewal', () => ({ resilierRenouvellement: async () => { throw new Error('le chemin des domaines ne doit pas être pris') } }))
vi.mock('@/lib/domains/history', () => ({ consignerEvenementDomaine: async () => undefined }))
vi.mock('@/lib/shop/handlePaidCheckout', () => ({ handlePaidCheckout: async () => undefined }))
vi.mock('@/lib/sites/adresse-site', () => ({ assurerAdresseSite: async () => ({ ok: true }) }))

import { POST } from '../route'

const signeur = new Stripe('cle_factice_jamais_appelee')
const ecrituresSites = () => (etat.pg.ecritures.sites ?? []).filter((e) => e.op === 'update').length
const MARQUE = { deribfy_type: 'application', deribfy_app_id: 'app-stock', deribfy_owner_id: 'u-contact' }
const FIN_1 = 1_802_592_000, FIN_2 = 1_805_184_000
const facture = (id: string, fin: number, o: { marque?: Record<string, string>; raison?: string } = {}) => ({
  id, object: 'invoice', currency: 'usd', amount_paid: 2000, amount_due: 2000, billing_reason: o.raison ?? 'subscription_create', attempt_count: 1, next_payment_attempt: null,
  parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_app', metadata: o.marque ?? MARQUE } },
  lines: { data: [{ period: { start: fin - 2_592_000, end: fin }, pricing: { type: 'price_details', price_details: { price: 'price_app' } } }] },
})
const paiement = (pi: string, o: { rembourse: number; total: boolean }) => ({ id: 'ch_' + pi, object: 'charge', payment_intent: pi, amount: 2000, amount_refunded: o.rembourse, refunded: o.total, currency: 'usd' })

let n = 0
async function avis(type: string, objet: unknown, id = `evt_test${String(++n)}`): Promise<Response> {
  const payload = JSON.stringify({ id, object: 'event', api_version: '2026-05-27.dahlia', type, data: { object: objet }, livemode: true, created: 1_800_000_000 })
  const entete = signeur.webhooks.generateTestHeaderString({ payload, secret: SECRET })
  return POST(new Request('https://www.deribfy.com/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': entete }, body: payload }))
}
const payer = async (inv: string, fin: number, pi: string, raison?: string) => {
  etat.factures[inv] = facture(inv, fin, { raison }); etat.paiementsDeFacture[pi] = inv
  return avis('invoice.paid', etat.factures[inv])
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET
  etat.publications = []
  process.env.STRIPE_SECRET_KEY = 'cle_factice_jamais_appelee'
  process.env.STRIPE_PRICE_APPLICATION = 'price_app'
  Object.assign(etat, { paiementsDeFacture: {}, factures: {}, annulesChezStripe: [], registre: [], finDePeriode: {}, depubliees: [], rpc: [], alertes: [] })
  // Vidé SUR PLACE : le double fidèle garde la référence de ce journal.
  for (const k of ['filtres', 'projections', 'ecritures'] as const) for (const t of Object.keys(etat.pg[k])) delete etat.pg[k][t]
  etat.abonnements = { sub_app: { id: 'sub_app', status: 'active', metadata: MARQUE } }
})

describe('cycle de vie Stripe d’une application (avis signés localement)', () => {
  it('signature : un avis mal signé est refusé (400), rien n’est fait', async () => {
    const payload = JSON.stringify({ id: 'evt_x', type: 'invoice.paid', data: { object: facture('in_x', FIN_1) } })
    const r = await POST(new Request('https://x/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=00' }, body: payload }))
    expect(r.status).toBe(400)
    expect(etat.rpc).toEqual([])
  })

  it('a) ACHAT : la première facture active l’appli (marque lue sur la facture, ou sur l’abonnement si elle manque — F1)', async () => {
    expect((await payer('in_1', FIN_1, 'pi_1')).status).toBe(200)
    expect(etat.registre.map((l) => l.reference)).toEqual(['in_1'])
    expect(etat.finDePeriode['app-stock']).toBe(FIN_1 * 1000)
    // RÈGLE 6 (2026-11-22) : le paiement enregistré, l'appli est publiée.
    expect(etat.publications).toEqual(['app-stock'])
    // F1 : instantané vide, l'abonnement fait foi.
    etat.factures.in_f1 = facture('in_f1', FIN_2, { marque: {} })
    expect((await avis('invoice.paid', etat.factures.in_f1)).status).toBe(200)
    expect(etat.registre.map((l) => l.reference)).toEqual(['in_1', 'in_f1'])
  })

  it('b) RENOUVELLEMENT : chaque facture payée prolonge, UNE fois par facture (même facture renvoyée : rien de plus)', async () => {
    await payer('in_1', FIN_1, 'pi_1')
    await payer('in_2', FIN_2, 'pi_2', 'subscription_cycle')
    expect(etat.finDePeriode['app-stock']).toBe(FIN_2 * 1000)
    expect((await avis('invoice.paid', etat.factures.in_2)).status).toBe(200)
    expect(etat.registre.filter((l) => l.reference === 'in_2')).toHaveLength(1)
    expect(etat.registre).toHaveLength(2)
  })

  it('c) PAIEMENT MENSUEL ÉCHOUÉ : rien ne se prolonge, une alerte (/admin + courriel), le chemin des domaines n’est pas pris', async () => {
    await payer('in_1', FIN_1, 'pi_1')
    etat.factures.in_2 = facture('in_2', FIN_2, { raison: 'subscription_cycle' })
    expect((await avis('invoice.payment_failed', { ...etat.factures.in_2, attempt_count: 1, next_payment_attempt: 1_800_300_000 })).status).toBe(200)
    expect(etat.finDePeriode['app-stock']).toBe(FIN_1 * 1000)
    expect(etat.rpc).toEqual(['enregistrer_paiement'])
    expect(etat.alertes.map((a) => a.type)).toEqual(['stripe_paiement_echoue_application'])
    expect(etat.alertes[0]?.details).toMatchObject({ facture: 'in_2', app: 'app-stock', tentative: 1 })
  })

  it('d) ANNULATION PAR LE CLIENT : rien ne change chez nous — le service court jusqu’à la fin de la période payée', async () => {
    await payer('in_1', FIN_1, 'pi_1')
    expect((await avis('customer.subscription.updated', { id: 'sub_app', object: 'subscription', customer: 'cus_c', status: 'active', cancel_at_period_end: true, metadata: MARQUE })).status).toBe(200)
    expect((await avis('customer.subscription.deleted', { id: 'sub_app', object: 'subscription', customer: 'cus_c', status: 'canceled', metadata: MARQUE })).status).toBe(200)
    expect(etat.finDePeriode['app-stock']).toBe(FIN_1 * 1000)
    expect(etat.depubliees).toEqual([])
    expect(ecrituresSites()).toBe(0)
    expect(etat.rpc).toEqual(['enregistrer_paiement'])
  })

  it('e) REMBOURSEMENT TOTAL de la dernière facture : dépubliée, abonnement annulé chez Stripe, ligne d’historique, alerte', async () => {
    await payer('in_1', FIN_1, 'pi_1')
    expect((await avis('charge.refunded', paiement('pi_1', { rembourse: 2000, total: true }))).status).toBe(200)
    expect(etat.depubliees).toEqual(['app-stock'])
    expect(etat.annulesChezStripe).toEqual(['sub_app'])
    expect(etat.registre.find((l) => l.objet === 'annulation')).toMatchObject({ reference: 'annulation:in_1', saisi_par: 'stripe:remboursement:derniere' })
    expect(etat.alertes.map((a) => a.type)).toEqual(['stripe_remboursement_application'])
    expect(etat.alertes[0]?.details).toMatchObject({ facture: 'in_1', app: 'app-stock', appli_depubliee: true })
  })

  it('e) …une facture PLUS ANCIENNE remboursée en entier : la ligne et l’alerte, mais l’appli reste (le mois en cours est payé)', async () => {
    await payer('in_1', FIN_1, 'pi_1')
    await payer('in_2', FIN_2, 'pi_2', 'subscription_cycle')
    await avis('charge.refunded', paiement('pi_1', { rembourse: 2000, total: true }))
    expect(etat.depubliees).toEqual([])
    expect(etat.annulesChezStripe).toEqual([])
    expect(etat.registre.find((l) => l.objet === 'annulation')?.saisi_par).toBe('stripe:remboursement:ancienne')
    expect(etat.alertes[0]?.details).toMatchObject({ appli_depubliee: false })
  })

  it('f) REMBOURSEMENT PARTIEL : rien ne change côté service, alerte (/admin + courriel)', async () => {
    await payer('in_1', FIN_1, 'pi_1')
    expect((await avis('charge.refunded', paiement('pi_1', { rembourse: 500, total: false }))).status).toBe(200)
    expect(etat.depubliees).toEqual([])
    expect(etat.annulesChezStripe).toEqual([])
    expect(etat.rpc).toEqual(['enregistrer_paiement'])
    expect(etat.alertes.map((a) => a.type)).toEqual(['stripe_remboursement_partiel_application'])
    expect(etat.alertes[0]?.details).toMatchObject({ rembourse: 5, sur: 20 })
  })

  it('g) CONTESTATION : comme un remboursement total, et l’alerte dit « litige »', async () => {
    await payer('in_1', FIN_1, 'pi_1')
    expect((await avis('charge.dispute.created', { id: 'du_1', object: 'dispute', payment_intent: 'pi_1', charge: 'ch_pi_1', amount: 2000, currency: 'usd', reason: 'fraudulent' })).status).toBe(200)
    expect(etat.depubliees).toEqual(['app-stock'])
    expect(etat.annulesChezStripe).toEqual(['sub_app'])
    expect(etat.registre.find((l) => l.objet === 'annulation')?.saisi_par).toBe('stripe:litige:derniere')
    expect(etat.alertes.map((a) => a.type)).toEqual(['stripe_litige_application'])
  })

  it('h) LE MÊME AVIS DEUX FOIS : un seul effet, une seule alerte', async () => {
    await payer('in_1', FIN_1, 'pi_1')
    const ch = paiement('pi_1', { rembourse: 500, total: false })
    await avis('charge.refunded', ch, 'evt_double')
    await avis('charge.refunded', ch, 'evt_double')
    expect(etat.alertes).toHaveLength(1)
    await avis('invoice.payment_failed', facture('in_9', FIN_2), 'evt_echec')
    await avis('invoice.payment_failed', facture('in_9', FIN_2), 'evt_echec')
    expect(etat.alertes).toHaveLength(2)
  })

  it('h) DANS LE DÉSORDRE : remboursement AVANT le paiement → 500 (Stripe renverra), puis après le paiement → appliqué une fois', async () => {
    etat.factures.in_1 = facture('in_1', FIN_1); etat.paiementsDeFacture.pi_1 = 'in_1'
    const rb = paiement('pi_1', { rembourse: 2000, total: true })
    expect((await avis('charge.refunded', rb, 'evt_rb')).status).toBe(500)
    expect(etat.depubliees).toEqual([])
    await avis('invoice.paid', etat.factures.in_1)
    expect((await avis('charge.refunded', rb, 'evt_rb')).status).toBe(200)
    expect(etat.depubliees).toEqual(['app-stock'])
  })

  it('h) REMBOURSEMENT ET CONTESTATION de la même facture : une seule annulation, un seul arrêt, Stripe annulé une fois', async () => {
    await payer('in_1', FIN_1, 'pi_1')
    await avis('charge.refunded', paiement('pi_1', { rembourse: 2000, total: true }))
    await avis('charge.dispute.created', { id: 'du_1', object: 'dispute', payment_intent: 'pi_1', amount: 2000, currency: 'usd' })
    expect(etat.registre.filter((l) => l.objet === 'annulation')).toHaveLength(1)
    expect(etat.depubliees).toEqual(['app-stock'])
    expect(etat.annulesChezStripe).toEqual(['sub_app'])
    expect(etat.alertes.map((a) => a.type)).toEqual(['stripe_remboursement_application'])
  })

  it('un remboursement qui n’est PAS d’une appli (boutique, site) : ce module n’y touche pas', async () => {
    expect((await avis('charge.refunded', paiement('pi_boutique', { rembourse: 2000, total: true }))).status).toBe(200)
    expect(etat.rpc).toEqual([])
    expect(etat.alertes).toEqual([])
  })

  it('ÉTAPE 3 · l’avis réel du 2 novembre (renouvellement d’un SITE, forme dahlia mesurée, identifiants factices) : accepté (200)', async () => {
    const r = await avis('customer.subscription.updated', {
      id: 'sub_site_factice', object: 'subscription', customer: 'cus_site_factice', status: 'active', cancel_at_period_end: false, metadata: {},
      items: { data: [{ id: 'si_factice', current_period_end: 1_796_248_062, current_period_start: 1_793_656_062, price: { id: 'price_site', currency: 'cad', unit_amount: 1500 } }] },
    }, 'evt_2nov_factice')
    expect(r.status).toBe(200)
    expect(ecrituresSites()).toBe(1)
  })
})
