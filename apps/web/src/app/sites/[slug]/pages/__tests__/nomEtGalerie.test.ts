import { describe, it, expect } from 'vitest'
import { nomDuResponsable } from '../FicheResponsable'
import { tuileGalerie } from '../../themes/tuileGalerie'

describe('fiche — le nom du responsable', () => {
  it('une personne (civilité) est reprise, un intitulé ne l’est pas', () => {
    expect(nomDuResponsable('Dr Youssouf Abdoulaye Ali')).toBe('Dr Youssouf Abdoulaye Ali')
    expect(nomDuResponsable('Mme Néboyzé Henriette')).toBe('Mme Néboyzé Henriette')
    expect(nomDuResponsable('M. Adamou Abdoulaye')).toBe('M. Adamou Abdoulaye')
    expect(nomDuResponsable('Chef comptable')).toBeNull()
    expect(nomDuResponsable('Le Directeur général')).toBeNull()
    expect(nomDuResponsable('Mr')).toBeNull()
    expect(nomDuResponsable(undefined)).toBeNull()
  })
})

// Cases occupées par une tuile : téléphone 2 colonnes, écran large 3.
const largeur = (c: string, large: boolean) => {
  const m = large ? c.match(/md:col-span-(\d)/) ?? c.match(/(?:^| )col-span-(\d)/) : c.match(/(?:^| )col-span-(\d)/)
  return m ? Number(m[1]) : 1
}
describe('galerie — aucun trou en bas de la grille', () => {
  for (let n = 1; n <= 9; n++) {
    it(`${n} photo(s)`, () => {
      const t = Array.from({ length: n }, (_, i) => tuileGalerie(i, n))
      // téléphone : la grande tuile prend 2×1 (carrée sur 2 colonnes)
      const tel = t.reduce((s, c) => s + largeur(c, false), 0)
      expect(tel % 2).toBe(0)
      // écran large : la grande tuile prend 2×2 = 4 cases
      const large = t.reduce((s, c, i) => s + (n >= 3 && i === 0 ? 4 : largeur(c, true)), 0)
      expect(large % 3).toBe(0)
    })
  }
})
