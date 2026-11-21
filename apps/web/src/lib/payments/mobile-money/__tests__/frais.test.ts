/**
 * LES FRAIS MOBILE MONEY, PAYÉS PAR LE CLIENT (2026-11-21).
 *
 * Règle du propriétaire : il ne reçoit JAMAIS moins que le prix net, après les
 * frais d'encaissement (retranchés) ET de reversement (ajoutés). Ce fichier le
 * prouve sur les montants décidés (13 400 / 13 100) et sur une grille.
 *
 * Ce qu'il NE PEUT PAS voir : la règle d'arrondi des frais chez MoneRails, ni
 * si les taux du bac à sable sont ceux du mode réel.
 */
import { describe, expect, it } from 'vitest'
import {
  CLES_TARIF, encaissementBp, pointsDeBase, prixPour, tarifDepuisReglages, totalAvecFrais,
} from '../frais'

const REGLAGES = {
  prix_mensuel_xaf: '12000', frais_encaissement_airtel_pct: '7', frais_encaissement_moov_pct: '5',
  frais_reversement_pct: '3.5', arrondi_frais_xaf: '100',
}

/** Ce que le propriétaire peut reverser au plus, en entiers : total × (1 − enc) ÷ (1 + rev). */
const netReversable = (total: number, encBp: number, revBp: number) => (total * (10_000 - encBp)) / (10_000 + revBp)

describe('le total payé par le client', () => {
  it('les montants DÉCIDÉS : Airtel 13 400 (1 400 de frais), Moov 13 100 (1 100)', () => {
    const t = tarifDepuisReglages(REGLAGES)
    expect(t.ok).toBe(true)
    if (!t.ok) return
    expect(prixPour(t.tarif, 'AIRTEL')).toEqual({ prix: 12000, frais: 1400, total: 13400 })
    expect(prixPour(t.tarif, 'MOOV')).toEqual({ prix: 12000, frais: 1100, total: 13100 })
  })
  it('le net après les deux frais ne passe JAMAIS sous 12 000 (Airtel ≈ 12 041, Moov ≈ 12 024)', () => {
    expect(netReversable(13400, 700, 350)).toBeGreaterThanOrEqual(12000)
    expect(netReversable(13100, 500, 350)).toBeGreaterThanOrEqual(12000)
    // …et 100 de moins ne suffirait pas : l'arrondi est le plus petit possible.
    expect(netReversable(13300, 700, 350)).toBeLessThan(12000)
    expect(netReversable(13000, 500, 350)).toBeLessThan(12000)
  })
  it('GRILLE : pour tout prix, taux et arrondi, le total est un multiple de l’arrondi, garantit le prix net, et est le PLUS PETIT qui le garantit', () => {
    let cas = 0
    for (const prix of [1, 99, 100, 2999, 3000, 12000, 12001, 15000, 99999]) {
      for (const enc of [0, 1, 350, 500, 700, 999, 5000, 9999]) {
        for (const rev of [0, 1, 350, 1000, 9999]) {
          for (const arrondi of [1, 5, 50, 100, 500, 10_000]) {
            const total = totalAvecFrais(prix, enc, rev, arrondi)
            expect(total % arrondi).toBe(0)
            expect(total * (10_000 - enc), `net sous le prix : ${String({ prix, enc, rev, arrondi, total })}`).toBeGreaterThanOrEqual(prix * (10_000 + rev))
            expect((total - arrondi) * (10_000 - enc), `arrondi trop haut : ${String({ prix, enc, rev, arrondi, total })}`).toBeLessThan(prix * (10_000 + rev))
            cas += 1
          }
        }
      }
    }
    expect(cas).toBe(2160)
  })
  it('les lots de 3 000 (non payables par mobile money aujourd’hui) donneraient 3 400 et 3 300', () => {
    expect(totalAvecFrais(3000, 700, 350, 100)).toBe(3400)
    expect(totalAvecFrais(3000, 500, 350, 100)).toBe(3300)
  })
})

describe('les réglages : tout ou rien', () => {
  it('les pourcentages : « 7 », « 3.5 », « 3,5 » ; vide, ≥ 100, négatif, 3 décimales, texte → illisible', () => {
    expect(pointsDeBase('7')).toBe(700)
    expect(pointsDeBase('3.5')).toBe(350)
    expect(pointsDeBase('3,5')).toBe(350)
    expect(pointsDeBase(' 0.25 ')).toBe(25)
    for (const v of ['', undefined, '100', '-1', '3.555', 'abc', '7%', '1e1']) expect(pointsDeBase(v), String(v)).toBeNull()
  })
  it('un seul réglage vide ou illisible → AUCUN tarif, et il est nommé', () => {
    expect(CLES_TARIF).toHaveLength(5)
    for (const cle of CLES_TARIF) {
      for (const mauvais of ['', 'abc']) {
        const t = tarifDepuisReglages({ ...REGLAGES, [cle]: mauvais })
        expect(t, `${cle}=${mauvais}`).toEqual({ ok: false, manque: [cle] })
      }
      const sans: Record<string, string> = { ...REGLAGES }
      delete sans[cle]
      expect(tarifDepuisReglages(sans)).toEqual({ ok: false, manque: [cle] })
    }
    expect(tarifDepuisReglages({ ...REGLAGES, prix_mensuel_xaf: '0' })).toEqual({ ok: false, manque: ['prix_mensuel_xaf'] })
    expect(tarifDepuisReglages({ ...REGLAGES, arrondi_frais_xaf: '0' })).toEqual({ ok: false, manque: ['arrondi_frais_xaf'] })
  })
  it('l’opérateur est reconnu par son code ; un autre n’a pas de prix (il n’est pas proposé)', () => {
    const t = tarifDepuisReglages(REGLAGES)
    if (!t.ok) throw new Error('tarif')
    expect(encaissementBp(t.tarif, 'AIRTEL')).toBe(700)
    expect(encaissementBp(t.tarif, 'MOOV')).toBe(500)
    expect(encaissementBp(t.tarif, 'moov_td')).toBe(500)
    expect(prixPour(t.tarif, 'ORANGE')).toBeNull()
  })
})
