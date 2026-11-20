/**
 * LES MOTS DU COMPTEUR (étape ③ du quota, 2026-11-19).
 *
 * Décision 5A : le commerçant lit des MODIFICATIONS, le propriétaire garde ses
 * dollars. Chaque situation que le bouton peut rencontrer a sa phrase ici.
 */
import { describe, expect, it } from 'vitest'
import { boutonOuvert, libelleBouton, phraseApresRetouche, raisonFermeture, voitLesCouts } from '../compteur-phrases'
import type { EtatCompteur } from '../compteur-phrases'

const gratuite = (n: number): EtatCompteur => ({ exempte: false, formule: 'gratuite', restantes: n, payeJusquAu: null })
const abonnee = (n: number): EtatCompteur => ({ exempte: false, formule: 'abonnee', restantes: n, payeJusquAu: '2026-12-19T10:00:00Z' })
const PROPRIO: EtatCompteur = { exempte: true }

describe('le bouton « Modifier »', () => {
  it('appli gratuite : le compte des gratuites, au singulier comme au pluriel', () => {
    expect(libelleBouton(gratuite(10), 'au plus 0,03 $')).toBe('Modifier — 10 modifications gratuites restantes')
    expect(libelleBouton(gratuite(1), '')).toBe('Modifier — 1 modification gratuite restante')
  })
  it('appli abonnée : le compte et la date de fin de période', () => {
    expect(libelleBouton(abonnee(37), '')).toBe('Modifier — 37 modifications restantes jusqu’au 19 décembre')
  })
  it('le propriétaire : le plafond en dollars, comme avant', () => {
    expect(libelleBouton(PROPRIO, 'au plus 0,03 $')).toBe('Modifier — au plus 0,03 $')
  })
  it('compteur illisible : « Modifier », jamais un chiffre faux', () => {
    expect(libelleBouton(null, 'au plus 0,03 $')).toBe('Modifier')
    expect(boutonOuvert(null)).toBe(true)
  })
  it('jamais de dollars dans le libellé du commerçant', () => {
    for (const e of [gratuite(10), gratuite(0), abonnee(5), abonnee(0)]) expect(libelleBouton(e, 'au plus 0,03 $')).not.toMatch(/\$/u)
  })
})

describe('à zéro, le bouton se ferme et dit pourquoi', () => {
  it('gratuite épuisée : fermé, l’abonnement rouvre, l’appli reste en ligne', () => {
    expect(boutonOuvert(gratuite(0))).toBe(false)
    expect(libelleBouton(gratuite(0), '')).toBe('Plus de modification gratuite')
    expect(raisonFermeture(gratuite(0))).toMatch(/Abonnez cette application/u)
    expect(raisonFermeture(gratuite(0))).toMatch(/reste en ligne/u)
  })
  it('période épuisée : fermé, le prochain paiement ou un lot rouvre', () => {
    expect(boutonOuvert(abonnee(0))).toBe(false)
    expect(raisonFermeture(abonnee(0))).toMatch(/prochain paiement/u)
    expect(raisonFermeture(abonnee(0))).toMatch(/reste en ligne/u)
  })
  it('ouvert : aucune raison', () => {
    expect(raisonFermeture(gratuite(3))).toBeNull()
    expect(raisonFermeture(PROPRIO)).toBeNull()
  })
})

describe('après une retouche', () => {
  it('livrée : combien il en reste ; la dernière se dit', () => {
    expect(phraseApresRetouche(gratuite(9), true, 8)).toBe(' Il vous en reste 8.')
    expect(phraseApresRetouche(gratuite(1), true, 0)).toBe(' C’était votre dernière modification.')
  })
  it('refusée : « Non décomptée. »', () => {
    expect(phraseApresRetouche(abonnee(5), false, undefined)).toBe(' Non décomptée.')
  })
  it('le propriétaire : rien sur le compteur ; et lui seul voit les dollars', () => {
    expect(phraseApresRetouche(PROPRIO, true, undefined)).toBe('')
    expect(voitLesCouts(PROPRIO)).toBe(true)
    expect(voitLesCouts(gratuite(3))).toBe(false)
    expect(voitLesCouts(null)).toBe(false)
  })
})
