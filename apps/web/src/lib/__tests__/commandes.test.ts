import { describe, it, expect } from 'vitest'
import { lireLignes, lireNote, nouvelleReference, tableAbsente, MAX_LIGNES } from '../commandes/commandes'

// Les règles d'un bon de commande (CPA, 2026-11-19) : des lignes propres, ou
// un message lisible — jamais une erreur de contrainte de la base.
describe('lireLignes', () => {
  it('garde les lignes remplies, ignore les lignes blanches, lit une quantité tapée en texte', () => {
    const r = lireLignes([
      { designation: ' Paracétamol 500 mg ', quantite: '120', unite: 'boîtes' },
      { designation: '', quantite: '' },
      { designation: 'Amoxicilline', quantite: 40, produit_reference: 'AMX-250' },
    ])
    expect(r).toEqual({ lignes: [
      { designation: 'Paracétamol 500 mg', quantite: 120, unite: 'boîtes', produit_reference: null },
      { designation: 'Amoxicilline', quantite: 40, unite: null, produit_reference: 'AMX-250' },
    ] })
  })

  it('refuse une commande vide, une quantité nulle, décimale ou absurde', () => {
    expect(lireLignes([])).toEqual({ erreur: 'Ajoutez au moins un produit.' })
    expect(lireLignes([{ designation: '', quantite: 3 }])).toEqual({ erreur: 'Ajoutez au moins un produit.' })
    expect(lireLignes('x')).toHaveProperty('erreur')
    for (const q of [0, -2, 1.5, 'abc', 2_000_000]) {
      expect(lireLignes([{ designation: 'Quinine', quantite: q }]), String(q)).toHaveProperty('erreur')
    }
  })

  it(`refuse plus de ${MAX_LIGNES} lignes`, () => {
    const trop = Array.from({ length: MAX_LIGNES + 1 }, (_, i) => ({ designation: `Produit ${i}`, quantite: 1 }))
    expect(lireLignes(trop)).toHaveProperty('erreur')
  })
})

describe('le reste', () => {
  it('la note est facultative et bornée', () => {
    expect(lireNote(undefined)).toEqual({ note: null })
    expect(lireNote('  ')).toEqual({ note: null })
    expect(lireNote('Livrer à Moundou')).toEqual({ note: 'Livrer à Moundou' })
    expect(lireNote('x'.repeat(2001))).toHaveProperty('erreur')
  })

  it('la référence se dicte : CMD-année-6 signes, sans 0/O/1/I/L', () => {
    const r = nouvelleReference(new Date('2026-11-19T10:00:00Z'))
    expect(r).toMatch(/^CMD-2026-[2-9A-HJKMNP-Z]{6}$/)
  })

  it('reconnaît une table pas encore créée', () => {
    expect(tableAbsente({ code: '42P01' })).toBe(true)
    expect(tableAbsente({ code: 'PGRST205', message: 'Could not find the table' })).toBe(true)
    expect(tableAbsente({ code: '23505' })).toBe(false)
    expect(tableAbsente(null)).toBe(false)
  })
})
