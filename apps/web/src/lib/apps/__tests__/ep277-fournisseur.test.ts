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
import {
  appelerFournisseur,
  CONFIGS,
  estPointe,
  fournisseurChoisi,
  PLAFOND_API_DEEPSEEK,
  tarifDe,
  tarifPlafond,
} from '../fournisseur'

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

    // ── LES TARIFS SONT CEUX DU MODÈLE RÉELLEMENT APPELÉ, ET DE L'HEURE.
    //
    // Ce cliquet figeait `{ entree: 0.66, sortie: 1.98 }` — et son propre
    // commentaire disait déjà le danger : « faux, ils ne cassent rien, ils
    // mentent seulement sur la dépense, ce qui est pire ».
    //
    // Mesuré le 2026-11-02 à la documentation : ce couple était le tarif
    // HORS POINTE de `v4-pro`. Pendant les fenêtres de pointe, tout coût
    // calculé valait LA MOITIÉ du vrai. Et le modèle LÉGER n'avait aucun
    // tarif : ses appels étaient facturés au prix du lourd, quatre fois trop.
    expect(CONFIGS.deepseek.prix.creuse).toEqual({ entree: 0.66, sortie: 1.98, entreeCache: 0.022 })
    expect(CONFIGS.deepseek.prix.pointe).toEqual({ entree: 1.32, sortie: 3.96, entreeCache: 0.044 })
    expect(CONFIGS.deepseek.prixLeger.creuse).toEqual({ entree: 0.15, sortie: 0.6, entreeCache: 0.003 })
    expect(CONFIGS.deepseek.prixLeger.pointe).toEqual({ entree: 0.3, sortie: 1.2, entreeCache: 0.006 })
    // Anthropic ne facture pas a l'heure : les deux periodes portent le
    // MEME couple, et l'ecrire dit « j'y ai pense » au lieu de laisser
    // deviner un oubli.
    expect(CONFIGS.anthropic.prix.creuse).toEqual({ entree: 5, sortie: 25, entreeCache: 0.5 })
    expect(CONFIGS.anthropic.prix.pointe).toEqual(CONFIGS.anthropic.prix.creuse)
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

  it('③ AUCUN MODÈLE N’A UN SEUL COUPLE DE PRIX', () => {
    // ── LA RÈGLE GÉNÉRALE, exigée par le propriétaire le 2026-11-02.
    //
    // Un modèle qui n'a qu'un tarif fait croire que l'heure ne compte pas.
    // Ce cliquet vaut pour les fournisseurs à venir : si l'un d'eux ne
    // facture pas à l'heure, il écrit DEUX FOIS le même couple — et ce
    // doublon dit « j'y ai pensé », au lieu de laisser deviner un oubli.
    for (const [nom, c] of Object.entries(CONFIGS)) {
      for (const [quel, m] of [['lourd', c.prix], ['leger', c.prixLeger]] as const) {
        for (const periode of ['creuse', 'pointe'] as const) {
          const t = m[periode]
          expect(t, `${nom}/${quel} n’a pas de tarif ${periode}`).toBeDefined()
          for (const champ of ['entree', 'sortie', 'entreeCache'] as const) {
            expect(typeof t[champ], `${nom}/${quel}/${periode}.${champ}`).toBe('number')
            expect(t[champ], `${nom}/${quel}/${periode}.${champ} est nul ou negatif`).toBeGreaterThan(0)
          }
        }
        // LA POINTE N'EST JAMAIS MOINS CHÈRE QUE LA CREUSE : l'inverse
        // signalerait deux colonnes interverties, et le plafond annoncé
        // serait alors sous le vrai prix.
        expect(m.pointe.entree, `${nom}/${quel} : pointe moins chère que creuse`).toBeGreaterThanOrEqual(m.creuse.entree)
        expect(m.pointe.sortie).toBeGreaterThanOrEqual(m.creuse.sortie)
      }
      // Et le LÉGER est moins cher que le LOURD, sinon l'un des deux est faux.
      expect(c.prixLeger.creuse.entree, `${nom} : le leger n’est pas moins cher`).toBeLessThan(c.prix.creuse.entree)
    }
  })

  it('④ LES FENÊTRES DE POINTE SONT CELLES DE LA DOCUMENTATION', () => {
    // 01:00-04:00 et 06:00-10:00 UTC, du lundi au vendredi. Le reste est
    // hors pointe, WEEK-ENDS INCLUS EN ENTIER.
    const d = (iso: string) => new Date(iso)
    expect(estPointe(d('2026-11-02T01:00:00Z')), 'lundi 01:00 devrait être en pointe').toBe(true)
    expect(estPointe(d('2026-11-02T03:59:00Z'))).toBe(true)
    expect(estPointe(d('2026-11-02T04:00:00Z')), '04:00 est hors pointe').toBe(false)
    expect(estPointe(d('2026-11-02T06:00:00Z'))).toBe(true)
    expect(estPointe(d('2026-11-02T09:59:00Z'))).toBe(true)
    expect(estPointe(d('2026-11-02T10:00:00Z'))).toBe(false)
    expect(estPointe(d('2026-11-02T00:30:00Z'))).toBe(false)
    // SAMEDI ET DIMANCHE EN ENTIER, même dans la fenêtre horaire.
    expect(estPointe(d('2026-11-07T02:00:00Z')), 'samedi n’est jamais en pointe').toBe(false)
    expect(estPointe(d('2026-11-08T08:00:00Z')), 'dimanche n’est jamais en pointe').toBe(false)
  })

  it('⑤ LE PLAFOND ANNONCÉ PREND LA POINTE — jamais l’heure creuse', () => {
    // Un plafond qui suppose l'heure creuse n'est plus un plafond :
    // l'opération peut démarrer à 00:59 et facturer à 01:00.
    expect(tarifPlafond(CONFIGS.deepseek.prixLeger)).toEqual(CONFIGS.deepseek.prixLeger.pointe)
    expect(tarifDe(CONFIGS.deepseek.prix, new Date('2026-11-02T02:00:00Z')))
      .toEqual(CONFIGS.deepseek.prix.pointe)
    expect(tarifDe(CONFIGS.deepseek.prix, new Date('2026-11-07T02:00:00Z')))
      .toEqual(CONFIGS.deepseek.prix.creuse)
  })
})
