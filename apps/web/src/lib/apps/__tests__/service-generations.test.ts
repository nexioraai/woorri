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
import { deposerGeneration, tournerUneTranche, etatGeneration, traduireRaison, RAISON_TECHNIQUE, RAISON_NON_ABOUTIE } from '../service-generations'

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
    expect(charge.etape).toBe('p0') // la premiere marche est VRAIE des le depot
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

  it('le payload utilisateur est DEGRAISSE : ni cout, ni diagnostics — un devtools ne voit que ceci', async () => {
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-1', statut: 'en_cours', etape: 'reparation', nom: 'depenses',
        cout_usd: 1.5, diagnostics: ['X@y'], document: null,
      }),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e).toMatchObject({
      id: 'g-1', statut: 'en_cours', etape: 'reparation', nom: 'depenses',
      aDocument: false, raison: null,
    })
    // la preuve par les CLES : rien d'autre ne sort — le triptyque ajoute
    // des TEMPS et des COMPTES, jamais une entraille ni un cout
    expect(Object.keys(e ?? {}).sort()).toEqual([
      'aDocument', 'activiteSec', 'apercuVersion', 'creeIl', 'defautsRestants',
      'etape', 'id', 'nom', 'raison', 'sections', 'statut',
    ])
  })

  it('le triptyque est de la TELEMETRIE pure : ecoule, battement, fraction, defauts, empreinte', async () => {
    const battement = new Date(Date.now() - 42_000).toISOString()
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-1', statut: 'en_cours', etape: 'reparation', nom: 'x',
        cout_usd: 9.9, diagnostics: [], document: null,
        created_at: '2026-10-10T10:00:00.000Z', battement,
        sections_acquises: { phase: 'reparation', defautsRestants: 12,
          acquis: { app: 1, screens: 2, actions: 3 } },
      }),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e?.creeIl).toBe('2026-10-10T10:00:00.000Z')
    expect(e?.activiteSec).toBeGreaterThanOrEqual(41)
    expect(e?.activiteSec).toBeLessThanOrEqual(45)
    expect(e?.sections).toEqual({ faites: 3, total: 22 })
    expect(e?.defautsRestants).toBe(12)
    expect(e?.apercuVersion).toMatch(/^[0-9a-f]{8}$/u)
    // entre deux tranches : battement nul → activite nulle, jamais inventee
    const e2 = await etatGeneration({
      base: baseAvec({ id: 'g-1', statut: 'en_attente', etape: 'reparation', nom: 'x',
        diagnostics: [], document: null, created_at: '2026-10-10T10:00:00.000Z',
        battement: null, sections_acquises: {} }),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e2?.activiteSec).toBeNull()
    expect(e2?.sections).toEqual({ faites: 0, total: 22 })
    expect(e2?.apercuVersion).toBeNull()
  })

  it("l'erreur de CREDIT ne sort JAMAIS brute — message generique, etat du compte invisible", async () => {
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-1', statut: 'refusee', etape: null, nom: 'x', cout_usd: 25.6,
        diagnostics: ['erreur fatale (non transitoire) : 400 {"type":"error"...Your credit balance is too low...'],
        document: null,
      }),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e?.raison).toBe(RAISON_TECHNIQUE)
    expect(JSON.stringify(e)).not.toMatch(/credit|balance|fatale|25\.6/iu)
  })

  it('les refus de convergence donnent le message rassurant, jamais le jargon du moteur', () => {
    for (const brute of [
      'non convergé en 3 tours de convergence (0 révélation(s) non comptée(s)) : reste 4 diagnostic(s)',
      'filet anti-boucle : 9 tentatives de réparation (suspensions comprises) pour 0 tour(s) achevé(s)',
      'réparation rejetée au tour 2 — TOUTES les bouchées amputent (3/3) : blk_entree_accroche',
      'stagnation au tour 2 : 5 → 5 diagnostic(s)',
      'raison inconnue du futur',
    ]) {
      const traduite = traduireRaison(brute)
      expect(traduite).toBe(RAISON_NON_ABOUTIE)
      expect(traduite).not.toMatch(/blk_|filet|bouchée/iu)
    }
    // et les familles techniques tombent toutes sur le generique
    expect(traduireRaison('echec repete x3: Request timed out.')).toBe(RAISON_TECHNIQUE)
    expect(traduireRaison('erreur fatale (non transitoire) : facturation')).toBe(RAISON_TECHNIQUE)
  })

  it('la ligne d un autre n existe pas : null, sans distinguer « absent » de « interdit »', async () => {
    expect(await etatGeneration({ base: baseAvec(null), table: 't_test', id: 'g-1', proprietaire: 'autre-user' })).toBeNull()
  })
})
