/**
 * L'APERÇU EST LE SITE — cookie et lecteur par requête. 2026-11-15.
 *
 * Défaut d'origine : l'aperçu d'un site non publié (copie rendue sous
 * /preview/<slug>, sans sous-pages) menait à des 404 dès qu'on cliquait le
 * menu. Ces tests figent les règles qui le ferment.
 *
 * Ce que ces tests NE peuvent PAS voir : que la vue `sites_public` laisse
 * réellement passer le propriétaire. C'est la base qui en décide
 * (supabase/sql/sites_public_apercu_*.sql), prouvée à part sur Postgres et
 * mesurée en anonyme avant/après.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = { valeur: undefined as string | undefined, leve: null as Error | null }
vi.mock('next/headers', () => ({
  cookies: async () => {
    if (cookieStore.leve) throw cookieStore.leve
    return { get: (nom: string) => (nom === 'deribfy_apercu' && cookieStore.valeur ? { value: cookieStore.valeur } : undefined) }
  },
}))
// `cache` de React n'agit que pendant un rendu serveur : hors rendu, chaque
// appel recalcule. On le neutralise pour tester la logique seule.
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <T,>(f: T) => f }))
const anonyme = { nom: 'client-anonyme' }
vi.mock('@/lib/supabase', () => ({ supabase: anonyme }))
const crees: { url: string; cle: string; options: { global: { headers: Record<string, string> } } }[] = []
vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, cle: string, options: never) => {
    crees.push({ url, cle, options })
    return { nom: 'client-proprietaire' }
  },
}))

import { cheminDuCookie, dureeDuCookie, expirationDuJeton, jetonEncoreValable, DUREE_MAX_APERCU } from '../apercu'

/** Un JWT non signé dont seul `exp` compte ici (la signature, c'est la base qui la vérifie). */
function jwt(exp: number): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256' })}.${b64({ sub: 'u', exp })}.signature`
}
const maintenant = 1_800_000_000

describe('le cookie d’aperçu', () => {
  it('est limité au site : /sites/<slug>', () => {
    expect(cheminDuCookie('goura-doula-1794663944227')).toBe('/sites/goura-doula-1794663944227')
  })

  it('lit l’expiration du jeton, et rend null sur un jeton illisible', () => {
    expect(expirationDuJeton(jwt(maintenant + 60))).toBe(maintenant + 60)
    expect(expirationDuJeton('pas-un-jeton')).toBeNull()
    expect(expirationDuJeton('a.%%%.c')).toBeNull()
  })

  it('ne vit jamais plus que le jeton, ni plus d’une heure', () => {
    expect(dureeDuCookie(jwt(maintenant + 600), maintenant)).toBe(600)
    expect(dureeDuCookie(jwt(maintenant + 99_999), maintenant)).toBe(DUREE_MAX_APERCU)
    expect(dureeDuCookie(jwt(maintenant - 5), maintenant)).toBe(0)
    expect(dureeDuCookie('illisible', maintenant)).toBe(0)
  })

  it('un jeton qui expire dans la marge n’est plus utilisable', () => {
    expect(jetonEncoreValable(jwt(maintenant + 60), maintenant)).toBe(true)
    expect(jetonEncoreValable(jwt(maintenant + 10), maintenant)).toBe(false)
    expect(jetonEncoreValable(jwt(maintenant - 1), maintenant)).toBe(false)
  })
})

describe('lecteurDuSite — un client par requête', () => {
  beforeEach(() => { cookieStore.valeur = undefined; cookieStore.leve = null; crees.length = 0 })

  it('SANS cookie : le client anonyme, rien ne change pour un visiteur', async () => {
    const { lecteurDuSite } = await import('../lecteurDuSite')
    expect(await lecteurDuSite()).toBe(anonyme)
    expect(crees).toHaveLength(0)
  })

  it('AVEC un cookie valable : un client qui porte le jeton du propriétaire', async () => {
    const jeton = jwt(Math.floor(Date.now() / 1000) + 600)
    cookieStore.valeur = jeton
    const { lecteurDuSite } = await import('../lecteurDuSite')
    expect(await lecteurDuSite()).toEqual({ nom: 'client-proprietaire' })
    expect(crees).toHaveLength(1)
    expect(crees[0].options.global.headers.Authorization).toBe(`Bearer ${jeton}`)
  })

  it('un cookie EXPIRÉ retombe sur l’anonyme (le site non publié redevient un 404, comme pour un visiteur)', async () => {
    cookieStore.valeur = jwt(Math.floor(Date.now() / 1000) - 60)
    const { lecteurDuSite } = await import('../lecteurDuSite')
    expect(await lecteurDuSite()).toBe(anonyme)
  })

  it('hors requête (cookies() lève) : l’anonyme, sans planter', async () => {
    cookieStore.leve = new Error('`cookies` was called outside a request scope.')
    const { lecteurDuSite } = await import('../lecteurDuSite')
    expect(await lecteurDuSite()).toBe(anonyme)
  })

  it('un jeton REFUSÉ par la base (401) : la requête est rejouée en anonyme — un site publié ne tombe jamais en 404', async () => {
    const { fetchRepliAnonyme } = await import('../lecteurDuSite')
    const vus: string[] = []
    const base = (async (_u: RequestInfo | URL, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get('Authorization') ?? ''
      vus.push(auth)
      return new Response('{}', { status: auth === 'Bearer jeton-invalide' ? 401 : 200 })
    }) as typeof fetch
    const f = fetchRepliAnonyme('cle-anon', base)
    const r = await f('https://x/rest/v1/sites_public', { headers: { Authorization: 'Bearer jeton-invalide', apikey: 'cle-anon' } })
    expect(r.status).toBe(200)
    expect(vus).toEqual(['Bearer jeton-invalide', 'Bearer cle-anon'])
    // Un jeton accepté ne déclenche aucun second appel.
    vus.length = 0
    await f('https://x', { headers: { Authorization: 'Bearer bon' } })
    expect(vus).toEqual(['Bearer bon'])
  })

  it('une erreur INTERNE de Next (rendu dynamique) n’est jamais avalée', async () => {
    const interne = Object.assign(new Error('Dynamic server usage'), { digest: 'DYNAMIC_SERVER_USAGE' })
    cookieStore.leve = interne
    const { lecteurDuSite } = await import('../lecteurDuSite')
    await expect(lecteurDuSite()).rejects.toBe(interne)
  })
})
