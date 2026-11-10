import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge } from '@/lib/testing/postgrest'

// ============================================================
// LOT 17 — L'INSCRIPTION DIRECTE.
//
// Décision du propriétaire, 2026-11-10 : pas de courriel de confirmation,
// pas d'examen par la Centrale ; le compte est visible sur le tableau de
// bord. Ce cliquet tient ce qui reste à protéger : le site doit OUVRIR des
// comptes, le rôle « agent » ne se réclame pas, une adresse déjà connue
// n'est JAMAIS reprise, et l'état du compte n'est pas écrit par la route.
// ============================================================

let journal = journalVierge()
let ouvre = true
let siteTrouve: unknown = { id: 'site-1' }
let erreurCompte: unknown = null
let existant: string | null = null
const createUser = vi.fn()
const deleteUser = vi.fn<(id: string) => Promise<object>>(async () => ({}))
const updateUserById = vi.fn(async () => ({}))
const journaliser = vi.fn<(e: unknown) => Promise<void>>(async () => {})

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => creerFrom({
      sites_public: { reponse: () => ({ data: siteTrouve, error: null }) },
      site_comptes: { reponse: () => ({ data: null, error: erreurCompte }) },
    }, journal)(t),
    rpc: async () => ({ data: existant, error: null }),
    auth: { admin: { createUser: (a: unknown) => createUser(a), deleteUser: (id: string) => deleteUser(id), updateUserById: (...a: unknown[]) => updateUserById(...(a as [])) } },
  },
}))
vi.mock('@/app/sites/[slug]/acces/ouvreDesComptes', () => ({ ouvreDesComptes: async () => ouvre }))
vi.mock('@/lib/audit/journaliser', () => ({ journaliser: (e: unknown) => journaliser(e) }))

import { POST } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const BON = { nom: 'Amina Mahamat', organisation: 'Pharma Sahel', role: 'fournisseur', telephone: '+235 66 12 34 56', email: 'Amina@Exemple.td', motDePasse: 'motdepasse1' }
const inscrire = (corps: Record<string, unknown> = BON) =>
  POST(new Request('https://x.test/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) }), params)

beforeEach(() => {
  journal = journalVierge(); ouvre = true; siteTrouve = { id: 'site-1' }; erreurCompte = null; existant = null
  createUser.mockReset(); createUser.mockImplementation(async () => ({ data: { user: { id: 'u-1' } }, error: null }))
  deleteUser.mockClear(); updateUserById.mockClear(); journaliser.mockClear()
})

describe('un seul geste, et le compte existe', () => {
  it('🔴 l’accès est créé CONFIRMÉ — aucun courriel à attendre', async () => {
    const r = await inscrire()
    expect(r.status).toBe(201)
    expect(createUser).toHaveBeenCalledTimes(1)
    expect(createUser.mock.calls[0][0]).toMatchObject({ email: 'amina@exemple.td', password: 'motdepasse1', email_confirm: true })
  })

  it('🔴 le compte de site porte nom, téléphone, organisation, rôle — et l’identité vient de l’accès créé', async () => {
    await inscrire()
    const e = journal.ecritures['site_comptes'] as { op: string; charge: Record<string, unknown> }[]
    expect(e).toHaveLength(1)
    expect(e[0].op).toBe('insert')
    expect(e[0].charge).toEqual({ site_id: 'site-1', user_id: 'u-1', email: 'amina@exemple.td', role: 'fournisseur', organisation: 'Pharma Sahel', nom: 'Amina Mahamat', telephone: '+235 66 12 34 56' })
  })

  it('🔴 la route n’écrit JAMAIS l’état : c’est la base qui le pose', async () => {
    await inscrire({ ...BON, etat: 'suspendu' })
    const e = journal.ecritures['site_comptes'] as { charge: Record<string, unknown> }[]
    expect('etat' in e[0].charge).toBe(false)
  })

  it('🔴 l’inscription est écrite au journal', async () => {
    await inscrire()
    expect(journaliser).toHaveBeenCalledWith(expect.objectContaining({ action: 'compte.inscrire', siteId: 'site-1' }))
  })
})

describe('ce qui est refusé', () => {
  it('🔴 un site qui n’ouvre pas de comptes refuse, même appelé à la main', async () => {
    ouvre = false
    expect((await inscrire()).status).toBe(404)
    expect(createUser).not.toHaveBeenCalled()
  })

  it('🔴 un site inconnu refuse', async () => {
    siteTrouve = null
    expect((await inscrire()).status).toBe(404)
    expect(createUser).not.toHaveBeenCalled()
  })

  it('🔴 « agent » ne se réclame pas', async () => {
    expect((await inscrire({ ...BON, role: 'agent' })).status).toBe(400)
    expect(createUser).not.toHaveBeenCalled()
  })

  for (const [champ, valeur] of [['nom', 'A'], ['organisation', ''], ['telephone', 'abc'], ['email', 'pas-une-adresse'], ['motDePasse', 'court']] as const) {
    it(`🔴 ${champ} invalide → refus, aucun accès créé`, async () => {
      expect((await inscrire({ ...BON, [champ]: valeur })).status).toBe(400)
      expect(createUser).not.toHaveBeenCalled()
    })
  }

  it('🔴 le piège à robots : succès apparent, RIEN n’est créé', async () => {
    expect((await inscrire({ ...BON, site_web: 'http://spam' })).status).toBe(201)
    expect(createUser).not.toHaveBeenCalled()
    expect(journal.ecritures['site_comptes'] ?? []).toHaveLength(0)
  })
})

describe('une adresse déjà connue n’est jamais reprise', () => {
  it('🔴 409 « connectez-vous », sans toucher à l’accès existant', async () => {
    createUser.mockImplementation(async () => ({ data: { user: null }, error: { message: 'already registered' } }))
    existant = 'u-autre'
    const r = await inscrire()
    expect(r.status).toBe(409)
    expect(updateUserById).not.toHaveBeenCalled()
    expect(journal.ecritures['site_comptes'] ?? []).toHaveLength(0)
  })

  it('🔴 si le compte de site échoue, l’accès tout juste créé est retiré — pas d’orphelin', async () => {
    erreurCompte = { code: '23514', message: 'check' }
    expect((await inscrire()).status).toBe(500)
    expect(deleteUser).toHaveBeenCalledWith('u-1')
  })
})
