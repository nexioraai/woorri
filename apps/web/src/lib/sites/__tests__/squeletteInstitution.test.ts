/**
 * UNE INSTITUTION NAÎT COMPLÈTE (lot 4, 2026-11-26).
 *
 * ① les pages et sous-pages (menu déroulant) de chaque famille ;
 * ② RIEN D'INVENTÉ : ni chiffre, ni téléphone, ni courriel, ni adresse, ni nom ;
 *   des encadrés « À compléter » qui disent quoi et où ;
 * ③ des photos par famille (jamais un bureau), un logo provisoire au sigle ;
 * ④ le semeur écrit pages et logo — jamais par-dessus un logo existant ;
 * ⑤ la génération l'appelle pour une institution seulement ; tout se modifie
 *   depuis le tableau de bord (route des pages, éditeur, blog, logo).
 * Ce que ce fichier NE voit PAS : une vraie génération, Pexels, le stockage réel.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { institution } from '@/lib/sites/institution'
import { creerFrom, journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'
import type { FamilleInstitution } from '@/lib/sites/familleInstitution'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }))
const { squeletteInstitution, missionsDe, RECHERCHE_PHOTOS, svgLogoProvisoire, aCompleter } = await import('@/lib/sites/squeletteInstitution')
const { semerInstitution } = await import('@/lib/sites/semerInstitution')
const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

const FAMILLES: FamilleInstitution[] = ['ministere', 'mairie', 'ong', 'ecole', 'hopital', 'agence_publique']
const GENERE = {
  about: 'Le ministère conçoit et met en œuvre la politique nationale de santé.',
  mission: 'Garantir l’accès de tous aux soins.',
  sections: [{ name: 'Nos missions', items: [{ title: 'Politique de santé', description: 'Définir les orientations nationales.', price: '5000 FCFA' }, { title: '', description: 'vide' }] }],
}
const pagesDe = (f: FamilleInstitution, photos: { presentation: string | null; activite: string | null } = { presentation: 'https://images.pexels.com/a.jpg', activite: 'https://images.pexels.com/b.jpg' }) =>
  squeletteInstitution({ famille: f, inst: institution('fr', 'le Ministère'), about: GENERE.about, mission: GENERE.mission, missions: missionsDe(GENERE.sections), photos })

/** Tout le TEXTE visible des pages (titres, introductions, blocs). */
const textes = (v: unknown): string[] => typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(textes) : v !== null && typeof v === 'object' ? Object.entries(v).filter(([k]) => k !== 'url' && k !== 'chemin' && k !== 'parent').flatMap(([, x]) => textes(x)) : []

describe('① pages et sous-pages', () => {
  for (const f of FAMILLES) {
    it(`${f} : 4 entrées de menu, leurs sous-pages, tout publié`, () => {
      const p = pagesDe(f)
      const racines = p.filter((x) => x.parent === null).sort((a, b) => a.ordre - b.ordre).map((x) => x.chemin)
      expect(racines[0]).toBe('qui-sommes-nous')
      expect(racines.slice(2)).toEqual(['actualites', 'documents'])
      expect(racines).toHaveLength(4)
      expect(p.filter((x) => x.parent === 'qui-sommes-nous').map((x) => x.chemin)).toEqual(['qui-sommes-nous/mot-du-responsable', 'qui-sommes-nous/organigramme', 'qui-sommes-nous/missions'])
      expect(p.filter((x) => x.parent === 'actualites').map((x) => x.titre)).toEqual(['Communiqués', 'Agenda'])
      expect(p.every((x) => x.menu && x.publie)).toBe(true)
      for (const x of p) expect(x.chemin, x.chemin).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/u)
    })
  }
  it('la page propre à la famille', () => {
    expect(pagesDe('mairie').find((x) => x.ordre === 20)?.titre).toBe('Démarches')
    expect(pagesDe('ong').find((x) => x.ordre === 20)?.titre).toBe('Nos programmes')
    expect(pagesDe('hopital').find((x) => x.ordre === 20)?.titre).toBe('Soins et services')
    expect(pagesDe('ecole').find((x) => x.ordre === 20)?.titre).toBe('Formations')
    expect(pagesDe('ministere').find((x) => x.chemin === 'qui-sommes-nous/mot-du-responsable')?.titre).toBe('Le mot du ministre')
  })
  it('les textes de la génération sont repris : « à propos », mission, missions — sans prix ni entrée vide', () => {
    const p = pagesDe('ministere')
    expect(p.find((x) => x.chemin === 'qui-sommes-nous')?.chapeau).toBe(GENERE.about)
    const m = p.find((x) => x.chemin === 'qui-sommes-nous/missions')!
    expect(m.chapeau).toBe(GENERE.mission)
    expect(m.blocs).toEqual([{ type: 'liste', items: ['Politique de santé — Définir les orientations nationales.'] }])
    expect(JSON.stringify(p)).not.toMatch(/FCFA|5000/u)
  })
})

describe('② rien d’inventé', () => {
  for (const f of FAMILLES) {
    it(`${f} : aucun chiffre, téléphone, courriel, adresse ; « À compléter » là où rien ne peut être su`, () => {
      const p = pagesDe(f)
      const t = textes(p.map((x) => ({ titre: x.titre, chapeau: x.chapeau, blocs: x.blocs }))).join(' ¦ ')
      expect(t).not.toMatch(/\d|@|\+235|avenue|rue\s|quartier|BP\s/iu)
      for (const c of ['qui-sommes-nous/mot-du-responsable', 'qui-sommes-nous/organigramme', 'documents']) {
        expect(p.find((x) => x.chemin === c)?.blocs.some((b) => b.type === 'encadre' && b.titre === 'À compléter'), c).toBe(true)
      }
    })
  }
  it('le responsable n’est nommé que par sa FONCTION — jamais un nom (liste fermée)', () => {
    expect(FAMILLES.map((f) => pagesDe(f).find((x) => x.chemin === 'qui-sommes-nous/mot-du-responsable')?.titre)).toEqual([
      'Le mot du ministre', 'Le mot du maire', 'Le mot de la présidence', 'Le mot de la direction', 'Le mot de la direction', 'Le mot de la direction générale',
    ])
  })
  it('l’encadré dit où compléter, et qu’on n’a rien écrit à la place', () => {
    expect(aCompleter('Le texte.')).toEqual({ type: 'encadre', ton: 'info', titre: 'À compléter', texte: 'Le texte. À ajouter depuis l’éditeur du site : rien n’est écrit ici à votre place.' })
  })
  it('sans missions générées : un encadré, jamais une liste inventée', () => {
    const p = squeletteInstitution({ famille: 'ong', inst: institution('fr', null), about: '', mission: '', missions: [], photos: { presentation: null, activite: null } })
    expect(p.find((x) => x.chemin === 'qui-sommes-nous/missions')?.blocs.map((b) => b.type)).toEqual(['encadre'])
    expect(p.find((x) => x.chemin === 'qui-sommes-nous')?.chapeau).toBeNull()
  })
})

describe('③ photos et logo', () => {
  it('des photos de lieux et de gens, par famille — jamais un bureau', () => {
    for (const f of FAMILLES) {
      expect(JSON.stringify(RECHERCHE_PHOTOS[f]), f).not.toMatch(/office|desk|laptop|business/iu)
      expect(RECHERCHE_PHOTOS[f].presentation).not.toBe(RECHERCHE_PHOTOS[f].activite)
    }
    const p = pagesDe('hopital')
    expect(p.find((x) => x.chemin === 'qui-sommes-nous')?.blocs[0]).toMatchObject({ type: 'image', url: 'https://images.pexels.com/a.jpg' })
    expect(pagesDe('hopital', { presentation: null, activite: null }).some((x) => x.blocs.some((b) => b.type === 'image'))).toBe(false)
  })
  it('le logo provisoire : le sigle sur la couleur du site, sans rien d’injectable', () => {
    const svg = svgLogoProvisoire('MSP', '#0a7f5a')
    expect(svg).toMatch(motifTexte('fill="#0a7f5a"'))
    expect(svg).toMatch(/>MSP<\/text>/u)
    expect(svgLogoProvisoire('A<script>', 'rouge')).toMatch(motifTexte('fill="#1e4d8c"'))
    expect(svgLogoProvisoire('A<script>', null)).not.toMatch(/<script|script/u)
    expect(svgLogoProvisoire('A<script>', null)).toMatch(/>A<\/text>/u)
    expect(svgLogoProvisoire('', null)).toMatch(/>REF<\/text>/u)
  })
})

describe('④ le semeur', () => {
  const faux = (site: unknown, j: JournalPostgrest, televerse: string[]) => ({
    from: creerFrom({ sites: { reponse: { data: site, error: null } }, site_pages: { reponse: { data: null, error: null } } }, j),
    storage: { from: () => ({
      upload: async (chemin: string) => { televerse.push(chemin); return { error: null } },
      getPublicUrl: (chemin: string) => ({ data: { publicUrl: `https://cdn.test/${chemin}` } }),
    }) },
  })
  const appel = (site: unknown, j: JournalPostgrest, televerse: string[], photos = async (q: string) => [`https://images.pexels.com/${q.length}.jpg`]) =>
    semerInstitution(
      { slug: 'ministere-sante', demande: 'site du ministère de la Santé publique', genere: { name: 'Ministère de la Santé Publique', primaryColor: '#0a7f5a', designation: 'le Ministère', ...GENERE }, photos },
      { admin: faux(site, j, televerse) as never, versPng: async () => Buffer.from('png'), maintenant: () => 1 },
    )
  it('écrit les 9 pages du site, et un logo provisoire au sigle quand il n’y en a pas', async () => {
    const j = journalVierge(); const tv: string[] = []
    const r = await appel({ id: 's1', logo_url: null }, j, tv)
    expect(r).toMatchObject({ pages: 9, logo: true, famille: 'ministere', erreurs: [] })
    const ecrites = (j.ecritures.site_pages[0] as { charge: { site_id: string; chemin: string }[] }).charge
    expect(ecrites).toHaveLength(9)
    expect(ecrites.every((p) => p.site_id === 's1')).toBe(true)
    expect(tv).toEqual(['ministere-sante/logo-provisoire-1.png'])
    expect(j.ecritures.sites).toContainEqual({ op: 'update', charge: { logo_url: 'https://cdn.test/ministere-sante/logo-provisoire-1.png' } })
    expect(j.filtres.sites).toContainEqual(['is', 'logo_url', null])
  })
  it('un logo existant n’est jamais remplacé', async () => {
    const j = journalVierge(); const tv: string[] = []
    const r = await appel({ id: 's1', logo_url: 'https://cdn.test/vrai-logo.png' }, j, tv)
    expect(r.logo).toBe(false)
    expect(tv).toEqual([])
    expect(j.ecritures.sites ?? []).toEqual([])
  })
  it('deux photos DIFFÉRENTES, même quand Pexels rend la même liste aux deux recherches', async () => {
    const j = journalVierge(); const tv: string[] = []
    await appel({ id: 's1', logo_url: null }, j, tv, async () => ['https://images.pexels.com/1.jpg', 'https://images.pexels.com/2.jpg'])
    const ecrites = (j.ecritures.site_pages[0] as { charge: { blocs: { type: string; url?: string }[] }[] }).charge
    const urls = ecrites.flatMap((p) => p.blocs.filter((b) => b.type === 'image').map((b) => b.url))
    expect(urls).toEqual(['https://images.pexels.com/1.jpg', 'https://images.pexels.com/2.jpg'])
  })
  it('site introuvable : rien n’est écrit, l’erreur est rendue', async () => {
    const j = journalVierge(); const tv: string[] = []
    const r = await appel(null, j, tv)
    expect(r.pages).toBe(0)
    expect(r.erreurs[0]).toMatch(/site\sintrouvable/u)
    expect(j.ecritures.site_pages ?? []).toEqual([])
  })
  it('des photos en panne : les pages naissent quand même, sans image', async () => {
    const j = journalVierge(); const tv: string[] = []
    const r = await appel({ id: 's1', logo_url: null }, j, tv, async () => { throw new Error('Pexels') })
    expect(r.pages).toBe(9)
    const ecrites = (j.ecritures.site_pages[0] as { charge: { blocs: { type: string }[] }[] }).charge
    expect(ecrites.some((p) => p.blocs.some((b) => b.type === 'image'))).toBe(false)
  })
})

describe('⑤ branché, et tout modifiable', () => {
  it('la génération sème une institution — et seulement elle', () => {
    const r = lire('src/app/api/chat/route.ts')
    expect(r).toMatch(motifTexte("if (sector === 'institution') {\n      try {\n        const semis = await semerInstitution({ slug, demande: message, genere: parsed as never, photos: (q) => fetchPexelsImages(q, parsed.primaryColor) });"))
  })
  it('le client modifie tout depuis le tableau de bord : pages (titre, intro, blocs, menu), logo, actualités', () => {
    expect(lire('src/app/api/sites/[slug]/pages/route.ts')).toMatch(motifTexte("const CHAMPS = ['chemin', 'parent', 'titre', 'chapeau', 'corps', 'ordre', 'menu', 'publie', 'blocs'] as const"))
    expect(lire('src/components/editeur/EditeurVisuel.tsx')).toMatch(/\/api\/sites\/\$\{encodeURIComponent\(slug\)\}\/pages|\/pages`/u)
    expect(lire('src/app/edit/[slug]/page.tsx')).toMatch(/\/api\/site\/logo/u)
    expect(lire('src/app/dashboard/blog/page.tsx')).toMatch(/CATEGORIES_BROUILLON/u)
  })
})
