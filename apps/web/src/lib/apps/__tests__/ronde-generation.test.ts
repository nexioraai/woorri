/**
 * LE RUNNER HEBERGE — ses preuves, a zero dollar et zero deploiement.
 * La maitresse : DESARME, N rondes completes ne touchent NI le travailleur
 * NI la base — le runner deploye-mais-non-arme tourne a vide, compte a
 * l'appui. (La serrure elle-meme est deja prouvee dans service-generations.)
 */
import { describe, expect, it } from 'vitest'
import { tournerUneTranche } from '../service-generations'
import {
  executerRondes,
  plafondDeLaTranche,
  plafondParLigne,
  prochaineAttenteMs,
  secretsManquants,
} from '../ronde-generation'
import type { RapportTranche } from '../travailleur'

const rapport = (issue: RapportTranche['issue']): RapportTranche => ({ id: 'x', issue })

describe('prochaineAttenteMs — la cadence', () => {
  it('desarme : 60 s — le runner vit, ne coute rien', () => {
    expect(prochaineAttenteMs({ desarme: true, rapports: [] })).toBe(60_000)
  })
  it('rien a saisir : 15 s', () => {
    expect(prochaineAttenteMs({ desarme: false, rapports: [] })).toBe(15_000)
    expect(prochaineAttenteMs({ desarme: false, rapports: [rapport('rien')] })).toBe(15_000)
  })
  it('du travail vient d etre fait : on enchaine sans dormir', () => {
    for (const issue of ['suspendu', 'livree', 'refusee', 'erreur', 'depossede'] as const) {
      expect(prochaineAttenteMs({ desarme: false, rapports: [rapport(issue)] })).toBe(0)
    }
  })
})

describe('executerRondes — la boucle, tout injecte', () => {
  it('DESARME x3 rondes : le travailleur-piege n est JAMAIS touche, on dort 60 s a chaque fois', async () => {
    const travailleur = {
      tourner: async (): Promise<RapportTranche[]> => {
        throw new Error('PIEGE: un runner desarme ne touche RIEN')
      },
    }
    const sommeils: number[] = []
    let rondes = 0
    const n = await executerRondes({
      tranche: () => {
        rondes += 1
        return tournerUneTranche({ travailleur, env: {} })
      },
      dormir: async (ms) => void sommeils.push(ms),
      continuer: () => rondes < 3,
    })
    expect(n).toBe(3)
    // l'arret prime sur le dernier sommeil : 2 sommeils pour 3 rondes
    expect(sommeils).toEqual([60_000, 60_000])
  })

  it('arme et au travail : les tranches s enchainent sans sommeil, l arret est honore entre deux', async () => {
    const sommeils: number[] = []
    let rondes = 0
    const n = await executerRondes({
      tranche: async () => {
        rondes += 1
        return { desarme: false, rapports: [rapport(rondes < 3 ? 'suspendu' : 'rien')] }
      },
      dormir: async (ms) => void sommeils.push(ms),
      continuer: () => rondes < 3,
    })
    expect(n).toBe(3)
    // deux tranches travaillees = zero sommeil ; la troisieme (rien) voudrait
    // dormir 15 s mais `continuer` est deja faux : l arret prime.
    expect(sommeils).toEqual([])
  })
})

describe('secretsManquants — le refus NOMME', () => {
  it('nomme exactement ce qui manque, et GO_EMISSION_IA n en fait pas partie', () => {
    expect(secretsManquants({})).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ANTHROPIC_API_KEY',
    ])
    expect(
      secretsManquants({
        NEXT_PUBLIC_SUPABASE_URL: 'u',
        SUPABASE_SERVICE_ROLE_KEY: 'k',
        ANTHROPIC_API_KEY: 'a',
      }),
    ).toEqual([])
    expect(secretsManquants({ NEXT_PUBLIC_SUPABASE_URL: 'u', ANTHROPIC_API_KEY: '' }))
      .toEqual(['SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY'])
  })
})

describe('LE PLAFOND DE DÉPENSE D UNE LIGNE — borné à travers les tranches', () => {
  it('le plafond de la TRANCHE est ce qui RESTE à la ligne', () => {
    expect(plafondDeLaTranche(12, null)).toBe(12)
    expect(plafondDeLaTranche(12, {})).toBe(12)
    expect(plafondDeLaTranche(12, { coutUsd: 5 })).toBe(7)
    expect(plafondDeLaTranche(12, { coutUsd: 11.75 })).toBeCloseTo(0.25, 6)
  })

  it('à bout de plafond : ZÉRO — la garde du cœur refuse AVANT le premier appel', () => {
    expect(plafondDeLaTranche(12, { coutUsd: 12 })).toBe(0)
    expect(plafondDeLaTranche(12, { coutUsd: 12.4 })).toBe(0) // jamais négatif
    expect(plafondDeLaTranche(12, { coutUsd: 99 })).toBe(0)
  })

  it('un état abîmé ne DÉBLOQUE rien : il retombe sur le plafond plein, jamais sur l infini', () => {
    for (const cout of [undefined, null, 'beaucoup', NaN, Infinity]) {
      expect(plafondDeLaTranche(12, { coutUsd: cout })).toBeLessThanOrEqual(12)
    }
  })

  it('TROIS TRANCHES QUI CUMULERAIENT PLUS DE 12 $ : la troisième est refusée AVANT appel', () => {
    // Le scénario exact que le propriétaire exige : le runner crée un moteur
    // neuf par tranche, donc un plafond CONSTANT laisserait passer trois
    // tranches de 5 $. Ici le plafond suit ce qui reste.
    const PLAFOND = 12
    let cumul = 0
    const tranches: { plafondVu: number; depense: number; appelPossible: boolean }[] = []
    for (const depense of [5, 5, 5]) {
      const plafondVu = plafondDeLaTranche(PLAFOND, { coutUsd: cumul })
      // `assertPeutAppeler` du cœur scellé refuse AVANT un appel dont le coût
      // maximal estimé franchirait le plafond. On modélise ici le cas le plus
      // favorable au dépassement : un appel dont le coût est connu.
      const appelPossible = plafondVu >= depense
      tranches.push({ plafondVu, depense, appelPossible })
      if (appelPossible) cumul += depense
    }
    expect(tranches[0]).toEqual({ plafondVu: 12, depense: 5, appelPossible: true })
    expect(tranches[1]).toEqual({ plafondVu: 7, depense: 5, appelPossible: true })
    // LA TROISIÈME : 2 $ restants pour un appel de 5 $ → REFUSÉE
    expect(tranches[2]?.plafondVu).toBe(2)
    expect(tranches[2]?.appelPossible).toBe(false)
    expect(cumul).toBe(10)
    expect(cumul).toBeLessThanOrEqual(PLAFOND) // JAMAIS un centime de plus
  })

  it('le plafond se LIT de l environnement, et son absence se DIT — jamais une garantie déguisée', () => {
    expect(plafondParLigne({ PLAFOND_USD_PAR_LIGNE: '12' })).toBe(12)
    expect(plafondParLigne({ PLAFOND_USD_PAR_LIGNE: '0.5' })).toBe(0.5)
    // absent, vide, zéro, négatif, illisible : AUCUN plafond — et le runner
    // l annonce au démarrage au lieu de laisser croire qu il en a un.
    for (const v of [undefined, '', '0', '-3', 'douze']) {
      expect(plafondParLigne({ PLAFOND_USD_PAR_LIGNE: v })).toBe(Number.POSITIVE_INFINITY)
    }
  })
})
