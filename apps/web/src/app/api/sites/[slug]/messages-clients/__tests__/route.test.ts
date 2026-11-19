import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable } from '@/lib/testing/postgrest'

// LES FILS DE TOUS LES CLIENTS, côté DDM (CPA, 2026-11-19) : la garde est
// celle de la gestion (propriétaire ou agent DDM) ; le client visé doit être
// un compte `structure` DE CE SITE.
const journal = journalVierge()
let messages: ReponseTable = { data: [], error: null }
let client: ReponseTable = { data: { id: 'c1' }, error: null }
let garde: Record<string, unknown>

vi.mock('@/lib/auth/require-gestion-clients', () => ({ requireGestionClients: async () => garde }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: (t: string) => creerFrom({
  messages_clients: { reponse: () => messages }, site_comptes: { reponse: () => client },
}, journal)(t) } }))

import { GET, POST } from '../route'
const params = { params: Promise.resolve({ slug: 'cpa' }) }

beforeEach(() => {
  garde = { ok: true, g: { siteId: 's1', acteur: 'agent@cpa.td', viaAdmin: false, qui: 'ddm' } }
  messages = { data: [], error: null }; client = { data: { id: 'c1' }, error: null }
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
  for (const k of Object.keys(journal.ecritures)) delete journal.ecritures[k]
})

describe('messages des clients (DDM)', () => {
  it('🔴 sans la garde de gestion, refusé', async () => {
    garde = { ok: false, response: new Response('{}', { status: 403 }) }
    expect((await GET(new Request('https://x.test/'), params)).status).toBe(403)
  })
  it('la liste résume chaque fil : dernier message et non-lus venus du client', async () => {
    messages = { data: [
      { compte_id: 'c1', de: 'client', texte: 'Bonjour', cree_le: '2026-11-19T10:00:00Z', lu_le: null },
      { compte_id: 'c1', de: 'centrale', texte: 'Reçu', cree_le: '2026-11-19T09:00:00Z', lu_le: null },
    ], error: null }
    const d = await (await GET(new Request('https://x.test/'), params)).json()
    expect(d.fils.c1).toMatchObject({ dernier: 'Bonjour', nonLus: 1 })
  })
  it('🔴 écrire à un compte qui n’est pas un client de CE site → 404, rien n’est écrit', async () => {
    client = { data: null, error: null }
    const r = await POST(new Request('https://x.test/', { method: 'POST', body: JSON.stringify({ compte: 'f1', texte: 'Bonjour' }) }), params)
    expect(r.status).toBe(404)
    expect(journal.ecritures.messages_clients ?? []).toHaveLength(0)
    expect(journal.filtres.site_comptes).toEqual(expect.arrayContaining([['eq', 'site_id', 's1'], ['eq', 'role', 'structure']]))
  })
  it('écrire à un client : message « centrale », signé par l’agent', async () => {
    messages = { data: { id: 'm1' }, error: null }
    const r = await POST(new Request('https://x.test/', { method: 'POST', body: JSON.stringify({ compte: 'c1', texte: 'Votre commande part demain.' }) }), params)
    expect(r.status).toBe(201)
    expect((journal.ecritures.messages_clients[0] as { charge: Record<string, unknown> }).charge).toMatchObject({ site_id: 's1', compte_id: 'c1', de: 'centrale', auteur: 'agent@cpa.td' })
  })
})
