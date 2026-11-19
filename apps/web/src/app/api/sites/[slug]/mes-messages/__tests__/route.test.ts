import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable } from '@/lib/testing/postgrest'

// MES MESSAGES (CPA, 2026-11-19) : le client ne lit et n'écrit que SON fil ;
// `?compter=1` compte sans rien marquer « lu ».
const journal = journalVierge()
let messages: ReponseTable = { data: [], error: null }
let garde: Record<string, unknown>
const roles: unknown[] = []

vi.mock('@/lib/auth/require-site-compte', () => ({ requireSiteCompte: async (_r: Request, _s: string, r: unknown) => { roles.push(r); return garde } }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: (t: string) => creerFrom({ messages_clients: { reponse: () => messages } }, journal)(t) } }))

import { GET, POST } from '../route'
const params = { params: Promise.resolve({ slug: 'cpa' }) }
const req = (q = '') => new Request(`https://x.test/${q}`)

beforeEach(() => {
  garde = { ok: true, compte: { id: 'c1', email: 'h@h.td' }, site: { id: 's1', slug: 'cpa' } }
  messages = { data: [], error: null }; roles.length = 0
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
  for (const k of Object.keys(journal.ecritures)) delete journal.ecritures[k]
})

describe('mes messages', () => {
  it('🔴 seul un client (`structure`) entre', async () => {
    await GET(req(), params); expect(roles[0]).toEqual(['structure'])
    garde = { ok: false, response: new Response('{}', { status: 403 }) }
    expect((await POST(new Request('https://x.test/', { method: 'POST', body: '{"texte":"x"}' }), params)).status).toBe(403)
  })
  it('lit SON fil (son compte, ce site) et marque lus les messages de la Centrale', async () => {
    messages = { data: [{ id: 'm1', de: 'centrale', lu_le: null }, { id: 'm2', de: 'client', lu_le: null }], error: null }
    await GET(req(), params)
    expect(journal.filtres.messages_clients).toEqual(expect.arrayContaining([['eq', 'site_id', 's1'], ['eq', 'compte_id', 'c1']]))
    const maj = journal.ecritures.messages_clients.find((e) => (e as { op: string }).op === 'update')
    expect(maj).toBeTruthy()
    expect(journal.filtres.messages_clients).toContainEqual(['in', 'id', ['m1']])
  })
  it('`?compter=1` compte sans rien marquer', async () => {
    messages = { data: [{ id: 'm1' }], error: null }
    const d = await (await GET(req('?compter=1'), params)).json()
    expect(d.nonLus).toBe(1)
    expect(journal.ecritures.messages_clients ?? []).toHaveLength(0)
  })
  it('écrire : le compte vient de la garde, le message est « client »', async () => {
    messages = { data: { id: 'm9' }, error: null }
    const r = await POST(new Request('https://x.test/', { method: 'POST', body: JSON.stringify({ texte: '  Bonjour  ', compte_id: 'pirate' }) }), params)
    expect(r.status).toBe(201)
    expect((journal.ecritures.messages_clients[0] as { charge: Record<string, unknown> }).charge).toMatchObject({ site_id: 's1', compte_id: 'c1', de: 'client', texte: 'Bonjour' })
    expect((await POST(new Request('https://x.test/', { method: 'POST', body: '{"texte":"   "}' }), params)).status).toBe(400)
  })
  it('table absente : « pas encore ouvert », pas une erreur', async () => {
    messages = { data: null, error: { code: '42P01', message: 'relation does not exist' } }
    expect(await (await GET(req(), params)).json()).toEqual({ messages: [], ouvert: false })
  })
})
