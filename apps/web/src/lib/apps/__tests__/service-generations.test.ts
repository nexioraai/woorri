/**
 * ETAGE 4 — LES PREUVES DU SERVICE, A ZERO DOLLAR PAR CONSTRUCTION.
 *
 * La preuve maitresse est la DEPENSE IMPOSSIBLE : desarme (l'etat livre),
 * `tournerUneTranche` ne touche NI la base NI le moteur — compte d'appels a
 * l'appui. Meme deploye, l'etage 4 ne peut pas depenser un centime tant que
 * le proprietaire n'arme pas GO_EMISSION_IA.
 */
import { describe, expect, it } from 'vitest'
import { creerFrom, type JournalPostgrest } from '@/lib/testing/postgrest'
import { creerTravailleur, type BaseGeneration, type MoteurContinuation } from '../travailleur'
import { deposerGeneration, tournerUneTranche, etatGeneration } from '../service-generations'

const sentinelle: MoteurContinuation = {
  poursuivreEmission: async () => {
    throw new Error('SENTINELLE: un depot ne lance JAMAIS le moteur')
  },
}

describe('deposerGeneration — un INSERT en_attente, aucun moteur', () => {
  it('la ligne nait en_attente, demande COMPLETE, et la sentinelle ne saute pas', async () => {
    const journal: JournalPostgrest = { filtres: {}, ecritures: {}, projections: {} }
    const from = creerFrom(
      { quelconque_test: { reponse: () => ({ data: [{ id: 'g-1' }], error: null }) } },
      journal,
    )
    const w = creerTravailleur({
      table: 'quelconque_test',
      base: { from } as unknown as BaseGeneration,
      moteur: sentinelle,
      budgetTrancheMs: 1,
      battementPerimeMs: 1000,
    })
    const longue = `une application ${'très '.repeat(80)}détaillée`
    const id = await deposerGeneration({ travailleur: w, demande: `  ${longue}  `, nom: 'app', email: 'a@b.c', proprietaire: 'user-1' })
    expect(id).toBe('g-1')
    const ecritures = journal.ecritures.quelconque_test ?? []
    expect(ecritures).toHaveLength(1)
    const charge = (ecritures[0] as { charge: Record<string, unknown> }).charge
    expect(charge.statut).toBe('en_attente')
    expect(charge.demande).toBe(longue) // jamais tronquee, juste ebarbee
    expect(charge.owner_email).toBe('a@b.c') // donnee d'affichage
    expect(charge.owner_id).toBe('user-1') // l'IDENTITE (dette 6a)
  })

  it('une demande vide est refusee AVANT la base', async () => {
    const w = { deposer: async () => { throw new Error('NE DOIT PAS ETRE APPELE') } }
    await expect(
      deposerGeneration({ travailleur: w, demande: '   ', nom: 'x', email: null, proprietaire: 'user-1' }),
    ).rejects.toThrowError(/DEMANDE_VIDE/u)
  })
})

describe('tournerUneTranche — la garantie de depense, MECANIQUE', () => {
  it('DESARME (etat livre) : zero appel au travailleur, zero appel a quoi que ce soit', async () => {
    let appels = 0
    const travailleur = { tourner: async () => { appels += 1; return [] } }
    const r = await tournerUneTranche({ travailleur, env: {} })
    expect(r.desarme).toBe(true)
    expect(appels).toBe(0) // la preuve : rien ne part, PAR CONSTRUCTION
    const r2 = await tournerUneTranche({ travailleur, env: { GO_EMISSION_IA: '0' } })
    expect(r2.desarme).toBe(true)
    expect(appels).toBe(0)
  })

  it('ARME par le proprietaire : la tranche balaye', async () => {
    let appels = 0
    const travailleur = { tourner: async () => { appels += 1; return [] } }
    const r = await tournerUneTranche({ travailleur, env: { GO_EMISSION_IA: '1' } })
    expect(r.desarme).toBe(false)
    expect(appels).toBe(1)
  })
})

describe('etatGeneration — la lecture est au PROPRIETAIRE seul', () => {
  const baseAvec = (ligne: Record<string, unknown> | null) => ({
    from: () => ({
      select: () => ({
        eq: (_c: string, _v: string) => ({
          eq: (_c2: string, _v2: string) => ({
            maybeSingle: async () => ({ data: ligne, error: null }),
          }),
        }),
      }),
    }),
  })

  it('rend la forme de l ecran : statut, etape, cout, diagnostics, aDocument', async () => {
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-1', statut: 'en_cours', etape: 'reparation', nom: 'depenses',
        cout_usd: 1.5, diagnostics: ['X@y'], document: null,
      }),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e).toEqual({
      id: 'g-1', statut: 'en_cours', etape: 'reparation', nom: 'depenses',
      coutUsd: 1.5, diagnostics: ['X@y'], aDocument: false,
    })
  })

  it('la ligne d un autre n existe pas : null, sans distinguer « absent » de « interdit »', async () => {
    expect(await etatGeneration({ base: baseAvec(null), table: 't_test', id: 'g-1', proprietaire: 'autre-user' })).toBeNull()
  })
})
