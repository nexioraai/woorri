// ÉTAPE 2 (2026-11-13) — CLIQUET DE COMPORTEMENT : ce que `construire` ENVOIE.
//
// Les cliquets texte (etape2-configuration-transmise ① ② ③) lisent la source :
// un renommage les casse avec la correction intacte, et ils peuvent être
// verts avec un comportement faux. Celui-ci rend le composant dans un DOM,
// remplace `fetch`, laisse l'effet de démarrage appeler la lecture du brief
// puis `construire`, et LIT LE CORPS envoyé à /api/generateur/direct.
//
// Les deux gestes qui ont cassé (M6) y rougissent :
//   · remettre l'état React nu dans le corps  → configuration = {} ;
//   · jeter `nomProduit` de la lecture du brief → nom = ''.
// Preuve rouge-puis-vert exécutée et rapportée (rapport, étape 2).
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Le client Supabase se construit à l'import avec les variables du serveur :
// ici, seul `getSession` sert (le jeton porté par l'en-tête Authorization).
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'jeton-de-test' } } }) } },
}))

const DEMANDE = '[TEST] Un atelier de couture à N’Djamena : les clientes et les commandes.'
const TABLE = { id: 'ent_cliente', name: 'cliente', fields: [{ id: 'fld_nom', name: 'nom', type: 'text', required: true }] }
const reponse = (objet: unknown) =>
  new Response(JSON.stringify(objet), { status: 200, headers: { 'content-type': 'application/json' } })

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })

describe('étape 2 — le corps envoyé à /api/generateur/direct (comportement)', () => {
  it('porte la configuration calculée, le nom proposé, les tables et le résultat de la lecture', async () => {
    const corps: { direct?: Record<string, unknown>; appels: string[] } = { appels: [] }
    globalThis.fetch = vi.fn(async (entree: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entree)
      corps.appels.push(url)
      if (url.endsWith('/api/generateur/lire-brief')) {
        return reponse({
          deduites: { ARGENT_DANS_APP: 'paiements' },
          entites: [TABLE],
          entitesRefusees: [],
          lecture: { resultat: 'reussie', entreeCoupee: false, tables: 1 },
          nomProduit: { nom: 'Atelier Mariam', dansLeDocument: true },
        })
      }
      if (url.endsWith('/api/generateur/avant')) {
        return reponse({ questions: [], configuration: { currency: 'XAF', encaissement: 'paiements' }, complet: true })
      }
      if (url.endsWith('/api/generateur/direct')) {
        corps.direct = JSON.parse(String(init?.body)) as Record<string, unknown>
        // Le test s'arrête ici : une réponse d'échec rend la main proprement.
        return reponse({ ok: false, error: 'fin du test' })
      }
      throw new Error(`appel réseau inattendu : ${url}`)
    }) as typeof fetch

    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { default: ConversationApplication } = await import('../ConversationApplication')
    const racine = document.createElement('div')
    document.body.appendChild(racine)
    await React.act(async () => {
      createRoot(racine).render(React.createElement(ConversationApplication, { demandeInitiale: DEMANDE, onRetour: () => undefined }))
    })
    await vi.waitFor(() => { expect(corps.direct, `direct jamais appelé ; appels : ${corps.appels.join(', ')}`).toBeDefined() }, { timeout: 8000 })

    // LA PREUVE : ce que la route reçoit, champ par champ.
    expect(corps.direct).toMatchObject({
      demande: DEMANDE,
      configuration: { currency: 'XAF', encaissement: 'paiements' },
      nom: 'Atelier Mariam',
      lectureBrief: { resultat: 'reussie', entreeCoupee: false, tables: 1 },
    })
    expect((corps.direct as { entites: unknown[] }).entites).toEqual([TABLE])
    // Et l'ordre des appels est celui du chemin vivant : lecture, pré-vol, génération.
    expect(corps.appels.map((u) => u.split('/').pop())).toEqual(['lire-brief', 'avant', 'direct'])
    // 2b : une lecture qui aboutit n'affiche AUCUN mot sur la lecture.
    expect(document.body.textContent).not.toContain('Lecture du cahier')
  })

  // ÉTAPE 2b (2026-11-13) — JAMAIS SILENCIEUX : la lecture du cahier qui n'aboutit
  // pas après la reprise est DITE à l'écran, et la génération part quand même,
  // le résultat nommé dans son corps. Signaler, pas bloquer.
  it('2b · une lecture tronquée est affichée avant que la génération parte, et voyage nommée', async () => {
    const corps: { direct?: Record<string, unknown> } = {}
    globalThis.fetch = vi.fn(async (entree: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entree)
      if (url.endsWith('/api/generateur/lire-brief')) {
        return reponse({ deduites: {}, lecture: { resultat: 'tronquee', entreeCoupee: false, tables: 0, tentatives: 2 }, illisible: true })
      }
      if (url.endsWith('/api/generateur/avant')) return reponse({ questions: [], configuration: { currency: 'XAF' }, complet: true })
      if (url.endsWith('/api/generateur/direct')) {
        corps.direct = JSON.parse(String(init?.body)) as Record<string, unknown>
        return reponse({ ok: false, error: 'fin du test' })
      }
      throw new Error(`appel réseau inattendu : ${url}`)
    }) as typeof fetch

    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { default: ConversationApplication } = await import('../ConversationApplication')
    const racine = document.createElement('div')
    document.body.appendChild(racine)
    await React.act(async () => {
      createRoot(racine).render(React.createElement(ConversationApplication, { demandeInitiale: DEMANDE + ' (2b)', onRetour: () => undefined }))
    })
    await vi.waitFor(() => { expect(corps.direct).toBeDefined() }, { timeout: 8000 })

    // VISIBLE : le mot est à l'écran, avec le nombre de tentatives.
    const statut = [...document.querySelectorAll('[role="status"]')].map((e) => e.textContent ?? '').join(' ')
    expect(statut).toMatch(/Lecture du cahier incomplète : la réponse a été coupée avant la fin \(2 tentatives\)/u)
    expect(statut).toContain('sans les tables déduites')
    // ET NOMMÉ : la génération est partie, son corps porte la coupe.
    expect(corps.direct).toMatchObject({ lectureBrief: { resultat: 'tronquee', tentatives: 2 }, entites: [], configuration: { currency: 'XAF' } })
  })
})
