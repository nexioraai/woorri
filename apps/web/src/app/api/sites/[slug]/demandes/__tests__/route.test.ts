import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable, type Filtre } from '@/lib/testing/postgrest'
import * as route from '../route'

// LOT 14.2 — la Centrale traite les demandes. Rien n'écrivait `etat` :
// chaque demande restait « reçue » pour toujours.

const journal = journalVierge()
const table: ReponseTable = { data: [], error: null }
let proprietaire: unknown = { site: { id: 'site-1', slug: 'cpa' } }
let modifie: Record<string, unknown> | null = null
let filtresMaj: string[] = []

vi.mock('@/lib/auth/require-site-owner', () => ({ requireSiteOwner: async () => proprietaire }))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => Object.assign(creerFrom({ messages: { reponse: () => table } }, journal)(t), {
      update: (l: Record<string, unknown>) => {
        modifie = l; filtresMaj = []
        const c: Record<string, unknown> = {
          eq: (col: string) => { filtresMaj.push(col); return c },
          select: () => c,
          maybeSingle: async () => ({ data: { id: 'm1', ...l }, error: null }),
        }
        return c
      },
    }),
  },
}))

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const patch = (corps: unknown) => new Request('https://x.test/', {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps),
})
const filtres = (t: string): Filtre[] => journal.filtres[t] ?? []

beforeEach(() => {
  proprietaire = { site: { id: 'site-1', slug: 'cpa' } }
  modifie = null; filtresMaj = []
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
})

describe('lire les demandes', () => {
  it('🔴 le filtre porte sur le SLUG vérifié par la garde', async () => {
    await route.GET(new Request('https://x.test/'), params)
    expect(filtres('messages')).toContainEqual(['eq', 'site_slug', 'cpa'])
  })
  it('🔴 un type inventé ne filtre RIEN', async () => {
    await route.GET(new Request('https://x.test/?type=plainte'), params)
    expect(filtres('messages').some((f) => f[1] === 'type')).toBe(false)
  })
  it('🔴 un non-propriétaire ne lit rien', async () => {
    proprietaire = { response: new Response(null, { status: 403 }) }
    expect((await route.GET(new Request('https://x.test/'), params)).status).toBe(403)
  })
})

describe('répondre', () => {
  it('🔴 répondre passe l’état à « répondu », avec la date', async () => {
    await route.PATCH(patch({ id: 'm1', reponse: 'Votre commande part jeudi.' }), params)
    expect(modifie).toMatchObject({ etat: 'repondu', reponse: 'Votre commande part jeudi.' })
    expect(String(modifie?.repondu_le ?? '').length).toBeGreaterThan(0)
  })
  it('🔴 un état explicite l’emporte', async () => {
    await route.PATCH(patch({ id: 'm1', reponse: 'Clos.', etat: 'clos' }), params)
    expect(modifie).toMatchObject({ etat: 'clos' })
  })
  it('🔴 effacer la réponse efface la date', async () => {
    await route.PATCH(patch({ id: 'm1', reponse: '  ' }), params)
    expect(modifie).toMatchObject({ reponse: null, repondu_le: null })
  })
  it('🔴 un état inventé est refusé', async () => {
    expect((await route.PATCH(patch({ id: 'm1', etat: 'perdu' }), params)).status).toBe(400)
    expect(modifie).toBeNull()
  })
  it('🔴 l’écriture est filtrée par SITE', async () => {
    await route.PATCH(patch({ id: 'm1', etat: 'en_cours' }), params)
    expect(filtresMaj).toContain('site_slug')
  })
  it('🔴 rien à modifier → refus', async () => {
    expect((await route.PATCH(patch({ id: 'm1' }), params)).status).toBe(400)
  })
  it('🔴 aucun DELETE — une demande ne s’efface pas', () => {
    expect(Object.keys(route).sort()).toEqual(['GET', 'PATCH'])
  })
})
