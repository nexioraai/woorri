/**
 * RECONNAÎTRE UNE INSTITUTION (lot 3, 2026-11-26).
 *
 * ① la règle : six familles, et ce qui n'en est PAS (agence de voyage,
 *   clinique, école de danse, boutique « pour hôpitaux »…) ;
 * ② le générateur : « ministère au Tchad » et « ONG à N'Djamena » sont des
 *   institutions ; le premier terme l'emporte sur un mot de commerce ;
 * ③ l'invite d'une institution : ni prix, ni témoignages, ni coordonnées
 *   inventées ; la désignation ; mode 1 forcé ;
 * ④ le balisage Google : les 10 sites publiés gardent EXACTEMENT leur type
 *   (relevé du 2026-11-26), les institutions reçoivent le leur.
 * Ce que ce fichier NE voit PAS : une vraie génération (aucun appel payant).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }))
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { designationValable, familleInstitution, institutionAvantCommerce } from '@/lib/sites/familleInstitution'
import { detectSector, getSectorPrompt, GeneratedSiteSchema } from '@/app/api/chat/route'
import JsonLd from '@/app/sites/[slug]/themes/JsonLd'

const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

describe('① la règle', () => {
  it('six familles, en français et en anglais', () => {
    const cas: [string, string][] = [
      ["site institutionnel d'un ministère au Tchad", 'ministere'], ['Ministry of Health', 'ministere'],
      ['Mairie de Moundou', 'mairie'], ['Commune de Farcha', 'mairie'],
      ["site d'une ONG à N'Djamena", 'ong'], ['Organisation non gouvernementale', 'ong'], ['an NGO in Chad', 'ong'],
      ['École publique de Farcha', 'ecole'], ['Université de N’Djamena', 'ecole'], ['Lycée de Sarh', 'ecole'],
      ['Hôpital de district de Bongor', 'hopital'], ['Centre hospitalier universitaire', 'hopital'],
      ['Agence nationale des routes', 'agence_publique'], ['Institution publique de santé', 'agence_publique'], ['Centrale Pharmaceutique d’Achats', 'agence_publique'],
    ]
    for (const [t, f] of cas) expect(familleInstitution(t), t).toBe(f)
  })
  it('ce qui n’est PAS une institution', () => {
    for (const t of ['Agence de voyage', 'Clinique dentaire', 'école de danse', 'Boutique d’équipements médicaux pour hôpitaux', 'restaurant dans la région du Logone',
      'fournisseur du gouvernement', 'Académie de football', 'Fondations et gros œuvre', 'Boutique de mode']) {
      expect(familleInstitution(t), t).toBeNull()
    }
  })
  it('deux termes d’institution : le PREMIER dans la phrase donne la famille', () => {
    expect(familleInstitution('Hôpital de district rattaché au ministère de la Santé')).toBe('hopital')
    expect(familleInstitution('Ministère dont dépend l’hôpital')).toBe('ministere')
  })
  it('institution ou commerce : le premier terme l’emporte', () => {
    expect(institutionAvantCommerce('restaurant près de l’hôpital', [/\brestaurant\b/i])).toBeNull()
    expect(institutionAvantCommerce('école publique avec cantine', [/\bcantine\b/i])).toBe('ecole')
  })
  it('la désignation : avec son article, 2 à 120 caractères', () => {
    expect(designationValable('le Ministère')).toBe('le Ministère')
    expect(designationValable("  l'Hôpital  de district ")).toBe("l'Hôpital de district")
    expect(designationValable('la Mairie')).toBe('la Mairie')
    for (const x of ['Ministère', '', 'l', 42, null, 'la ' + 'x'.repeat(130)]) expect(designationValable(x), String(x)).toBeNull()
  })
})

describe('①bis les phrases du propriétaire (2026-11-26)', () => {
  const PHRASES = [
    "Site institutionnel de la Maison Nationale de la Femme du Tchad, établissement public à caractère administratif à N'Djamena",
    "Site de la Centrale pharmaceutique d'achats, établissement public",
    "Site d'un établissement public à caractère administratif",
  ]
  it('institution, famille agence publique, secteur du générateur, type Google', () => {
    for (const t of PHRASES) {
      expect(familleInstitution(t), t).toBe('agence_publique')
      expect(detectSector(t), t).toBe('institution')
      expect(/"@type":"([A-Za-z]+)"/u.exec(renderToStaticMarkup(createElement(JsonLd, { site: { slug: 's', name: 'N', type: t } as never, url: 'https://s.deribfy.app' })))?.[1], t).toBe('GovernmentOrganization')
    }
  })
})

describe('② le générateur', () => {
  it('les deux demandes du diagnostic sont des institutions ; les commerces restent des commerces', () => {
    expect(detectSector("site institutionnel d'un ministère au Tchad")).toBe('institution')
    expect(detectSector("site d'une ONG à N'Djamena")).toBe('institution')
    expect(detectSector('Restaurant près de l’hôpital')).toBe('restaurant')
    expect(detectSector('boutique de vêtements à Moundou')).toBe('shop')
    expect(detectSector('salon de coiffure')).toBe('services')
    expect(detectSector('École publique avec cantine')).toBe('institution')
  })
  it('l’entretien connaît les institutions, ne leur propose que le mode 1, et ne leur demande pas ce qu’elles vendent', () => {
    const e = lire('src/app/api/onboarding/route.ts')
    expect(e).toMatch(motifTexte("institution: [1],"))
    expect(e).toMatch(motifTexte("!== null) return 'institution';"))
    expect(e).toMatch(motifTexte('never ask what they "sell", never talk about customers, prices or products.'))
  })
})

describe('③ l’invite d’une institution', () => {
  const p = getSectorPrompt('institution', null)
  it('ni prix, ni témoignages, ni coordonnées inventées ; missions et services ; la désignation', () => {
    expect(p).toMatch(motifTexte('NO prices anywhere'))
    expect(p).toMatch(motifTexte('"testimonials" is []'))
    expect(p).toMatch(motifTexte('address, phone and email stay "" unless the request gives them'))
    expect(p).toMatch(motifTexte("the institution's MISSIONS and the SERVICES it gives the public"))
    expect(p).toMatch(motifTexte('"designation": how the institution names ITSELF'))
    expect(getSectorPrompt('restaurant', null)).not.toMatch(/designation/u)
  })
  it('la désignation traverse la validation, et n’est écrite que pour une institution, valable ; mode 1 forcé', () => {
    const base = { name: 'N', heroTitle: 'h', about: 'a', mode: 1 }
    const r = GeneratedSiteSchema.safeParse({ ...base, designation: 'le Ministère' })
    expect(r.success && (r.data as { designation?: string }).designation).toBe('le Ministère')
    expect(GeneratedSiteSchema.safeParse(base).success, 'sans désignation : toujours valable').toBe(true)
    const route = lire('src/app/api/chat/route.ts')
    expect(route).toMatch(motifTexte("...(sector === 'institution' && designationValable(parsed.designation) !== null ? { designation: designationValable(parsed.designation) } : {}),"))
    expect(route).toMatch(motifTexte("const finalMode = sector === 'institution' ? 1 : resolveFinalMode(siteMode, parsed.mode);"))
  })
})

describe('④ le balisage Google', () => {
  const type = (t: string) => /"@type":"([A-Za-z]+)"/u.exec(renderToStaticMarkup(createElement(JsonLd, { site: { slug: 's', name: 'N', type: t } as never, url: 'https://s.deribfy.app' })))?.[1]
  it('les 10 sites publiés gardent EXACTEMENT leur type (relevé du 2026-11-26)', () => {
    const releve: [string, string][] = [
      ['Online Beauty & Cosmetics Retailer', 'LocalBusiness'], ['Dropshipping Electronics Retailer', 'LocalBusiness'],
      ['Commodities Trading & Distribution.', 'LocalBusiness'], ['Boutique de vêtements et accessoires', 'Store'],
      ['Boutique de mode et accessoires', 'Store'], ['Commerce de matériaux de construction et décoration', 'LocalBusiness'],
      ['Institution publique de santé', 'GovernmentOrganization'], ['Boutique de Mode et Accessoires Premium', 'Store'],
      ['Magasin de pièces automobiles et garage', 'AutoPartsStore'], ['Boutique d\'équipements médicaux', 'Store'],
    ]
    for (const [t, attendu] of releve) expect(type(t), t).toBe(attendu)
  })
  it('un hôpital, une école, une mairie ont un lieu (adresse déclarée) ; un ministère, une ONG, une agence non', () => {
    const adresse = (t: string) => renderToStaticMarkup(createElement(JsonLd, { site: { slug: 's', name: 'N', type: t, contact: { address: 'Avenue Charles de Gaulle, N’Djamena' } } as never, url: 'https://s.deribfy.app' })).includes('PostalAddress')
    expect(adresse('Hôpital de district')).toBe(true)
    expect(adresse('École publique')).toBe(true)
    expect(adresse('Mairie de Moundou')).toBe(true)
    expect(adresse('Ministère de la Santé publique')).toBe(false)
    expect(adresse('Organisation non gouvernementale')).toBe(false)
  })
  it('les institutions reçoivent leur type', () => {
    expect(type('Ministère de la Santé publique')).toBe('GovernmentOrganization')
    expect(type('Organisation non gouvernementale')).toBe('NGO')
    expect(type('Hôpital de district')).toBe('Hospital')
    expect(type('École publique')).toBe('EducationalOrganization')
    expect(type('Mairie de Moundou')).toBe('GovernmentOrganization')
  })
})
