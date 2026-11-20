/**
 * L'ACTIVATION À LA MAIN : le prix de CHAQUE objet, et l'écart (2026-11-20).
 * Prix décidés : mois 12 000 FCFA, lot 3 000 FCFA.
 */
import { describe, expect, it } from 'vitest'
import { blocage, ecart, prixRegle } from '../activation-manuelle'

const REGLES = { prixMensuelXaf: '12000', lotPrixXaf: '3000' }

describe('l’activation à la main', () => {
  it('12 000 FCFA pour un mois : accepté, aucun écart signalé', () => {
    expect(blocage('abonnement', REGLES)).toBeNull()
    expect(ecart('abonnement', 12000, REGLES)).toBeNull()
  })
  it('un autre montant pour un mois : l’écart est signalé, avec les deux chiffres', () => {
    expect(ecart('abonnement', 10000, REGLES)).toBe('Attention : le prix réglé est 12 000 FCFA, le montant reçu est 10 000 FCFA.')
  })
  it('le lot se compare au prix du LOT, pas au mois', () => {
    expect(ecart('lot', 3000, REGLES)).toBeNull()
    expect(ecart('lot', 12000, REGLES)).toBe('Attention : le prix réglé est 3 000 FCFA, le montant reçu est 12 000 FCFA.')
  })
  it('un prix vide bloque — pour son objet seulement', () => {
    const sansLot = { prixMensuelXaf: '12000', lotPrixXaf: '' }
    expect(blocage('lot', sansLot)).toMatch(/prix du lot/u)
    expect(blocage('abonnement', sansLot)).toBeNull()
    expect(prixRegle('abonnement', { prixMensuelXaf: '', lotPrixXaf: '3000' })).toBeNull()
  })
})
