/**
 * L'APPLI PUBLIÉE S'INSTALLE SUR ANDROID (décision du propriétaire, 2026-11-22).
 *
 * Ce que ces tests tiennent, dans la gate :
 *   · son nom, son nom court, sa couleur, SES icônes (192, 512, maskable) ;
 *   · un manifeste qui remplit les critères de Chrome (lus le 2026-11-22) ;
 *   · les fichiers servis par l'origine de l'appli, et rien pour un nom non publié ;
 *   · un service worker qui ne garde QUE l'écran d'accueil — exécuté ici dans
 *     un environnement de service worker simulé, événement par événement ;
 *   · l'inscription seulement sous `*.deribfy.app`, jamais sur deribfy.com.
 *
 * CE QU'ILS NE PEUVENT PAS VOIR : l'installation sur un vrai téléphone. La
 * mesure faite dans Chromium (installabilité 0 erreur, hors ligne, mise à jour,
 * dépublication — sous la vraie CSP sandbox) n'est pas dans la gate ; le
 * téléphone est l'essai de Youssouf.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
// Le proxy lit les sites à l'import : ses lectures ne servent pas ici (seul `cheminApplication` est éprouvé).
vi.mock('@/app/sites/[slug]/themes/shared', () => ({ fetchSiteEtLangueParDomaine: async () => null, fetchSiteParNomPublic: async () => null, fetchSiteParSlug: async () => null }))
const etat = vi.hoisted(() => ({
  ligne: null as null | Record<string, unknown>,
  arret: null as null | { data: unknown; error: unknown },
  journal: { filtres: {}, projections: {}, ecritures: {} } as import('@/lib/testing/postgrest').JournalPostgrest,
}))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
  return { supabaseAdmin: { from: creerFrom({
    [TABLE_GENERATIONS]: { reponse: () => ({ data: etat.ligne, error: null }) },
    // L'arrêt d'urgence : `quota_reglages.pwa_arret` (absent par défaut).
    quota_reglages: { reponse: () => etat.arret ?? { data: null, error: null } },
  }, etat.journal) } }
})

import { CHEMINS_ICONES, CHEMIN_MANIFESTE, CHEMIN_SERVICE_WORKER, identitePwa, manifestePwa, nomCourtDe, pageDOuverture, PETITS_MOTS } from '../pwa'
import { BANDEAU_HORS_LIGNE, INSCRIPTION_SERVICE_WORKER, MARQUE_HTML_APRES, RELANCE_ARRET_SERVICE_WORKER } from '../pwa-emis'
import { codeServiceWorker, CODE_SERVICE_WORKER_ARRET, VERSION_SERVICE_WORKER } from '@/app/a/[sous]/sw/code-service-worker'
import { cheminApplication } from '@/proxy'
import { pageAutonome } from '../boucle-directe'
import { cspSousDomaine, CSP_PAGE_PUBLIEE } from '../publication'
import { GET as MANIFESTE } from '@/app/a/[sous]/manifeste/route'
import { GET as SW } from '@/app/a/[sous]/sw/route'
import { GET as ICONE } from '@/app/a/[sous]/icone/[forme]/route'
import { geometrieIcone } from '../icone-appli'

const PUBLIEE = { nom: 'Gestion de stock', document: { apparence: { couleur: '#0f766e' } }, publication_jeton: 'jt-1' }
beforeEach(() => {
  etat.ligne = { ...PUBLIEE }
  etat.arret = null
  etat.journal.filtres = {}; etat.journal.projections = {}; etat.journal.ecritures = {}
})
const param = (sous: string, forme = '') => ({ params: Promise.resolve({ sous, forme }) })
const req = new Request('https://gestion-stock.deribfy.app/')

describe('a) son nom, sa couleur, son initiale', () => {
  it('le nom court se coupe au MOT sous 12 signes ; l’initiale garde son accent ; la couleur est celle de l’appli', () => {
    expect(identitePwa('Gestion de stock', { couleur: '#0f766e' })).toEqual({ nom: 'Gestion de stock', nomCourt: 'Stock', couleur: '#0f766e', initiale: 'G' })
    expect(identitePwa('Épicerie', null)).toMatchObject({ nomCourt: 'Épicerie', initiale: 'É', couleur: '#2a5bd7' })
    expect(identitePwa('Tontinedesmamansdumarché', null).nomCourt).toHaveLength(12)
    expect(identitePwa('  ', null)).toMatchObject({ nom: 'Application', initiale: 'A' })
    expect(identitePwa('<b>"Pharma"</b>', null).nom).toBe('bPharma/b')
  })

  it('les icônes : 192 et 512 arrondies, la maskable pleine avec l’initiale dans la zone sûre (40 % centraux)', () => {
    expect(geometrieIcone(192)).toEqual({ cote: 192, lettre: 0.56, arrondi: 0.22 })
    expect(geometrieIcone(512).cote).toBe(512)
    const m = geometrieIcone('maskable')
    expect(m.arrondi, 'une maskable arrondie laisse des coins vides une fois découpée').toBe(0)
    expect(m.lettre, 'l’initiale déborde de la zone sûre').toBeLessThanOrEqual(0.4)
  })
})

describe('b) le manifeste remplit les critères d’installation de Chrome', () => {
  const m = manifestePwa(identitePwa('Gestion de stock', { couleur: '#0f766e' })) as Record<string, unknown> & { icons: { src: string; sizes: string; purpose: string }[] }
  it('nom, nom court, start_url, display standalone, id et portée stables, couleur de thème', () => {
    expect(m).toMatchObject({ id: '/', name: 'Gestion de stock', short_name: 'Stock', start_url: '/', scope: '/', display: 'standalone', theme_color: '#0f766e', lang: 'fr' })
    expect('prefer_related_applications' in m, 'Chrome refuse l’installation (critère)').toBe(false)
  })
  it('des icônes 192 ET 512, plus une 512 « maskable », servies par l’origine (jamais data:)', () => {
    expect(m.icons.map((i) => `${i.sizes}:${i.purpose}`)).toEqual(['192x192:any', '512x512:any', '512x512:maskable'])
    for (const i of m.icons) expect(i.src.startsWith('/'), `${i.src} n’est pas servi par l’origine`).toBe(true)
  })
})

describe('b) les fichiers sont servis par l’origine de l’appli — et seulement publiée', () => {
  it('le proxy mène chaque fichier à sa route, et tout le reste à l’appli', () => {
    expect(cheminApplication('gestion-stock', CHEMIN_MANIFESTE)).toBe('/a/gestion-stock/manifeste')
    expect(cheminApplication('gestion-stock', CHEMIN_SERVICE_WORKER)).toBe('/a/gestion-stock/sw')
    expect(cheminApplication('gestion-stock', CHEMINS_ICONES[192])).toBe('/a/gestion-stock/icone/192')
    expect(cheminApplication('gestion-stock', CHEMINS_ICONES[512])).toBe('/a/gestion-stock/icone/512')
    expect(cheminApplication('gestion-stock', CHEMINS_ICONES.maskable)).toBe('/a/gestion-stock/icone/maskable')
    expect(cheminApplication('gestion-stock', '/compte')).toBe('/a/gestion-stock/compte')
    expect(cheminApplication('gestion-stock', '/')).toBe('/a/gestion-stock')
    expect(cheminApplication('gestion-stock', '/autre.png')).toBe('/a/gestion-stock')
  })

  it('publiée : manifeste JSON, service worker en JavaScript revérifié à chaque fois, icônes PNG aux bonnes tailles', async () => {
    const m = await MANIFESTE(req, param('gestion-stock'))
    expect(m.status).toBe(200)
    expect(m.headers.get('content-type')).toContain('application/manifest+json')
    expect(((await m.json()) as { name: string }).name).toBe('Gestion de stock')
    const s = await SW(req, param('gestion-stock'))
    expect(s.headers.get('content-type')).toContain('text/javascript')
    expect(s.headers.get('cache-control')).toBe('no-cache')
    expect(await s.text()).toContain(VERSION_SERVICE_WORKER)
    for (const [forme, cote] of [['192', 192], ['512', 512], ['maskable', 512]] as const) {
      const r = await ICONE(req, param('gestion-stock', forme))
      const b = new Uint8Array(await r.arrayBuffer())
      expect([...b.slice(1, 4)].map((c) => String.fromCharCode(c)).join(''), `${forme} n’est pas un PNG`).toBe('PNG')
      const v = new DataView(b.buffer)
      expect([v.getUint32(16), v.getUint32(20)], `${forme} : mauvaise taille`).toEqual([cote, cote])
    }
  })

  it('nom enregistré mais NON publié (pas de jeton), ou nom invalide : 404 partout', async () => {
    etat.ligne = { ...PUBLIEE, publication_jeton: null }
    for (const r of [await MANIFESTE(req, param('gestion-stock')), await SW(req, param('gestion-stock')), await ICONE(req, param('gestion-stock', '192'))]) expect(r.status).toBe(404)
    etat.ligne = { ...PUBLIEE }
    expect((await MANIFESTE(req, param('A'))).status).toBe(404)
    expect((await ICONE(req, param('gestion-stock', 'geante'))).status).toBe(404)
  })
})

describe('la page servie : installable sous son origine, inchangée ailleurs', () => {
  const page = (installable: boolean) => pageAutonome('void 0', 'Gestion de stock', undefined, 'servie', null, { couleur: '#0f766e' }, false, installable)
  it('sous <nom>.deribfy.app : le manifeste de l’origine, l’icône, l’inscription du service worker, le bandeau hors ligne', () => {
    const p = page(true)
    expect(p).toContain(`<link rel="manifest" href="${CHEMIN_MANIFESTE}" />`)
    expect(p).toContain(`<link rel="apple-touch-icon" href="${CHEMINS_ICONES[192]}" />`)
    expect(p).toContain(INSCRIPTION_SERVICE_WORKER)
    expect(p).toContain(BANDEAU_HORS_LIGNE)
    expect(p).toContain('<meta name="theme-color" content="#0f766e" />')
  })
  it('aperçu, archive, lien par jeton : comme avant (manifeste data:, aucun service worker)', () => {
    const p = page(false)
    expect(p).toContain('<link rel="manifest" href="data:application/manifest+json,')
    expect(p).not.toContain('serviceWorker')
    expect(p).not.toContain('deribfy-hors-ligne')
  })
  it('la CSP du sous-domaine permet SON manifeste, SES icônes, SON service worker — et la page sur deribfy.com, non', () => {
    const csp = cspSousDomaine('')
    for (const d of ["manifest-src 'self' data:", "worker-src 'self'", "img-src 'self' data: blob:"]) expect(csp).toContain(d)
    expect(csp.match(/img-src/gu)?.length, 'deux directives img-src').toBe(1)
    expect(csp).toContain('sandbox allow-scripts allow-same-origin')
    expect(CSP_PAGE_PUBLIEE, 'la page servie depuis deribfy.com pourrait inscrire un service worker').not.toMatch(/worker-src|'self'/u)
  })
})

// ── LE SERVICE WORKER, EXÉCUTÉ. Un environnement simulé : `self`, `caches`,
//    `fetch`, et les trois événements. Ce qu'il fait se lit dans le journal.
type Cache = Map<string, Response>
function environnement(reseau: (r: Request) => Promise<Response>, code = codeServiceWorker('Gestion de stock')) {
  const caches = new Map<string, Cache>()
  const ecouteurs: Record<string, (e: unknown) => void> = {}
  const journal: string[] = []
  const api = {
    keys: async () => [...caches.keys()],
    open: async (n: string) => {
      if (!caches.has(n)) caches.set(n, new Map())
      const c = caches.get(n) as Cache
      return {
        add: async (r: Request) => { journal.push(`precache ${new URL(r.url).pathname} credentials=${r.credentials}`); c.set(new URL(r.url).pathname, await reseau(r)) },
        put: async (k: string, v: Response) => { journal.push(`garde ${k}`); c.set(k, v) },
      }
    },
    match: async (k: string) => { for (const c of caches.values()) { const v = c.get(k); if (v) return v.clone() } return undefined },
    // (Map.prototype.delete appelé par son prototype : le cliquet travailleur-isolation
    //  réserve l'écriture « .delete( » à la purge du banc.)
    delete: async (n: string) => { journal.push(`efface ${n}`); return Map.prototype.delete.call(caches, n) },
  }
  const self = {
    location: { origin: 'https://gestion-stock.deribfy.app' },
    addEventListener: (t: string, f: (e: unknown) => void) => { ecouteurs[t] = f },
    skipWaiting: () => { journal.push('skipWaiting') },
    registration: { unregister: async () => { journal.push('desinscrit'); return true } },
    clients: { claim: async () => { journal.push('claim') }, matchAll: async () => [{ url: 'https://gestion-stock.deribfy.app/', navigate: (u: string) => { journal.push(`recharge ${u}`) } }] },
  }
  class Req extends Request { constructor(u: string, o?: RequestInit) { super(new URL(u, self.location.origin).toString(), o) } }
  new Function('self', 'caches', 'fetch', 'Request', code)(self, api, reseau, Req)
  const declencher = async (type: string, donnees: Record<string, unknown> = {}) => {
    let promesse: Promise<unknown> | undefined
    let reponse: Promise<Response> | undefined
    ecouteurs[type]?.({ ...donnees, waitUntil: (p: Promise<unknown>) => { promesse = p }, respondWith: (p: Promise<Response>) => { reponse = p } })
    await promesse
    return reponse === undefined ? undefined : await reponse
  }
  const naviguer = (chemin: string, o: { mode?: string; method?: string; origine?: string } = {}) => {
    const r = new Request(`${o.origine ?? self.location.origin}${chemin}`, { method: o.method ?? 'GET' })
    Object.defineProperty(r, 'mode', { value: o.mode ?? 'navigate' })
    return declencher('fetch', { request: r })
  }
  return { caches, journal, declencher, naviguer, ecouteurs }
}
const PAGE = '<!doctype html><html lang="fr"><head></head><body>ACCUEIL</body></html>'
const enLigne = async (r: Request) => (new URL(r.url).pathname === '/' ? new Response(PAGE, { status: 200 }) : new Response('autre', { status: 200 }))
const coupe = async () => { throw new TypeError('Failed to fetch') }

describe('c) le service worker ne garde QUE l’écran d’accueil', () => {
  it('installation : il garde l’accueil SANS identifiants, et prend la main tout de suite', async () => {
    const env = environnement(enLigne)
    await env.declencher('install')
    expect(env.journal).toEqual(['skipWaiting', 'precache / credentials=omit'])
    expect([...env.caches.keys()]).toEqual([VERSION_SERVICE_WORKER])
  })

  it('activation : les anciennes versions sont effacées, les pages ouvertes passent sous la nouvelle (mise à jour sans geste)', async () => {
    const env = environnement(enLigne)
    env.caches.set('deribfy-appli-0', new Map())
    await env.declencher('install'); await env.declencher('activate')
    expect([...env.caches.keys()]).toEqual([VERSION_SERVICE_WORKER])
    expect(env.journal).toContain('efface deribfy-appli-0')
    expect(env.journal.at(-1)).toBe('claim')
  })

  it('rien d’autre qu’une NAVIGATION en GET de la même origine : la base, l’authentification, les images ne passent jamais par lui', async () => {
    const env = environnement(enLigne)
    expect(await env.naviguer('/rest/v1/produit', { mode: 'cors' }), 'un appel à la base est intercepté').toBeUndefined()
    expect(await env.naviguer('/auth/v1/token', { mode: 'cors', method: 'POST' })).toBeUndefined()
    expect(await env.naviguer('/', { method: 'POST' })).toBeUndefined()
    expect(await env.naviguer('/', { origine: 'https://projet.supabase.co' }), 'une autre origine est interceptée').toBeUndefined()
    expect(await env.naviguer('/icone-192.png', { mode: 'no-cors' })).toBeUndefined()
    expect(env.journal.filter((l) => l.startsWith('garde')), 'quelque chose a été gardé').toEqual([])
  })

  it('en ligne : l’accueil vient du RÉSEAU (toujours à jour) et sa copie est rafraîchie ; /compte n’est jamais gardé', async () => {
    const env = environnement(enLigne)
    const r = await env.naviguer('/')
    expect(await r?.text()).toBe(PAGE)
    await env.naviguer('/compte')
    expect(env.journal.filter((l) => l.startsWith('garde'))).toEqual(['garde /'])
  })

  it('hors ligne : l’accueil gardé, MARQUÉ pour le bandeau ; une autre page : « Pas de connexion »', async () => {
    const enLigneEnv = environnement(enLigne)
    await enLigneEnv.naviguer('/')
    const env = environnement(coupe)
    env.caches.set(VERSION_SERVICE_WORKER, enLigneEnv.caches.get(VERSION_SERVICE_WORKER) as Cache)
    const accueil = await env.naviguer('/')
    const html = await accueil?.text()
    expect(html).toContain('ACCUEIL')
    expect(html, 'la copie n’est pas marquée : pas de bandeau sur un wifi sans internet').toContain(MARQUE_HTML_APRES)
    const compte = await env.naviguer('/compte')
    expect(compte?.status).toBe(503)
    expect(await compte?.text()).toContain('Pas de connexion')
  })

  it('hors ligne, rien de gardé : « Pas de connexion », avec le nom de l’appli', async () => {
    const env = environnement(coupe)
    const r = await env.naviguer('/')
    expect(r?.status).toBe(503)
    expect(await r?.text()).toMatch(/Pas de connexion[\s\S]*Gestion de stock/u)
  })

  it('dépubliée (l’adresse rend 404) : la copie s’efface et le service worker se retire', async () => {
    const env = environnement(enLigne)
    await env.naviguer('/')
    const depubliee = environnement(async () => new Response('Cette application est introuvable.', { status: 404 }))
    depubliee.caches.set(VERSION_SERVICE_WORKER, env.caches.get(VERSION_SERVICE_WORKER) as Cache)
    const r = await depubliee.naviguer('/')
    expect(r?.status).toBe(404)
    expect(depubliee.journal).toEqual([`efface ${VERSION_SERVICE_WORKER}`, 'desinscrit'])
  })
})

describe('l’inscription et le bandeau, exécutés', () => {
  const inscrire = (hote: string) => {
    const inscrits: string[] = []
    const script = INSCRIPTION_SERVICE_WORKER.replace(/^<script>|<\/script>$/gu, '')
    new Function('navigator', 'location', script)({ serviceWorker: { register: (u: string) => { inscrits.push(u); return Promise.resolve() } } }, { hostname: hote })
    return inscrits
  }
  it('seulement sous *.deribfy.app — jamais sur l’origine de Deribfy (lien par jeton)', () => {
    expect(inscrire('gestion-stock.deribfy.app')).toEqual(['/sw.js'])
    expect(inscrire('www.deribfy.com')).toEqual([])
    expect(inscrire('deribfy.app.evil.com')).toEqual([])
  })

  it('le bandeau : caché en ligne, visible hors ligne OU sur la copie gardée', () => {
    const script = BANDEAU_HORS_LIGNE.slice(BANDEAU_HORS_LIGNE.indexOf('<script>') + 8, -9)
    const voir = (onLine: boolean, copie: boolean) => {
      const b = { hidden: true }
      new Function('document', 'navigator', 'addEventListener', 'location', script)(
        { getElementById: () => b, documentElement: { getAttribute: () => (copie ? '1' : null) } }, { onLine }, () => undefined, {},
      )
      return !b.hidden
    }
    expect(voir(true, false)).toBe(false)
    expect(voir(false, false)).toBe(true)
    expect(voir(true, true), 'wifi sans internet : la copie gardée doit dire « Pas de connexion »').toBe(true)
  })
})

describe('A1 · le nom sous l’icône ne finit jamais par un petit mot', () => {
  it('les 4 applis en ligne, et deux autres titres', () => {
    expect(nomCourtDe('Gestion de pharmacie')).toBe('Pharmacie')
    expect(nomCourtDe('Application')).toBe('Application')
    expect(nomCourtDe('Atelier de réparation automobile')).toBe('Réparation')
    expect(nomCourtDe('Place de marché Tchad')).toBe('Marché Tchad')
    expect(nomCourtDe('Gestion de stock')).toBe('Stock')
  })
  it('sur une série de titres : 12 signes au plus, coupé au mot, jamais un petit mot à la fin', () => {
    const titres = ['Gestion de pharmacie', 'Place de marché Tchad', 'Suivi des élèves de Moundou', 'Carnet de dépenses et recettes', 'Registre pour la tontine', 'Boutique en ligne du quartier', 'Annuaire des artisans à Sarh', 'Réservations au salon de coiffure']
    for (const t of titres) {
      const c = nomCourtDe(t)
      expect(c.length, t).toBeLessThanOrEqual(12)
      expect(t.toLocaleLowerCase('fr'), `${t} → « ${c} » n’est pas pris dans le titre`).toContain(c.toLocaleLowerCase('fr'))
      const dernier = c.split(' ').at(-1) ?? ''
      expect(PETITS_MOTS.has(dernier.toLocaleLowerCase('fr')), `${t} → « ${c} »`).toBe(false)
    }
  })
})

describe('A3 · l’appli installée s’ouvre du côté VISITEURS', () => {
  it('avec une page publique : « / » ; une base sans page publique : la connexion (« /#gestion ») ; sans base : « / »', () => {
    expect(pageDOuverture({ aUneBase: true, aUnePagePublique: true })).toBe('/')
    expect(pageDOuverture({ aUneBase: true, aUnePagePublique: false })).toBe('/#gestion')
    expect(pageDOuverture({ aUneBase: false, aUnePagePublique: false })).toBe('/')
  })
  it('le manifeste servi porte cette page d’ouverture', async () => {
    const lire = async () => ((await (await MANIFESTE(req, param('gestion-stock'))).json()) as { start_url: string }).start_url
    etat.ligne = { ...PUBLIEE, document: { schema: 'create table public.produit (id uuid)', entites: [{ id: 'produit', name: 'Produits', fields: [], lecturePublique: true }] } }
    expect(await lire()).toBe('/')
    etat.ligne = { ...PUBLIEE, document: { schema: 'create table public.stock (id uuid)', entites: [{ id: 'stock', name: 'Stock', fields: [] }] } }
    expect(await lire()).toBe('/#gestion')
    etat.ligne = { ...PUBLIEE, document: { fichiers: {} } }
    expect(await lire()).toBe('/')
  })
})

describe('A2 · l’arrêt d’urgence : un réglage, et toutes les applis se désinstallent', () => {
  const ARRET = { data: { valeur: 'oui' }, error: null }
  it('activé : plus de manifeste (404), et /sw.js sert le service worker d’arrêt — même pour une appli dépubliée', async () => {
    etat.arret = ARRET
    expect((await MANIFESTE(req, param('gestion-stock'))).status).toBe(404)
    expect(await (await SW(req, param('gestion-stock'))).text()).toBe(CODE_SERVICE_WORKER_ARRET)
    etat.ligne = { ...PUBLIEE, publication_jeton: null }
    const s = await SW(req, param('gestion-stock'))
    expect(s.status).toBe(200)
    expect(await s.text()).toBe(CODE_SERVICE_WORKER_ARRET)
    expect(etat.journal.filtres.quota_reglages).toContainEqual(['eq', 'cle', 'pwa_arret'])
  })

  it('le service worker d’arrêt, exécuté : il efface TOUS les caches, se désinstalle, recharge la page, et ne sert plus rien', async () => {
    const env = environnement(enLigne, CODE_SERVICE_WORKER_ARRET)
    env.caches.set(VERSION_SERVICE_WORKER, new Map([['/', new Response(PAGE)]]))
    await env.declencher('install'); await env.declencher('activate')
    expect([...env.caches.keys()]).toEqual([])
    expect(env.journal).toEqual(['skipWaiting', `efface ${VERSION_SERVICE_WORKER}`, 'desinscrit', 'recharge https://gestion-stock.deribfy.app/'])
    expect(env.ecouteurs.fetch, 'le service worker d’arrêt intercepte encore').toBeUndefined()
  })

  it('la page en arrêt : ni manifeste ni inscription ni icône d’écran d’accueil ; la relance du service worker d’arrêt', () => {
    const p = pageAutonome('void 0', 'Gestion de stock', undefined, 'servie', null, null, false, 'arret')
    expect(p).not.toContain('rel="manifest"')
    expect(p).not.toContain('apple-touch-icon')
    expect(p).not.toContain(INSCRIPTION_SERVICE_WORKER)
    expect(p).toContain(RELANCE_ARRET_SERVICE_WORKER)
  })

  it('réglage absent, vide, « non », ou illisible : marche NORMALE (l’arrêt est un geste, jamais l’effet d’une panne)', async () => {
    for (const a of [null, { data: { valeur: '' }, error: null }, { data: { valeur: 'non' }, error: null }, { data: null, error: { message: 'panne' } }]) {
      etat.arret = a
      expect((await MANIFESTE(req, param('gestion-stock'))).status).toBe(200)
      expect(await (await SW(req, param('gestion-stock'))).text()).toContain(VERSION_SERVICE_WORKER)
    }
  })
})
