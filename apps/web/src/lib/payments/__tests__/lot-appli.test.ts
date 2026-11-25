/**
 * LE LOT DE MODIFICATIONS, PAYÉ PAR LE CLIENT (2026-11-24) — routes et Stripe.
 *   · GET/POST /api/generateur/lot : abonnement en cours exigé, moyens ouverts,
 *     paiement UNIQUE Stripe au prix STRIPE_PRICE_LOT ;
 *   · /api/generateur/mobile-money&objet=lot : 3 500 FCFA, abonnement en cours exigé ;
 *   · la session Stripe payée d'un lot → enregistrer_paiement(objet = lot).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({
  compteur: null as unknown,
  carte: true, mm: true,
  reglages: {} as Record<string, string> | null,
  sessions: [] as Record<string, unknown>[],
  rpc: [] as [string, Record<string, unknown>][],
  appels: [] as string[],
  encaissees: [] as Record<string, unknown>[],
  ligne: { id: 'a1', statut: 'livree' } as Record<string, unknown> | null,
}))
const REGLAGES = {
  prix_mensuel_xaf: '12000', frais_encaissement_airtel_pct: '7', frais_encaissement_moov_pct: '5',
  frais_reversement_pct: '3.5', frais_retrait_pct: '4', arrondi_frais_xaf: '100', lot_prix_xaf: '3000', lot_taille: '50',
}
vi.mock('server-only', () => ({}))
vi.mock('@/lib/payments/mobile-money/demandes', () => ({
  masquer: (t: string) => t,
  registreDemandes: { ouvrir: async () => ({ issue: 'ouverte', id: 'd1' }), noterReference: async () => undefined, abandonner: async () => undefined, noterAvis: async () => undefined, aRattraper: async () => [], lire: async () => null, marquerActivee: async () => undefined },
}))
vi.mock('@/lib/alertes', () => ({ alerter: async () => 'alerte' }))
vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: () => ({ ok: true, userId: 'u1', email: 'client@exemple.td' }) }))
vi.mock('@/lib/apps/quota', () => ({
  lireReglagesTexte: async () => etat.reglages,
  lireCompteur: async () => etat.compteur,
  PHRASE_COMPTEUR_INDISPONIBLE: 'Le compteur de modifications ne répond pas.',
}))
vi.mock('@/lib/payments/interrupteur', () => ({ interrupteurOuvert: async (cle: string) => (cle === 'abonnement_carte' ? etat.carte : etat.mm) }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  return { supabaseAdmin: {
    from: creerFrom({ app_generations: { reponse: () => ({ data: etat.ligne, error: null }) }, comptes_stripe: { reponse: { data: { customer_id: 'cus_1' }, error: null } } }, journalVierge()),
    rpc: async (n: string, p: Record<string, unknown>) => { etat.rpc.push([n, p]); return { data: { statut: 'enregistre' }, error: null } },
  } }
})
vi.mock('@/lib/stripe', () => ({ getStripe: () => ({ checkout: { sessions: { create: async (p: Record<string, unknown>) => { etat.sessions.push(p); return { url: 'https://checkout.stripe.com/c/pay/cs_lot' } } } } }) }))
vi.mock('@/lib/payments/mobile-money/fournisseur', () => ({
  fournisseurMobileMoney: () => ({ nom: 'monerails', operateurs: async () => { etat.appels.push('operateurs'); return [{ code: 'AIRTEL', nom: 'Airtel Money', validation: 'approbation' }] },
    encaissementsDe: async () => [], encaisser: async (d: Record<string, unknown>) => { etat.appels.push('encaisser'); etat.encaissees.push(d); return { id: 'c1', etat: 'en_attente', montant: 3500, devise: 'XAF', test: true, action: null, echec: null } }, lire: async () => ({}), autoriser: async () => ({}), verifierAvis: () => null }),
}))

import { GET as LOT, POST as LOT_CARTE } from '@/app/api/generateur/lot/route'
import { GET as MM, POST as MM_POST } from '@/app/api/generateur/mobile-money/route'
import { PHRASE_LOT_SANS_ABONNEMENT, traiterSessionLot } from '../lot-appli'
import { PHRASE_MOYEN_FERME } from '@/lib/apps/decision-publication'

const ABONNEE = { exempte: false, formule: 'abonnee', restantes: 0, payeJusquAu: '2099-01-01T00:00:00Z', actif: true }
const GRATUITE = { exempte: false, formule: 'gratuite', restantes: 3, payeJusquAu: null, actif: false }
const req = (u: string, m = 'GET') => new Request(`https://www.deribfy.com${u}`, { method: m, headers: { Authorization: 'Bearer x', origin: 'https://www.deribfy.com' } })
const json = async (r: Response) => ({ status: r.status, d: (await r.json()) as Record<string, unknown> })

beforeEach(() => {
  vi.unstubAllEnvs(); vi.stubEnv('STRIPE_PRICE_LOT', 'price_lot5')
  etat.compteur = ABONNEE; etat.carte = true; etat.mm = true; etat.reglages = { ...REGLAGES }
  etat.sessions = []; etat.rpc = []; etat.appels = []; etat.encaissees = []; etat.ligne = { id: 'a1', statut: 'livree' }
})

describe('GET /api/generateur/lot', () => {
  it('abonnée : possible, 50 modifications, Carte bancaire ET Mobile money', async () => {
    expect(await json(await LOT(req('/api/generateur/lot?id=a1')))).toEqual({ status: 200, d: { possible: true, taille: 50, moyens: ['carte', 'mobile_money'] } })
  })
  it('sans abonnement en cours : pas possible, avec la phrase', async () => {
    etat.compteur = GRATUITE
    expect(await json(await LOT(req('/api/generateur/lot?id=a1')))).toEqual({ status: 200, d: { possible: false, raison: PHRASE_LOT_SANS_ABONNEMENT } })
  })
  it('fermé par défaut : sans prix Stripe du lot → pas de carte ; sans prix du lot en FCFA → pas de mobile money', async () => {
    vi.stubEnv('STRIPE_PRICE_LOT', '')
    expect((await json(await LOT(req('/api/generateur/lot?id=a1')))).d.moyens).toEqual(['mobile_money'])
    vi.stubEnv('STRIPE_PRICE_LOT', 'price_lot5')
    etat.reglages = { ...REGLAGES, lot_prix_xaf: '' }
    expect((await json(await LOT(req('/api/generateur/lot?id=a1')))).d.moyens).toEqual(['carte'])
    etat.carte = false
    expect((await json(await LOT(req('/api/generateur/lot?id=a1')))).d.moyens).toEqual([])
  })
  it('une appli d’un autre compte : 404', async () => {
    etat.ligne = null
    expect((await LOT(req('/api/generateur/lot?id=autre'))).status).toBe(404)
  })
})

describe('POST /api/generateur/lot (carte)', () => {
  it('ouvre un paiement UNIQUE au prix du lot, marqué « lot », retour sur l’atelier', async () => {
    expect(await json(await LOT_CARTE(req('/api/generateur/lot?id=a1', 'POST')))).toEqual({ status: 200, d: { paiement: 'https://checkout.stripe.com/c/pay/cs_lot' } })
    expect(etat.sessions[0]).toMatchObject({
      mode: 'payment', line_items: [{ price: 'price_lot5', quantity: 1 }],
      metadata: { deribfy_type: 'application', deribfy_objet: 'lot', deribfy_app_id: 'a1', deribfy_owner_id: 'u1' },
      success_url: 'https://www.deribfy.com/atelier/a1?lot=recu', cancel_url: 'https://www.deribfy.com/atelier/a1?lot=annule',
    })
  })
  it('sans abonnement : 409 ; carte fermée : 409 ; rien n’est ouvert', async () => {
    etat.compteur = GRATUITE
    expect((await LOT_CARTE(req('/api/generateur/lot?id=a1', 'POST'))).status).toBe(409)
    etat.compteur = ABONNEE; etat.carte = false
    const r = await json(await LOT_CARTE(req('/api/generateur/lot?id=a1', 'POST')))
    expect(r).toEqual({ status: 409, d: { error: PHRASE_MOYEN_FERME } })
    expect(etat.sessions).toEqual([])
  })
})

describe('mobile money, objet = lot', () => {
  it('abonnée : le montant du LOT, 3 500 FCFA (et 14 000 sans objet)', async () => {
    expect((await json(await MM(req('/api/generateur/mobile-money?id=a1&objet=lot')))).d.montant).toBe(3500)
    expect((await json(await MM(req('/api/generateur/mobile-money?id=a1')))).d.montant).toBe(14000)
  })
  it('sans abonnement en cours : 409, avec la phrase, et le prestataire n’est pas appelé', async () => {
    etat.compteur = GRATUITE
    expect(await json(await MM(req('/api/generateur/mobile-money?id=a1&objet=lot')))).toEqual({ status: 409, d: { error: PHRASE_LOT_SANS_ABONNEMENT } })
    expect(etat.appels).toEqual([])
  })
  it('POST objet=lot : la demande part au prix du LOT, marquée « lot »', async () => {
    const r = await MM_POST(new Request('https://www.deribfy.com/api/generateur/mobile-money?id=a1&objet=lot', { method: 'POST', headers: { Authorization: 'Bearer x' }, body: JSON.stringify({ operateur: 'AIRTEL', telephone: '66000001', nom: 'Awa' }) }))
    expect(r.status).toBe(201)
    expect(etat.encaissees[0]).toMatchObject({ montant: 3500, rattachement: { objet: 'lot' }, description: 'Deribfy — lot de modifications' })
  })
  it('objet inconnu : 400', async () => {
    expect((await MM(req('/api/generateur/mobile-money?id=a1&objet=bitcoin'))).status).toBe(400)
  })
})

describe('la session Stripe payée d’un lot', () => {
  const S = { id: 'cs_lot_1', mode: 'payment', payment_status: 'paid', amount_total: 500, currency: 'usd', metadata: { deribfy_type: 'application', deribfy_objet: 'lot', deribfy_app_id: 'a1', deribfy_owner_id: 'u1' } }
  it('→ enregistrer_paiement(objet = lot, référence = la session, 5 USD)', async () => {
    expect(await traiterSessionLot(S)).toEqual({ traitee: true, ok: true, statut: 'enregistre', app: 'a1' })
    expect(etat.rpc).toEqual([['enregistrer_paiement', expect.objectContaining({ p_objet: 'lot', p_reference: 'cs_lot_1', p_montant: 5, p_devise: 'USD', p_fournisseur: 'stripe' })]])
  })
  it('pas un lot Deribfy (achat boutique) : non traitée, le chemin boutique continue', async () => {
    expect(await traiterSessionLot({ ...S, metadata: { order_id: 'o1' } })).toEqual({ traitee: false })
    expect(await traiterSessionLot({ ...S, metadata: { ...S.metadata, deribfy_objet: 'abonnement' } })).toEqual({ traitee: false })
  })
  it('non payée, ou pas en USD : dite, rien n’est écrit', async () => {
    expect(await traiterSessionLot({ ...S, payment_status: 'unpaid' })).toMatchObject({ traitee: true, ok: false })
    expect(await traiterSessionLot({ ...S, currency: 'eur' })).toMatchObject({ traitee: true, ok: false })
    expect(etat.rpc).toEqual([])
  })
})
