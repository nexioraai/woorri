import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable } from '@/lib/testing/postgrest'

// LES COMPTES CLIENTS, gérés par la DDM (CPA, 2026-11-19) : seulement les
// structures, en lecture ET en écriture ; seul l'état change.

const journal = journalVierge()
let comptes: ReponseTable = { data: [], error: null }
let garde: Record<string, unknown>

vi.mock('@/lib/auth/require-gestion-clients', () => ({ requireGestionClients: async () => garde }))
vi.mock('@/lib/audit/journaliser', () => ({ journaliser: async () => {} }))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (t: string) => creerFrom({ site_comptes: { reponse: () => comptes } }, journal)(t) },
}))

import { GET, PATCH } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const patch = (c: unknown) => new Request('https://x.test/', { method: 'PATCH', body: JSON.stringify(c) })

beforeEach(() => {
  garde = { ok: true, g: { siteId: 's1', acteur: 'agent@cpa.td', viaAdmin: false, qui: 'ddm' } }
  comptes = { data: [], error: null }
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
  for (const k of Object.keys(journal.ecritures)) delete journal.ecritures[k]
})

describe('comptes clients', () => {
  it('🔴 garde refusée → refus', async () => {
    garde = { ok: false, response: new Response('{}', { status: 403 }) }
    expect((await GET(new Request('https://x.test/'), params)).status).toBe(403)
    expect((await PATCH(patch({ id: 'c1', etat: 'suspendu' }), params)).status).toBe(403)
  })

  it('la liste ne rend que les STRUCTURES de CE site', async () => {
    await GET(new Request('https://x.test/'), params)
    expect(journal.filtres.site_comptes).toEqual(expect.arrayContaining([['eq', 'site_id', 's1'], ['eq', 'role', 'structure']]))
  })

  it('suspendre ne touche qu’un client de ce site ; seul l’état est écrit', async () => {
    comptes = { data: { id: 'c1', email: 'h@h.td', etat: 'suspendu' }, error: null }
    expect((await PATCH(patch({ id: 'c1', etat: 'suspendu', role: 'agent' }), params)).status).toBe(200)
    expect(journal.filtres.site_comptes).toEqual(expect.arrayContaining([['eq', 'id', 'c1'], ['eq', 'site_id', 's1'], ['eq', 'role', 'structure']]))
    const charge = (journal.ecritures.site_comptes[0] as { charge: Record<string, unknown> }).charge
    expect(Object.keys(charge).sort()).toEqual(['etat', 'maj_le'])
  })

  it('un état inconnu, ou un compte qui n’est pas client, est refusé', async () => {
    expect((await PATCH(patch({ id: 'c1', etat: 'supprime' }), params)).status).toBe(400)
    comptes = { data: null, error: null }
    expect((await PATCH(patch({ id: 'f1', etat: 'suspendu' }), params)).status).toBe(404)
  })
})
