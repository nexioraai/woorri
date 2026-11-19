import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable } from '@/lib/testing/postgrest'

// ============================================================
// MES COMMANDES (CPA, 2026-11-19) — le client passe et suit ses bons.
//
//   · seul un compte « structure » ACTIF entre (la garde, avec ce rôle) ;
//   · le compte et le site viennent de la GARDE, jamais du corps ;
//   · on ne lit que SES commandes, sur CE site ;
//   · avant la SQL, la page dit « pas encore ouvert » au lieu de casser.
// ============================================================

const journal = journalVierge()
let commandes: ReponseTable = { data: [], error: null }
let lignes: ReponseTable = { data: [], error: null }
let garde: { ok: true; compte: Record<string, unknown>; site: { id: string; slug: string } } | { ok: false; response: Response }
const rolesDemandes: unknown[] = []

vi.mock('@/lib/auth/require-site-compte', () => ({
  requireSiteCompte: async (_r: Request, _s: string, roles: unknown) => { rolesDemandes.push(roles); return garde },
}))
vi.mock('@/lib/audit/journaliser', () => ({ journaliser: async () => {} }))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => creerFrom({
      commandes: { reponse: () => commandes },
      commande_lignes: { reponse: () => lignes },
      catalogue_produits_public: { reponse: { data: [], error: null } },
    }, journal)(t),
  },
}))

import { GET, POST } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const poster = (corps: unknown) => new Request('https://x.test/', {
  method: 'POST', headers: { authorization: 'Bearer j', 'content-type': 'application/json' }, body: JSON.stringify(corps),
})

beforeEach(() => {
  garde = { ok: true, compte: { id: 'c1', email: 'pharma@hopital.td', organisation: 'Hôpital de Moundou' }, site: { id: 's1', slug: 'cpa' } }
  commandes = { data: [], error: null }
  lignes = { data: null, error: null }
  rolesDemandes.length = 0
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
  for (const k of Object.keys(journal.ecritures)) delete journal.ecritures[k]
})

describe('qui commande', () => {
  it('🔴 la garde exige le rôle « structure » — un fournisseur ne commande pas', async () => {
    await GET(new Request('https://x.test/'), params)
    expect(rolesDemandes[0]).toEqual(['structure'])
  })

  it('🔴 garde refusée → refus, sans rien lire ni écrire', async () => {
    garde = { ok: false, response: new Response(JSON.stringify({ error: 'Accès refusé.' }), { status: 403 }) as never }
    expect((await POST(poster({ lignes: [{ designation: 'Quinine', quantite: 2 }] }), params)).status).toBe(403)
    expect(journal.ecritures.commandes ?? []).toHaveLength(0)
  })
})

describe('lire ses commandes', () => {
  it('filtre par SON compte et CE site', async () => {
    commandes = { data: [{ id: 'k1', reference: 'CMD-2026-AAAAAA', etat: 'recue', cree_le: '2026-11-19' }], error: null }
    lignes = { data: [{ commande_id: 'k1', designation: 'Quinine', quantite: 3 }], error: null }
    const r = await GET(new Request('https://x.test/'), params)
    const d = await r.json()
    expect(journal.filtres.commandes).toEqual(expect.arrayContaining([['eq', 'site_id', 's1'], ['eq', 'compte_id', 'c1']]))
    expect(d.commandes[0].lignes).toHaveLength(1)
    expect(d.ouvert).toBe(true)
  })

  it('table pas encore créée : « pas ouvert », pas une erreur', async () => {
    commandes = { data: null, error: { code: '42P01', message: 'relation "commandes" does not exist' } }
    const d = await (await GET(new Request('https://x.test/'), params)).json()
    expect(d).toEqual({ commandes: [], catalogue: [], ouvert: false })
  })
})

describe('passer une commande', () => {
  it('écrit l’en-tête avec le compte et le site DE LA GARDE, puis les lignes', async () => {
    commandes = { data: { id: 'k9', reference: 'CMD-2026-BBBBBB' }, error: null }
    const r = await POST(poster({
      compte_id: 'pirate', site_id: 'autre',
      lignes: [{ designation: 'Paracétamol', quantite: '10', unite: 'boîtes' }, { designation: '', quantite: '' }],
      note: 'Urgent',
    }), params)
    expect(r.status).toBe(201)
    const entete = (journal.ecritures.commandes[0] as { charge: Record<string, unknown> }).charge
    expect(entete).toMatchObject({ site_id: 's1', compte_id: 'c1', note: 'Urgent' })
    const ecrites = (journal.ecritures.commande_lignes[0] as { charge: unknown[] }).charge
    expect(ecrites).toEqual([{ commande_id: 'k9', rang: 0, designation: 'Paracétamol', quantite: 10, unite: 'boîtes', produit_reference: null }])
  })

  it('une commande sans produit est refusée avant toute écriture', async () => {
    const r = await POST(poster({ lignes: [{ designation: '', quantite: '' }] }), params)
    expect(r.status).toBe(400)
    expect(journal.ecritures.commandes ?? []).toHaveLength(0)
  })

  it('si les lignes échouent, l’en-tête est retiré — pas de bon vide chez la Centrale', async () => {
    commandes = { data: { id: 'k9', reference: 'CMD-2026-BBBBBB' }, error: null }
    lignes = { data: null, error: { message: 'boom' } }
    const r = await POST(poster({ lignes: [{ designation: 'Quinine', quantite: 1 }] }), params)
    expect(r.status).toBe(500)
    expect(journal.ecritures.commandes.map((e) => (e as { op: string }).op)).toEqual(['insert', 'delete'])
  })
})
