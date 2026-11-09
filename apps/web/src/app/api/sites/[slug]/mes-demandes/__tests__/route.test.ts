import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable, type Filtre } from '@/lib/testing/postgrest'

// ============================================================
// LOT 11 — MES DEMANDES, MES RÉCLAMATIONS.
//
// `/demandes/suivi` du lot 8 exigeait une RÉFÉRENCE : connaître une adresse
// ne devait rien ouvrir. Ici la personne est AUTHENTIFIÉE et ADMISE — mais
// cela déplace le risque, ça ne le supprime pas :
//
//   · l'adresse doit venir du JETON, sinon la route devient l'annuaire des
//     échanges du site ;
//   · le compte doit être ACTIF, pas seulement inscrit — s'inscrire est à la
//     portée de n'importe qui ;
//   · le filtre par SITE doit rester, sinon un compte sur un site voit ses
//     échanges avec tous les autres.
// ============================================================

const journal = journalVierge()
let sitesPublic: ReponseTable = { data: null, error: null }
let comptes: ReponseTable = { data: null, error: null }
let messages: ReponseTable = { data: [], error: null }
let porteur: { id: string; email: string } | null = null

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: porteur }, error: null }) } }),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => creerFrom({
      sites_public: { reponse: () => sitesPublic },
      site_comptes: { reponse: () => comptes },
      messages: { reponse: () => messages },
    }, journal)(t),
  },
}))

import { GET } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const appel = (q = '') =>
  new Request(`https://x.test/api/sites/cpa/mes-demandes${q}`, {
    headers: { authorization: 'Bearer jeton' },
  })

const LIGNE = {
  id: 'm1', reference: 'CPA-AB12CD', subject: null, type: 'demande',
  etat: 'recu', created_at: '2026-11-01', maj_le: null,
  message: 'Bonjour, je souhaite commander des antipaludiques pour le district sanitaire de Moundou, en urgence si possible.',
}

beforeEach(() => {
  porteur = { id: 'u1', email: 'Pharmacie@Hopital.TD' }
  sitesPublic = { data: { id: 'site-1', slug: 'cpa' }, error: null }
  comptes = { data: { etat: 'actif' }, error: null }
  messages = { data: [LIGNE], error: null }
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
})

const filtres = (t: string): Filtre[] => journal.filtres[t] ?? []

describe('qui peut lire', () => {
  it('🔴 sans jeton, le MÊME refus', async () => {
    const r = await GET(new Request('https://x.test/'), params)
    expect(r.status).toBe(403)
    expect(await r.json()).toEqual({ error: 'Accès refusé.' })
  })

  it('🔴 une SESSION ne suffit pas : il faut un compte ACTIF', async () => {
    // S'inscrire est à la portée de n'importe qui. Lire les échanges d'une
    // centrale d'achats publique demande d'avoir été ADMIS.
    for (const etat of ['en_attente', 'suspendu']) {
      comptes = { data: { etat }, error: null }
      expect((await GET(appel(), params)).status, etat).toBe(403)
    }
  })

  it('🔴 sans compte du tout, refusé — et du même refus', async () => {
    comptes = { data: null, error: null }
    const r = await GET(appel(), params)
    expect(r.status).toBe(403)
    expect(await r.json()).toEqual({ error: 'Accès refusé.' })
  })

  it('🔴 un site inconnu rend le MÊME refus', async () => {
    sitesPublic = { data: null, error: null }
    expect((await GET(appel(), params)).status).toBe(403)
  })
})

describe('sur quoi la liste est bâtie', () => {
  it('🔴 l’adresse vient du JETON, normalisée', async () => {
    // Accepter une adresse en paramètre ferait de cette route l'annuaire des
    // échanges du site.
    await GET(appel('?email=quelquun@ailleurs.td'), params)
    expect(filtres('messages')).toContainEqual(['eq', 'email', 'pharmacie@hopital.td'])
    expect(filtres('messages').some((f) => String(f[2]).includes('ailleurs'))).toBe(false)
  })

  it('🔴 le filtre par SITE est posé', async () => {
    await GET(appel(), params)
    expect(filtres('messages')).toContainEqual(['eq', 'site_slug', 'cpa'])
  })

  it('🔴 le compte est cherché sur CE site ET cette personne', async () => {
    await GET(appel(), params)
    const f = filtres('site_comptes').map((x) => x[1])
    expect(f).toContain('site_id')
    expect(f).toContain('user_id')
  })
})

describe('le type est un vocabulaire fermé', () => {
  it('🔴 `reclamation` filtre vraiment', async () => {
    await GET(appel('?type=reclamation'), params)
    expect(filtres('messages')).toContainEqual(['eq', 'type', 'reclamation'])
  })

  it('🔴 un type inventé ne filtre RIEN plutôt que de filtrer n’importe quoi', async () => {
    // Poser `.eq('type', 'plainte')` rendrait une liste vide, et la personne
    // croirait ses messages perdus.
    await GET(appel('?type=plainte'), params)
    expect(filtres('messages').some((f) => f[1] === 'type')).toBe(false)
  })
})

describe('ce qui sort', () => {
  it('🔴 le corps entier ne sort PAS — un extrait suffit', async () => {
    // Deux cents corps entiers pour afficher une liste, c'est la bande
    // passante de quelqu'un qui est peut-être sur un téléphone.
    const d = await (await GET(appel(), params)).json()
    expect(d.demandes[0]).not.toHaveProperty('message')
    expect(d.demandes[0].extrait.length).toBeLessThanOrEqual(101)
    expect(d.demandes[0].extrait.startsWith('Bonjour')).toBe(true)
  })

  it('🔴 un message court n’est pas coupé, et ne gagne pas de points', async () => {
    messages = { data: [{ ...LIGNE, message: 'Merci.' }], error: null }
    const d = await (await GET(appel(), params)).json()
    expect(d.demandes[0].extrait).toBe('Merci.')
  })

  it('🔴 la réponse rappelle SUR QUELLE ADRESSE la liste est bâtie', async () => {
    // Sans elle, l'écran ne peut pas dire pourquoi une demande manque.
    const d = await (await GET(appel(), params)).json()
    expect(d.courriel).toBe('Pharmacie@Hopital.TD')
  })
})
