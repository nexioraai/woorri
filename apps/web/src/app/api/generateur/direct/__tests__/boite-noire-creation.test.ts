/**
 * LA BOÎTE NOIRE D'UNE CRÉATION (2026-11-23), sur la vraie route.
 *   · la demande, la lecture du cahier, la consigne EXACTE et la réponse BRUTE
 *     de chaque tour, les décisions, les contrôles, les mesures, la livraison,
 *     puis l'analyse phrase par phrase — dans l'ordre ;
 *   · une écriture refusée, ou qui JETTE, ne fait pas échouer la création.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TABLE_GENERATIONS, TABLE_VERSIONS } from '@/lib/apps/journal'
import { TABLE_TENTATIVES } from '@/lib/apps/tentatives'

const etat = vi.hoisted(() => ({ texte: '', boite: 'ok' as 'ok' | 'refus' | 'jette', boites: [] as Record<string, unknown>[] }))
vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'issayamiyoussouf@gmail.com' }) }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const de = creerFrom({
    [TABLE_GENERATIONS]: { reponse: { data: { id: 'g-1' }, error: null } },
    [TABLE_VERSIONS]: { reponse: { data: null, error: null } },
    [TABLE_TENTATIVES]: { reponse: { data: null, error: null } },
  }, journalVierge())
  return { supabaseAdmin: { from: (t: string) => (t === 'app_boite_noire'
    ? { insert: async (l: Record<string, unknown>) => {
      if (etat.boite === 'jette') throw new Error('réseau coupé')
      if (etat.boite === 'refus') return { error: { message: 'table absente' } }
      etat.boites.push(l); return { error: null }
    } }
    : de(t)) } }
})
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { stream: () => ({ finalMessage: () => ({ content: [{ type: 'text', text: etat.texte }], usage: { input_tokens: 100, output_tokens: 100 } }) }) }
  },
}))
import { POST } from '../route'

const BON = ['=== index.tsx ===', "import { facture } from './calcul'", 'export const total = facture(159)', '=== calcul.ts ===', 'export const facture = (k: number) => k * 2'].join('\n')
const DEMANDE = 'Calcule ma facture SNE. Chaque client ne voit que ses propres factures.'
const appel = () => POST(new Request('https://deribfy.test/api/generateur/direct', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer j' },
  body: JSON.stringify({ demande: DEMANDE, nom: 'Facture SNE' }),
}))
const fin = async (r: Response) => JSON.parse((await r.text()).trim().split('\n').filter((l) => l.trim() !== '').at(-1) ?? '{}') as Record<string, unknown>

beforeEach(() => {
  etat.texte = BON; etat.boite = 'ok'; etat.boites = []
  process.env.GENERATEUR_MOTEUR = 'direct'
  process.env.ANTHROPIC_API_KEY = 'cle-de-test'
  delete process.env.GENERATEUR_FOURNISSEUR
})

describe('la boîte noire d’une création', () => {
  it('toutes les étapes, dans l’ordre ; la réponse brute mot pour mot ; l’analyse phrase par phrase', async () => {
    const d = await fin(await appel())
    expect(d.ok).toBe(true)
    expect(etat.boites).toHaveLength(1)
    const b = etat.boites[0] as { nature: string; generation_id: string; issue: string; etapes: { type: string; donnees: Record<string, unknown> }[]; analyse_phrases: { phrases: { verdict: string }[] } }
    expect(b).toMatchObject({ nature: 'generation', generation_id: 'g-1', issue: 'livree' })
    const types = b.etapes.map((e) => e.type)
    expect(types.slice(0, 4)).toEqual(['demande', 'lecture_cahier', 'consigne', 'reponse_brute'])
    expect(types.slice(-4)).toEqual(['decisions', 'controles', 'mesures', 'livraison'])
    expect(b.etapes[0]?.donnees.demande).toBe(DEMANDE)
    const consigne = b.etapes[2]?.donnees as { consigneSysteme: string; empreinteConsigne: string; messagesAjoutes: { content: string }[] }
    expect(consigne.consigneSysteme.length, 'la consigne exacte manque').toBeGreaterThan(500)
    expect(consigne.empreinteConsigne).toMatch(/^[0-9a-f]{16}$/u)
    expect(consigne.messagesAjoutes[0]?.content).toContain(DEMANDE)
    expect(b.etapes[3]?.donnees.texte, 'la réponse brute n’est pas mot pour mot').toBe(BON)
    expect(b.etapes.at(-1)?.donnees.messageMontre).toBe('J’ai créé votre application.')
    // « que ses propres factures » : une brique absente, dite perdue.
    expect(b.analyse_phrases.phrases.map((p) => p.verdict)).toContain('perdue')
    // Aucune clé : celle du fournisseur n'apparaît nulle part.
    expect(JSON.stringify(b)).not.toContain('cle-de-test')
  })
  it('une écriture REFUSÉE, puis une écriture qui JETTE : la création réussit quand même', async () => {
    etat.boite = 'refus'
    expect((await fin(await appel())).ok).toBe(true)
    etat.boite = 'jette'
    expect((await fin(await appel())).ok).toBe(true)
  })
})
