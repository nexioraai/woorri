/**
 * UNE INSTITUTION NAÎT COMPLÈTE (lot 4, 2026-11-26 ; menu et pages du lot 4c).
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
const { squeletteInstitution, missionsDe, RECHERCHE_PHOTOS, svgLogoProvisoire, aCompleter, pagesLegalesInstitution } = await import('@/lib/sites/squeletteInstitution')
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

/** La rubrique de l'institution, par famille (lot 4c). */
const RUBRIQUE: Record<FamilleInstitution, string> = { ministere: 'le-ministere', mairie: 'la-mairie', ong: 'l-organisation', ecole: 'l-etablissement', hopital: 'l-hopital', agence_publique: 'l-agence' }
const PROPRE_DE: Record<FamilleInstitution, string> = { ministere: 'nos-services', agence_publique: 'nos-services', mairie: 'demarches', ong: 'zones-d-intervention', ecole: 'formations', hopital: 'soins-et-services' }

describe('① pages et sous-pages (menu du lot 4c)', () => {
  for (const f of FAMILLES) {
    it(`${f} : Accueil · <l’institution> · Projets · Actualités · Documents · Contact`, () => {
      const p = pagesDe(f)
      const R = RUBRIQUE[f]
      const menu = p.filter((x) => x.parent === null && x.menu).sort((a, b) => a.ordre - b.ordre).map((x) => x.chemin)
      expect(menu).toEqual([R, 'projets', 'actualites', 'documents'])
      const tutelle = f === 'ministere' || f === 'agence_publique'
      expect(p.filter((x) => x.parent === R).sort((a, b) => a.ordre - b.ordre).map((x) => x.chemin)).toEqual([
        `${R}/mot-du-responsable`, `${R}/biographie`, `${R}/missions`, `${R}/organigramme`, `${R}/${PROPRE_DE[f]}`, ...(tutelle ? [`${R}/organismes-sous-tutelle`] : []),
      ])
      expect(p.filter((x) => x.parent === 'actualites').map((x) => x.titre)).toEqual(['Communiqués', 'Agenda'])
      // Publié et au menu, SAUF : le modèle de programme (jamais publié), les deux pages légales
      // (publiées, hors menu : au pied de page) et les deux réglages de l'accueil.
      const horsMenu = ['projets/modele-de-programme', 'mentions-legales', 'confidentialite', 'accueil-bandeau', 'accueil-chiffres']
      expect(p.filter((x) => !(x.menu && x.publie)).map((x) => x.chemin).sort()).toEqual(horsMenu.filter((c) => p.some((x) => x.chemin === c)).sort())
      expect(p.find((x) => x.chemin === 'projets/modele-de-programme')).toMatchObject({ publie: false, menu: false, parent: 'projets' })
      for (const c of ['mentions-legales', 'confidentialite']) expect(p.find((x) => x.chemin === c), c).toMatchObject({ publie: true, menu: false, parent: null })
      for (const x of p) expect(x.chemin, x.chemin).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/u)
    })
  }
  it('la page propre à la famille, et le titre de la rubrique', () => {
    expect(pagesDe('mairie').find((x) => x.chemin === 'la-mairie/demarches')?.titre).toBe('Démarches')
    expect(pagesDe('ong').find((x) => x.chemin === 'l-organisation/zones-d-intervention')?.titre).toBe('Zones d’intervention')
    expect(pagesDe('hopital').find((x) => x.chemin === 'l-hopital/soins-et-services')?.titre).toBe('Soins et services')
    expect(pagesDe('ecole').find((x) => x.chemin === 'l-etablissement/formations')?.titre).toBe('Formations')
    expect(pagesDe('ministere').find((x) => x.chemin === 'le-ministere/mot-du-responsable')?.titre).toBe('Le mot du ministre')
    expect(FAMILLES.map((f) => pagesDe(f).find((x) => x.chemin === RUBRIQUE[f])?.titre)).toEqual(['Le Ministère', 'La Mairie', 'L’Organisation', 'L’Établissement', 'L’Hôpital', 'L’Agence'])
  })
  it('les textes de la génération sont repris : « à propos », mission, missions — sans prix ni entrée vide', () => {
    const p = pagesDe('ministere')
    expect(p.find((x) => x.chemin === 'le-ministere')?.chapeau).toBe(GENERE.about)
    const m = p.find((x) => x.chemin === 'le-ministere/missions')!
    expect(m.chapeau).toBe(GENERE.mission)
    expect(m.blocs).toEqual([{ type: 'liste', items: ['Politique de santé — Définir les orientations nationales.'] }])
    expect(JSON.stringify(p)).not.toMatch(/FCFA|5000/u)
  })
})

describe('①ter lot 4c : biographie, organigramme, organismes, programmes, pages légales', () => {
  it('la biographie n’est JAMAIS générée : un encadré « À compléter », rien d’autre', () => {
    for (const f of FAMILLES) {
      const bio = pagesDe(f).find((x) => x.chemin === `${RUBRIQUE[f]}/biographie`)!
      expect(bio.chapeau, f).toBeNull()
      expect(bio.blocs.map((b) => [b.type, b.titre]), f).toEqual([['encadre', 'À compléter']])
    }
  })
  it('l’organigramme : un vrai bloc à une seule boîte certaine (la fonction du responsable), sans nom', () => {
    const o = pagesDe('ministere').find((x) => x.chemin === 'le-ministere/organigramme')!
    expect(o.blocs[0]).toEqual({ type: 'organigramme', titre: 'Organigramme', items: [{ cle: 'tete', fonction: 'Le ministre' }] })
    expect(pagesDe('mairie').find((x) => x.chemin === 'la-mairie/organigramme')!.blocs[0]).toMatchObject({ items: [{ cle: 'tete', fonction: 'Le maire' }] })
  })
  it('aucun organisme ni programme inventé : seulement un modèle NON publié aux cases « À compléter »', () => {
    const p = pagesDe('ministere')
    expect(p.filter((x) => x.parent === 'le-ministere/organismes-sous-tutelle')).toEqual([])
    const enfantsProjets = p.filter((x) => x.parent === 'projets')
    expect(enfantsProjets.map((x) => [x.chemin, x.publie])).toEqual([['projets/modele-de-programme', false]])
    expect(enfantsProjets[0].blocs[0]).toMatchObject({ type: 'tableau', lignes: [['Statut', 'À compléter'], ['Date', 'À compléter'], ['Bailleur', 'À compléter']] })
  })
  it('mentions légales : hébergeur rempli (Deribfy) ; éditeur, adresse, directeur, contact « À compléter »', () => {
    const m = pagesLegalesInstitution({ assistant: false }).find((x) => x.chemin === 'mentions-legales')!
    const lignes = m.blocs.filter((b) => b.type === 'tableau').flatMap((b) => b.lignes as string[][])
    expect(Object.fromEntries(lignes)).toEqual({
      'Nom officiel': 'À compléter', Adresse: 'À compléter', 'Directeur de la publication': 'À compléter', Contact: 'À compléter',
      Plateforme: 'Deribfy — www.deribfy.com', Infrastructure: 'Vercel Inc. (pages) et Supabase Inc. (données)',
    })
  })
  it('politique de confidentialité : ce que le site FAIT, aucune loi citée, la note juridique réservée au propriétaire', () => {
    const sans = pagesLegalesInstitution({ assistant: false }).find((x) => x.chemin === 'confidentialite')!
    const avec = pagesLegalesInstitution({ assistant: true }).find((x) => x.chemin === 'confidentialite')!
    const texte = (pg: typeof sans) => textes(pg.blocs).join(' ')
    expect(texte(sans)).toMatch(/formulaire\sde\scontact/iu)
    expect(texte(sans)).toMatch(/mesure\sd’audience[\s\S]*n’est\sactivée\sque\ssi\svous\sl’acceptez/iu)
    expect(texte(sans)).not.toMatch(/assistant/iu)
    expect(texte(avec)).toMatch(/assistant\sdu\ssite/iu)
    for (const pg of [sans, avec]) {
      expect(texte(pg)).not.toMatch(/\bloi\b|RGPD|décret|article\s\d|ordonnance/iu)
      expect(pg.blocs[0]).toMatchObject({ type: 'encadre', titre: 'Visible par vous seul', texte: expect.stringMatching(/service juridique/u) })
    }
  })
})

describe('①bis deux pages ne répètent jamais les mêmes lignes (lot 4b)', () => {
  it('Missions = la 1re section ; la page de la famille = les sections suivantes ; aucune ligne commune', () => {
    const sections = [{ items: [{ title: 'Politique de santé', description: 'Orientations.' }] }, { items: [{ title: 'Vaccination', description: 'Campagnes.' }, { title: 'Politique de santé', description: 'doublon' }] }]
    const p = squeletteInstitution({ famille: 'ministere', inst: institution('fr', null), about: '', mission: '', missions: missionsDe(sections, 'missions'), services: missionsDe(sections, 'services'), photos: { presentation: null, activite: null } })
    const lignes = (c: string) => p.find((x) => x.chemin === c)!.blocs.filter((b) => b.type === 'liste').flatMap((b) => b.items as string[])
    expect(lignes('le-ministere/missions')).toEqual(['Politique de santé — Orientations.'])
    expect(lignes('le-ministere/nos-services')).toEqual(['Vaccination — Campagnes.'])
  })
  it('une seule section générée : la page de la famille n’a PAS de liste (pas de doublon), seulement « À compléter »', () => {
    const p = pagesDe('ministere')
    expect(p.find((x) => x.chemin === 'le-ministere/nos-services')!.blocs.filter((b) => b.type === 'liste')).toEqual([])
  })
})

describe('② rien d’inventé', () => {
  for (const f of FAMILLES) {
    it(`${f} : aucun chiffre, téléphone, courriel, adresse ; « À compléter » là où rien ne peut être su`, () => {
      const p = pagesDe(f)
      const t = textes(p.map((x) => ({ titre: x.titre, chapeau: x.chapeau, blocs: x.blocs }))).join(' ¦ ')
      expect(t).not.toMatch(/\d|@|\+235|avenue|rue\s|quartier|BP\s/iu)
      for (const c of [`${RUBRIQUE[f]}/mot-du-responsable`, `${RUBRIQUE[f]}/biographie`, `${RUBRIQUE[f]}/organigramme`, 'documents', 'projets']) {
        expect(p.find((x) => x.chemin === c)?.blocs.some((b) => b.type === 'encadre' && b.titre === 'À compléter'), c).toBe(true)
      }
    })
  }
  it('le responsable n’est nommé que par sa FONCTION — jamais un nom (liste fermée)', () => {
    expect(FAMILLES.map((f) => pagesDe(f).find((x) => x.chemin === `${RUBRIQUE[f]}/mot-du-responsable`)?.titre)).toEqual([
      'Le mot du ministre', 'Le mot du maire', 'Le mot de la présidence', 'Le mot de la direction', 'Le mot de la direction', 'Le mot de la direction générale',
    ])
  })
  it('l’encadré dit où compléter, et qu’on n’a rien écrit à la place', () => {
    expect(aCompleter('Le texte.')).toEqual({ type: 'encadre', ton: 'info', titre: 'À compléter', texte: 'Le texte. À ajouter depuis l’éditeur du site : rien n’est écrit ici à votre place.' })
  })
  it('sans missions générées : un encadré, jamais une liste inventée', () => {
    const p = squeletteInstitution({ famille: 'ong', inst: institution('fr', null), about: '', mission: '', missions: [], photos: { presentation: null, activite: null } })
    expect(p.find((x) => x.chemin === 'l-organisation/missions')?.blocs.map((b) => b.type)).toEqual(['encadre'])
    expect(p.find((x) => x.chemin === 'l-organisation')?.chapeau).toBeNull()
  })
})

describe('③ photos et logo', () => {
  it('des photos de lieux et de gens, par famille — jamais un bureau', () => {
    for (const f of FAMILLES) {
      expect(JSON.stringify(RECHERCHE_PHOTOS[f]), f).not.toMatch(/office|desk|laptop|business/iu)
      // LOT 4b : chaque recherche nomme l'Afrique ou un pays africain (contexte sahélien).
      for (const q of [...RECHERCHE_PHOTOS[f].presentation, ...RECHERCHE_PHOTOS[f].activite]) expect(q, `${f} : ${q}`).toMatch(/africa|african|sahel|nigeria|lagos|chad/iu)
      expect(RECHERCHE_PHOTOS[f].presentation[0]).not.toBe(RECHERCHE_PHOTOS[f].activite[0])
    }
    const p = pagesDe('hopital')
    expect(p.find((x) => x.chemin === 'l-hopital')?.blocs[0]).toMatchObject({ type: 'image', url: 'https://images.pexels.com/a.jpg' })
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
  const AFRICAINE = (url: string) => ({ url, alt: 'A nurse checks a patient in a clinic in Lagos, Nigeria.' })
  const appel = (site: unknown, j: JournalPostgrest, televerse: string[], photos = async (q: string) => [AFRICAINE(`https://images.pexels.com/${q.length}.jpg`)]) =>
    semerInstitution(
      { slug: 'ministere-sante', demande: 'site du ministère de la Santé publique', genere: { name: 'Ministère de la Santé Publique', primaryColor: '#0a7f5a', designation: 'le Ministère', ...GENERE }, photos },
      { admin: faux(site, j, televerse) as never, versPng: async () => Buffer.from('png'), maintenant: () => 1 },
    )
  it('écrit les 17 pages du site, la maquette, et un logo provisoire au sigle quand il n’y en a pas', async () => {
    const j = journalVierge(); const tv: string[] = []
    const r = await appel({ id: 's1', logo_url: null }, j, tv)
    expect(r).toMatchObject({ pages: 17, logo: true, famille: 'ministere', erreurs: [] })
    const ecrites = (j.ecritures.site_pages[0] as { charge: { site_id: string; chemin: string }[] }).charge
    expect(ecrites).toHaveLength(17)
    // LOT 4c : une institution générée naît « maquette de démonstration ».
    expect(j.ecritures.sites).toContainEqual({ op: 'update', charge: { maquette_demo: true } })
    expect(ecrites.map((p) => p.chemin)).toEqual(expect.arrayContaining(['accueil-bandeau', 'accueil-chiffres']))
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
    expect(j.ecritures.sites ?? []).toEqual([{ op: 'update', charge: { maquette_demo: true } }])
  })
  it('deux photos DIFFÉRENTES, même quand Pexels rend la même liste aux deux recherches', async () => {
    const j = journalVierge(); const tv: string[] = []
    await appel({ id: 's1', logo_url: null }, j, tv, async () => [AFRICAINE('https://images.pexels.com/1.jpg'), AFRICAINE('https://images.pexels.com/2.jpg')])
    const ecrites = (j.ecritures.site_pages[0] as { charge: { blocs: { type: string; url?: string }[] }[] }).charge
    const urls = ecrites.flatMap((p) => p.blocs.filter((b) => b.type === 'image').map((b) => b.url))
    expect(urls).toEqual(['https://images.pexels.com/1.jpg', 'https://images.pexels.com/2.jpg'])
  })
  it('LOT 4b : le semeur passe les services (2e section) à la page de la famille, sans les missions', async () => {
    const j = journalVierge(); const tv: string[] = []
    await semerInstitution(
      { slug: 'm', demande: 'site du ministère de la Santé', genere: { name: 'Ministère', designation: 'le Ministère', sections: [{ items: [{ title: 'Politique', description: 'Orientations.' }] }, { items: [{ title: 'Vaccination', description: 'Campagnes.' }] }] }, photos: async () => [] },
      { admin: faux({ id: 's1', logo_url: 'x' }, j, tv) as never, versPng: async () => Buffer.from('png'), maintenant: () => 1 },
    )
    const ecrites = (j.ecritures.site_pages[0] as { charge: { chemin: string; blocs: { type: string; items?: string[] }[] }[] }).charge
    expect(ecrites.find((p) => p.chemin === 'le-ministere/nos-services')!.blocs.find((b) => b.type === 'liste')?.items).toEqual(['Vaccination — Campagnes.'])
  })
  it('LOT 4b : une photo au décor non africain (ou sans description) n’est JAMAIS posée', async () => {
    const j = journalVierge(); const tv: string[] = []
    await appel({ id: 's1', logo_url: null }, j, tv, async () => [
      { url: 'https://images.pexels.com/usa.jpg', alt: 'African American nurse in a hospital in Chicago, USA' },
      { url: 'https://images.pexels.com/x.jpg', alt: '' },
      { url: 'https://images.pexels.com/papua.jpg', alt: 'Indonesian women in Papua attending a class' },
    ])
    const ecrites = (j.ecritures.site_pages[0] as { charge: { blocs: { type: string }[] }[] }).charge
    expect(ecrites.some((p) => p.blocs.some((b) => b.type === 'image'))).toBe(false)
  })
  it('LOT 4b : le bandeau reprend la mission ; les chiffres clés sont des CASES « À compléter », jamais des valeurs', async () => {
    const j = journalVierge(); const tv: string[] = []
    await appel({ id: 's1', logo_url: null }, j, tv)
    const ecrites = (j.ecritures.site_pages[0] as { charge: { chemin: string; publie: boolean; menu: boolean; blocs: { type: string; items?: unknown[] }[] }[] }).charge
    const bandeau = ecrites.find((p) => p.chemin === 'accueil-bandeau')!
    expect(bandeau).toMatchObject({ publie: false, menu: false })
    expect((bandeau.blocs[0].items as string[]).includes('Garantir l’accès de tous aux soins')).toBe(true)
    const chiffres = ecrites.find((p) => p.chemin === 'accueil-chiffres')!
    expect(chiffres).toMatchObject({ publie: false, menu: false })
    expect((chiffres.blocs[0].items as { valeur: string }[]).every((x) => x.valeur === 'À compléter')).toBe(true)
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
    expect(r.pages).toBe(17)
    const ecrites = (j.ecritures.site_pages[0] as { charge: { blocs: { type: string }[] }[] }).charge
    expect(ecrites.some((p) => p.blocs.some((b) => b.type === 'image'))).toBe(false)
  })
})

describe('⑤ branché, et tout modifiable', () => {
  it('la génération sème une institution — et seulement elle', () => {
    const r = lire('src/app/api/chat/route.ts')
    expect(r).toMatch(motifTexte("if (sector === 'institution') {\n      try {\n        const semis = await semerInstitution({ slug, demande: message, genere: { ...parsed, primaryColor: couleurDemandee(message) ?? parsed.primaryColor } as never, photos: async (q) => (await fetchPexelsPhotos(q)).map((p) => ({ url: p.standard, alt: p.alt ?? '' })) });"))
  })
  it('le client modifie tout depuis le tableau de bord : pages (titre, intro, blocs, menu), logo, actualités', () => {
    expect(lire('src/app/api/sites/[slug]/pages/route.ts')).toMatch(motifTexte("const CHAMPS = ['chemin', 'parent', 'titre', 'chapeau', 'corps', 'ordre', 'menu', 'publie', 'blocs'] as const"))
    expect(lire('src/components/editeur/EditeurVisuel.tsx')).toMatch(/\/api\/sites\/\$\{encodeURIComponent\(slug\)\}\/pages|\/pages`/u)
    expect(lire('src/app/edit/[slug]/page.tsx')).toMatch(/\/api\/site\/logo/u)
    expect(lire('src/app/dashboard/blog/page.tsx')).toMatch(/CATEGORIES_BROUILLON/u)
  })
})
