/**
 * LES PREUVES DE LA REPRISE — et surtout de ses REFUS.
 *
 * Le danger ici n'est pas qu'une reprise echoue : c'est qu'elle reussisse
 * ALORS QU'IL N'Y A RIEN A REPRENDRE. Une « reprise » qui relance une
 * generation complete en silence, c'est la facture payee deux fois.
 */
import { describe, expect, it } from 'vitest'
import { estReprenable, etatDeReprise } from '../reprise'

const TERMINEE = {
  sections_acquises: {
    phase: 'terminee',
    tirages: [{ tentative: 1 }],
    tours: [{ n: 1 }, { n: 2 }],
    niveaux: { a: 1 },
    acquis: { app: {}, navigation: {} },
    modele: { version: 'modele-metier/1.2.0' },
  },
  cout_usd: 16.0338,
  jetons_entree: 1252757,
  jetons_sortie: 291294,
}

describe('ce que le moteur reçoit pour continuer', () => {
  it('porte exactement ce qu’il exige', () => {
    const e = etatDeReprise(TERMINEE)
    expect(e).not.toBeNull()
    expect(e?.acquis).toEqual({ app: {}, navigation: {} })
    expect(e?.tirages).toEqual([{ tentative: 1 }])
    expect(e?.niveaux).toEqual({ a: 1 })
  })

  it('la dépense DÉJÀ FAITE voyage avec — sinon la ligne mentirait', () => {
    const e = etatDeReprise(TERMINEE)
    expect(e?.coutUsd).toBe(16.0338)
    expect(e?.jetons).toEqual({ entree: 1252757, sortie: 291294 })
  })

  it('« phase: terminée » NE fait PAS le voyage', () => {
    // Le moteur la lirait comme un ordre d'arret, et la reprise ne
    // reprendrait rien.
    expect(etatDeReprise(TERMINEE)).not.toHaveProperty('phase')
  })

  it('le modèle survit — la réparation en a besoin', () => {
    expect(etatDeReprise(TERMINEE)?.modele).toEqual({ version: 'modele-metier/1.2.0' })
  })
})

describe('les REFUS — c’est là qu’une erreur coûterait cher', () => {
  it('aucune base acquise : rien à reprendre', () => {
    expect(etatDeReprise({ sections_acquises: { phase: 'terminee', tirages: [] } })).toBeNull()
  })

  it('une base VIDE n’est pas une base', () => {
    // La forme exacte vue en base le 2026-10-10 : `sections_acquises = {}`.
    expect(etatDeReprise({ sections_acquises: {} })).toBeNull()
    expect(etatDeReprise({ sections_acquises: { acquis: {} } })).toBeNull()
  })

  it('une colonne absente ou d’un autre type ne passe pas', () => {
    for (const v of [null, undefined, 'texte', 42]) {
      expect(etatDeReprise({ sections_acquises: v })).toBeNull()
    }
  })

  it('une ligne LIVRÉE n’est pas reprenable — elle est finie', () => {
    expect(estReprenable('livree', TERMINEE)).toBe(false)
    expect(estReprenable('en_cours', TERMINEE)).toBe(false)
    expect(estReprenable('en_attente', TERMINEE)).toBe(false)
    expect(estReprenable('refusee', TERMINEE)).toBe(true)
  })

  it('un statut reprenable SANS base reste non reprenable', () => {
    expect(estReprenable('refusee', { sections_acquises: {} })).toBe(false)
  })
})

describe('les chiffres abîmés ne cassent rien', () => {
  it('un coût absent ou absurde devient zéro, jamais NaN', () => {
    const e = etatDeReprise({ ...TERMINEE, cout_usd: undefined, jetons_entree: 'x', jetons_sortie: -5 })
    expect(e?.coutUsd).toBe(0)
    expect(e?.jetons).toEqual({ entree: 0, sortie: 0 })
  })

  it('un coût rendu en texte par la base est lu comme un nombre', () => {
    // `numeric` de Postgres revient parfois en chaine via PostgREST.
    expect(etatDeReprise({ ...TERMINEE, cout_usd: '16.0338' })?.coutUsd).toBe(16.0338)
  })
})
