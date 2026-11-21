/**
 * LE WEBHOOK MOBILE MONEY, DE BOUT EN BOUT (2026-11-21) : corps brut → signature
 * → avis → registre. Vraie implémentation MoneRails, base simulée.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
const etat = vi.hoisted(() => ({ rpc: [] as unknown[], deja: new Set<string>() }))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    rpc: async (n: string, p: { p_reference: string }) => {
      etat.rpc.push([n, p])
      const vu = etat.deja.has(p.p_reference)
      etat.deja.add(p.p_reference)
      return { data: { statut: vu ? 'deja_enregistre' : 'enregistre' }, error: null }
    },
  },
}))
vi.mock('@/lib/apps/quota', () => ({ lirePrixMensuelXaf: async () => 12000 }))
import { POST } from '../route'

const SECRET = 'whsec_essai'
const corps = (o: Record<string, unknown> = {}) => JSON.stringify({
  id: 'evt_1', object: 'event', type: 'collection.succeeded', livemode: false,
  data: { object: { id: 'col_1', object: 'collection', status: 'succeeded', amount: 12000, currency: 'XAF', livemode: false,
    metadata: { deribfy_app: 'a1', deribfy_proprietaire: 'u1', deribfy_objet: 'abonnement', deribfy_montant: '12000' }, ...o } },
})
const appel = (brut: string, signature: string, fournisseur = 'monerails') =>
  POST(new Request(`https://www.deribfy.com/api/webhooks/mobile-money/${fournisseur}`, { method: 'POST', body: brut, headers: { 'Monerail-Signature': signature } }),
    { params: Promise.resolve({ fournisseur }) })
const signe = (brut: string, t = Math.floor(Date.now() / 1000)) => `t=${String(t)},v1=${createHmac('sha256', SECRET).update(`${String(t)}.${brut}`).digest('hex')}`

beforeEach(() => { etat.rpc = []; etat.deja = new Set(); vi.stubEnv('MONERAILS_WEBHOOK_SECRET', SECRET) })
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
  it('bon avis : 200, une ligne ; le même avis rejoué : 200, « déjà enregistré »', async () => {
    const b = corps()
    const r1 = await appel(b, signe(b))
    expect(r1.status).toBe(200)
    expect(await r1.json()).toEqual({ recu: true, issue: 'enregistre' })
    const r2 = await appel(b, signe(b))
    expect(await r2.json()).toEqual({ recu: true, issue: 'deja_enregistre' })
    expect(etat.rpc).toHaveLength(2)
    expect((etat.rpc[0] as [string, { p_fournisseur: string; p_reference: string }])[1]).toMatchObject({ p_fournisseur: 'monerails', p_reference: 'col_1' })
  })
  it('montant trafiqué côté prestataire : 200 (pas de nouvelle tentative), RIEN n’est écrit', async () => {
    const b = corps({ amount: 100 })
    expect(await (await appel(b, signe(b))).json()).toEqual({ recu: true, issue: 'refuse' })
    expect(etat.rpc).toEqual([])
  })
  it('avis réel (mode test seulement) : ignoré', async () => {
    const b = corps({ livemode: true })
    expect(await (await appel(b, signe(b))).json()).toEqual({ recu: true, issue: 'ignore' })
    expect(etat.rpc).toEqual([])
  })
  it('prestataire inconnu : 404', async () => {
    const b = corps()
    expect((await appel(b, signe(b), 'inconnu')).status).toBe(404)
  })
})
