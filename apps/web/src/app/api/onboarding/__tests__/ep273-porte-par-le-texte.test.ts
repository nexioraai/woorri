/**
 * EP-273 — ON ARRIVE À L'APPLICATION EN TAPANT SON TEXTE, PAS EN CLIQUANT.
 *
 * ── LE DÉFAUT, MESURÉ SUR LE PROPRIÉTAIRE LUI-MÊME, LE 2026-10-18.
 *
 * Il a décrit son application en détail — tranches tarifaires, frais fixes,
 * exemples chiffrés. Le modèle l'a parfaitement comprise et lui a répondu
 * « choisissez l'option Application depuis l'écran d'accueil ».
 *
 * Il n'a pas trouvé le bouton. Il a abandonné.
 *
 * Ses mots : « il y a des utilisateurs qui viennent taper directement le
 * texte, sans appuyer sur le bouton — il ne faut pas décevoir ceux-là. »
 *
 * Le classifieur n'avait que trois classes : site, boutique, dropshipping.
 * La compréhension vivait dans la tête du modèle et nulle part dans la
 * réponse. Même famille que les sept « machines posées, débranchées ».
 *
 * ── CE QUE CE CLIQUET TIENT, ET POURQUOI EN DEUX MORCEAUX.
 *
 * ① LA ROUTE transporte vraiment le signal jusqu'à l'écran. On l'APPELLE
 *    avec un faux modèle — EP-267 a coûté la leçon : un contrôle qui lit des
 *    mentions dans une source ne mesure pas un câblage.
 * ② LA DÉCISION refuse tout ce qui n'est pas un « oui » franc. Elle vit dans
 *    sa propre fonction PARCE QUE `apps/web` n'a aucun harnais de rendu :
 *    enfouie dans un composant de 900 lignes, elle serait intestable.
 *
 * ── CE QU'IL NE PROUVE PAS.
 *
 * 🟠 Que le modèle pose le drapeau au bon moment. Ça dépend du prompt et se
 *    vérifie sur un vrai tir. Ici on prouve que le CHEMIN existe — hier il
 *    n'existait pas du tout.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUserMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser: (...a: unknown[]) => getUserMock(...a) } },
}))

/**
 * LE DOUBLE EST CELUI DU DÉPÔT — `lib/testing/postgrest`.
 *
 * `postgrestProjectionFidelity` plafonne les harnais permissifs à 40, et ce
 * nombre ne peut que BAISSER. Mon premier double, écrit à la main, l'avait
 * fait passer à 41 — mesuré. Le cliquet dit lui-même quoi faire : un harnais
 * NOUVEAU passe par `lib/testing/postgrest`, qui honore la projection et
 * capture les filtres.
 */
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const j = journalVierge()
  return {
    supabaseAdmin: {
      from: creerFrom(
        { profiles: { reponse: { data: { generation_count: 0 }, error: null } } },
        j,
      ),
    },
  }
})

const messagesCreateMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...a: unknown[]) => messagesCreateMock(...a) }
  },
}))

import { POST } from '../route'
import { doitAiguillerVersApplication } from '@/lib/apps/aiguillage'

/** Le modèle rend ce qu'on lui dit — aucun appel réseau, aucun centime. */
const modeleRend = (objet: unknown) => {
  // LA ROUTE PRÉPOSE L'ACCOLADE : elle préremplit la réponse de l'assistant
  // avec « { ». Un fixture qui rend le JSON entier produirait « {{…} », que
  // la route ne sait pas lire — on mesurerait notre propre erreur.
  const sansAccolade = JSON.stringify(objet).slice(1)
  messagesCreateMock.mockResolvedValue({ content: [{ type: 'text', text: sansAccolade }] })
}

const requete = (texte: string) =>
  new Request('https://deribfy.test/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jeton' },
    body: JSON.stringify({ history: [{ role: 'user', content: texte }] }),
  })

beforeEach(() => {
  getUserMock.mockResolvedValue({ data: { user: { id: 'u-1', email: 'a@b.c' } }, error: null })
})

describe('EP-273 · la route transporte le signal jusqu’à l’écran', () => {
  it('① UN « OUI » DU MODÈLE ARRIVE À L’ÉCRAN — hier il mourait dans la route', async () => {
    modeleRend({
      type: 'ask',
      reply: 'Je vous emmène sur le chemin des applications.',
      skippable: false,
      detectedMode: null,
      estApplication: true,
    })
    const d = (await (await POST(requete('je veux une application mobile'))).json()) as {
      type: string
      estApplication?: unknown
    }
    expect(d.type).toBe('ask')
    expect(
      d.estApplication,
      'le signal meurt dans la route : la personne reste dans l’entonnoir des sites, ' +
        'exactement le défaut mesuré sur le propriétaire',
    ).toBe(true)
  })

  it('② UNE CONVERSATION ORDINAIRE NE PORTE PAS LE DRAPEAU', async () => {
    // Contrôle NÉGATIF : sans lui, le ① passerait même si la route posait
    // `estApplication: true` sur TOUTES ses réponses.
    modeleRend({ type: 'ask', reply: 'Quel est votre secteur ?', skippable: false, detectedMode: 1 })
    const d = (await (await POST(requete('je vends des fleurs'))).json()) as {
      estApplication?: unknown
    }
    expect(d.estApplication, 'un fleuriste est envoyé construire une application').toBe(false)
  })

  it('⑤ LE SIGNAL SURVIT À UN JSON CASSÉ — mesuré après une mutation survivante', async () => {
    // ── CE CONTRÔLE N'EXISTAIT PAS, ET LA MUTATION L'A MONTRÉ.
    //
    // Retirer `estApplication` de l'extraction de secours laissait les quatre
    // autres verts : aucun n'empruntait cette porte. Or elle existe
    // précisément parce qu'un modèle casse parfois son JSON — et ce jour-là
    // la personne serait restée dans l'entonnoir des sites, sans signal.
    //
    // Un saut de ligne NU dans une chaîne : `JSON.parse` refuse, l'extraction
    // tolérante prend le relais. C'est le chemin réel, pas une simulation.
    messagesCreateMock.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '"type":"ask","reply":"Je vous emmène\nsur le chemin des applications.","skippable":false,"estApplication":true}',
        },
      ],
    })
    const d = (await (await POST(requete('une application mobile'))).json()) as {
      type: string
      estApplication?: unknown
    }
    expect(d.type, 'la réponse de secours ne se forme pas').toBe('ask')
    expect(
      d.estApplication,
      'le signal est perdu dès que le JSON casse : la personne reste dans ' +
        'l’entonnoir des sites et rien ne le dit',
    ).toBe(true)
  })

  it('③ UNE VALEUR DOUTEUSE NE TRAVERSE PAS EN « VRAI »', async () => {
    // Le signal vient d'un modèle de langage : il peut rendre n'importe quoi.
    for (const douteux of ['true', 1, 'oui', {}, [], 'false']) {
      modeleRend({ type: 'ask', reply: 'Hmm ?', skippable: false, estApplication: douteux })
      const d = (await (await POST(requete('bonjour'))).json()) as { estApplication?: unknown }
      expect(d.estApplication, `« ${JSON.stringify(douteux)} » a été promu en vrai`).toBe(false)
    }
  })
})

describe('EP-273 · la décision refuse tout ce qui n’est pas un oui franc', () => {
  it('④ TROIS REFUS, chacun pour sa raison', async () => {
    // Le cas qui aiguille, et lui seul.
    expect(doitAiguillerVersApplication({ type: 'ask', estApplication: true }, true)).toBe(true)

    // ① Pas « truthy » : STRICTEMENT `true`. Basculer quelqu'un qui voulait
    //    une boutique serait pire que l'impasse qu'on répare.
    for (const d of ['true', 1, 'oui', {}, [], null, undefined, 'false']) {
      expect(
        doitAiguillerVersApplication({ type: 'ask', estApplication: d }, true),
        `« ${JSON.stringify(d)} » a aiguillé quelqu’un`,
      ).toBe(false)
    }

    // ② Seulement sur une QUESTION : basculer une conversation terminée
    //    détruirait un travail déjà fait.
    expect(doitAiguillerVersApplication({ type: 'done', estApplication: true }, true)).toBe(false)
    expect(doitAiguillerVersApplication({ estApplication: true }, true)).toBe(false)

    // ③ Chemin non armé : on enverrait la personne sur un écran qui ne peut
    //    rien produire. Mesuré le 2026-10-18 : `NEXT_PUBLIC_GENERATION_ASYNC`
    //    était ABSENTE en production, et le bouton lui-même ne menait nulle part.
    expect(doitAiguillerVersApplication({ type: 'ask', estApplication: true }, false)).toBe(false)
  })
})
