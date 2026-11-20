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
  }),
}))

import { abonnementDeFacture, finDePeriode } from '../facture-stripe'
import { clientDuCompte, ouvrirPaiementAppli, traiterFactureAppli } from '../abonnement-appli'

const MARQUE = { deribfy_type: 'application', deribfy_app_id: 'app-1', deribfy_owner_id: 'u-1' }
const factureDahlia = (meta: Record<string, string>, devise = 'usd') => ({
  id: 'in_123', amount_paid: 2000, currency: devise,
  parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_9', metadata: meta } },
  lines: { data: [{ period: { start: 1795000000, end: 1797592000 } }] },
})

beforeEach(() => {
  etat.fiche = null; etat.rpc = []; etat.creees = []; etat.sessions = []
  process.env.STRIPE_PRICE_APPLICATION = 'price_app20usd'
})

describe('abonnement d’une appli par carte', () => {
  it('① les deux formes de facture se lisent', () => {
    expect(abonnementDeFacture(factureDahlia(MARQUE))).toEqual({ id: 'sub_9', metadata: MARQUE })
    expect(abonnementDeFacture({ subscription: 'sub_ancien' })).toEqual({ id: 'sub_ancien', metadata: {} })
    expect(finDePeriode(factureDahlia(MARQUE))).toBe(new Date(1797592000 * 1000).toISOString())
  })

  it('② une facture qui n’est pas d’une appli n’est pas traitée ici', async () => {
    expect(await traiterFactureAppli(factureDahlia({}))).toEqual({ traitee: false })
    expect(etat.rpc).toEqual([])
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

  it('⑥ une fiche par compte : retrouvée sans création ; absente, créée UNE fois (clé par compte)', async () => {
    etat.fiche = { customer_id: 'cus_existant' }
    expect(await clientDuCompte('u-1', 'a@b.c')).toBe('cus_existant')
    expect(etat.creees).toEqual([])
    etat.fiche = null
    expect(await clientDuCompte('u-1', 'a@b.c')).toBe('cus_nouveau')
    expect(etat.creees[0]?.[1]).toEqual({ idempotencyKey: 'deribfy_compte_u-1' })
  })
})
