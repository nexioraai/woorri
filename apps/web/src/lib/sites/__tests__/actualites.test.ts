/**
 * LE MODULE ACTUALITÉS (2026-11-26).
 *
 * ① les règles pures (adresses, onglets, libellés) ;
 * ② la page publique : le module s'allume SEULEMENT si le site déclare la page
 *   `actualites` — sinon rien ne change (c'est ce qui protège la CPA en ligne) ;
 * ③ l'écriture de la catégorie (création, modification) et le refus après
 *   l'échéance sur la modification, la suppression et la couverture d'un article ;
 * ④ l'accueil : « Dernières actualités », jamais vide, dans les 4 thèmes ;
 * ⑤ le tableau de bord : le choix de la catégorie.
 * Ce que ce fichier NE voit PAS : la base réelle (les vues publiques), le rendu
 * à l'œil (captures), et les données du site CPA.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn(), auth: { getUser: vi.fn() } } }))
vi.mock('@/lib/lecteurDuSite', () => ({ lecteurDuSite: async () => ({ from: vi.fn() }) }))
const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

// ── Les lectures de la page publique, remplacées : PAGES déclarées et ARTICLES par catégorie.
type Page = { chemin: string; parent: string | null; titre: string; chapeau: string | null; corps: string | null; maj_le: string | null; blocs: unknown[] }
let PAGES: Record<string, Page> = {}
const ARTICLES = [
  { slug: 'rappel-lot', title: 'Rappel du lot 12', excerpt: 'Un rappel.', cover_image: null, published_at: '2026-11-20T10:00:00Z', categorie: 'communique' },
  { slug: 'journee-qualite', title: 'Journée qualité', excerpt: null, cover_image: null, published_at: '2026-11-18T10:00:00Z', categorie: 'evenement' },
]
const demandes: (string | null)[] = []
vi.mock('next/headers', () => ({ headers: async () => new Map([['host', 'ma-centrale.deribfy.app']]) }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND') } }))
vi.mock('@/app/sites/[slug]/themes/lireSite', () => ({
  lireSite: async () => ({ id: 's1', slug: 'ma-centrale', name: 'Ma Centrale', lang: 'fr', primary_color: '#0a7f5a', custom_domain: null }),
}))
vi.mock('@/app/sites/[slug]/pages/fetchPage', () => ({
  fetchPage: async (_s: string, c: string) => PAGES[c] ?? null,
  fetchFilDAriane: async () => [],
  fetchEnfants: async () => [{ chemin: 'actualites/communiques', parent: 'actualites', titre: 'Communiqués', ordre: 1 }],
}))
vi.mock('@/app/sites/[slug]/blog/fetchPosts', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchBlogIndex: async (_slug: string, c: string | null) => { demandes.push(c); return { site: {}, posts: ARTICLES.filter((a) => c === null || a.categorie === c) } },
}))

// ── L'API d'écriture : propriétaire vérifié, base remplacée, échéance réglable.
let permis = true
const ecritures: { quoi: string; valeurs: unknown }[] = []
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn(), rpc: async () => ({ data: permis, error: null }) } }))
vi.mock('@/lib/auth/require-site-owner', () => ({ requireSiteOwner: async () => ({ ok: true, site: { id: 's1' } }) }))
vi.mock('@/lib/auth/require-article-owner', () => ({
  requireArticleOwner: async () => ({ ok: true, article: { id: 'a1', site_id: 's1', title: 'T', published_at: null, cover_storage_path: null } }),
}))
vi.mock('@/lib/blog', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  createPost: async (_s: string, v: unknown) => { ecritures.push({ quoi: 'create', valeurs: v }); return { id: 'a1', ...(v as object) } },
  updatePost: async (_i: string, _s: string, v: unknown) => { ecritures.push({ quoi: 'update', valeurs: v }); return { id: 'a1', ...(v as object) } },
  deletePost: async () => { ecritures.push({ quoi: 'delete', valeurs: null }) },
}))

const R = await import('@/app/sites/[slug]/pages/actualites')
const { default: PageDeclaree } = await import('@/app/sites/[slug]/[...rest]/page')
const API = await import('@/app/api/blog/posts/route')
const ARTICLE = await import('@/app/api/blog/posts/[id]/route')
const COUVERTURE = await import('@/app/api/blog/posts/[id]/cover/route')
const BROUILLON = await import('@/app/dashboard/blog/blogDraft')

const rendre = async (rest: string[]) =>
  renderToStaticMarkup(await PageDeclaree({ params: Promise.resolve({ slug: 'ma-centrale', rest }) }))
const page = (chemin: string, titre: string, blocs: unknown[] = []): Page => ({ chemin, parent: chemin.includes('/') ? 'actualites' : null, titre, chapeau: null, corps: null, maj_le: null, blocs })
const requete = (methode: string, corps?: unknown) => new Request('https://x.test/api/blog/posts', {
  method: methode, headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
})
const ctx = { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) }

beforeEach(() => { PAGES = {}; demandes.length = 0; ecritures.length = 0; permis = true })

describe('① les règles', () => {
  it('les adresses du module, et rien d’autre', () => {
    expect(R.vueActualites('actualites')).toEqual({ categorie: null })
    expect(R.vueActualites('actualites/communiques')).toEqual({ categorie: 'communique' })
    expect(R.vueActualites('actualites/evenements')).toEqual({ categorie: 'evenement' })
    expect(R.vueActualites('actualites/articles')).toEqual({ categorie: 'article' })
    for (const x of ['actualites/autre', 'actualites/communiques/x', 'blog', 'actualite', 'qui-sommes-nous']) expect(R.vueActualites(x), x).toBeNull()
  })
  it('les onglets mènent aux bonnes adresses ; les libellés suivent la langue du site', () => {
    expect(R.lienOnglet('https://x.app', null)).toBe('https://x.app/actualites')
    expect(R.lienOnglet('https://x.app', 'evenement')).toBe('https://x.app/actualites/evenements')
    expect(R.libellesActualites('fr')).toMatchObject({ titre: 'Actualités', communique: 'Communiqués', evenement: 'Agenda', dernieres: 'Dernières actualités' })
    expect(R.libellesActualites('en').titre).toBe('News')
    expect(R.libellesActualites('xx').titre).toBe('Actualités')
    expect(R.NOMBRE_DERNIERES).toBe(3)
  })
})

describe('② la page publique', () => {
  it('module ÉTEINT (aucune page `actualites`) : /actualites reste un 404', async () => {
    await expect(rendre(['actualites'])).rejects.toThrow('NOT_FOUND')
  })
  it('module ÉTEINT : une page `actualites/communiques` déjà déclarée garde son rendu d’avant (ni onglets, ni module)', async () => {
    PAGES['actualites/communiques'] = page('actualites/communiques', 'Communiqués de la Centrale')
    const html = await rendre(['actualites', 'communiques'])
    expect(html).toMatch(motifTexte('Communiqués de la Centrale'))
    expect(html).not.toContain('data-module-actualites')
    expect(html).not.toContain('data-onglets-actualites')
    expect(html, 'hors module, les sous-pages restent').toContain('aria-label="Sous-pages"')
  })
  it('module ALLUMÉ : /actualites montre les onglets et TOUTES les publications, sans cartes de sous-pages', async () => {
    PAGES.actualites = page('actualites', 'Actualités')
    const html = await rendre(['actualites'])
    expect(html).toContain('data-module-actualites')
    expect(html).toMatch(motifTexte('Rappel du lot 12'))
    expect(html).toMatch(motifTexte('Journée qualité'))
    expect(html).toMatch(/href="https:\/\/ma-centrale\.deribfy\.app\/actualites\/communiques"[^>]*>Communiqués</u)
    expect(html).toMatch(/aria-current="page"[^>]*>Tout</u)
    expect(html).toContain('href="https://ma-centrale.deribfy.app/blog/rappel-lot"')
    expect(demandes).toEqual([null])
    expect(html, 'les cartes de sous-pages ne s’ajoutent pas aux onglets').not.toContain('aria-label="Sous-pages"')
  })
  it('module ALLUMÉ : un onglet sans page déclarée existe quand même, filtré, avec son libellé', async () => {
    PAGES.actualites = page('actualites', 'Actualités')
    const html = await rendre(['actualites', 'evenements'])
    expect(html).toContain('<h1')
    expect(html).toMatch(/<h1[^>]*>Agenda</u)
    expect(html).toMatch(motifTexte('Journée qualité'))
    expect(html).not.toMatch(motifTexte('Rappel du lot 12'))
    expect(html).toMatch(/aria-current="page"[^>]*>Agenda</u)
  })
  it('module ALLUMÉ : la page Communiqués déclarée prête son titre, et son bloc « articles » n’est pas affiché deux fois', async () => {
    PAGES.actualites = page('actualites', 'Actualités')
    PAGES['actualites/communiques'] = page('actualites/communiques', 'Communiqués officiels', [{ type: 'articles', categorie: 'communique', titre: 'BLOC-EN-DOUBLE' }])
    const html = await rendre(['actualites', 'communiques'])
    expect(html).toMatch(/<h1[^>]*>Communiqués officiels</u)
    expect(html).toMatch(motifTexte('Rappel du lot 12'))
    expect(html).not.toContain('BLOC-EN-DOUBLE')
  })
  it('une adresse hors module (actualites/autre) sans page : 404, même module allumé', async () => {
    PAGES.actualites = page('actualites', 'Actualités')
    await expect(rendre(['actualites', 'autre'])).rejects.toThrow('NOT_FOUND')
  })
})

describe('③ écrire la catégorie, et l’échéance', () => {
  it('création : la catégorie choisie part ; absente → « article » ; inconnue → 400 sans écriture', async () => {
    expect((await API.POST(requete('POST', { site: 'ma-centrale', title: 'Rappel', categorie: 'communique' }))).status).toBe(200)
    expect((ecritures[0].valeurs as { categorie: string }).categorie).toBe('communique')
    await API.POST(requete('POST', { site: 'ma-centrale', title: 'Billet' }))
    expect((ecritures[1].valeurs as { categorie: string }).categorie).toBe('article')
    const r = await API.POST(requete('POST', { site: 'ma-centrale', title: 'X', categorie: 'promo' }))
    expect(r.status).toBe(400)
    expect(ecritures).toHaveLength(2)
  })
  it('modification : une catégorie valable s’écrit ; inconnue → 400 sans écriture', async () => {
    expect((await ARTICLE.PATCH(requete('PATCH', { categorie: 'evenement' }), ctx)).status).toBe(200)
    expect(ecritures[0].valeurs).toEqual({ categorie: 'evenement' })
    expect((await ARTICLE.PATCH(requete('PATCH', { categorie: 'n/importe' }), ctx)).status).toBe(400)
    expect(ecritures).toHaveLength(1)
  })
  it('APRÈS L’ÉCHÉANCE : modifier, supprimer ou changer la couverture d’un article → 403, rien n’est écrit', async () => {
    permis = false
    expect((await ARTICLE.PATCH(requete('PATCH', { title: 'Nouveau' }), ctx)).status).toBe(403)
    expect((await ARTICLE.DELETE(requete('DELETE'), ctx)).status).toBe(403)
    expect((await COUVERTURE.POST(requete('POST', {}), ctx)).status).toBe(403)
    expect((await API.POST(requete('POST', { site: 'ma-centrale', title: 'X' }))).status).toBe(403)
    expect(ecritures).toEqual([])
  })
})

describe('④ l’accueil', () => {
  it('la section n’existe que module allumé ET publication présente', () => {
    const accueil = lire('src/app/sites/[slug]/page.tsx')
    expect(accueil).toMatch(motifTexte('const actualites = pageActualites !== null ? dernieres : []'))
    expect(accueil).toMatch(motifTexte('fetchPage(site.id, CHEMIN_ACTUALITES)'))
    expect(accueil).toMatch(motifTexte('fetchDernieresActualites(site.id, NOMBRE_DERNIERES)'))
    expect(accueil).toMatch(motifTexte('actualites={actualites}'))
  })
  for (const theme of ['AuroraTheme', 'NoirTheme', 'VifTheme', 'EditorialTheme']) {
    it(`${theme} : « Dernières actualités » sous les appels d’offres, jamais vide`, () => {
      const src = lire(`src/app/sites/[slug]/themes/${theme}.tsx`)
      expect(src).toMatch(motifTexte("{actualites.length > 0 && !hidden('Actualites') && ("))
      expect(src).toMatch(motifTexte('actualites = [],'))
      expect(src.indexOf('<SectionActualites')).toBeGreaterThan(src.indexOf('<SectionAppelsOffres'))
    })
  }
  it('la section : le titre, 3 cartes vers l’article, la catégorie et « Toutes les actualités »', async () => {
    const { default: SectionActualites } = await import('@/app/sites/[slug]/themes/SectionActualites')
    const html = renderToStaticMarkup(createElement(SectionActualites, {
      site: { slug: 'ma-centrale', lang: 'fr', custom_domain: null } as never, primary: '#0a7f5a', host: 'ma-centrale.deribfy.app',
      posts: ARTICLES as never,
    }))
    expect(html).toMatch(motifTexte('Dernières actualités'))
    expect(html).toContain('href="https://ma-centrale.deribfy.app/actualites"')
    expect(html).toContain('href="https://ma-centrale.deribfy.app/blog/rappel-lot"')
    expect(html).toContain('Communiqués')
    expect(html).toMatch(motifTexte('Toutes les actualités'))
  })
})

describe('⑤ le tableau de bord', () => {
  it('la catégorie part à la création, et à la modification seulement si elle change', () => {
    const b = { ...BROUILLON.BROUILLON_VIDE, title: 'T', content: 'c', categorie: 'evenement' as const }
    expect(BROUILLON.corpsCreation('ma-centrale', b).categorie).toBe('evenement')
    const origine = { id: 'a1', title: 'T', slug: 't', excerpt: '', content: 'c', cover_image: null, published: false, published_at: null, updated_at: null, categorie: 'communique' }
    expect(BROUILLON.corpsModification(origine, { ...BROUILLON.versBrouillon(origine) })).toEqual({})
    expect(BROUILLON.corpsModification(origine, { ...BROUILLON.versBrouillon(origine), categorie: 'article' })).toEqual({ categorie: 'article' })
    expect(BROUILLON.versBrouillon({ ...origine, categorie: 'inconnue' }).categorie).toBe('article')
    expect(BROUILLON.BROUILLON_VIDE.categorie).toBe('article')
  })
  it('l’écran propose les trois catégories, et dit l’échéance au lieu de « authentification »', () => {
    const ecran = lire('src/app/dashboard/blog/page.tsx')
    expect(ecran).toMatch(motifTexte('CATEGORIES_BROUILLON.map((c) => <option key={c} value={c}>{t(`blog.cat.${c}`)}</option>)'))
    expect(ecran).toMatch(motifTexte("if (estRefusSiteEchu(refus)) { setErreur(t('siteEchu.message')); return null; }"))
  })
})
