import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable } from '@/lib/testing/postgrest'

// QUI GÈRE L'ESPACE CLIENT (CPA, 2026-11-19) : le propriétaire, OU un agent
// du service `ddm`. Un client, un fournisseur, un agent sans service : refusés.

const journal = journalVierge()
let proprio: Record<string, unknown>
let compte: Record<string, unknown>
let service: ReponseTable

vi.mock('@/lib/auth/require-site-owner', () => ({ requireSiteOwner: async () => proprio }))
vi.mock('@/lib/auth/require-site-compte', () => ({
  requireSiteCompte: async (_r: Request, _s: string, roles: string[]) => {
    const c = compte as { ok: boolean; compte?: { role: string } }
    if (!c.ok || !roles.includes(c.compte!.role)) return { ok: false, response: new Response('', { status: 403 }) }
    return c
  },
}))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (t: string) => creerFrom({ site_comptes: { reponse: () => service } }, journal)(t) },
}))

import { requireGestionClients } from '../require-gestion-clients'

const req = new Request('https://x.test/')
const NON = { ok: false, response: new Response('', { status: 403 }) }
const agent = (role: string) => ({ ok: true, compte: { id: 'a1', role, email: 'agent@cpa.td' }, site: { id: 's1', slug: 'cpa' } })

beforeEach(() => {
  proprio = NON; compte = { ok: false }; service = { data: { service: 'ddm' }, error: null }
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
})

describe('requireGestionClients', () => {
  it('le propriétaire entre', async () => {
    proprio = { ok: true, site: { id: 's1' }, email: 'cpa@cpa.td' }
    const r = await requireGestionClients(req, 'cpa')
    expect(r.ok && r.g).toMatchObject({ siteId: 's1', qui: 'proprietaire' })
  })

  it('un agent du service DDM entre — le service lu sur SON compte, CE site', async () => {
    compte = agent('agent')
    const r = await requireGestionClients(req, 'cpa')
    expect(r.ok && r.g).toMatchObject({ siteId: 's1', qui: 'ddm', acteur: 'agent@cpa.td' })
    expect(journal.filtres.site_comptes).toEqual(expect.arrayContaining([['eq', 'id', 'a1'], ['eq', 'site_id', 's1']]))
  })

  it('🔴 un agent SANS service, ou dont le service ne se lit pas, est refusé', async () => {
    compte = agent('agent')
    service = { data: { service: null }, error: null }
    expect((await requireGestionClients(req, 'cpa')).ok).toBe(false)
    service = { data: null, error: { message: 'column service does not exist' } }
    expect((await requireGestionClients(req, 'cpa')).ok).toBe(false)
  })

  it('🔴 un client ou un fournisseur est refusé', async () => {
    for (const role of ['structure', 'fournisseur']) {
      compte = agent(role)
      expect((await requireGestionClients(req, 'cpa')).ok, role).toBe(false)
    }
  })
})
