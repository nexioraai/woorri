/**
 * LE THÈME DES SITES INSTITUTIONNELS (lot 4b, 2026-11-26).
 *
 * ① une couleur par rubrique, tirée de la couleur du site, texte blanc lisible ;
 * ② la couleur NOMMÉE par le client est respectée (« rose vif » → rose vif) ;
 * ③ le bandeau défilant : phrases courtes de la mission ;
 * ④ les chiffres clés : JAMAIS de faux chiffres en ligne (masqués aux visiteurs
 *   tant qu'ils ne sont pas remplis ; montrés au propriétaire avec un avis) ;
 * ⑤ le rendu : grand menu à panneaux, bouton ☰ sur téléphone, rubriques en
 *   couleur, aucun « Sous-pages : — », contact sans rien d'inventé ;
 * ⑥ seulement pour les institutions : la CPA et les autres thèmes ne changent pas.
 * Ce que ce fichier NE voit PAS : le rendu à l'œil (captures), le navigateur
 * (ouverture du panneau au survol).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { chiffreRempli, contrasteBlanc, couleurDemandee, couleursRubriques, phrasesBandeau, photoAfricaine } from '@/lib/sites/institutionVisuel'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }))
const { default: InstitutionTheme, chiffresVisibles } = await import('@/app/sites/[slug]/themes/InstitutionTheme')
const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

describe('① une couleur par rubrique', () => {
  it('tirée de la couleur du site ; la 1re est celle du site ; toutes portent du blanc lisible (≥ 4,5)', () => {
    for (const primaire of ['#0a6b4f', '#E6007E', '#F9A825', '#1565C0', '#7CB342']) {
      const c = couleursRubriques(primaire, 5)
      expect(c).toHaveLength(5)
      expect(new Set(c).size, primaire).toBe(5)
      for (const x of c) expect(contrasteBlanc(x), `${primaire} → ${x}`).toBeGreaterThanOrEqual(4.5)
    }
    expect(couleursRubriques('#0a6b4f', 1)[0]).toBe('#0a6b4f')
    expect(couleursRubriques(null, 2)).toHaveLength(2)
  })
})

describe('② la couleur demandée', () => {
  it('« rose vif » → rose vif ; « vert foncé » ; « en bleu » ; sinon rien', () => {
    expect(couleurDemandee('Site du ministère de la Femme, couleur rose vif')).toBe('#E6007E')
    expect(couleurDemandee('je veux le site en rose')).toBe('#EC407A')
    expect(couleurDemandee('couleur vert foncé pour la mairie')).toBe('#1B5E20')
    expect(couleurDemandee('ONG, couleur principale : bleu marine')).toBe('#0D2C54')
    expect(couleurDemandee('Hôpital de la Rose de Sharon')).toBeNull()
    expect(couleurDemandee('Ministère de la Santé')).toBeNull()
  })
})

describe('③ le bandeau', () => {
  it('phrases courtes (12 à 90 signes), sans doublon, 5 au plus', () => {
    expect(phrasesBandeau('Garantir l’accès de tous aux soins. Former les agents de santé ; Lutter contre les épidémies.', 'Garantir l’accès de tous aux soins.'))
      .toEqual(['Garantir l’accès de tous aux soins', 'Former les agents de santé', 'Lutter contre les épidémies'])
    expect(phrasesBandeau('Court.', 'x'.repeat(120))).toEqual([])
    // Une phrase isolée sans sens (constat du propriétaire sur le site fictif, 2026-11-26).
    expect(phrasesBandeau("Le Ministère de l'Exemple est une institution fictive. Il n'existe pas.")).toEqual(["Le Ministère de l'Exemple est une institution fictive"])
    expect(phrasesBandeau('Servir chaque citoyen. Former les agents publics.')).toEqual(['Servir chaque citoyen', 'Former les agents publics'])
    expect(phrasesBandeau('Former trois agents.')).toEqual([])
    // Deux mots, même longs, ne font pas une phrase de bandeau.
    expect(phrasesBandeau('Coordination interministérielle.')).toEqual([])
  })
})

describe('④ les chiffres clés', () => {
  const vides = [{ valeur: 'À compléter', libelle: 'Lits' }, { valeur: 'À compléter', libelle: 'Services' }]
  const pleins = [{ valeur: '250', libelle: 'Lits' }, { valeur: '12', libelle: 'Services' }]
  it('un chiffre n’est rempli que s’il porte un chiffre', () => {
    expect(chiffreRempli('250')).toBe(true)
    expect(chiffreRempli('À compléter')).toBe(false)
    expect(chiffreRempli('')).toBe(false)
  })
  it('visiteur : masqués tant qu’une case est vide ; montrés une fois tous remplis ; propriétaire : toujours', () => {
    expect(chiffresVisibles({ chiffres: vides, proprietaire: false })).toBe(false)
    expect(chiffresVisibles({ chiffres: [pleins[0], vides[1]], proprietaire: false })).toBe(false)
    expect(chiffresVisibles({ chiffres: pleins, proprietaire: false })).toBe(true)
    expect(chiffresVisibles({ chiffres: vides, proprietaire: true })).toBe(true)
    expect(chiffresVisibles({ chiffres: [], proprietaire: true })).toBe(false)
  })
})

describe('⑤ le rendu', () => {
  const site = { id: 's1', slug: 'ministere-sante', name: 'Ministère de la Santé Publique', primary_color: '#0a6b4f', hero_title: 'Garantir la santé de tous', hero_subtitle: 'Le ministère conçoit la politique de santé.', hero_image: 'https://images.pexels.com/h.jpg', about: 'Le ministère conçoit et met en œuvre la politique de santé.', mission: 'Garantir l’accès de tous aux soins', contact: {}, lang: 'fr', custom_domain: null }
  const rubriques = [
    { chemin: 'qui-sommes-nous', titre: 'Qui sommes-nous', chapeau: 'Présentation', couleur: '#0a6b4f', image: 'https://images.pexels.com/a.jpg', enfants: [{ chemin: 'qui-sommes-nous/missions', titre: 'Missions' }] },
    { chemin: 'documents', titre: 'Documents', chapeau: null, couleur: '#0b5a6b', image: null, enfants: [] },
  ]
  const rendre = (o: { proprietaire: boolean; chiffres?: { valeur: string; libelle: string }[] }) => renderToStaticMarkup(createElement(InstitutionTheme, {
    site: site as never, host: 'ministere-sante.deribfy.app',
    institution: { rubriques, bandeau: ['Garantir l’accès de tous aux soins', 'Former les agents de santé'], chiffres: o.chiffres ?? [{ valeur: 'À compléter', libelle: 'Lits' }], proprietaire: o.proprietaire },
  }))
  it('grand menu (rubriques, sous-pages), bouton ☰ pour le téléphone, rubriques à leur couleur, bandeau, titre très gras', () => {
    const h = rendre({ proprietaire: false })
    expect(h).toContain('data-grand-menu')
    expect(h).toContain('data-bouton-menu')
    expect(h).toMatch(motifTexte('aria-label="Ouvrir le menu"'))
    expect(h).toContain('aria-expanded="false"')
    expect(h).toContain('href="https://ministere-sante.deribfy.app/qui-sommes-nous/missions"')
    expect(h).toContain('background-color:#0b5a6b')
    expect(h).toContain('data-bandeau')
    expect(h).toMatch(motifTexte('Former les agents de santé'))
    expect(h).toMatch(/<h1\sclass="[^"]*text-\[2\.6rem\][^"]*lg:text-8xl/u)
    expect(h).not.toMatch(/Sous-pages\s*:/u)
    // La mission n'est pas un TITRE (capture du 2026-11-26) : un titre court, la mission en texte.
    expect(h).toMatch(/<h2[^>]*>Notre\smission<\/h2>/u)
  })
  it('visiteur : AUCUN chiffre « À compléter », aucun contact inventé', () => {
    const h = rendre({ proprietaire: false })
    expect(h).not.toContain('data-chiffres')
    expect(h).not.toMatch(/compléter/u)
    expect(h).not.toMatch(/tel:|mailto:/u)
  })
  it('propriétaire : les cases « À compléter », avec l’avis « visible par vous seul »', () => {
    const h = rendre({ proprietaire: true })
    expect(h).toContain('data-chiffres')
    expect(h).toMatch(motifTexte('Visible par vous seul'))
    expect(h).toMatch(motifTexte('À compléter'))
  })
  it('chiffres tous remplis : visibles de tous', () => {
    expect(rendre({ proprietaire: false, chiffres: [{ valeur: '250', libelle: 'Lits' }] })).toContain('data-chiffres')
  })
  it('les pages intérieures d’une institution ont l’en-tête et le pied du site', () => {
    const p = lire('src/app/sites/[slug]/[...rest]/page.tsx')
    expect(p).toMatch(motifTexte("const institution = site.theme === 'institution'"))
    expect(p).toMatch(motifTexte('{enveloppe(<div style='))
  })
})

describe('⑥ seulement pour les institutions', () => {
  it('le thème est enregistré sous sa clé ; la génération ne le donne qu’à une institution', () => {
    expect(lire('src/app/sites/[slug]/page.tsx')).toMatch(motifTexte('institution: InstitutionTheme,'))
    const route = lire('src/app/api/chat/route.ts')
    expect(route).toMatch(motifTexte("...(sector === 'institution' ? { theme: 'institution' } : {}),"))
    expect(route).toMatch(motifTexte("primary_color: (sector === 'institution' ? couleurDemandee(message) : null) ?? parsed.primaryColor,"))
    expect(route).toMatch(motifTexte('const p = (await fetchPexelsPhotos(q)).find((x) => photoAfricaine(x.alt));'))
  })
  it('le filtre africain : nomme l’Afrique ou un pays africain, jamais un décor d’ailleurs', () => {
    expect(photoAfricaine('A nurse in a clinic in Lagos, Nigeria.')).toBe(true)
    expect(photoAfricaine('A group of African children in a rural school')).toBe(true)
    expect(photoAfricaine('African American nurse in Chicago')).toBe(false)
    expect(photoAfricaine('Indonesian women in Papua attending a class')).toBe(false)
    expect(photoAfricaine('Portrait of a boy in a Haitian classroom')).toBe(false)
    expect(photoAfricaine('')).toBe(false)
  })
})
