/**
 * L'ABONNEMENT D'UNE APPLI PAR CARTE (décision 9A, 2026-11-20).
 *
 * ① une facture « dahlia » (mesurée sur le compte : `parent.subscription_details`)
 *   ET une facture à l'ancienne se lisent toutes deux ;
 * ② une facture qui n'est pas d'une appli n'est pas traitée ici ;
 * ③ une facture d'appli → enregistrer_paiement : automatique, stripe, la FACTURE
 *   en référence, le montant en USD, la fin de période Stripe ;
 * ④ une facture d'appli dans une autre devise que l'USD → refusée, rien n'est écrit ;
 * ⑤ la page de paiement porte la marque APPLICATION (session ET abonnement), le
 *   prix des applis, et la fiche du compte ; prix absent → 503 ;
 * ⑥ une fiche Stripe par compte : retrouvée, jamais recréée.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({
  fiche: null as null | { customer_id: string },
  rpc: [] as unknown[],
  creees: [] as unknown[][],
  sessions: [] as Record<string, unknown>[],
  // F1/F3 (2026-11-21) : l'abonnement lu chez Stripe, et ceux du client.
  abonnement: { metadata: {} } as { metadata: Record<string, string> },
  lus: [] as string[],
  abonnements: [] as { id: string; status: string; metadata: Record<string, string> }[],
  listes: [] as unknown[],
}))

vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  return {
    supabaseAdmin: {
      from: creerFrom({ comptes_stripe: { reponse: () => ({ data: etat.fiche, error: null }) } }, journalVierge()),
      rpc: async (nom: string, args: unknown) => { etat.rpc.push({ nom, args }); return { data: { statut: 'enregistre', jusqu_au: '2026-12-20T00:00:00.000Z' }, error: null } },
    },
  }
})
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    customers: { create: async (...a: unknown[]) => { etat.creees.push(a); return { id: 'cus_nouveau' } } },
    checkout: { sessions: { create: async (p: Record<string, unknown>) => { etat.sessions.push(p); return { url: 'https://checkout.stripe.test/s' } } } },
    subscriptions: {
      retrieve: async (id: string) => { etat.lus.push(id); return etat.abonnement },
      list: async (p: unknown) => { etat.listes.push(p); return { data: etat.abonnements } },
    },
  }),
}))

import { abonnementDeFacture, finDePeriode, prixDeFacture } from '../facture-stripe'
import { clientDuCompte, ouvrirPaiementAppli, PHRASE_ABONNEMENT_EN_COURS, traiterFactureAppli } from '../abonnement-appli'

const MARQUE = { deribfy_type: 'application', deribfy_app_id: 'app-1', deribfy_owner_id: 'u-1' }
const factureDahlia = (meta: Record<string, string>, devise = 'usd', prix = 'price_app20usd') => ({
  id: 'in_123', amount_paid: 2000, currency: devise,
  parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_9', metadata: meta } },
  // Forme MESURÉE sur une facture réelle dahlia (2026-11-21) : le prix sous pricing.price_details.
  lines: { data: [{ period: { start: 1795000000, end: 1797592000 }, pricing: { type: 'price_details', price_details: { price: prix } } }] },
})

beforeEach(() => {
  etat.fiche = null; etat.rpc = []; etat.creees = []; etat.sessions = []
  etat.abonnement = { metadata: {} }; etat.lus = []; etat.abonnements = []; etat.listes = []
  process.env.STRIPE_PRICE_APPLICATION = 'price_app20usd'
})

describe('abonnement d’une appli par carte', () => {
  it('① les deux formes de facture se lisent', () => {
    expect(abonnementDeFacture(factureDahlia(MARQUE))).toEqual({ id: 'sub_9', metadata: MARQUE })
    expect(abonnementDeFacture({ subscription: 'sub_ancien' })).toEqual({ id: 'sub_ancien', metadata: {} })
    expect(finDePeriode(factureDahlia(MARQUE))).toBe(new Date(1797592000 * 1000).toISOString())
  })

  it('② une facture qui n’est pas d’une appli (autre prix, abonnement sans marque) n’est pas traitée ici', async () => {
    expect(await traiterFactureAppli(factureDahlia({}, 'cad', 'price_site15cad'))).toEqual({ traitee: false })
    expect(etat.lus, 'sans marque sur la facture, l’abonnement est relu').toEqual(['sub_9'])
    expect(etat.rpc).toEqual([])
  })

  it('F1 · marque ABSENTE de la facture mais présente sur l’abonnement : enregistrée quand même (jamais un payé-non-activé silencieux)', async () => {
    etat.abonnement = { metadata: MARQUE }
    const r = await traiterFactureAppli(factureDahlia({}))
    expect(r).toMatchObject({ traitee: true, ok: true, statut: 'enregistre' })
    expect((etat.rpc[0] as { args: { p_app: string; p_reference: string } }).args).toMatchObject({ p_app: 'app-1', p_reference: 'in_123' })
  })

  it('F1 · une facture AU PRIX DES APPLIS sans marque nulle part : erreur DITE (anomalie + courriel), rien n’est écrit', async () => {
    const r = await traiterFactureAppli(factureDahlia({}))
    expect(r).toEqual({ traitee: true, ok: false, erreur: 'facture au prix des applications sans marque Deribfy (abonnement sub_9)' })
    expect(etat.rpc).toEqual([])
  })

  it('F1 · marque sur la facture : l’abonnement n’est PAS relu (aucun appel de plus) ; facture sans abonnement : rien n’est lu', async () => {
    await traiterFactureAppli(factureDahlia(MARQUE))
    expect(etat.lus).toEqual([])
    expect(await traiterFactureAppli({ id: 'in_seul', currency: 'usd', lines: { data: [] } })).toEqual({ traitee: false })
    expect(etat.lus).toEqual([])
  })

  it('le prix d’une ligne se lit sous la forme dahlia ET l’ancienne', () => {
    expect(prixDeFacture(factureDahlia(MARQUE))).toBe('price_app20usd')
    expect(prixDeFacture({ lines: { data: [{ price: { id: 'price_ancien' } }] } })).toBe('price_ancien')
    expect(prixDeFacture({})).toBeNull()
  })

  it('③ une facture d’appli → enregistrer_paiement, la facture en référence', async () => {
    const r = await traiterFactureAppli(factureDahlia(MARQUE))
    expect(r).toMatchObject({ traitee: true, ok: true, statut: 'enregistre' })
    expect(etat.rpc).toEqual([{ nom: 'enregistrer_paiement', args: {
      p_source: 'automatique', p_fournisseur: 'stripe', p_reference: 'in_123', p_app: 'app-1', p_owner: 'u-1',
      p_objet: 'abonnement', p_montant: 20, p_devise: 'USD', p_jusqu_au: new Date(1797592000 * 1000).toISOString(), p_saisi_par: 'stripe',
    } }])
  })

  it('④ une autre devise que l’USD : refusée, rien n’est écrit', async () => {
    const r = await traiterFactureAppli(factureDahlia(MARQUE, 'cad'))
    expect(r).toMatchObject({ traitee: true, ok: false })
    expect(etat.rpc).toEqual([])
  })

  it('⑤ la page de paiement porte la marque, le prix des applis et la fiche du compte', async () => {
    etat.fiche = { customer_id: 'cus_compte' }
    const r = await ouvrirPaiementAppli({ app: 'app-1', proprietaire: 'u-1', email: 'a@b.c', origine: 'https://www.deribfy.com' })
    expect(r).toEqual({ ok: true, url: 'https://checkout.stripe.test/s' })
    expect(etat.sessions[0]).toMatchObject({
      mode: 'subscription', customer: 'cus_compte', line_items: [{ price: 'price_app20usd', quantity: 1 }],
      metadata: MARQUE, subscription_data: { metadata: MARQUE },
      success_url: 'https://www.deribfy.com/atelier/app-1?paiement=recu',
    })
    delete process.env.STRIPE_PRICE_APPLICATION
    expect(await ouvrirPaiementAppli({ app: 'app-1', proprietaire: 'u-1', email: 'a@b.c', origine: 'x' })).toMatchObject({ ok: false, status: 503 })
  })

  it('F3 · l’appli a DÉJÀ un abonnement en cours (activation qui tarde) : 409, AUCUNE page de paiement ne s’ouvre', async () => {
    etat.fiche = { customer_id: 'cus_compte' }
    for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused']) {
      etat.sessions = []
      etat.abonnements = [{ id: 'sub_1', status, metadata: MARQUE }]
      expect(await ouvrirPaiementAppli({ app: 'app-1', proprietaire: 'u-1', email: 'a@b.c', origine: 'https://www.deribfy.com' }), status)
        .toEqual({ ok: false, status: 409, erreur: PHRASE_ABONNEMENT_EN_COURS })
      expect(etat.sessions, status).toEqual([])
    }
    expect(etat.listes[0]).toEqual({ customer: 'cus_compte', status: 'all', limit: 100 })
  })

  it('F3 · abonnement terminé (annulé, expiré) ou d’une AUTRE appli : la page s’ouvre', async () => {
    etat.fiche = { customer_id: 'cus_compte' }
    etat.abonnements = [
      { id: 'sub_a', status: 'canceled', metadata: MARQUE },
      { id: 'sub_b', status: 'incomplete_expired', metadata: MARQUE },
      { id: 'sub_c', status: 'active', metadata: { ...MARQUE, deribfy_app_id: 'app-2' } },
      { id: 'sub_d', status: 'active', metadata: {} },
    ]
    expect(await ouvrirPaiementAppli({ app: 'app-1', proprietaire: 'u-1', email: 'a@b.c', origine: 'https://www.deribfy.com' })).toEqual({ ok: true, url: 'https://checkout.stripe.test/s' })
    expect(etat.sessions).toHaveLength(1)
  })

  it('⑥ une fiche par compte : retrouvée sans création ; absente, créée UNE fois (clé par compte)', async () => {
    etat.fiche = { customer_id: 'cus_existant' }
    expect(await clientDuCompte('u-1', 'a@b.c')).toBe('cus_existant')
    expect(etat.creees).toEqual([])
    etat.fiche = null
    expect(await clientDuCompte('u-1', 'a@b.c')).toBe('cus_nouveau')
    expect(etat.creees[0]?.[1]).toEqual({ idempotencyKey: 'deribfy_compte_u-1' })
  })
})
