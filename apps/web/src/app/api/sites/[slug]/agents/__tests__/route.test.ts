import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable } from '@/lib/testing/postgrest'

// LES AGENTS DDM, nommés par le propriétaire (CPA, 2026-11-19). Une adresse
// déjà cliente ou fournisseur est refusée : le rôle d'un compte ne change pas.

const journal = journalVierge()
let garde: Record<string, unknown>
let deja: ReponseTable
let ecrit: ReponseTable
let identifiant: string | null
const crees: unknown[] = []
const appelsSiteComptes: number[] = []

vi.mock('@/lib/auth/require-site-owner', () => ({ requireSiteOwner: async () => garde }))
vi.mock('@/lib/audit/journaliser', () => ({ journaliser: async () => {} }))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    rpc: async () => ({ data: identifiant, error: null }),
    auth: { admin: {
      createUser: async (u: unknown) => { crees.push(u); return { data: { user: { id: 'nouveau' } }, error: null } },
      deleteUser: async () => ({}),
    } },
    from: (t: string) => creerFrom({
      site_comptes: { reponse: () => { appelsSiteComptes.push(1); return appelsSiteComptes.length === 1 ? deja : ecrit } },
    }, journal)(t),
  },
}))

import { POST } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const poster = (c: unknown) => new Request('https://x.test/', { method: 'POST', body: JSON.stringify(c) })

beforeEach(() => {
  garde = { ok: true, site: { id: 's1' }, email: 'cpa@cpa.td' }
  deja = { data: null, error: null }
  ecrit = { data: { id: 'a1', email: 'agent@cpa.td', service: 'ddm' }, error: null }
  identifiant = null
  crees.length = 0; appelsSiteComptes.length = 0
  for (const k of Object.keys(journal.ecritures)) delete journal.ecritures[k]
})

describe('nommer un agent DDM', () => {
  it('🔴 seul le propriétaire nomme', async () => {
    garde = { ok: false, response: new Response('{}', { status: 403 }) }
    expect((await POST(poster({ nom: 'Agent', email: 'agent@cpa.td' }), params)).status).toBe(403)
  })

  it('adresse sans accès : accès créé (mot de passe aléatoire), compte agent DDM écrit', async () => {
    const r = await POST(poster({ nom: 'Mahamat Ali', email: ' Agent@CPA.td ' }), params)
    expect(r.status).toBe(201)
    expect((await r.json()).nouvelAcces).toBe(true)
    expect(crees[0]).toMatchObject({ email: 'agent@cpa.td', email_confirm: true })
    const charge = (journal.ecritures.site_comptes[0] as { charge: Record<string, unknown> }).charge
    expect(charge).toMatchObject({ site_id: 's1', user_id: 'nouveau', role: 'agent', service: 'ddm', nom: 'Mahamat Ali' })
  })

  it('🔴 une adresse déjà CLIENT de ce site est refusée, rien n’est écrit', async () => {
    identifiant = 'u-client'
    deja = { data: { id: 'c1', role: 'structure' }, error: null }
    const r = await POST(poster({ nom: 'X Y', email: 'hopital@sante.td' }), params)
    expect(r.status).toBe(409)
    expect(crees).toHaveLength(0)
    expect(journal.ecritures.site_comptes ?? []).toHaveLength(0)
  })

  it('adresse ou nom invalide : refus lisible', async () => {
    expect((await POST(poster({ nom: 'Agent', email: 'pas-une-adresse' }), params)).status).toBe(400)
    expect((await POST(poster({ nom: 'A', email: 'agent@cpa.td' }), params)).status).toBe(400)
  })
})
