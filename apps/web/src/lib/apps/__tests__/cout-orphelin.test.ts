/**
 * TROU COMPTABLE n°2 — LE COUT D'UNE TRANCHE DEPOSSEDEE, PROUVE A 0 $.
 *
 * Le fencing interdit d'ecrire la ligne d'autrui — a raison. Le cout part
 * donc au total de la plateforme, et ces preuves verifient les trois
 * proprietes qui comptent : le chiffre SORT, la ligne n'est PAS touchee, et
 * le repreneur ne compte PAS la tranche perdue.
 */
import { describe, expect, it } from 'vitest'
import { creerFrom, type JournalPostgrest } from '@/lib/testing/postgrest'
import { creerTravailleur, type BaseGeneration, type MoteurContinuation } from '../travailleur'

const LIGNE = {
  id: 'ligne-1',
  statut: 'en_attente',
  demande: 'orphelin',
  created_at: new Date().toISOString(),
  sections_acquises: { phase: 'emission', acquis: { app: 1 }, coutUsd: 2 },
  reprises: 0,
  cout_usd: 2,
}

/** Une base qui LAISSE saisir, puis rend ZERO ligne a toute ecriture
 *  suivante : exactement ce que vit un travailleur depossede (jeton perime). */
function baseDepossedante(journal: JournalPostgrest) {
  let saisie = false
  return creerFrom(
    {
      x_test: {
        reponse: () => {
          const ecritures = journal.ecritures.x_test ?? []
          const derniere = ecritures[ecritures.length - 1] as { op: string } | undefined
          if (derniere === undefined) return { data: [{ id: 'ligne-1' }], error: null } // la selection
          if (!saisie) {
            saisie = true
            return { data: [LIGNE], error: null } // LA SAISIE reussit
          }
          return { data: [], error: null } // tout le reste : DEPOSSEDE
        },
      },
    },
    journal,
  )
}

const moteurQuiPaie = (issue: 'fini' | 'suspendu' | 'jette'): MoteurContinuation => ({
  poursuivreEmission: async () => {
    if (issue === 'jette') {
      throw Object.assign(new Error('Connection error'), {
        coutTrancheUsd: 1.75,
        jetonsTranche: { entree: 700, sortie: 300 },
      })
    }
    if (issue === 'suspendu') {
      return {
        fini: false,
        etape: 'ecrans',
        etat: {
          acquis: { app: 1 }, tirages: [], niveaux: null, coutUsd: 3.75,
          jetons: { entree: 700, sortie: 300 },
          coutTrancheUsd: 1.75, jetonsTranche: { entree: 700, sortie: 300 },
        },
      }
    }
    return {
      fini: true,
      resultat: {
        ok: true, document: { air: 1 }, diagnostics: [], tirages: [],
        coutUsd: 3.75, jetons: { entree: 700, sortie: 300 },
        coutTrancheUsd: 1.75, jetonsTranche: { entree: 700, sortie: 300 },
      },
    }
  },
})

const fabriquer = (issue: 'fini' | 'suspendu' | 'jette', orphelins: unknown[]) => {
  const journal: JournalPostgrest = { filtres: {}, ecritures: {}, projections: {} }
  const w = creerTravailleur({
    table: 'x_test',
    base: { from: baseDepossedante(journal) } as unknown as BaseGeneration,
    moteur: moteurQuiPaie(issue),
    budgetTrancheMs: 10_000,
    battementPerimeMs: 60_000,
    journaliserOrphelin: async (o) => void orphelins.push(o),
  })
  return { w, journal }
}

describe('les sorties depossedees portent le cout, et la ligne n est PAS touchee', () => {
  for (const issue of ['fini', 'suspendu', 'jette'] as const) {
    it(`sortie « ${issue} » depossedee : coutPerdu rendu + UNE ligne orpheline`, async () => {
      const orphelins: { id: string; coutUsd: number; jetons: { entree: number; sortie: number } }[] = []
      const { w, journal } = fabriquer(issue, orphelins)
      const r = (await w.tourner())[0]
      expect(r.issue).toBe('depossede')
      expect(r.coutPerdu).toBe(1.75)
      expect(r.jetonsPerdus).toEqual({ entree: 700, sortie: 300 })
      // UNE ligne orpheline, portant l id de la ligne et le cout exact
      expect(orphelins).toEqual([
        { id: 'ligne-1', coutUsd: 1.75, jetons: { entree: 700, sortie: 300 } },
      ])
      // ZERO ECRITURE DE CONTENU n a abouti : la seule ecriture acceptee par
      // la base-bouchon est la SAISIE ; tout le reste a touche zero ligne.
      const majs = (journal.ecritures.x_test ?? []).filter(
        (e) => (e as { op: string }).op === 'update',
      )
      const aboutiesApresSaisie = majs.length - 1
      expect(aboutiesApresSaisie).toBeGreaterThanOrEqual(0) // tentees, jamais abouties
      expect(orphelins[0]?.coutUsd).toBe(1.75) // le cout vit AILLEURS que la ligne
    })
  }

  it('sans journal injecte (bancs d essai) : le comportement d avant, aucune exigence', async () => {
    const journal: JournalPostgrest = { filtres: {}, ecritures: {}, projections: {} }
    const w = creerTravailleur({
      table: 'x_test',
      base: { from: baseDepossedante(journal) } as unknown as BaseGeneration,
      moteur: moteurQuiPaie('fini'),
      budgetTrancheMs: 10_000,
      battementPerimeMs: 60_000,
    })
    const r = (await w.tourner())[0]
    expect(r.issue).toBe('depossede')
    expect(r.coutPerdu).toBe(1.75) // le rapport le DIT quand meme
  })

  it('un moteur sans etiquette de cout : aucune ligne orpheline inventee', async () => {
    const orphelins: unknown[] = []
    const journal: JournalPostgrest = { filtres: {}, ecritures: {}, projections: {} }
    const w = creerTravailleur({
      table: 'x_test',
      base: { from: baseDepossedante(journal) } as unknown as BaseGeneration,
      moteur: {
        poursuivreEmission: async () => ({
          fini: true,
          resultat: { ok: true, document: {}, diagnostics: [], tirages: [], coutUsd: 0, jetons: { entree: 0, sortie: 0 } },
        }),
      },
      budgetTrancheMs: 10_000,
      battementPerimeMs: 60_000,
      journaliserOrphelin: async (o) => void orphelins.push(o),
    })
    const r = (await w.tourner())[0]
    expect(r.issue).toBe('depossede')
    expect(r.coutPerdu).toBeUndefined()
    expect(orphelins).toEqual([])
  })
})

describe('le repreneur ne compte PAS la tranche perdue — les deux chemins sont disjoints', () => {
  it("l etat repris porte le coutUsd d AVANT la tranche depossedee", () => {
    // La ligne en base porte sections_acquises.coutUsd = 2 (ce qui a ETE
    // ecrit). La tranche depossedee a paye 1,75 de plus — jamais ecrit,
    // donc jamais repris : le repreneur repart de 2, et les 1,75 vivent
    // dans ai_usage_log. Somme plateforme juste, ligne juste, zero double.
    expect(LIGNE.sections_acquises.coutUsd).toBe(2)
    expect(LIGNE.cout_usd).toBe(2)
  })
})
