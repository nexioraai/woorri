/**
 * LE PRIX MOBILE MONEY — UN SEUL, PAYÉ PAR LE CLIENT (2026-11-21 ; prix unique le 2026-11-23).
 *
 * Règle du propriétaire : un seul prix, le même pour Airtel et Moov, calculé
 * avec le taux d'encaissement le plus élevé, plus le reversement ET le retrait :
 *   prix ÷ (1 − retrait) × (1 + reversement) ÷ (1 − encaissement), arrondi à la centaine supérieure.
 * Ce fichier le prouve sur les montants attendus (7 000 / 10 500 / 14 000) et sur une grille.
 *
 * Ce qu'il NE PEUT PAS voir : la règle d'arrondi des frais chez MoneRails, ni
 * si les taux du bac à sable sont ceux du mode réel.
 */
import { describe, expect, it } from 'vitest'
import {
  CLES_TARIF, encaissementRetenuBp, operateurPropose, pointsDeBase, prixMobileMoney, tarifDepuisReglages, totalUnique, type Tarif,
} from '../frais'

const REGLAGES = {
  prix_mensuel_xaf: '12000', frais_encaissement_airtel_pct: '7', frais_encaissement_moov_pct: '5',
  frais_reversement_pct: '3.5', frais_retrait_pct: '4', arrondi_frais_xaf: '100',
}
const tarif = (v: Record<string, string> = REGLAGES): Tarif => {
  const t = tarifDepuisReglages(v)
  if (!t.ok) throw new Error(`tarif : ${t.manque.join(', ')}`)
  return t.tarif
}

describe('le prix unique', () => {
  it('LES MONTANTS ATTENDUS : 6 000 → 7 000 · 9 000 → 10 500 · 12 000 → 14 000', () => {
    const t = tarif()
    expect(prixMobileMoney(t, 6000).total).toBe(7000)
    expect(prixMobileMoney(t, 9000).total).toBe(10500)
    expect(prixMobileMoney(t)).toEqual({ prix: 12000, frais: 2000, total: 14000 })
  })
  it('LE CALCUL, pas à pas (en réels) : 12 000 ÷ 0,96 × 1,035 ÷ 0,93 = 13 911,29 → 14 000', () => {
    const brut = (p: number) => (p / (1 - 0.04)) * (1 + 0.035) / (1 - 0.07)
    expect(brut(12000)).toBeCloseTo(13911.29, 2)
    expect(brut(9000)).toBeCloseTo(10433.47, 2)
    expect(brut(6000)).toBeCloseTo(6955.65, 2)
    for (const p of [6000, 9000, 12000]) expect(prixMobileMoney(tarif(), p).total).toBe(Math.ceil(brut(p) / 100) * 100)
  })
  it('LE TAUX LE PLUS ÉLEVÉ fait le prix — quel que soit l’opérateur qui le porte', () => {
    expect(encaissementRetenuBp(tarif())).toBe(700)
    const inverse = tarif({ ...REGLAGES, frais_encaissement_airtel_pct: '5', frais_encaissement_moov_pct: '7' })
    expect(encaissementRetenuBp(inverse)).toBe(700)
    expect(prixMobileMoney(inverse).total).toBe(14000)
    // Moov à 5 % seul ne fait PAS le prix : il serait plus bas (13 700).
    expect(prixMobileMoney(tarif({ ...REGLAGES, frais_encaissement_airtel_pct: '5' })).total).toBe(13700)
  })
  it('LE RETRAIT compte : sans lui, 12 000 donnerait 13 400 ; avec 4 %, 14 000', () => {
    expect(prixMobileMoney(tarif({ ...REGLAGES, frais_retrait_pct: '0' })).total).toBe(13400)
    expect(prixMobileMoney(tarif()).total).toBe(14000)
  })
  it('après encaissement, reversement ET retrait, il reste au moins le prix — et 100 de moins ne suffirait pas', () => {
    // Ce qui reste d'un total T : T × (1 − enc) ÷ (1 + rev) × (1 − retrait).
    const reste = (total: number) => (total * 9300 * 9600) / (10_350 * 10_000)
    for (const [p, total] of [[6000, 7000], [9000, 10500], [12000, 14000]] as const) {
      expect(reste(total)).toBeGreaterThanOrEqual(p)
      expect(reste(total - 100)).toBeLessThan(p)
    }
  })
  it('GRILLE : pour tout prix, taux, retrait et arrondi, le total est un multiple de l’arrondi, garantit le prix, et est le PLUS PETIT qui le garantit', () => {
    let cas = 0
    for (const prix of [1, 99, 100, 3000, 6000, 9000, 12000, 12001, 99999]) {
      for (const enc of [0, 1, 500, 700, 9999]) {
        for (const rev of [0, 350, 9999]) {
          for (const ret of [0, 1, 400, 9999]) {
            for (const arrondi of [1, 100, 10_000]) {
              const total = totalUnique(prix, enc, rev, ret, arrondi)
              const besoin = prix * 10_000 * (10_000 + rev)
              const tient = (x: number) => x * (10_000 - enc) * (10_000 - ret) >= besoin
              expect(total % arrondi).toBe(0)
              expect(tient(total), `sous le prix : ${JSON.stringify({ prix, enc, rev, ret, arrondi, total })}`).toBe(true)
              expect(tient(total - arrondi), `arrondi trop haut : ${JSON.stringify({ prix, enc, rev, ret, arrondi, total })}`).toBe(false)
              cas += 1
            }
          }
        }
      }
    }
    expect(cas).toBe(1620)
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
  it('un seul réglage vide ou illisible (le retrait compris) → AUCUN tarif, et il est nommé', () => {
    expect(CLES_TARIF).toHaveLength(6)
    expect(CLES_TARIF).toContain('frais_retrait_pct')
    for (const cle of CLES_TARIF) {
      for (const mauvais of ['', 'abc']) {
        expect(tarifDepuisReglages({ ...REGLAGES, [cle]: mauvais }), `${cle}=${mauvais}`).toEqual({ ok: false, manque: [cle] })
      }
      const sans: Record<string, string> = { ...REGLAGES }
      delete sans[cle]
      expect(tarifDepuisReglages(sans)).toEqual({ ok: false, manque: [cle] })
    }
    expect(tarifDepuisReglages({ ...REGLAGES, prix_mensuel_xaf: '0' })).toEqual({ ok: false, manque: ['prix_mensuel_xaf'] })
    expect(tarifDepuisReglages({ ...REGLAGES, arrondi_frais_xaf: '0' })).toEqual({ ok: false, manque: ['arrondi_frais_xaf'] })
  })
  it('les opérateurs proposés : Airtel et Moov (par leur code) ; un autre non', () => {
    for (const o of ['AIRTEL', 'MOOV', 'moov_td', 'airtel_td']) expect(operateurPropose(o), o).toBe(true)
    for (const o of ['ORANGE', 'MTN', '']) expect(operateurPropose(o), o).toBe(false)
  })
})
