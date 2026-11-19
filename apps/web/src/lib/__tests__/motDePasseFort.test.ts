import { describe, it, expect } from 'vitest'
import { motDePasseFort, criteresMotDePasse, libellesCriteres } from '../auth/motDePasseFort'

// LA RÈGLE DU MOT DE PASSE (CPA, 2026-11-19) : 10 caractères minimum, une
// majuscule, une minuscule, un chiffre, un signe.
describe('motDePasseFort', () => {
  it('accepte un mot de passe qui tient les cinq critères (lettres accentuées comprises)', () => {
    for (const m of ['MotDePasse1!', 'Ndjaména#2026', 'Él3ve-sûr-Ok']) expect(motDePasseFort(m), m).toBe(true)
  })
  it('refuse chaque manque, un par un', () => {
    expect(motDePasseFort('Court1!a')).toBe(false)        // 8 caractères
    expect(motDePasseFort('motdepasse1!')).toBe(false)    // pas de majuscule
    expect(motDePasseFort('MOTDEPASSE1!')).toBe(false)    // pas de minuscule
    expect(motDePasseFort('MotDePasse!!')).toBe(false)    // pas de chiffre
    expect(motDePasseFort('MotDePasse12')).toBe(false)    // pas de signe
    expect(motDePasseFort('A1!' + 'a'.repeat(80))).toBe(false) // trop long (72)
  })
  it('la liste dit quels critères sont tenus', () => {
    expect(criteresMotDePasse('abc').map((c) => c.ok)).toEqual([false, false, true, false, false])
  })
  it('les quatre langues ont la règle et ses cinq critères', () => {
    for (const l of ['fr', 'en', 'ar', 'es']) {
      const L = libellesCriteres(l)
      for (const k of ['longueur', 'majuscule', 'minuscule', 'chiffre', 'signe', 'regle'] as const) expect(L[k].length, `${l}.${k}`).toBeGreaterThan(3)
    }
  })
})
