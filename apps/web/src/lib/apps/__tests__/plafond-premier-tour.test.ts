/**
 * LE PREMIER TOUR TIENT DANS LE PLAFOND (option B, 2026-11-21) — le calcul.
 * Tarifs de POINTE relevés dans `fournisseur.ts` : DeepSeek 1,32 / 3,96 $/M,
 * Anthropic (Opus) 5 / 25 $/M. Jetons d'entrée mesurés en production : 5 079
 * (génération en un tour) et 56 394 (la plus grosse tentative, trois tours).
 */
import { describe, expect, it } from 'vitest'
import { CONFIGS, tarifPlafond } from '@/lib/apps/fournisseur'
import { sortiePremierTour, SIGNES_PAR_JETON_PRUDENT } from '@/lib/apps/plafond-premier-tour'

const DS = { tarif: tarifPlafond(CONFIGS.deepseek.prix), sortieMax: CONFIGS.deepseek.maxJetons, plafondUsd: 0.5 }
const AN = { tarif: tarifPlafond(CONFIGS.anthropic.prix), sortieMax: CONFIGS.anthropic.maxJetons, plafondUsd: 0.5 }
const signesPour = (jetons: number) => jetons * SIGNES_PAR_JETON_PRUDENT

describe('sortie du premier tour', () => {
  it('les tarifs relevés sont ceux du calcul (garde-fou si fournisseur.ts change)', () => {
    expect(DS.tarif).toMatchObject({ entree: 1.32, sortie: 3.96 })
    expect(DS.sortieMax).toBe(65_536)
    expect(AN.tarif).toMatchObject({ entree: 5, sortie: 25 })
    expect(AN.sortieMax).toBe(32_000)
  })
  it('DeepSeek, générations MESURÉES (5 079 et 56 394 jetons d’entrée) : sortie INCHANGÉE, 65 536', () => {
    for (const j of [5_079, 56_394]) {
      const r = sortiePremierTour({ ...DS, signes: signesPour(j) })
      expect(r).toMatchObject({ refus: false, sortie: 65_536 })
      if (!r.refus) expect(r.estimationUsd).toBeLessThanOrEqual(0.5)
    }
  })
  it('DeepSeek : inchangé jusqu’à ~182 000 jetons d’entrée ; au-delà, la sortie se réduit, sans refus sous le fusible (1 000 000 de signes)', () => {
    expect(sortiePremierTour({ ...DS, signes: signesPour(182_000) })).toMatchObject({ refus: false, sortie: 65_536 })
    const r = sortiePremierTour({ ...DS, signes: 1_000_000 })
    expect(r.refus).toBe(false)
    if (!r.refus) { expect(r.sortie).toBeLessThan(65_536); expect(r.estimationUsd).toBeLessThanOrEqual(0.5) }
  })
  it('Anthropic (secours) : 32 000 jetons coûteraient 0,80 $ → la sortie est RÉDUITE pour tenir dans 0,50 $', () => {
    const r = sortiePremierTour({ ...AN, signes: signesPour(5_000) })
    expect(r).toMatchObject({ refus: false, sortie: 19_000 })
    if (!r.refus) expect(r.estimationUsd).toBeCloseTo(0.5, 6)
  })
  it('Anthropic, cahier énorme : l’entrée seule ne laisse pas 4 096 jetons → REFUS avant tout appel', () => {
    expect(sortiePremierTour({ ...AN, signes: 300_000 })).toMatchObject({ refus: true })
  })
})
