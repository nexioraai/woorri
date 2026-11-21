/**
 * LE PLAFOND DE COÛT ARRIVE BIEN À LA BOUCLE (2026-11-21).
 *
 * Mesuré le 2026-11-21 : retirer la ligne `plafondUsd: PLAFOND_USD_GENERATION`
 * de la route laissait les 1 160 tests verts — la boucle était testée, son
 * BRANCHEMENT ne l'était pas. Ce fichier passe par la VRAIE route et la VRAIE
 * boucle : seul le modèle est simulé, et chaque tour coûte 0,30 $ (Opus,
 * 12 000 jetons de sortie à 25 $/M). Avec le plafond de 0,50 $, la boucle
 * s'arrête après UN tour (0,30 + 0,30 > 0,50) ; sans lui, elle en joue un
 * second.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TABLE_GENERATIONS, TABLE_VERSIONS } from '@/lib/apps/journal'
import { TABLE_TENTATIVES } from '@/lib/apps/tentatives'

const etat = vi.hoisted(() => ({ appels: 0, maxTokens: [] as number[] }))
vi.mock('@/lib/apps/quota', async (orig) => ({
  ...(await orig<typeof import('@/lib/apps/quota')>()),
  reserverCreation: async () => ({ ok: true, id: 'resa-1' }),
  solderCreation: async () => ({ ok: true }),
}))
vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'marchand@example.com' }),
}))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  return {
    supabaseAdmin: {
      from: creerFrom(
        {
          [TABLE_GENERATIONS]: { reponse: { data: { id: 'g-1' }, error: null } },
          [TABLE_VERSIONS]: { reponse: { data: null, error: null } },
          [TABLE_TENTATIVES]: { reponse: { data: null, error: null } },
        },
        journalVierge(),
      ),
    },
  }
})
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      stream: (args: { max_tokens: number }) => ({
        finalMessage: () => {
          etat.appels += 1
          etat.maxTokens.push(args.max_tokens)
          // Une réponse sans fichiers : refusée, la boucle voudrait rejouer.
          return { content: [{ type: 'text', text: 'pas de fichiers ici' }], usage: { input_tokens: 100, output_tokens: 12_000 } }
        },
      }),
    }
  },
}))

import { POST } from '../route'

const appel = (demande = 'calcule ma facture SNE') =>
  new Request('https://deribfy.test/api/generateur/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer j' },
    body: JSON.stringify({ demande, nom: 'Facture SNE' }),
  })
const fin = async (r: Response) => JSON.parse((await r.text()).trim().split('\n').filter((l) => l.trim() !== '').at(-1) ?? '{}') as Record<string, unknown>

beforeEach(() => {
  etat.appels = 0
  etat.maxTokens = []
  vi.unstubAllGlobals()
  process.env.GENERATEUR_MOTEUR = 'direct'
  delete process.env.GENERATEUR_FOURNISSEUR
  process.env.ANTHROPIC_API_KEY = 'cle-de-test'
})

describe('le plafond de coût de la route arrive à la boucle', () => {
  it('0,30 $ par tour, plafond 0,50 $ : UN seul appel au modèle, et le motif le dit', async () => {
    const d = await fin(await POST(appel()))
    expect(etat.appels, 'la route n’a pas transmis PLAFOND_USD_GENERATION à la boucle').toBe(1)
    expect(d.ok).toBe(false)
    expect(JSON.stringify(d)).toMatch(/plafond de coût/u)
  })

  it('option B · Anthropic : le PREMIER tour demande moins de 32 000 jetons, assez peu pour tenir dans 0,50 $', async () => {
    await fin(await POST(appel()))
    const premier = etat.maxTokens[0] as number
    expect(premier).toBeLessThan(32_000)
    expect(premier).toBeGreaterThanOrEqual(4_096)
    expect((premier * 25) / 1e6, 'la sortie seule dépasserait le plafond').toBeLessThan(0.5)
  })

  it('option B · cahier trop long pour le plafond : refus AVANT tout appel, et la phrase le dit', async () => {
    const d = await fin(await POST(appel('x'.repeat(300_000))))
    expect(etat.appels, 'le modèle a été appelé malgré une entrée qui dépasse le plafond').toBe(0)
    expect(d.ok).toBe(false)
    expect(String(d.error)).toMatch(/trop long pour être traité en une seule génération/u)
  })

  it('option B · DeepSeek (production) : sortie INCHANGÉE, 65 536 jetons', async () => {
    process.env.GENERATEUR_FOURNISSEUR = 'deepseek'
    process.env.DEEPSEEK_API_KEY = 'cle-de-test'
    const corps: { max_tokens?: number }[] = []
    const vrai = globalThis.fetch
    vi.stubGlobal('fetch', async (u: string | URL | Request, init?: RequestInit) => {
      if (String(u).startsWith('https://api.deepseek.com/')) {
        corps.push(JSON.parse(String(init?.body)) as { max_tokens?: number })
        return new Response(JSON.stringify({ choices: [{ message: { content: 'pas de fichiers ici' }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 100 } }), { status: 200 })
      }
      return vrai(u, init)
    })
    await fin(await POST(appel()))
    delete process.env.GENERATEUR_FOURNISSEUR
    expect(corps.length).toBeGreaterThan(0)
    expect(corps.map((c) => c.max_tokens)).toEqual(corps.map(() => 65_536))
  })
})
