/**
 * UN AJOUT DE DONNÉES NE DEMANDE PAS L'ACCORD (décision du 2026-11-28).
 *
 * Une retouche qui AJOUTE une table ou une colonne se fait, et se dit après
 * avec les nombres comptés. Ce qui détruit est arrêté par le plan
 * (`peutAvancer` faux) et n'arrive jamais jusqu'à l'accord. Seul un
 * changement de ce que lisent les visiteurs sans compte le demande encore.
 */
import { describe, expect, it } from 'vitest'
import { comparerDeclarations } from '../migration-oeuvre'
import { demandeAccordAvantMigration } from '../phrase-migration'
import type { EntiteDeclaree } from '../entites-declarees'

const colis = (en: Partial<EntiteDeclaree> = {}, champs: EntiteDeclaree['fields'] = []): EntiteDeclaree => ({
  id: 'ent_colis', name: 'colis',
  fields: [{ id: 'fld_statut', name: 'statut', type: 'text', required: true }, ...champs],
  ...en,
}) as EntiteDeclaree

describe('l’accord avant une migration', () => {
  it('une colonne ajoutée : pas d’accord', () => {
    const plan = comparerDeclarations([colis()], [colis({}, [{ id: 'fld_numero', name: 'numero', type: 'text', required: false }])])
    expect(plan.ajouts.map((e) => e.genre)).toEqual(['champ-ajoute'])
    expect(plan.peutAvancer).toBe(true)
    expect(demandeAccordAvantMigration(plan)).toBe(false)
  })

  it('une table ajoutée : pas d’accord', () => {
    const agence = { id: 'ent_succursale', name: 'succursale', fields: [{ id: 'fld_ville', name: 'ville', type: 'text', required: true }] } as EntiteDeclaree
    const plan = comparerDeclarations([colis()], [colis(), agence])
    expect(plan.ajouts.map((e) => e.genre)).toEqual(['table-ajoutee'])
    expect(demandeAccordAvantMigration(plan)).toBe(false)
  })

  it('une liste ouverte à tous les visiteurs : l’accord reste demandé', () => {
    const plan = comparerDeclarations([colis()], [colis({ lecturePublique: true }, [{ id: 'fld_numero', name: 'numero', type: 'text', required: false }])])
    expect(demandeAccordAvantMigration(plan)).toBe(true)
  })

  it('une table abandonnée n’arrive pas jusqu’à l’accord : le plan s’arrête', () => {
    const plan = comparerDeclarations([colis()], [])
    expect(plan.peutAvancer).toBe(false)
  })
})
