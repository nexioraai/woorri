/**
 * LA BOÎTE NOIRE D'UNE MODIFICATION (2026-11-23), sur la vraie route.
 *   · la demande, la consigne EXACTE, la réponse BRUTE (mot pour mot), les
 *     décisions, les mesures, ce que l'écran a reçu — dans l'ordre ;
 *   · une écriture refusée ne change RIEN à la réponse rendue.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({ texte: '', erreurBoite: false, boites: [] as Record<string, unknown>[] }))
vi.mock('@/lib/apps/quota', async (orig) => ({
  ...(await orig<typeof import('@/lib/apps/quota')>()),
  reserverModification: async () => ({ ok: true, restantes: 10 }),
  libererModification: async () => ({ ok: true }),
}))
vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'a@b.c' }) }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS, TABLE_VERSIONS } = await import('@/lib/apps/journal')
  const { TABLE_TENTATIVES } = await import('@/lib/apps/tentatives')
  const doc = { fichiers: { 'index.tsx': 'export const a = 1' }, schema: '-- rien', politiques: '' }
  const de = creerFrom({
    [TABLE_GENERATIONS]: { reponse: { data: { document: doc, nom: 'App' }, error: null } },
    [TABLE_VERSIONS]: { reponse: { data: [], error: null } },
    [TABLE_TENTATIVES]: { reponse: { data: null, error: null } },
    alertes_generation: { reponse: { data: null, error: null } },
  }, journalVierge())
  return { supabaseAdmin: { from: (t: string) => (t === 'app_boite_noire'
    ? { insert: async (l: Record<string, unknown>) => { if (etat.erreurBoite) return { error: { message: 'table absente' } }; etat.boites.push(l); return { error: null } } }
    : de(t)) } }
})
vi.mock('@/lib/apps/juge-execution', async () => {
  const { jugeMuet } = await import('@/lib/apps/__tests__/juge-muet')
  return { jugerExecution: jugeMuet }
})
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { stream: () => ({ finalMessage: () => Promise.resolve({ content: [{ type: 'text', text: etat.texte }], stop_reason: 'end_turn', usage: { input_tokens: 2000, output_tokens: 300 } }) }) }
  },
}))
const { POST } = await import('../route')
const appel = () => POST(new Request('https://x/api/generateur/retoucher?id=g1', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ demande: 'mets les boutons en vert' }),
}))

beforeEach(() => { etat.texte = '=== index.tsx ===\nexport const a = 2\n'; etat.erreurBoite = false; etat.boites = [] })

describe('la boîte noire d’une modification', () => {
  it('toutes les étapes, dans l’ordre ; la consigne exacte et la réponse brute, mot pour mot', async () => {
    await appel()
    expect(etat.boites).toHaveLength(1)
    const b = etat.boites[0] as { nature: string; generation_id: string; etapes: { type: string; donnees: Record<string, unknown> }[] }
    expect(b.nature).toBe('retouche')
    expect(b.generation_id).toBe('g1')
    expect(b.etapes.map((e) => e.type)).toEqual(['demande', 'consigne', 'reponse_brute', 'decisions', 'mesures', 'livraison'])
    expect(b.etapes[0]?.donnees.demande).toBe('mets les boutons en vert')
    const consigne = b.etapes[1]?.donnees as { consigneSysteme: string; message: string; empreinteConsigne: string }
    expect(consigne.consigneSysteme.length).toBeGreaterThan(200)
    expect(consigne.message).toContain('=== DEMANDE ===\nmets les boutons en vert')
    expect(consigne.empreinteConsigne).toMatch(/^[0-9a-f]{16}$/u)
    expect(b.etapes[2]?.donnees.texte, 'la réponse brute n’est pas mot pour mot').toBe(etat.texte)
  })
  it('une écriture refusée : la réponse rendue est EXACTEMENT la même', async () => {
    const avec = await (await appel()).json()
    etat.erreurBoite = true
    const sans = await (await appel()).json()
    expect(sans).toEqual(avec)
  })
})
