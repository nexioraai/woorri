/**
 * TEXTES NEUTRES (lot 2, 2026-11-26) — là où le nom de l'institution est EMPLOYÉ :
 * la lecture de la désignation, les sujets de la bulle, et les écrans qui
 * disaient « la Centrale » en dur (catalogue, routes, tableau de bord).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { institution } from '@/lib/sites/institution'
import { creerFrom, journalVierge } from '@/lib/testing/postgrest'

vi.mock('server-only', () => ({}))
let reponse: { data: unknown; error: unknown } = { data: { designation: 'la Centrale' }, error: null }
const journal = journalVierge()
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (t: string) => creerFrom({ sites: { reponse: () => reponse } }, journal)(t) },
}))
const { lireInstitution } = await import('@/lib/sites/lireInstitution')
const { sujetsParDefaut } = await import('@/app/sites/[slug]/themes/sujetsAssistant')
const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

describe('la désignation lue en base', () => {
  it('lue : elle sert ; absente, vide ou en erreur (colonne pas encore posée) : le générique', async () => {
    reponse = { data: { designation: 'la Centrale' }, error: null }
    expect((await lireInstitution('s1', 'fr')).a).toBe('à la Centrale')
    reponse = { data: { designation: null }, error: null }
    expect((await lireInstitution('s1', 'fr')).a).toBe('à l’établissement')
    reponse = { data: null, error: { message: 'column sites.designation does not exist' } }
    expect((await lireInstitution('s1', 'fr')).la).toBe('l’établissement')
    // Une erreur l'emporte même si une valeur traîne dans la réponse.
    reponse = { data: { designation: 'la Centrale' }, error: { message: 'panne' } }
    expect((await lireInstitution('s1', 'fr')).la).toBe('l’établissement')
    // La lecture vise CE site, et seulement la colonne `designation`.
    expect(journal.filtres.sites).toContainEqual(['eq', 'id', 's1'])
    expect(journal.projections.sites).toBe('designation')
  })
})

describe('les sujets par défaut de la bulle', () => {
  const connus = new Map([['/appels-offres', 'Appels d’offres'], ['/inscription', 'Créer un compte'], ['/connexion', 'Se connecter'], ['/actualites', 'Actualités']])
  const ministere = institution('fr', 'le Ministère de la Santé')
  it('ce que le site A, seulement ; les liens vers des adresses CONNUES ; le nom du site', () => {
    const s = sujetsParDefaut({ inst: ministere, appelsOffres: true, comptes: true, connus })
    expect(s.map((x) => x.label)).toEqual(['Appels d’offres', 'Créer un compte', 'Actualités', 'Contact'])
    expect(s[0].liens.map((l) => l.chemin)).toEqual(['/appels-offres'])
    expect(s.at(-1)).toMatchObject({ reponse: 'Les coordonnées du Ministère de la Santé et le formulaire de contact sont sur la page d’accueil.', liens: [{ chemin: '/#contact', titre: 'Contacter le Ministère de la Santé' }] })
    expect(JSON.stringify(s)).not.toMatch(/Centrale|fournisseur/u)
  })
  it('pas d’appels d’offres publiés par le site : pas de sujet, même si une page à cette adresse existe', () => {
    const s = sujetsParDefaut({ inst: institution('fr', null), appelsOffres: false, comptes: false, connus })
    const libelles = s.map((x) => x.label)
    expect(libelles.includes('Appels d’offres')).toBe(false)
    expect(libelles.includes('Créer un compte')).toBe(false)
  })
  it('un site sans appels d’offres, sans comptes, sans actualités : Contact seul', () => {
    const s = sujetsParDefaut({ inst: institution('fr', null), appelsOffres: false, comptes: false, connus: new Map() })
    expect(s.map((x) => x.label)).toEqual(['Contact'])
  })
  it('la bulle n’a plus de sujets écrits pour la CPA ; le serveur les tire du site quand le site n’a pas les siens', () => {
    const bulle = lire('src/app/sites/[slug]/themes/Assistant.tsx')
    expect(bulle).toMatch(motifTexte('const SUJETS: { label: string; reponse: string; liens: Lien[] }[] = []'))
    expect(bulle).not.toMatch(motifTexte('Devenir fournisseur'))
    expect(bulle).not.toMatch(motifTexte('direction des achats'))
    const cadre = lire('src/app/sites/[slug]/layout.tsx')
    expect(cadre).toMatch(motifTexte('if (textesAssistant.sujets === undefined) {'))
    expect(cadre).toMatch(motifTexte('appelsOffres: r.publishes_tenders === true,'))
    expect(cadre).toMatch(motifTexte('comptes: r.ouvre_des_comptes === true,'))
  })
})

describe('les écrans qui disaient « la Centrale »', () => {
  it('catalogue, fiche produit, routes du compte et des agents, journal, rôles : le nom du site', () => {
    expect(lire('src/app/sites/[slug]/catalogue/[reference]/page.tsx')).toMatch(motifTexte('Produit contrôlé par {inst.la} avant sa mise à disposition.'))
    expect(lire('src/app/sites/[slug]/catalogue/[reference]/page.tsx')).toMatch(motifTexte('Écrivez ${inst.a} depuis votre espace'))
    expect(lire('src/app/sites/[slug]/catalogue/page.tsx')).toMatch(motifTexte("dès que {inst?.la ?? 'l’établissement'} l’aura mis en ligne."))
    expect(lire('src/app/api/sites/[slug]/mon-compte/route.ts')).toMatch(motifTexte("écrivez ${(await lireInstitution(site.id, 'fr')).a} pour toute modification."))
    expect(lire('src/app/api/sites/[slug]/agents/route.ts')).toMatch(motifTexte("organisation: `${(await lireInstitution(siteId, 'fr')).nu} — Service clients`,"))
    expect(lire('src/app/comptes/[slug]/Journal.tsx')).toMatch(motifTexte('Chaque geste qui engage {inst.la},'))
    expect(lire('src/app/comptes/[slug]/page.tsx')).toMatch(motifTexte('agent: `Agent ${inst.de}`'))
    expect(lire('src/app/api/sites/[slug]/comptes/route.ts')).toMatch(motifTexte("institution: await lireInstitution(proprietaire.site.id, 'fr')"))
  })
  it('les espaces reçoivent l’institution du site par `PageEspace`', () => {
    const p = lire('src/app/sites/[slug]/espace/PageEspace.tsx')
    expect(p).toMatch(motifTexte('const inst = await lireInstitution(s.id, s.lang)'))
    expect(p).toMatch(motifTexte('{rendu({ slug: s.slug, base, accent, lang: s.lang, inst })}'))
    expect(p).toMatch(motifTexte('titre={titre(s.lang, inst)} phrase={phrase?.(s.lang, inst)}'))
  })
})
