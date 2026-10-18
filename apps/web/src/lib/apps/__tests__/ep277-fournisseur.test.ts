/**
 * EP-277 — DEUX FOURNISSEURS, DEUX DIALECTES, UN SEUL APPELANT.
 *
 * ── POURQUOI, MESURÉ LE 2026-10-18.
 *
 * Le crédit Anthropic du propriétaire est tombé à zéro en plein tir, et un
 * rechargement de 10 $ n'y a rien changé : la clé rend toujours « Your credit
 * balance is too low ». Vérifié directement contre l'API — HTTP 400,
 * request_id req_011CgAXUTM9DCqy9LVX15B5X.
 *
 * Un produit dont la seule porte est fermée n'a plus de porte.
 *
 *     Anthropic Opus    entrée 5,00 $/M    sortie 25,00 $/M
 *     DeepSeek          entrée 0,27 $/M    sortie  1,10 $/M
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * Les deux contraintes de dialecte, qui ne sont PAS des préférences :
 *
 *   · ANTHROPIC exige le FLUX dès que `max_tokens` autorise plus de dix
 *     minutes — mesuré au premier essai du propriétaire, rien n'est parti.
 *   · DEEPSEEK plafonne sa sortie à 8 192 jetons : au-delà, c'est un 400.
 *     Déclaré dans l'adaptateur du dépôt depuis EP-089.
 *
 * Les oublier, c'est un tir perdu à chaque fois.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { appelerFournisseur, CONFIGS, fournisseurChoisi } from '../fournisseur'

const { anthropic } = vi.hoisted(() => ({ anthropic: { vus: null as unknown } }))

/** Un faux SDK Anthropic : il n'expose QUE `stream`. */
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      stream: (args: unknown) => {
        anthropic.vus = args
        return {
          finalMessage: () => ({
            content: [{ type: 'text', text: 'du code' }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
        }
      },
    }
  },
}))

describe('EP-277 · l’interrupteur de fournisseur', () => {
  it('① SEULE LA VALEUR EXACTE BASCULE — tout le reste sert le connu', () => {
    expect(fournisseurChoisi('deepseek')).toBe('deepseek')
    for (const v of [undefined, '', 'DeepSeek', 'DEEPSEEK', ' deepseek', 'anthropic', '1']) {
      expect(fournisseurChoisi(v), `« ${String(v)} » a fait basculer le fournisseur`).toBe(
        'anthropic',
      )
    }
  })

  it('② LES DEUX CONTRAINTES DE DIALECTE SONT DÉCLARÉES, pas devinées', () => {
    // 8 192 est un MUR chez DeepSeek : au-delà, c'est un 400. Le dépasser
    // ferait perdre chaque tir, sans qu'un seul jeton soit produit.
    expect(CONFIGS.deepseek.maxJetons, 'le plafond de DeepSeek a bougé').toBe(8_192)
    expect(CONFIGS.anthropic.maxJetons).toBeGreaterThan(8_192)
    // Les tarifs sont ceux que le dépôt déclare déjà dans ses adaptateurs.
    expect(CONFIGS.deepseek.prix).toEqual({ entree: 0.27, sortie: 1.1 })
    expect(CONFIGS.anthropic.prix).toEqual({ entree: 5, sortie: 25 })
    // Chaque fournisseur nomme SA variable : une clé croisée ne part jamais.
    expect(CONFIGS.deepseek.variableCle).toBe('DEEPSEEK_API_KEY')
    expect(CONFIGS.anthropic.variableCle).toBe('ANTHROPIC_API_KEY')
  })
})

describe('EP-277 · les deux dialectes', () => {
  beforeEach(() => {
    anthropic.vus = null
    vi.restoreAllMocks()
  })

  it('③ ANTHROPIC PART EN FLUX, et au plafond déclaré', async () => {
    const r = await appelerFournisseur('anthropic', 'cle', 'consigne', [
      { role: 'user', content: 'écris' },
    ])
    expect(r.texte).toBe('du code')
    expect(r.usage).toEqual({ entree: 10, sortie: 20 })
    const a = anthropic.vus as { max_tokens: number; model: string }
    expect(a.max_tokens, 'le plafond ne vient pas de la configuration').toBe(
      CONFIGS.anthropic.maxJetons,
    )
    expect(a.model).toBe(CONFIGS.anthropic.modele)
  })

  it('④ DEEPSEEK PART EN DIALECTE OPENAI, plafonné à 8 192', async () => {
    let vu: { body?: string } = {}
    vi.stubGlobal('fetch', async (_u: string, o: { body?: string }) => {
      vu = o
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'du code deepseek' } }],
          usage: { prompt_tokens: 7, completion_tokens: 9 },
        }),
      }
    })
    const r = await appelerFournisseur('deepseek', 'cle', 'consigne', [
      { role: 'user', content: 'écris' },
    ])
    expect(r.texte).toBe('du code deepseek')
    expect(r.usage).toEqual({ entree: 7, sortie: 9 })
    const corps = JSON.parse(vu.body ?? '{}') as { max_tokens: number; model: string; messages: unknown[] }
    expect(corps.max_tokens, 'au-delà de 8 192, DeepSeek rend un 400').toBe(8_192)
    expect(corps.model).toBe('deepseek-chat')
    // La consigne voyage en premier message `system`, comme le dialecte l'attend.
    expect(corps.messages.length).toBe(2)
  })

  it('⑤ UNE ERREUR DU FOURNISSEUR REMONTE AVEC SON STATUT', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 400,
      text: async () => '{"error":{"message":"credit balance is too low"}}',
    }))
    await expect(
      appelerFournisseur('deepseek', 'cle', 'c', [{ role: 'user', content: 'x' }]),
    ).rejects.toThrow(/400.*credit balance/u)
  })
})
