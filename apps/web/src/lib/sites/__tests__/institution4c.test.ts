/**
 * LOT 4c — UN SITE INSTITUTIONNEL COMPLET, SANS RIEN DE FAUX (2026-11-26).
 *
 * ① RÈGLE ABSOLUE : aucune section visible des visiteurs sans données réelles —
 *   les cases « À compléter » ne sont montrées qu'au propriétaire ;
 * ② le logo s'affiche dans l'aperçu d'un site NON publié, au propriétaire
 *   seulement, et jamais par le cache public ;
 * ③ en-tête et pied de page : Accueil, recherche (« / »), contraste élevé,
 *   pages légales, réseaux remplis seulement, « Développé par Deribfy » ;
 * ④ le grand menu ne répète pas le titre de la rubrique ;
 * ⑤ les pages intérieures ont un en-tête coloré, pas d'écran blanc forcé ;
 * ⑥ « Programmes en cours » ; ⑦ « Maquette de démonstration » ;
 * ⑧ l'éditeur ajoute et retire des lignes (organigramme modifiable).
 * Ce que ce fichier NE voit PAS : le rendu à l'œil (captures), la vraie base,
 * le vrai cookie d'aperçu, le SQL de `maquette_demo` (bloc à exécuter).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { blocsPourVisiteur, ficheProgramme, nonRempli, videPourVisiteur } from '@/lib/sites/institutionVisiteur'
import { ajouterLigne, nombreDeLignes, retirerLigne } from '@/components/edit/champsDeBloc'
import type { Bloc } from '@/app/sites/[slug]/pages/blocs'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }))
const { default: InstitutionTheme, programmesVisibles } = await import('@/app/sites/[slug]/themes/InstitutionTheme')
const { sourceEnseigne } = await import('@/app/sites/[slug]/themes/institution/CadreInstitution')
const { chercher, normaliser } = await import('@/app/sites/[slug]/themes/institution/OutilsInstitution')
const { cacheEnseigne } = await import('@/lib/images/reponseEnseigne')
const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

const A = 'À compléter'

describe('① ce qu’un visiteur voit', () => {
  it('un encadré « À compléter » ou « Visible par vous seul » disparaît ; un encadré réel reste', () => {
    const blocs = [
      { type: 'encadre', titre: A, texte: 'Le texte.' },
      { type: 'encadre', titre: 'Visible par vous seul', texte: 'Modèle.' },
      { type: 'encadre', titre: 'Horaires', texte: 'Du lundi au vendredi.' },
    ]
    expect(blocsPourVisiteur(blocs)).toEqual([{ type: 'encadre', titre: 'Horaires', texte: 'Du lundi au vendredi.' }])
  })
  it('une case non remplie disparaît, le reste demeure ; un bloc vidé disparaît entier', () => {
    expect(blocsPourVisiteur([{ type: 'tableau', entetes: ['R', 'V'], lignes: [['Nom officiel', A], ['Plateforme', 'Deribfy']] }]))
      .toEqual([{ type: 'tableau', entetes: ['R', 'V'], lignes: [['Plateforme', 'Deribfy']] }])
    expect(blocsPourVisiteur([{ type: 'tableau', entetes: ['R', 'V'], lignes: [['Statut', A]] }])).toEqual([])
    expect(blocsPourVisiteur([{ type: 'liste', items: ['Politique', A] }])).toEqual([{ type: 'liste', items: ['Politique'] }])
    expect(blocsPourVisiteur([{ type: 'chiffres', items: [{ valeur: A, libelle: 'Lits' }] }])).toEqual([])
    expect(blocsPourVisiteur([{ type: 'organigramme', items: [{ cle: 'tete', fonction: 'Le ministre' }, { cle: 'p2', parent: 'tete', fonction: A }] }]))
      .toEqual([{ type: 'organigramme', items: [{ cle: 'tete', fonction: 'Le ministre' }] }])
    expect(blocsPourVisiteur([{ type: 'image', url: 'https://x/a.jpg', alt: '' }])).toHaveLength(1)
  })
  it('une page sans rien de réel est « vide » pour un visiteur ; un chapeau réel suffit à la remplir', () => {
    expect(videPourVisiteur({ chapeau: null, blocs: [{ type: 'encadre', titre: A, texte: 'x' }] })).toBe(true)
    expect(videPourVisiteur({ chapeau: `${A} : la description.`, blocs: [] })).toBe(true)
    expect(videPourVisiteur({ chapeau: 'Les directions du ministère.', blocs: [] })).toBe(false)
    expect(nonRempli('  à compléter ')).toBe(true)
    expect(nonRempli('2025')).toBe(false)
  })
  it('la fiche d’un programme ne prend que les lignes remplies', () => {
    expect(ficheProgramme([{ type: 'tableau', lignes: [['Statut', 'En cours'], ['Date', A], ['Bailleur', 'Banque mondiale']] }]))
      .toEqual({ statut: 'En cours', date: null, bailleur: 'Banque mondiale' })
  })
  it('les pages intérieures, le menu et la recherche appliquent la règle (branchement)', () => {
    const rest = lire('src/app/sites/[slug]/[...rest]/page.tsx')
    expect(rest).toMatch(motifTexte('const blocsAffiches = visiteur ? blocsPourVisiteur(sansPhotoDeTete) : sansPhotoDeTete'))
    expect(rest).toMatch(motifTexte('<SousPages enfants={enfantsAffiches}'))
    const lecture = lire('src/app/sites/[slug]/themes/institution/lireInstitution.ts')
    expect(lecture).toMatch(motifTexte('const visibles = pages.filter((p) => p.publie && p.menu && montrable(p))'))
    expect(lecture).toMatch(motifTexte('visiter(blocsPourVisiteur(blocsDe(p.blocs)))'))
  })
  it('le propriétaire est VÉRIFIÉ : le jeton doit être celui du propriétaire du site, pas un jeton quelconque', () => {
    expect(lire('src/lib/sites/proprietaireDuSite.ts')).toMatch(motifTexte("return typeof id === 'string' && id !== '' && (site as { owner_id?: string | null } | null)?.owner_id === id"))
    const lecture = lire('src/app/sites/[slug]/themes/institution/lireInstitution.ts')
    expect(lecture).toMatch(motifTexte('estProprietaireDuSite(siteId),'))
    expect(lecture).not.toMatch(/proprietaire:\s*\(await\sjetonDApercu\(\)\)\s*!==\s*null/u)
  })
})

describe('② le logo dans l’aperçu', () => {
  it('le propriétaire charge l’enseigne sous le chemin du site (que son cookie atteint) ; un visiteur, par la route publique', () => {
    expect(sourceEnseigne('ministere-exemple', true)).toBe('/sites/ministere-exemple/enseigne.png')
    expect(sourceEnseigne('ministere-exemple', false)).toBeUndefined()
  })
  it('la route d’aperçu lit avec le cookie, en cache PRIVÉ ; la route publique lit en anonyme, en cache public', () => {
    expect(cacheEnseigne('prive')).toBe('private, no-store')
    expect(cacheEnseigne('public')).toMatch(/^public,/u)
    const apercu = lire('src/app/sites/[slug]/enseigne.png/route.ts')
    expect(apercu).toMatch(motifTexte('const lecteur = await lecteurDuSite()'))
    expect(apercu).toMatch(motifTexte("return reponseEnseigne(site as SiteEnseigne, 'prive')"))
    expect(apercu).toMatch(motifTexte("status: 404, headers: { 'Cache-Control': 'private, no-store' }"))
    const publique = lire('src/app/api/internal/site-logo/[slug]/route.ts')
    expect(publique).toMatch(motifTexte("return reponseEnseigne(site as SiteEnseigne, 'public')"))
    expect(publique).not.toMatch(/lecteurDuSite/u)
    expect(lire('src/lib/images/reponseEnseigne.ts')).toMatch(motifTexte("'Cache-Control': cacheEnseigne(portee)"))
  })
})

const SITE = { id: 's1', slug: 'ministere-exemple', name: 'Ministère de l’Exemple', primary_color: '#0a6b4f', hero_title: 'Servir', hero_subtitle: null, hero_image: null, about: null, mission: null, contact: {}, lang: 'fr', custom_domain: null, logo_url: 'https://x.supabase.co/storage/v1/object/public/site-images/m/logo.png', social_links: {} as Record<string, string> }
const RUBRIQUES = [
  { chemin: 'le-ministere', titre: 'Le Ministère', chapeau: null, couleur: '#0a6b4f', image: null, enfants: [{ chemin: 'le-ministere/missions', titre: 'Missions' }] },
  { chemin: 'projets', titre: 'Projets', chapeau: null, couleur: '#0b5a6b', image: null, enfants: [] },
]
const rendre = (o: { proprietaire: boolean; programmes?: unknown[]; social?: Record<string, string>; contact?: Record<string, string> }) => renderToStaticMarkup(createElement(InstitutionTheme, {
  site: { ...SITE, social_links: o.social ?? {}, contact: o.contact ?? {} } as never, host: 'ministere-exemple.deribfy.app',
  liensLegaux: [{ href: 'https://ministere-exemple.deribfy.app/mentions-legales', titre: 'Mentions légales' }, { href: 'https://ministere-exemple.deribfy.app/confidentialite', titre: 'Politique de confidentialité' }],
  institution: { rubriques: RUBRIQUES, bandeau: [], chiffres: [], proprietaire: o.proprietaire, recherche: [], programmes: (o.programmes ?? []) as never },
}))

describe('③ en-tête et pied de page', () => {
  it('Accueil en tête du menu ; recherche et contraste dans l’en-tête', () => {
    const h = rendre({ proprietaire: false })
    expect(h).toMatch(/data-grand-menu=""><a\shref="https:\/\/ministere-exemple\.deribfy\.app"[^>]*>Accueil<\/a>/u)
    expect(h).toContain('data-bouton-recherche')
    expect(h).toMatch(motifTexte('aria-label="Rechercher sur le site (touche /)"'))
    expect(h).toContain('data-bouton-contraste')
  })
  it('pied : logo, pages légales, « Développé par Deribfy », marqué `data-pied-legal` (le bandeau commun se retire)', () => {
    const h = rendre({ proprietaire: false })
    const pied = h.slice(h.indexOf('<footer'))
    expect(pied).toContain('data-pied-legal')
    expect(pied).toContain('src="/api/internal/site-logo/ministere-exemple"')
    expect(pied).toMatch(motifTexte('>Mentions légales</a>'))
    expect(pied).toMatch(motifTexte('>Politique de confidentialité</a>'))
    expect(pied).toMatch(/Développé\spar\s<a\shref="https:\/\/www\.deribfy\.com"[^>]*>Deribfy<\/a>/u)
  })
  it('réseaux : aucune icône sans lien ; une icône par lien rempli', () => {
    expect(rendre({ proprietaire: false })).not.toMatch(/facebook\.com|aria-label="Facebook"/iu)
    const h = rendre({ proprietaire: false, social: { facebook: 'https://facebook.com/ministere-exemple' } })
    expect(h).toContain('https://facebook.com/ministere-exemple')
    expect(h).not.toMatch(/youtube\.com/u)
  })
  it('propriétaire : l’enseigne (en-tête ET pied) passe par la route d’aperçu', () => {
    const h = rendre({ proprietaire: true })
    expect(h.split('src="/sites/ministere-exemple/enseigne.png"').length - 1).toBe(2)
    expect(h).not.toContain('/api/internal/site-logo/')
  })
})

describe('③ter téléphone : le bouton ☰ centré dans l’en-tête (capture du 2026-11-26)', () => {
  it('la zone du menu centre ses enfants sur téléphone, et les étire sur ordinateur (panneaux)', () => {
    expect(lire('src/app/sites/[slug]/themes/institution/CadreInstitution.tsx')).toMatch(motifTexte('<div className="ml-auto flex items-center lg:items-stretch h-full" data-zone-menu="">'))
  })
})

describe('②bis la vue visiteur d’un site non publié garde son logo (capture du 2026-11-26)', () => {
  it('cookie d’aperçu sans être propriétaire : l’enseigne passe quand même par la route d’aperçu', () => {
    const h = renderToStaticMarkup(createElement(InstitutionTheme, {
      site: SITE as never, host: 'localhost:3999',
      institution: { rubriques: RUBRIQUES, bandeau: [], chiffres: [], proprietaire: false, apercu: true, recherche: [], programmes: [] },
    }))
    expect(h.split('src="/sites/ministere-exemple/enseigne.png"').length - 1).toBe(2)
    expect(h).not.toMatch(/compléter/u)
  })
})

describe('④ ⑥ accueil : contact et programmes', () => {
  it('visiteur sans coordonnées ni programme : ni section Contact, ni « Programmes en cours », aucun « À compléter »', () => {
    const h = rendre({ proprietaire: false })
    expect(h).not.toContain('id="contact"')
    expect(h).not.toContain('data-programmes')
    expect(h).not.toMatch(/compléter/u)
  })
  it('propriétaire : la carte-modèle (image, statut, titre, description, date, bailleur « À compléter »)', () => {
    const h = rendre({ proprietaire: true })
    expect(h).toContain('data-programme-modele')
    for (const k of ['Image', 'Statut', 'Titre', 'Description', 'Date', 'Bailleur']) expect(h).toMatch(motifTexte(`<dt class="font-bold">${k}</dt><dd class="italic">À compléter</dd>`))
  })
  it('un programme publié : sa carte, avec seulement ses champs remplis', () => {
    const h = rendre({ proprietaire: false, programmes: [{ chemin: 'projets/eau', titre: 'Eau pour tous', description: 'Des forages.', image: null, statut: 'En cours', date: null, bailleur: 'Banque mondiale' }] })
    expect(h).toContain('data-programmes')
    expect(h).toMatch(motifTexte('>En cours</span>'))
    expect(h).toMatch(motifTexte('<dt class="font-bold">Bailleur</dt><dd>Banque mondiale</dd>'))
    expect(h).not.toMatch(/<dt[^>]*>Date<\/dt>/u)
    expect(h).not.toContain('data-programme-modele')
    expect(programmesVisibles({ programmes: [], proprietaire: false })).toBe(false)
  })
})

describe('⑤ pages intérieures et contact', () => {
  it('un en-tête coloré (couleur de la rubrique, photo, fil d’Ariane, grand titre) ; plus d’écran blanc forcé', () => {
    const rest = lire('src/app/sites/[slug]/[...rest]/page.tsx')
    expect(rest).toMatch(motifTexte("<EnTetePage titre={page.titre} chapeau={chapeauAffiche} couleur={racine?.couleur ?? (site.primary_color || '#1e4d8c')} image={imageDeTete}"))
    expect(rest).toMatch(motifTexte("minHeight: institution === null ? '100vh' : undefined"))
    const tete = lire('src/app/sites/[slug]/themes/institution/EnTetePage.tsx')
    expect(tete).toMatch(motifTexte('aria-label="Fil d\'Ariane"'))
    expect(tete).toMatch(motifTexte('style={{ backgroundColor: couleur }}'))
    expect(tete).not.toMatch(/min-h-screen|100vh/u)
  })
  it('le contact d’une institution est dans son cadre (en-tête, fil d’Ariane, pied)', () => {
    const c = lire('src/app/sites/[slug]/contact/page.tsx')
    expect(c).toMatch(motifTexte("if (site.theme === 'institution') {"))
    expect(c).toMatch(motifTexte('<EnTetePage titre={t.sections.contactTitle}'))
  })
})

describe('⑦ maquette de démonstration', () => {
  it('le bandeau fixe sur TOUTES les pages (gabarit commun), lu à part pour ne rien casser sans la colonne', () => {
    const g = lire('src/app/sites/[slug]/layout.tsx')
    expect(g).toMatch(motifTexte("const { data: maq } = await supabaseAdmin.from('sites').select('maquette_demo').eq('slug', slug).maybeSingle()"))
    expect(g).toMatch(motifTexte('{maquette && <BandeauMaquette />}'))
    expect(g).toMatch(motifTexte('Maquette de démonstration — non officielle'))
    expect(g).toMatch(motifTexte("position: 'fixed', left: 0, right: 0, bottom: 0"))
  })
  it('l’interrupteur est dans l’éditeur, seulement une fois la colonne en base ; le semeur l’allume', () => {
    expect(lire('src/components/Navbar.tsx')).toMatch(motifTexte("{site && 'maquette_demo' in site && ("))
    expect(lire('src/lib/sites/semerInstitution.ts')).toMatch(motifTexte(".update({ maquette_demo: true })"))
    const sql = lire('supabase/sql/sites_maquette_demo.sql')
    expect(sql).toMatch(motifTexte('add column if not exists maquette_demo boolean not null default false'))
    expect(sql).toMatch(motifTexte('grant update (maquette_demo) on table public.sites to authenticated'))
  })
})

describe('⑧ l’éditeur ajoute et retire des lignes', () => {
  const orga = { type: 'organigramme', items: [{ cle: 'tete', fonction: 'Le ministre' }] } as unknown as Bloc
  it('organigramme : une boîte neuve, clé unique, rattachée à la racine, « À compléter » (jamais vide)', () => {
    const b2 = ajouterLigne(orga)
    const b3 = ajouterLigne(b2)
    const items = (b3 as unknown as { items: { cle: string; parent?: string; fonction: string }[] }).items
    expect(items.map((i) => i.cle)).toEqual(['tete', 'poste-2', 'poste-3'])
    expect(items.slice(1).every((i) => i.parent === 'tete' && i.fonction === A)).toBe(true)
    expect(nombreDeLignes(b3)).toBe(3)
  })
  it('liste, tableau, documents : la forme de la dernière ligne, nom obligatoire « À compléter », adresse gardée, facultatifs omis', () => {
    expect((ajouterLigne({ type: 'liste', items: ['Un'] } as Bloc) as { items: string[] }).items).toEqual(['Un', A])
    expect((ajouterLigne({ type: 'tableau', entetes: ['R', 'V'], lignes: [['Statut', 'En cours']] } as Bloc) as { lignes: string[][] }).lignes[1]).toEqual([A, A])
    expect((ajouterLigne({ type: 'documents', items: [{ nom: 'Rapport', url: '/r.pdf', format: 'PDF' }] } as Bloc) as { items: unknown[] }).items[1]).toEqual({ nom: 'À compléter', url: '/r.pdf' })
  })
  it('retirer : jamais la dernière ligne ; un bloc sans lignes ne change pas', () => {
    const b = ajouterLigne(orga)
    expect(nombreDeLignes(retirerLigne(b, 1))).toBe(1)
    expect(retirerLigne(orga, 0)).toBe(orga)
    const texte = { type: 'texte', texte: 'x' } as Bloc
    expect(nombreDeLignes(texte)).toBeNull()
    expect(ajouterLigne(texte)).toBe(texte)
  })
  it('les deux éditeurs portent les boutons', () => {
    for (const f of ['src/components/EditeurBlocs.tsx', 'src/components/editeur/EditeurVisuel.tsx']) {
      expect(lire(f), f).toMatch(motifTexte('+ Ajouter une ligne'))
      expect(lire(f), f).toMatch(/retirerLigne\([a-z],\sn\)/u)
    }
  })
})

describe('③bis recherche interne et contraste (navigateur)', () => {
  beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
  afterAll(() => { GlobalRegistrator.unregister() })
  const INDEX = [
    { chemin: 'le-ministere/missions', titre: 'Missions', texte: 'Définir la politique de santé publique.' },
    { chemin: 'documents', titre: 'Documents', texte: 'Rapports annuels du ministère.' },
  ]
  it('sans accents, tous les mots, le titre d’abord', () => {
    expect(normaliser('Ministère')).toBe('ministere')
    expect(chercher(INDEX, 'sante').map((r) => r.chemin)).toEqual(['le-ministere/missions'])
    expect(chercher(INDEX, 'ministere rapports').map((r) => r.chemin)).toEqual(['documents'])
    expect(chercher(INDEX, '   ')).toEqual([])
  })
  it('« / » ouvre la recherche (pas dans un champ) ; Échap la ferme ; le contraste se pose sur le site', async () => {
    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { default: Outils } = await import('@/app/sites/[slug]/themes/institution/OutilsInstitution')
    const site = document.createElement('div'); site.setAttribute('data-theme-institution', ''); document.body.appendChild(site)
    const racine = document.createElement('div'); site.appendChild(racine)
    await React.act(async () => { createRoot(racine).render(React.createElement(Outils, { index: INDEX, base: 'https://m.deribfy.app', couleur: '#0a6b4f' })) })
    expect(document.querySelector('[data-recherche]')).toBeNull()
    await React.act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' })) })
    expect(document.querySelector('[data-recherche]')).not.toBeNull()
    await React.act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(document.querySelector('[data-recherche]')).toBeNull()
    const contraste = racine.querySelector('[data-bouton-contraste]') as HTMLButtonElement
    await React.act(async () => { contraste.click() })
    expect(site.hasAttribute('data-contraste')).toBe(true)
    expect(contraste.getAttribute('aria-pressed')).toBe('true')
    await React.act(async () => { contraste.click() })
    expect(site.hasAttribute('data-contraste')).toBe(false)
  })
  it('le grand menu ne répète pas le titre : il est dit UNE fois dans le panneau, comme lien de la rubrique', async () => {
    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { default: GrandMenu } = await import('@/app/sites/[slug]/themes/institution/GrandMenu')
    const racine = document.createElement('div'); document.body.appendChild(racine)
    await React.act(async () => { createRoot(racine).render(React.createElement(GrandMenu, { rubriques: RUBRIQUES, base: 'https://m.deribfy.app', contact: '/contact', couleur: '#0a6b4f' })) })
    await React.act(async () => { (racine.querySelector('[aria-controls="panneau-le-ministere"]') as HTMLButtonElement).click() })
    const panneau = racine.querySelector('[data-panneau]') as HTMLElement
    expect((panneau.textContent ?? '').split('Le Ministère').length - 1).toBe(1)
    expect(panneau.querySelector('[data-titre-panneau]')?.getAttribute('href')).toBe('https://m.deribfy.app/le-ministere')
  })
})
