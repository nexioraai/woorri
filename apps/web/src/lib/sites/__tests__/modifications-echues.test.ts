/**
 * APRÈS L'ÉCHÉANCE, LE CONTENU D'UN SITE NE SE MODIFIE PLUS (2026-11-26).
 *
 * Ce que ce fichier prouve : la règle du refus (403, phrase du propriétaire),
 * qu'une vraie route de contenu refuse SANS écrire, et que CHAQUE route de la
 * liste du propriétaire appelle le refus — et aucune de celles qui doivent
 * continuer de marcher.
 * Ce qu'il NE voit PAS : la fonction `site_modifications_permises` de la base
 * (prouvée par la vérification n° 10 en production).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { creerFrom, journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

vi.mock('server-only', () => ({}))
let journal: JournalPostgrest = journalVierge()
let permis: { data: unknown; error: unknown } = { data: true, error: null }
const appels: { fn: string; args: unknown }[] = []
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => creerFrom({ site_pages: { reponse: { data: { id: 'p1', chemin: '/a', titre: 'A' }, error: null } } }, journal)(t),
    rpc: async (fn: string, args: unknown) => { appels.push({ fn, args }); return permis },
  },
}))
vi.mock('@/lib/auth/require-site-owner', () => ({
  requireSiteOwner: async () => ({ ok: true, site: { id: 'site-1', owner_id: 'u1' }, email: 'moi@exemple.td', viaAdmin: false }),
}))

const { refuserSiEchu, PHRASE_SITE_ECHU, CODE_SITE_ECHU } = await import('@/lib/sites/modifications-echues')
const { estRefusSiteEchu } = await import('@/lib/sites/site-echu')
const { lienRenouveler, lireRenouveler } = await import('@/components/dashboard/renouvelerSite')
const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

beforeEach(() => { journal = journalVierge(); permis = { data: true, error: null }; appels.length = 0 })

describe('le refus', () => {
  it('échu : 403, la phrase du propriétaire, le code, « renouveler »', async () => {
    const r = await refuserSiEchu({ site: { id: 'site-1' } }, { lire: async () => false })
    expect(r?.status).toBe(403)
    expect(await r?.json()).toEqual({ error: PHRASE_SITE_ECHU, code: CODE_SITE_ECHU, renouveler: true })
    expect(PHRASE_SITE_ECHU).toBe('L’abonnement de ce site est arrivé à échéance. Renouvelez-le pour reprendre les modifications. Votre site reste en ligne.')
  })
  it('permis, lecture ratée ou en erreur : laisse passer', async () => {
    expect(await refuserSiEchu({ site: { id: 'site-1' } }, { lire: async () => true })).toBeNull()
    expect(await refuserSiEchu({ site: { id: 'site-1' } }, { lire: async () => null })).toBeNull()
    expect(await refuserSiEchu({ site: { id: 'site-1' } }, { lire: async () => { throw new Error('réseau') } })).toBeNull()
  })
  it('l’opérateur n’est jamais arrêté, et la base n’est même pas lue', async () => {
    const lu: string[] = []
    expect(await refuserSiEchu({ site: { id: 'site-1' }, viaAdmin: true }, { lire: async (id) => { lu.push(id); return false } })).toBeNull()
    expect(lu).toEqual([])
  })
  it('lit la MÊME fonction que le déclencheur de la base, pour CE site', async () => {
    permis = { data: false, error: null }
    expect((await refuserSiEchu({ site: { id: 'site-1' } }))?.status).toBe(403)
    expect(appels).toEqual([{ fn: 'site_modifications_permises', args: { p_site: 'site-1' } }])
    permis = { data: null, error: { message: 'absente' } }
    expect(await refuserSiEchu({ site: { id: 'site-1' } })).toBeNull()
  })
  it('reconnaît le refus de la base comme celui d’une route', () => {
    expect(estRefusSiteEchu({ message: 'SITE_ECHU: l’abonnement…' })).toBe(true)
    expect(estRefusSiteEchu({ code: CODE_SITE_ECHU })).toBe(true)
    expect(estRefusSiteEchu({ message: 'permission denied' })).toBe(false)
    expect(estRefusSiteEchu(null)).toBe(false)
  })
})

describe('une vraie route de contenu : les pages', () => {
  const appeler = async (m: 'POST' | 'PATCH' | 'DELETE') => {
    const route = await import('@/app/api/sites/[slug]/pages/route')
    const req = new Request('https://www.deribfy.com/api/sites/ma-vitrine/pages?id=p1', { method: m, body: m === 'DELETE' ? undefined : JSON.stringify({ chemin: '/a', titre: 'A' }) })
    return route[m](req, { params: Promise.resolve({ slug: 'ma-vitrine' }) })
  }
  it('échu : refusée, RIEN n’est écrit', async () => {
    permis = { data: false, error: null }
    for (const m of ['POST', 'PATCH', 'DELETE'] as const) {
      const r = await appeler(m)
      expect(r.status, m).toBe(403)
    }
    expect(journal.ecritures.site_pages ?? []).toEqual([])
  })
  it('à jour : la page s’écrit comme avant', async () => {
    const r = await appeler('POST')
    expect(r.status).toBe(201)
    expect((journal.ecritures.site_pages as { op: string }[])[0].op).toBe('insert')
  })
})

/** Les routes de contenu (liste du propriétaire, 2026-11-26) et leurs méthodes d'écriture. */
const BLOQUEES: Record<string, readonly string[]> = {
  'sites/[slug]/pages': ['POST', 'PATCH', 'DELETE'],
  'sites/[slug]': ['PATCH'],
  'shop/products': ['POST'],
  'shop/promo': ['POST'],
  'blog/posts': ['POST'],
  'blog/posts/generate': ['POST'],
  'catalog/curate': ['POST'],
  'catalog/enhance': ['POST'],
  'catalog/selections': ['PATCH', 'DELETE', 'POST'],
  'sites/[slug]/catalogue': ['POST', 'PATCH', 'DELETE'],
  'images/upload': ['POST'],
  'sites/[slug]/fichiers': ['POST', 'DELETE'],
  'site/logo': ['POST'],
  'agent/[slug]/apply': ['POST'],
  'agent/[slug]/chat': ['POST'],
  'pod/generate-mockups': ['POST'],
}
/** Ce qui doit continuer de marcher : commandes, clients, messages, paiement, renouvellement. */
const LIBRES = ['shop/orders', 'sites/[slug]/commandes', 'sites/[slug]/clients', 'sites/[slug]/comptes', 'sites/[slug]/messages-clients',
  'sites/[slug]/mobile-money', 'sites/[slug]/publication', 'checkout', 'sites/[slug]/offres', 'sites/[slug]/documents', 'stripe/portal']

/** Le corps de la fonction `m` exportée par le fichier. */
function corps(src: string, m: string): string {
  const debut = src.search(new RegExp(`export async function ${m}\\b`, 'u'))
  if (debut < 0) return ''
  const suite = src.slice(debut + 10).search(/export async function (GET|POST|PATCH|PUT|DELETE)\b/u)
  return suite < 0 ? src.slice(debut) : src.slice(debut, debut + 10 + suite)
}

describe('chaque route de contenu refuse, et aucune autre', () => {
  for (const [r, ms] of Object.entries(BLOQUEES)) {
    for (const m of ms) {
      it(`${m} /api/${r} : le refus vient après le contrôle du propriétaire`, () => {
        const c = corps(lire(`src/app/api/${r}/route.ts`), m)
        const garde = c.indexOf('requireSiteOwner(')
        const refus = c.indexOf('refuserSiEchu(')
        expect(garde, 'contrôle du propriétaire').toBeGreaterThan(-1)
        expect(refus, 'refus après échéance').toBeGreaterThan(garde)
      })
    }
  }
  it('les lectures (GET) des routes de contenu restent libres', () => {
    for (const r of Object.keys(BLOQUEES)) expect(corps(lire(`src/app/api/${r}/route.ts`), 'GET'), r).not.toContain('refuserSiEchu(')
  })
  for (const r of LIBRES) {
    it(`/api/${r} continue de marcher après l’échéance`, () => {
      expect(lire(`src/app/api/${r}/route.ts`)).not.toContain('refuserSiEchu')
    })
  }
})

describe('« Renouveler » depuis l’éditeur', () => {
  it('le lien ramène au tableau de bord, qui le relit', () => {
    expect(lienRenouveler('ma-vitrine')).toBe('/dashboard?renouveler=ma-vitrine')
    expect(lireRenouveler('?renouveler=ma-vitrine')).toBe('ma-vitrine')
    expect(lireRenouveler('?renouveler=../admin')).toBeNull()
    expect(lireRenouveler('')).toBeNull()
  })
  it('le tableau de bord ouvre le renouvellement demandé, et les deux éditeurs montrent le bandeau', () => {
    const tableau = lire('src/app/dashboard/page.tsx')
    expect(tableau).toContain('lireRenouveler(window.location.search)')
    expect(tableau).toMatch(motifTexte('handlePublish(s.slug, s.published, true)'))
    expect(lire('src/components/editeur/EditeurVisuel.tsx')).toMatch(motifTexte('<BandeauSiteEchu slug={slug} />'))
    expect(lire('src/app/edit/[slug]/page.tsx')).toMatch(motifTexte('<BandeauSiteEchu slug={slug} />'))
  })
})
