import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge } from '@/lib/testing/postgrest'

// LOT 19 — « ce n'est pas une prison » : la personne supprime son compte.
// Ce cliquet tient ce qui ne doit JAMAIS arriver : supprimer le compte d'un
// autre, effacer un soumissionnaire, laisser ses fichiers au seau, ou retirer
// un accès Deribfy qui sert encore ailleurs.

let journal = journalVierge()
let porteur: { ok: true; userId: string; email: string } | { ok: false } = { ok: true, userId: 'u-1', email: 'a@b.td' }
let compte: unknown = { id: 'c1' }
let offres = 0
let documents: { chemin: string }[] = []
let autresComptes = 0
let sitesPossedes = 0
const retires: string[][] = []
const accesSupprimes: string[] = []

vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: async () => porteur }))
vi.mock('@/app/sites/[slug]/acces/ouvreDesComptes', () => ({ ouvreDesComptes: async () => true }))
vi.mock('@/lib/audit/journaliser', () => ({ journaliser: async () => {} }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {
  from: (t: string) => creerFrom({
    sites_public: { reponse: { data: { id: 'site-1' }, error: null } },
    // La lecture du compte lit `data` ; le comptage des AUTRES comptes lit `count`.
    site_comptes: { reponse: () => ({ data: compte, error: null, count: autresComptes }) as never },
    offres: { reponse: { data: null, error: null, count: offres } as never },
    comptes_documents: { reponse: () => ({ data: documents, error: null }) },
    sites: { reponse: { data: null, error: null, count: sitesPossedes } as never },
  }, journal)(t),
  storage: { from: () => ({ remove: async (c: string[]) => { retires.push(c); return {} } }) },
  auth: { admin: { deleteUser: async (id: string) => { accesSupprimes.push(id); return {} } } },
} }))

import { DELETE } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const supprimer = () => DELETE(new Request('https://x.test/', { method: 'DELETE', headers: { authorization: 'Bearer j' } }), params)
const effacements = () => (journal.ecritures['site_comptes'] ?? []).filter((e) => (e as { op: string }).op === 'delete')

beforeEach(() => {
  journal = journalVierge(); porteur = { ok: true, userId: 'u-1', email: 'a@b.td' }; compte = { id: 'c1' }
  offres = 0; documents = []; autresComptes = 0; sitesPossedes = 0; retires.length = 0; accesSupprimes.length = 0
})

describe('supprimer mon compte', () => {
  it('🔴 sans session : refus, rien n’est effacé', async () => {
    porteur = { ok: false }
    expect((await supprimer()).status).toBe(403)
    expect(effacements()).toHaveLength(0)
  })

  it('🔴 l’effacement est filtré par PERSONNE, jamais par le seul identifiant', async () => {
    expect((await supprimer()).status).toBe(200)
    expect(effacements()).toHaveLength(1)
    expect((journal.filtres['site_comptes'] ?? []).some(([op, col, v]) => op === 'eq' && col === 'user_id' && v === 'u-1')).toBe(true)
  })

  it('🔴 un soumissionnaire n’est JAMAIS effacé : 409, et il sait pourquoi', async () => {
    offres = 1
    const r = await supprimer()
    expect(r.status).toBe(409)
    expect(String((await r.json()).error)).toMatch(/offre/)
    expect(effacements()).toHaveLength(0)
  })

  it('🔴 ses FICHIERS quittent le seau privé, pas seulement leurs lignes', async () => {
    documents = [{ chemin: 'site-1/c1/a.pdf' }, { chemin: 'site-1/c1/b.pdf' }]
    await supprimer()
    expect(retires).toEqual([['site-1/c1/a.pdf', 'site-1/c1/b.pdf']])
  })

  it('🔴 l’accès Deribfy n’est retiré QUE s’il ne sert plus à rien', async () => {
    await supprimer()
    expect(accesSupprimes).toEqual(['u-1'])
  })

  it('🔴 un marchand qui quitte la CPA garde sa boutique ET son accès', async () => {
    sitesPossedes = 1
    await supprimer()
    expect(accesSupprimes).toEqual([])
  })

  it('🔴 un compte sur un autre site garde son accès', async () => {
    autresComptes = 1
    await supprimer()
    expect(accesSupprimes).toEqual([])
  })
})
