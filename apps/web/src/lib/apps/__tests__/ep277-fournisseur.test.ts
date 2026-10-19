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
import { appelerFournisseur, CONFIGS, fournisseurChoisi, PLAFOND_API_DEEPSEEK } from '../fournisseur'

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

  it('② LE PLAFOND TIENT ENTRE DEUX MURS, et j’avais écrit le mauvais', () => {
    // ── CE CONTRÔLE GELAIT MON ERREUR. IL LA REFUSE MAINTENANT.
    //
    // J'avais écrit ici « le plafond de DeepSeek a bougé » en exigeant 8 192,
    // recopié d'EP-089 sans revérifier. Deux tirs du propriétaire ont rendu
    // 24 576 jetons de sortie pour trois tours : 8 192 AU JETON PRÈS à chaque
    // tour. Le contrôle était vert, et il certifiait une borne fausse.
    //
    // Plafond réel, mesuré contre l'API le 2026-10-19 par une requête
    // volontairement hors-borne — un 400 ne génère rien et ne facture rien :
    //     « the valid range of max_tokens is [1, 393216] »
    expect(PLAFOND_API_DEEPSEEK).toBe(393_216)

    // MUR DU HAUT : au-delà, c'est un 400 et le tir est perdu avant d'avoir
    // produit un seul jeton.
    expect(
      CONFIGS.deepseek.maxJetons,
      'au-delà du plafond de l’API, chaque appel est un 400',
    ).toBeLessThanOrEqual(PLAFOND_API_DEEPSEEK)

    // MUR DU BAS : 8 192 a coupé une application entière, trois fois. Toute
    // valeur de cet ordre reproduirait exactement le défaut mesuré.
    expect(
      CONFIGS.deepseek.maxJetons,
      'cette borne a déjà coupé une application entière, trois fois',
    ).toBeGreaterThan(32_768)

    // Les tarifs sont ceux du modèle RÉELLEMENT appelé. Faux, ils ne cassent
    // rien — ils mentent seulement sur la dépense, ce qui est pire.
    expect(CONFIGS.deepseek.prix).toEqual({ entree: 0.66, sortie: 1.98 })
    expect(CONFIGS.anthropic.prix).toEqual({ entree: 5, sortie: 25 })
    // Chaque fournisseur nomme SA variable : une clé croisée ne part jamais.
    expect(CONFIGS.deepseek.variableCle).toBe('DEEPSEEK_API_KEY')
    expect(CONFIGS.anthropic.variableCle).toBe('ANTHROPIC_API_KEY')
  })

  it('③ LE MODÈLE APPELÉ EXISTE AU CATALOGUE DU FOURNISSEUR', () => {
    // ── MESURÉ LE 2026-10-19 SUR `GET /models` (appel gratuit) : le
    // catalogue ne sert plus que `deepseek-flash` et `deepseek-v4-pro`.
    // `deepseek-chat`, que j'appelais, n'y figure plus — il répondait encore,
    // en alias, avec les bornes de l'ancienne génération.
    //
    // ARBITRAGE DU PROPRIÉTAIRE : le plus capable des deux.
    expect(['deepseek-flash', 'deepseek-v4-pro']).toContain(CONFIGS.deepseek.modele)
    expect(CONFIGS.deepseek.modele, 'l’arbitrage du propriétaire a été défait').toBe(
      'deepseek-v4-pro',
    )
  })
})

describe('EP-277 · la troncature est LUE, jamais devinée', () => {
  // ── LE DÉFAUT QUI A COÛTÉ DEUX TIRS, 2026-10-19.
  //
  // Une réponse coupée et une réponse fautive arrivaient ici sous la même
  // forme : du texte. Le compilateur disait « Expected } but found EOF » — un
  // diagnostic EXACT mais trompeur, qui décrit le texte et non ce qui lui est
  // arrivé. Je le relayais au modèle comme une faute de syntaxe ; il
  // « corrigeait » du code qui n'était pas faux, et se faisait couper encore.
  //
  // Chaque fournisseur le DIT, et le disait déjà. Je ne le lisais pas.
  it('⑦ CHAQUE DIALECTE DIT SA COUPURE À SA MANIÈRE', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'coupé net' }, finish_reason: 'length' }],
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      }),
    }))
    const d = await appelerFournisseur('deepseek', 'c', 's', [{ role: 'user', content: 'x' }])
    expect(d.tronquee, '« length » n’est pas lu : la coupure passera pour une faute').toBe(true)

    // Et une réponse ENTIÈRE ne doit jamais être prise pour une coupure —
    // sinon la boucle redemanderait « plus court » sans aucune raison.
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'entier' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      }),
    }))
    const e = await appelerFournisseur('deepseek', 'c', 's', [{ role: 'user', content: 'x' }])
    expect(e.tronquee, 'une réponse entière est prise pour une coupure').toBe(false)
  })
})

describe('EP-277 · les deux dialectes', () => {
  beforeEach(() => {
    anthropic.vus = null
    vi.restoreAllMocks()
  })

  it('④ ANTHROPIC PART EN FLUX, et au plafond déclaré', async () => {
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

  it('⑤ DEEPSEEK PART EN DIALECTE OPENAI, au plafond déclaré', async () => {
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
    // LE PLAFOND VIENT DE LA CONFIGURATION, jamais d'un littéral recopié ici :
    // un nombre écrit en double est un nombre qui divergera.
    expect(corps.max_tokens, 'le plafond ne vient pas de la configuration').toBe(
      CONFIGS.deepseek.maxJetons,
    )
    expect(corps.model).toBe(CONFIGS.deepseek.modele)
    // La consigne voyage en premier message `system`, comme le dialecte l'attend.
    expect(corps.messages.length).toBe(2)
  })

  it('⑥ UNE ERREUR DU FOURNISSEUR REMONTE AVEC SON STATUT', async () => {
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
