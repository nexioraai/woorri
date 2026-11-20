import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/lecteurDuSite', () => ({ lecteurDuSite: async () => ({}) }))
import { chercher, procheDUneLettre, variantesDe, memeFamille, type ProduitCatalogue } from '../fetchCatalogue'
import { lireDisponibilite, commandable, LIBELLE_DISPO, DISPONIBILITES } from '../disponibilite'

// LA FICHE PRODUIT ET LA RECHERCHE (CPA, 2026-11-19).
const P = (reference: string, denomination: string, x: Partial<ProduitCatalogue> = {}): ProduitCatalogue =>
  ({ reference, denomination, famille: null, forme: null, dosage: null, conditionnement: null, chaine_du_froid: false, note: null, maj_le: null, ...x })

const L = [
  P('EX-PARA-500', 'Paracétamol', { dosage: '500 mg', forme: 'Comprimé', famille: 'Antalgiques' }),
  P('EX-PARA-120', 'Paracétamol', { dosage: '120 mg / 5 ml', forme: 'Sirop', famille: 'Antalgiques' }),
  P('EX-AMOX-250', 'Amoxicilline', { forme: 'Poudre pour suspension buvable', famille: 'Antibiotiques' }),
  P('EX-OXY-10', 'Ocytocine', { forme: 'Solution injectable', famille: 'Santé maternelle', chaine_du_froid: true }),
]

describe('la recherche pardonne', () => {
  it('sans accents ni casse, mot par mot, dans plusieurs champs', () => {
    expect(chercher(L, 'PARACETAMOL sirop').map((p) => p.reference)).toEqual(['EX-PARA-120'])
    expect(chercher(L, 'antibiotiques').map((p) => p.reference)).toEqual(['EX-AMOX-250'])
    expect(chercher(L, '500 mg').map((p) => p.reference)).toEqual(['EX-PARA-500'])
  })
  it('une faute de frappe sur un mot long', () => {
    expect(chercher(L, 'paracetemol').length).toBe(2)
    expect(chercher(L, 'amoxiciline').map((p) => p.reference)).toEqual(['EX-AMOX-250'])
    expect(procheDUneLettre('ocitocine', 'ocytocine')).toBe(true)
    expect(chercher(L, 'zzzzzz')).toEqual([])
  })
})

describe('la fiche', () => {
  it('les autres présentations : même molécule, autre référence', () => {
    expect(variantesDe(L, L[0]).map((p) => p.reference)).toEqual(['EX-PARA-120'])
    expect(variantesDe(L, L[2])).toEqual([])
  })
  it('la même famille, sans le produit lui-même', () => {
    expect(memeFamille(L, L[0]).map((p) => p.reference)).toEqual(['EX-PARA-120'])
  })
  it('la disponibilité : quatre états en mots ; inconnu → Disponible ; indisponible → pas commandable', () => {
    expect(DISPONIBILITES.map((d) => LIBELLE_DISPO[d])).toEqual(['Disponible', 'Disponibilité limitée', 'Momentanément indisponible', 'Sur commande'])
    expect(lireDisponibilite('n’importe quoi')).toBe('en_stock')
    expect(commandable('rupture')).toBe(false)
    expect(commandable('sur_commande')).toBe(true)
    for (const d of DISPONIBILITES) expect(LIBELLE_DISPO[d]).not.toMatch(/\d/)
  })
})
