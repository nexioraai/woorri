/**
 * LE WEBHOOK MOBILE MONEY, DE BOUT EN BOUT (2026-11-21) : corps brut → signature
 * → avis → registre. Vraie implémentation MoneRails, base simulée.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
const etat = vi.hoisted(() => ({ rpc: [] as unknown[], deja: new Set<string>(), mobileMoney: '' as string, apres: [] as (() => Promise<void>)[], publiees: [] as [string, string][] }))
// 2026-11-23 : le verrou et le journal en base ont leur propre test (mobile-money-l1-l2) ; ici, un registre qui ouvre toujours.
vi.mock('@/lib/payments/mobile-money/demandes', () => ({
  masquer: (t: string) => t.slice(0, 3) + '••••••' + t.slice(-2),
  registreDemandes: { ouvrir: async () => ({ issue: 'ouverte', id: 'd1' }), noterReference: async () => undefined, abandonner: async () => undefined, noterAvis: async () => undefined, aRattraper: async () => [], lire: async () => null, marquerActivee: async () => undefined },
}))
vi.mock('@/lib/alertes', () => ({ alerter: async () => 'alerte' }))
// `after` (2026-11-24) : hors d'une vraie requête, on garde le travail pour le lancer à la main.
vi.mock('next/server', async (origine) => ({ ...(await origine<typeof import('next/server')>()), after: (f: () => Promise<void>) => { etat.apres.push(f) } }))
vi.mock('@/lib/payments/mobile-money/publication', () => ({ publierApresEncaissement: async (app: string, proprietaire: string) => { etat.publiees.push([app, proprietaire]); return 'publiee' } }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  return {
  supabaseAdmin: {
    // Le type d'un site (lot L5) : une Vitrine — par le harnais FIDÈLE (projection, filtres).
    from: creerFrom({ sites: { reponse: { data: { mode: 1 }, error: null } } }, journalVierge()),
    // Le courriel du propriétaire, relu par son identifiant (jamais pris dans l'avis).
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: id === 'u1' ? { email: 'abbas@x.com' } : null } }) } },
    rpc: async (n: string, p: { p_reference: string }) => {
      etat.rpc.push([n, p])
      const vu = etat.deja.has(p.p_reference)
      etat.deja.add(p.p_reference)
      return { data: { statut: vu ? 'deja_enregistre' : 'enregistre' }, error: null }
    },
  },
  }
})
vi.mock('@/lib/apps/quota', () => ({ lireReglagesTexte: async () => ({
  prix_mensuel_xaf: '12000', frais_encaissement_airtel_pct: '7', frais_encaissement_moov_pct: '5',
  frais_reversement_pct: '3.5', frais_retrait_pct: '4', arrondi_frais_xaf: '100', lot_prix_xaf: '3000', prix_site_vitrine_xaf: '6000', prix_site_boutique_xaf: '9000', mobile_money: etat.mobileMoney,
}) }))
import { POST } from '../route'

const SECRET = 'whsec_essai'
const corps = (o: Record<string, unknown> = {}) => JSON.stringify({
  id: 'evt_1', object: 'event', type: 'collection.succeeded', livemode: false,
  data: { object: { id: 'col_1', object: 'collection', status: 'succeeded', amount: 14000, currency: 'XAF', operator: 'AIRTEL', livemode: false,
    metadata: { deribfy_app: 'a1', deribfy_proprietaire: 'u1', deribfy_objet: 'abonnement', deribfy_montant: '14000' }, ...o } },
})
const appel = (brut: string, signature: string, fournisseur = 'monerails') =>
  POST(new Request(`https://www.deribfy.com/api/webhooks/mobile-money/${fournisseur}`, { method: 'POST', body: brut, headers: { 'Monerail-Signature': signature } }),
    { params: Promise.resolve({ fournisseur }) })
const signe = (brut: string, t = Math.floor(Date.now() / 1000), secret = SECRET) => `t=${String(t)},v1=${createHmac('sha256', secret).update(`${String(t)}.${brut}`).digest('hex')}`
const SECRET_LIVE = 'whsec_live'

beforeEach(() => { etat.rpc = []; etat.deja = new Set(); etat.mobileMoney = ''; etat.apres = []; etat.publiees = []; vi.stubEnv('MONERAILS_WEBHOOK_SECRET', SECRET) })
afterEach(() => { vi.unstubAllEnvs() })

describe('webhook mobile money', () => {
  it('signature fausse : 400, rien n’est écrit', async () => {
    const b = corps()
    expect((await appel(b, 't=1,v1=00')).status).toBe(400)
    expect((await appel(b, signe(b).replace(/.$/u, (c) => (c === '0' ? '1' : '0')))).status).toBe(400)
    expect(etat.rpc).toEqual([])
  })
  it('horodatage de plus de 5 minutes (rejeu) : 400', async () => {
    const b = corps()
    expect((await appel(b, signe(b, Math.floor(Date.now() / 1000) - 301))).status).toBe(400)
    expect(etat.rpc).toEqual([])
  })
  it('OPTION A · bon avis de TEST : 200, vérifié et JOURNALISÉ, RIEN n’est écrit (même rejoué)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const b = corps()
    const r1 = await appel(b, signe(b))
    expect(r1.status).toBe(200)
    expect(await r1.json()).toEqual({ recu: true, issue: 'test_verifie' })
    expect(await (await appel(b, signe(b))).json()).toEqual({ recu: true, issue: 'test_verifie' })
    expect(etat.rpc, 'un avis de test a écrit dans le registre').toEqual([])
    const lignes = log.mock.calls.map((c) => String(c[0]))
    log.mockRestore()
    expect(lignes.some((l) => l.includes('avis de TEST vérifié, RIEN n\'est écrit') && l.includes('"p_reference":"col_1"') && l.includes('"p_montant":14000'))).toBe(true)
  })
  it('FRAIS · l’avis de l’essai 3 (12 000, inscrit 12 000) : refusé — le montant attendu est recalculé (14 000, prix unique)', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const b = corps({ amount: 12000, metadata: { deribfy_app: 'a1', deribfy_proprietaire: 'u1', deribfy_objet: 'abonnement', deribfy_montant: '12000' } })
    expect(await (await appel(b, signe(b))).json()).toEqual({ recu: true, issue: 'refuse' })
    err.mockRestore()
    expect(etat.rpc).toEqual([])
  })
  it('montant trafiqué côté prestataire : 200 (pas de nouvelle tentative), RIEN n’est écrit', async () => {
    const b = corps({ amount: 100 })
    expect(await (await appel(b, signe(b))).json()).toEqual({ recu: true, issue: 'refuse' })
    expect(etat.rpc).toEqual([])
  })
  it('L3 · avis réel signé par le secret de TEST : 400 (le secret et livemode doivent s’accorder), rien n’est écrit', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const b = corps({ livemode: true })
    expect((await appel(b, signe(b))).status).toBe(400)
    warn.mockRestore()
    expect(etat.rpc).toEqual([])
  })
  it('L3 · avis réel signé par le secret LIVE, pour un compte SANS le mode réel : refusé, rien n’est écrit', async () => {
    vi.stubEnv('MONERAILS_WEBHOOK_SECRET_LIVE', SECRET_LIVE)
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const b = corps({ livemode: true })
    expect(await (await appel(b, signe(b, Math.floor(Date.now() / 1000), SECRET_LIVE))).json()).toEqual({ recu: true, issue: 'refuse' })
    err.mockRestore()
    expect(etat.rpc).toEqual([])
  })
  it('OUVERT À TOUS · réglage « tous » + clé live : l’avis réel d’un compte quelconque est ENREGISTRÉ', async () => {
    vi.stubEnv('MONERAILS_WEBHOOK_SECRET_LIVE', SECRET_LIVE)
    vi.stubEnv('MONERAILS_CLE_LIVE', 'mr_live_abc')
    etat.mobileMoney = 'tous'
    const b = corps({ livemode: true })
    expect(await (await appel(b, signe(b, Math.floor(Date.now() / 1000), SECRET_LIVE))).json()).toEqual({ recu: true, issue: 'enregistre' })
    expect(etat.rpc.map((x) => (x as [string])[0])).toEqual(['enregistrer_paiement'])
    // LE PAIEMENT REÇU PUBLIE L'APPLI (2026-11-24), APRÈS la réponse au prestataire.
    expect(etat.publiees, 'publié avant la réponse').toEqual([])
    expect(etat.apres).toHaveLength(1)
    await etat.apres[0]!()
    expect(etat.publiees).toEqual([['a1', 'u1']])
  })
  it('LOT · l’avis réel d’un lot (3 500) est ENREGISTRÉ comme lot, et ne publie RIEN (l’appli est déjà abonnée)', async () => {
    vi.stubEnv('MONERAILS_WEBHOOK_SECRET_LIVE', SECRET_LIVE)
    vi.stubEnv('MONERAILS_CLE_LIVE', 'mr_live_abc')
    etat.mobileMoney = 'tous'
    const b = corps({ livemode: true, amount: 3500, metadata: { deribfy_app: 'a1', deribfy_proprietaire: 'u1', deribfy_objet: 'lot', deribfy_montant: '3500' } })
    expect(await (await appel(b, signe(b, Math.floor(Date.now() / 1000), SECRET_LIVE))).json()).toEqual({ recu: true, issue: 'enregistre' })
    expect(etat.rpc).toEqual([['enregistrer_paiement', expect.objectContaining({ p_objet: 'lot', p_montant: 3500 })]])
    expect(etat.apres, 'un lot a lancé une publication').toEqual([])
  })
  it('SITE · l’avis réel d’un site (7 000) est ENREGISTRÉ par la fonction des sites, et le webhook ne publie AUCUNE appli', async () => {
    vi.stubEnv('MONERAILS_WEBHOOK_SECRET_LIVE', SECRET_LIVE)
    vi.stubEnv('MONERAILS_CLE_LIVE', 'mr_live_abc')
    etat.mobileMoney = 'tous'
    const b = corps({ livemode: true, amount: 7000, metadata: { deribfy_site: 's1', deribfy_proprietaire: 'u1', deribfy_objet: 'abonnement', deribfy_montant: '7000' } })
    expect(await (await appel(b, signe(b, Math.floor(Date.now() / 1000), SECRET_LIVE))).json()).toEqual({ recu: true, issue: 'enregistre' })
    expect(etat.rpc).toEqual([['enregistrer_paiement_site', expect.objectContaining({ p_site: 's1', p_montant: 7000 })]])
    expect(etat.apres, 'un site a lancé une publication d’appli').toEqual([])
  })
  it('un avis de TEST, refusé ou ignoré ne publie RIEN', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const b = corps()
    expect(await (await appel(b, signe(b))).json()).toEqual({ recu: true, issue: 'test_verifie' })
    const r = corps({ amount: 100 })
    expect(await (await appel(r, signe(r))).json()).toEqual({ recu: true, issue: 'refuse' })
    const e = corps({ status: 'failed' })
    await appel(e, signe(e))
    err.mockRestore()
    expect(etat.apres).toEqual([])
    expect(etat.publiees).toEqual([])
  })
  it('OUVERT À TOUS · le même avis, réglage vide ou clé live absente : refusé, rien n’est écrit', async () => {
    vi.stubEnv('MONERAILS_WEBHOOK_SECRET_LIVE', SECRET_LIVE)
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const b = corps({ livemode: true })
    vi.stubEnv('MONERAILS_CLE_LIVE', 'mr_live_abc')
    etat.mobileMoney = ''
    expect(await (await appel(b, signe(b, Math.floor(Date.now() / 1000), SECRET_LIVE))).json()).toEqual({ recu: true, issue: 'refuse' })
    vi.stubEnv('MONERAILS_CLE_LIVE', '')
    etat.mobileMoney = 'tous'
    expect(await (await appel(b, signe(b, Math.floor(Date.now() / 1000), SECRET_LIVE))).json()).toEqual({ recu: true, issue: 'refuse' })
    err.mockRestore()
    expect(etat.rpc).toEqual([])
  })
  it('prestataire inconnu : 404', async () => {
    const b = corps()
    expect((await appel(b, signe(b), 'inconnu')).status).toBe(404)
  })
})
