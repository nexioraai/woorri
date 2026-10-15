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

/**
 * EP-223 · LA MARCHE D'UN REFUS DIT LA VÉRITÉ.
 *
 * SIGNALÉ PAR LE PROPRIÉTAIRE, capture à l'appui (2026-10-15). L'escalier
 * affichait « Comprendre la demande ✓ · Écrire l'application ✓ · Vérifier
 * et réparer en cours » sur un tir mort en P0, avec `sections=0` et
 * `modele: null`. Deux marches vertes jamais atteintes, et une troisième
 * présentée comme en cours alors qu'elle n'avait jamais commencé.
 *
 * Cause : `courante: 3` EN DUR dans la branche `refusee`.
 */
describe('EP-223 — la marche du refus est lue, jamais figée', () => {
  const refus = (etape: string | null) =>
    marcheDuSuivi({ statut: 'refusee', etape, raison: null })

  it('un refus en P0 s arrete a « Comprendre la demande »', () => {
    const m = refus('p0')
    expect(m.courante, 'la marche 3 serait un mensonge : P0 n a jamais abouti').toBe(1)
    expect(ETAPES_SUIVI[m.courante]).toBe('Comprendre la demande')
    expect(m.refusee).toBe(true)
  })

  it('CONTRÔLE NÉGATIF — un refus en réparation reste bien a la marche 3', () => {
    // Sans ce contrôle, on aurait pu remplacer un mensonge par un autre en
    // ramenant TOUT refus a la premiere marche.
    const m = refus('reparation')
    expect(m.courante).toBe(3)
    expect(ETAPES_SUIVI[m.courante]).toBe('Vérifier et réparer')
  })

  it('un refus pendant l ecriture reste a « Écrire l application »', () => {
    expect(refus('ecrans').courante).toBe(2)
    expect(refus(null).courante).toBe(2)
  })

  it('la marche d un refus se lit comme celle d un en_cours — une seule table', () => {
    // LE CONTRÔLE QUI COMPTE : deux lectures séparées, c'est deux vérités
    // possibles pour un même état — exactement le défaut mesuré.
    for (const etape of ['p0', 'reparation', 'ecrans', null]) {
      expect(
        marcheDuSuivi({ statut: 'refusee', etape, raison: null }).courante,
        `« ${String(etape)} » se lit differemment selon le statut`,
      ).toBe(marcheDuSuivi({ statut: 'en_cours', etape, raison: null }).courante)
    }
  })

  it('un refus porte toujours une raison lisible, jamais une page vide', () => {
    expect(refus('p0').raison).toMatch(/n’a pas pu aboutir/u)
  })
})
