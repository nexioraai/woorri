/**
 * CLIQUET — UNE ERREUR DE BATTEMENT N'EST PAS UNE DEPOSSESSION.
 *
 * MESURE (tir 0234da42, tranche 5) : un battement en echec passager rendait
 * `data: null`, le travailleur se croyait depossede, JETAIT la tranche
 * payee (333 s de reparation) sans rien ecrire, et la ligne restait figee
 * `en_cours` jusqu'a peremption. Seule une reponse PROPRE a zero ligne —
 * sans erreur — certifie qu'un autre detient le jeton.
 *
 * Harnais PostgREST MAISON (`creerFrom`) — pas un bouchon permissif de
 * plus : la projection est honoree, les ecritures journalisees. Ce qui est
 * juge est la DECISION du travailleur face a des reponses connues ; le CAS
 * reel reste prouve sur la vraie jumelle par V1/V2.
 */
import { describe, expect, it } from 'vitest'
import { creerFrom, type JournalPostgrest } from '@/lib/testing/postgrest'
import { creerTravailleur, type BaseGeneration, type MoteurContinuation } from '../travailleur'

const LIGNE = {
  id: 'ligne-test',
  statut: 'en_attente',
  demande: 'test battement',
  created_at: new Date().toISOString(),
  sections_acquises: {},
  reprises: 0,
}

/** La base : chaque battement rend ce que le scenario dicte, le reste suit. */
function baseScriptee(battement: { data: unknown; error: unknown }) {
  const journal: JournalPostgrest = { filtres: {}, ecritures: {}, projections: {} }
  const from = creerFrom(
    {
      x_test: {
        reponse: () => {
          const ecritures = journal.ecritures.x_test ?? []
          const derniere = ecritures[ecritures.length - 1] as
            | { op: string; charge?: Record<string, unknown> }
            | undefined
          if (derniere === undefined) return { data: [{ id: 'ligne-test' }], error: null } // la saisie lit
          const cles = Object.keys(derniere.charge ?? {})
          if (derniere.op === 'update' && cles.length === 1 && cles[0] === 'battement') {
            return battement // ← le scenario
          }
          return { data: [{ ...LIGNE, ...(derniere.charge ?? {}) }], error: null }
        },
      },
    },
    journal,
  )
  const base = { from } as unknown as BaseGeneration
  return { base, journal }
}

const moteurLent = (ms: number): MoteurContinuation => ({
  poursuivreEmission: async () => {
    await new Promise((r) => setTimeout(r, ms))
    return {
      fini: true,
      resultat: {
        ok: true,
        document: { livre: true },
        diagnostics: [],
        tirages: [],
        coutUsd: 0,
        jetons: { entree: 0, sortie: 0 },
      },
    }
  },
})

describe('CLIQUET — le battement distingue erreur et dépossession', () => {
  it('un battement EN ERREUR ne déposséde pas : la tranche payée est ÉCRITE', async () => {
    const { base, journal } = baseScriptee({ data: null, error: { message: 'réseau passager' } })
    const w = creerTravailleur({
      table: 'x_test',
      base,
      moteur: moteurLent(120),
      budgetTrancheMs: 10_000,
      battementPerimeMs: 90,
      battementRafraichiMs: 30,
    })
    const r = await w.tourner()
    expect(r[0]?.issue).toBe('livree')
    const finales = (journal.ecritures.x_test ?? []) as { charge?: { statut?: string } }[]
    expect(finales.some((e) => e.charge?.statut === 'livree')).toBe(true)
  })

  it('une réponse PROPRE à zéro ligne, elle, déposséde — et rien n’est écrit', async () => {
    const { base, journal } = baseScriptee({ data: [], error: null })
    const w = creerTravailleur({
      table: 'x_test',
      base,
      moteur: moteurLent(120),
      budgetTrancheMs: 10_000,
      battementPerimeMs: 90,
      battementRafraichiMs: 30,
    })
    const r = await w.tourner()
    expect(r[0]?.issue).toBe('depossede')
    const finales = (journal.ecritures.x_test ?? []) as { charge?: { statut?: string } }[]
    expect(finales.some((e) => e.charge?.statut === 'livree')).toBe(false)
  })
})
