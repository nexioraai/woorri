import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable } from '@/lib/testing/postgrest'

// LES COMMANDES REÇUES (CPA, 2026-11-19) — le propriétaire seul les lit et
// les fait avancer ; le filtre par SITE reste même avec un `id`.

const journal = journalVierge()
let commandes: ReponseTable = { data: [], error: null }
let garde: Record<string, unknown>

vi.mock('@/lib/auth/require-site-owner', () => ({ requireSiteOwner: async () => garde }))
vi.mock('@/lib/audit/journaliser', () => ({ journaliser: async () => {} }))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => creerFrom({
      commandes: { reponse: () => commandes },
      commande_lignes: { reponse: { data: [], error: null } },
      site_comptes: { reponse: { data: [{ id: 'c1', organisation: 'Hôpital de Moundou', email: 'a@b.td' }], error: null } },
    }, journal)(t),
  },
}))

import { GET, PATCH } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const patch = (corps: unknown) => new Request('https://x.test/', { method: 'PATCH', body: JSON.stringify(corps) })

beforeEach(() => {
  garde = { ok: true, site: { id: 's1' }, email: 'cpa@cpa.td' }
  commandes = { data: [], error: null }
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
  for (const k of Object.keys(journal.ecritures)) delete journal.ecritures[k]
})

describe('la Centrale traite ses commandes', () => {
  it('🔴 sans la garde du propriétaire, refusé', async () => {
    garde = { ok: false, response: new Response('{}', { status: 403 }) }
    expect((await GET(new Request('https://x.test/'), params)).status).toBe(403)
    expect((await PATCH(patch({ id: 'k1', etat: 'livree' }), params)).status).toBe(403)
  })

  it('la liste est celle DE CE SITE, avec le client et les lignes', async () => {
    commandes = { data: [{ id: 'k1', reference: 'CMD-2026-AAAAAA', etat: 'recue', cree_le: '2026-11-19', compte_id: 'c1' }], error: null }
    const d = await (await GET(new Request('https://x.test/'), params)).json()
    expect(journal.filtres.commandes).toContainEqual(['eq', 'site_id', 's1'])
    expect(d.commandes[0].client.organisation).toBe('Hôpital de Moundou')
  })

  it('changer l’état garde le filtre par site ; un état inconnu est refusé', async () => {
    commandes = { data: { id: 'k1', reference: 'CMD-2026-AAAAAA', etat: 'livree' }, error: null }
    expect((await PATCH(patch({ id: 'k1', etat: 'livree' }), params)).status).toBe(200)
    expect(journal.filtres.commandes).toEqual(expect.arrayContaining([['eq', 'id', 'k1'], ['eq', 'site_id', 's1']]))
    expect((await PATCH(patch({ id: 'k1', etat: 'payee' }), params)).status).toBe(400)
  })

  it('une réponse porte sa date ; l’effacer efface la date', async () => {
    commandes = { data: { id: 'k1', reference: 'R' }, error: null }
    await PATCH(patch({ id: 'k1', reponse: 'Livraison jeudi.' }), params)
    await PATCH(patch({ id: 'k1', reponse: '  ' }), params)
    const [a, b] = journal.ecritures.commandes.map((e) => (e as { charge: Record<string, unknown> }).charge)
    expect(a.reponse).toBe('Livraison jeudi.'); expect(typeof a.repondu_le).toBe('string')
    expect(b.reponse).toBeNull(); expect(b.repondu_le).toBeNull()
  })

  it('table pas encore créée : pas de panneau, pas d’erreur', async () => {
    commandes = { data: null, error: { code: 'PGRST205', message: 'Could not find the table' } }
    expect(await (await GET(new Request('https://x.test/'), params)).json()).toEqual({ commandes: [], ouvert: false })
  })
})
