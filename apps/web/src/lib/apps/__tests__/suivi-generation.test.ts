/**
 * ETAGE 4 — LES 4 ETATS DE L'ECRAN, PROUVES SUR REPONSES SIMULEES.
 * Zero navigateur, zero appel : la logique est pure, c'est elle qu'on prouve.
 */
import { describe, expect, it } from 'vitest'
import {
  ETAPES_SUIVI,
  marcheDuSuivi,
  modeAsyncActif,
  generationDepuisUrl,
  memoriserGeneration,
  oublierGeneration,
} from '../suivi-generation'

const stockage = () => {
  // un objet nu, pas une Map : la sequence de suppression PostgREST est
  // interdite dans lib/apps par le cliquet du banc, meme en homonyme.
  let m: Record<string, string> = {}
  return {
    getItem: (k: string) => m[k] ?? null,
    setItem: (k: string, v: string) => {
      m[k] = v
    },
    removeItem: (k: string) => {
      const { [k]: _jete, ...reste } = m
      void _jete
      m = reste
    },
  }
}

describe('les 4 etats rendus depuis des reponses simulees', () => {
  it('en_attente : premiere marche, en cours', () => {
    const m = marcheDuSuivi({ statut: 'en_attente', etape: null, raison: null })
    expect(m).toEqual({ courante: 0, livree: false, refusee: false, raison: null, enCours: true })
  })

  it('en_cours suit l etape du moteur : p0 comprend, sections ecrivent, reparation verifie', () => {
    expect(marcheDuSuivi({ statut: 'en_cours', etape: 'p0', raison: null }).courante).toBe(1)
    expect(marcheDuSuivi({ statut: 'en_cours', etape: 'ecrans', raison: null }).courante).toBe(2)
    expect(marcheDuSuivi({ statut: 'en_cours', etape: 'reparation', raison: null }).courante).toBe(3)
  })

  it('livree : derniere marche, bouton possible', () => {
    const m = marcheDuSuivi({ statut: 'livree', etape: null, raison: null })
    expect(m.livree).toBe(true)
    expect(m.courante).toBe(ETAPES_SUIVI.length - 1)
    expect(m.enCours).toBe(false)
  })

  it('refusee : la raison affichee est celle TRADUITE par le serveur, avec repli generique', () => {
    const m = marcheDuSuivi({
      statut: 'refusee', etape: null,
      raison: 'Une erreur technique est survenue. Réessayez dans un moment.',
    })
    expect(m.refusee).toBe(true)
    expect(m.raison).toBe('Une erreur technique est survenue. Réessayez dans un moment.')
    // raison absente (vieille ligne d'avant la traduction) : repli utilisateur
    expect(marcheDuSuivi({ statut: 'refusee', etape: null, raison: null }).raison)
      .toContain('n’a pas pu aboutir')
  })
})

describe('le drapeau — OFF laisse l ancien chemin seul au monde', () => {
  it('seul « 1 » arme le mode async', () => {
    expect(modeAsyncActif(undefined)).toBe(false)
    expect(modeAsyncActif('')).toBe(false)
    expect(modeAsyncActif('0')).toBe(false)
    expect(modeAsyncActif('true')).toBe(false)
    expect(modeAsyncActif('1')).toBe(true)
  })
})

describe('survivre au rafraichissement', () => {
  it('l URL d abord, le stockage en secours, rien sinon', () => {
    const st = stockage()
    expect(generationDepuisUrl('?generation=g-1', st)).toBe('g-1')
    expect(generationDepuisUrl('', st)).toBeNull()
    memoriserGeneration('g-2', st)
    expect(generationDepuisUrl('', st)).toBe('g-2')
    expect(generationDepuisUrl('?generation=g-1', st)).toBe('g-1') // l URL prime
    oublierGeneration(st)
    expect(generationDepuisUrl('', st)).toBeNull()
  })

  it('memoriser rend la query a poser dans l URL', () => {
    expect(memoriserGeneration('g 3', stockage())).toBe('?generation=g%203')
  })
})
