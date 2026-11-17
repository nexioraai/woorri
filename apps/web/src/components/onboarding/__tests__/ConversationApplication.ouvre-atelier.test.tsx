// 2026-11-17 — L'ATELIER S'OUVRE TOUT SEUL APRÈS UNE GÉNÉRATION (comportement).
//
// Le défaut : en moteur `direct`, l'écran ne lisait pas l'`id` rendu par la
// route ; le lien « Ouvrir dans l'atelier » ne s'affichait donc jamais, et il
// fallait repasser par « Mes projets ». Ce test rend le composant dans un DOM,
// remplace `fetch`, et regarde OÙ l'écran va quand la route répond.
//
//   ① réponse livrée AVEC un id   → l'atelier de cette œuvre s'ouvre ;
//   ② réponse livrée SANS id      → on reste : l'aperçu est la seule trace ;
//   ③ réponse en échec             → on reste, et rien ne s'ouvre.
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { cheminAtelier } from '@/components/atelier/ouvrirAtelier'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'jeton-de-test' } } }) } },
}))
const ouvertures: string[] = []
vi.mock('@/components/atelier/ouvrirAtelier', async (original) => ({
  ...(await original<typeof import('@/components/atelier/ouvrirAtelier')>()),
  ouvrirAtelier: (id: string) => { ouvertures.push(id) },
}))

const DEMANDE = '[TEST] Un atelier de couture à N’Djamena : les clientes et les commandes.'
const reponse = (objet: unknown) =>
  new Response(JSON.stringify(objet), { status: 200, headers: { 'content-type': 'application/json' } })

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })
beforeEach(() => { ouvertures.length = 0; document.body.innerHTML = '' })

async function generer(reponseDirect: Record<string, unknown>): Promise<void> {
  let direct = false
  globalThis.fetch = vi.fn(async (entree: RequestInfo | URL) => {
    const url = String(entree)
    if (url.endsWith('/api/generateur/lire-brief')) {
      return reponse({ deduites: {}, entites: [], entitesRefusees: [], lecture: { resultat: 'reussie', entreeCoupee: false, tables: 0 } })
    }
    if (url.endsWith('/api/generateur/avant')) return reponse({ questions: [], configuration: {}, complet: true })
    if (url.endsWith('/api/generateur/direct')) { direct = true; return reponse(reponseDirect) }
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
  await vi.waitFor(() => { expect(direct, 'la route direct n’a pas été appelée').toBe(true) }, { timeout: 8000 })
  // La réponse est lue, puis l'écran décide : on attend que le rendu se pose.
  await vi.waitFor(() => {
    const fin = document.body.textContent ?? ''
    expect(fin.includes('Votre application est prête') || fin.includes('fin du test')).toBe(true)
  }, { timeout: 8000 })
}

describe('l’atelier s’ouvre après une génération (moteur direct)', () => {
  it('① livrée avec un id : l’atelier de CETTE œuvre s’ouvre', async () => {
    await generer({ ok: true, id: 'oeuvre-42', html: '<p>app</p>', tours: [{}], dureeMs: 30000 })
    expect(ouvertures).toEqual(['oeuvre-42'])
    expect(cheminAtelier('oeuvre-42')).toBe('/atelier/oeuvre-42')
  })

  it('② livrée sans id : on reste sur l’aperçu, rien ne s’ouvre', async () => {
    await generer({ ok: true, id: null, html: '<p>app</p>', tours: [{}], dureeMs: 30000 })
    expect(ouvertures).toEqual([])
    expect(document.body.textContent).toContain('Votre application est prête')
  })

  it('③ en échec : rien ne s’ouvre', async () => {
    await generer({ ok: false, error: 'fin du test' })
    expect(ouvertures).toEqual([])
  })
})
