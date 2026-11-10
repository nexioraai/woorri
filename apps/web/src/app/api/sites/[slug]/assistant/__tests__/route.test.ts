import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge } from '@/lib/testing/postgrest'

// ============================================================
// LOT 16 — L'ASSISTANT NE DÉPENSE QUE CE QUI EST PERMIS.
//
// Chaque appel au fournisseur coûte. Ce cliquet tient la seule chose qui
// compte pour la facture : AUCUN appel ne part quand l'interrupteur est
// éteint ou qu'un des trois plafonds est atteint — et chaque question qui
// part est COMPTÉE avant de partir.
// ============================================================

let site: Record<string, unknown> | null = { id: 'site-1', name: 'CPA', assistant_actif: true }
let compteJour = 0
let compteHeure = 0
let comptees = 0
let appels: unknown[] = []
let insertions: Record<string, unknown>[] = []
let lectureAnonyme = 0

vi.mock('@/lib/ia/client', () => ({
  MODELE_LEGER: 'modele-test',
  clientIA: () => ({ messages: { create: async (a: unknown) => { appels.push(a); return { content: [{ type: 'text', text: 'Réponse (voir : /qui-sommes-nous)' }] } } } }),
}))

// LE HARNAIS FIDÈLE : il honore la projection comme PostgREST. Premier jet
// avec un `select: () =>` maison — refusé par \`postgrestProjectionFidelity\`,
// et il avait raison : la projection de \`assistant_actif\` est exactement ce
// qui décide si un appel payant part.
const journal = journalVierge()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (t: string) => { lectureAnonyme++; return creerFrom({
      site_pages_public: { reponse: () => ({ data: [{ chemin: 'qui-sommes-nous', titre: 'Qui sommes-nous', corps: 'La Centrale achète des médicaments.' }], error: null }) },
      appels_offres_public: { reponse: () => ({ data: [], error: null }) },
    }, journal)(t) },
  }),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => {
      if (t === 'sites') return creerFrom({ sites: { reponse: () => ({ data: site, error: null }) } }, journal)(t)
      // assistant_questions
      return {
        delete: () => ({ eq: () => ({ lt: async () => ({}) }) }),
        insert: async (l: Record<string, unknown>) => { insertions.push(l); comptees++; return {} },
        select: (_cols: string) => {
          const c: Record<string, unknown> = {}
          let parAdresse = false
          c.eq = (col: string) => { if (col === 'ip_hache') parAdresse = true; return c }
          c.gte = async () => ({ count: parAdresse ? compteHeure : compteJour })
          return c
        },
      }
    },
  },
}))

import { POST, PAR_JOUR, PAR_HEURE, PAR_CONVERSATION } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const poser = (question = 'Que fait la Centrale ?', historique: unknown[] = []) =>
  POST(new Request('https://x.test/', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '41.202.1.1' },
    body: JSON.stringify({ question, historique }),
  }), params)

beforeEach(() => {
  site = { id: 'site-1', name: 'CPA', assistant_actif: true }
  compteJour = 0; compteHeure = 0; comptees = 0; appels = []; insertions = []; lectureAnonyme = 0
})

describe('les plafonds validés par le propriétaire', () => {
  it('🔴 ce sont bien 10 / 10 / 200', () => {
    expect([PAR_CONVERSATION, PAR_HEURE, PAR_JOUR]).toEqual([10, 10, 200])
  })
})

describe('aucun appel payant quand ce n’est pas permis', () => {
  it('🔴 interrupteur éteint → aucun appel, rien de compté', async () => {
    site = { id: 'site-1', name: 'X', assistant_actif: false }
    expect((await poser()).status).toBe(404)
    expect(appels).toHaveLength(0); expect(comptees).toBe(0)
  })

  it('🔴 site inconnu → aucun appel', async () => {
    site = null
    await poser()
    expect(appels).toHaveLength(0)
  })

  it('🔴 200 questions aujourd’hui → aucun appel', async () => {
    compteJour = PAR_JOUR
    expect((await poser()).status).toBe(429)
    expect(appels).toHaveLength(0); expect(comptees).toBe(0)
  })

  it('🔴 10 questions dans l’heure pour cette adresse → aucun appel', async () => {
    compteHeure = PAR_HEURE
    expect((await poser()).status).toBe(429)
    expect(appels).toHaveLength(0)
  })

  it('🔴 10 questions dans la conversation → aucun appel', async () => {
    const h = Array.from({ length: 10 }, (_, i) => ({ role: 'user', content: `q${i}` }))
    expect((await poser('encore une', h)).status).toBe(429)
    expect(appels).toHaveLength(0)
  })

  it('🔴 une question vide ne part pas', async () => {
    expect((await poser(' ')).status).toBe(400)
    expect(appels).toHaveLength(0)
  })
})

describe('ce qui part, et ce qui est gardé', () => {
  it('🔴 sous les plafonds, la question part ET elle est comptée', async () => {
    const r = await poser()
    expect(r.status).toBe(200)
    expect(appels).toHaveLength(1)
    expect(comptees).toBe(1)
  })

  it('🔴 on garde une EMPREINTE, jamais l’adresse ni la question', async () => {
    await poser('Mon numéro est 66 00 00 00')
    const ligne = JSON.stringify(insertions[0])
    expect(ligne).not.toContain('41.202.1.1')
    expect(ligne).not.toContain('66 00')
    expect(Object.keys(insertions[0]).sort()).toEqual(['ip_hache', 'site_id'])
  })

  it('🔴 le contenu donné au modèle est lu avec la clé ANONYME', async () => {
    await poser()
    expect(lectureAnonyme).toBeGreaterThan(0)
  })

  it('🔴 les consignes interdisent d’inventer et imposent la source', async () => {
    await poser()
    const sys = String((appels[0] as { system: string }).system)
    expect(sys).toMatch(/Je ne trouve pas cette information sur le site/)
    expect(sys).toMatch(/N'invente jamais/)
    expect(sys).toMatch(/voir : \/adresse/)
  })

  it('🔴 la sortie est bornée', async () => {
    await poser()
    expect((appels[0] as { max_tokens: number }).max_tokens).toBeLessThanOrEqual(600)
  })
})
