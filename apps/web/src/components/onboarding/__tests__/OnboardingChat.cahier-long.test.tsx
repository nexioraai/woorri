// G30 (2026-11-13) — LE CHEMIN EXACT QUI COUPAIT, RENDU DE BOUT EN BOUT.
//
// MESURÉ : un cahier collé dans la conversation d'ACCUEIL, puis la pastille
// « Application » → le texte partait coupé à 1 000 signes (quatre lignes en
// base). Ici l'accueil est rendu dans un DOM, 2 600 signes sont collés dans
// SON composeur, la pastille est cliquée, et on lit le corps que l'écran
// Application envoie à /api/generateur/direct : `demande` doit faire 2 600.
// Rouge-puis-vert : remettre `maxLength={1000}` sur le <textarea> rougit ici
// (demande de 1 000).
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'jeton-de-test' } } }),
      getUser: async () => ({ data: { user: { id: 'u-1', email: 'a@b.c' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  },
}))

const CAHIER = ('[TEST-G30] Application mobile et web pour le « Complexe Scolaire La Renaissance » à N’Djamena. ' +
  'Élèves (nom, classe, date d’inscription, statut : actif, parti, renvoyé), paiements de scolarité (élève, montant, date, payé ou non), enseignants et matières. ').repeat(12).slice(0, 2600)

const reponse = (objet: unknown) =>
  new Response(JSON.stringify(objet), { status: 200, headers: { 'content-type': 'application/json' } })

beforeAll(() => {
  // La pastille « Application » n'est active que sous ce drapeau, lu à l'import.
  process.env.NEXT_PUBLIC_GENERATION_ASYNC = '1'
  GlobalRegistrator.register({ url: 'http://localhost/' })
})
afterAll(() => { GlobalRegistrator.unregister() })

function coller(el: HTMLTextAreaElement, texte: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(el, texte)
  el.dispatchEvent(new window.Event('input', { bubbles: true }))
}

describe('G30 — un cahier collé à l’accueil arrive entier à la génération', () => {
  it('2 600 signes collés, pastille « Application » : la demande envoyée à direct fait 2 600 signes', async () => {
    expect(CAHIER).toHaveLength(2600)
    const corps: { direct?: Record<string, unknown>; appels: string[] } = { appels: [] }
    globalThis.fetch = vi.fn(async (entree: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entree)
      corps.appels.push(url)
      if (url.endsWith('/api/generateur/lire-brief')) return reponse({ deduites: {}, entites: [], entitesRefusees: [], lecture: { resultat: 'reussie', entreeCoupee: false, tables: 0, tentatives: 1 }, nomProduit: { nom: 'La Renaissance', dansLeDocument: true } })
      if (url.endsWith('/api/generateur/avant')) return reponse({ questions: [], configuration: { currency: 'XAF' }, complet: true })
      if (url.endsWith('/api/generateur/direct')) { corps.direct = JSON.parse(String(init?.body)) as Record<string, unknown>; return reponse({ ok: false, error: 'fin du test' }) }
      // Tout autre appel de l'accueil (langue, suivi…) reçoit une réponse vide plutôt qu'une exception.
      return reponse({})
    }) as typeof fetch

    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { LanguageProvider } = await import('@/lib/translations')
    const { default: OnboardingChat } = await import('../OnboardingChat')
    const racine = document.createElement('div')
    document.body.appendChild(racine)
    await React.act(async () => {
      createRoot(racine).render(
        <LanguageProvider langueImposee="fr">
          <OnboardingChat />
        </LanguageProvider>,
      )
    })
    const champ = racine.querySelector('textarea[aria-label="Décrivez votre activité"]') as HTMLTextAreaElement | null
    expect(champ, 'le composeur de l’accueil est introuvable').not.toBeNull()
    // Le collage programmatique contourne `maxLength` : l'attribut absent est
    // le cliquet du mécanisme ; la longueur transmise, celui du chemin.
    expect(champ!.hasAttribute('maxlength'), 'le composeur de l’accueil porte un maxLength : il tronque les collages').toBe(false)
    await React.act(async () => { coller(champ!, CAHIER) })
    expect(champ!.value, 'le composeur de l’accueil a tronqué le collage').toHaveLength(2600)

    const pastille = [...racine.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes('Application'))
    expect(pastille, 'la pastille « Application » est introuvable').toBeDefined()
    await React.act(async () => { pastille!.click() })
    await vi.waitFor(() => { expect(corps.direct, `direct jamais appelé ; appels : ${corps.appels.join(', ')}`).toBeDefined() }, { timeout: 8000 })

    expect(String(corps.direct!.demande)).toHaveLength(2600)
    expect(String(corps.direct!.demande).startsWith('[TEST-G30]')).toBe(true)
    expect(corps.direct).toMatchObject({ nom: 'La Renaissance', configuration: { currency: 'XAF' } })
  })
})
