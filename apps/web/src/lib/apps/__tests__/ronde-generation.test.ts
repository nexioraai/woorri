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
