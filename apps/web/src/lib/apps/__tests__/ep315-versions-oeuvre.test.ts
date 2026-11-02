/**
 * EP-315 — LES VERSIONS : LE RANG 1 NE SE PURGE JAMAIS.
 *
 * ── CE QUE CES CLIQUETS TIENNENT.
 *
 * « Avant de laisser modifier, il faut pouvoir annuler. » Le lot 1 pose la
 * plomberie ; ces cliquets tiennent les trois décisions qui la rendent sûre,
 * et chacune vient d'une objection du propriétaire :
 *
 *   ① le rang 1 survit à toute purge — sinon régénérer dix fois efface
 *     définitivement l'application d'origine, celle qu'on veut le plus
 *     souvent retrouver ;
 *   ② une version de pipeline n'est PAS restaurable — elle ne porte pas de
 *     fichiers, et proposer d'y revenir serait promettre un retour vide ;
 *   ③ le prix annoncé dit « environ » — annoncer 0,13 et prélever 0,20
 *     abîme la confiance plus que l'écart lui-même.
 */
import { describe, expect, it } from 'vitest'
import {
  estRestaurable,
  prixEstime,
  rangsAPurger,
  VERSIONS_GARDEES,
} from '../versions-oeuvre'

describe('EP-315 — les versions d’une œuvre', () => {
  it('① LE RANG 1 SURVIT À TOUTE PURGE', () => {
    // Quinze versions : on en garde dix, et le rang 1 EN PLUS.
    const rangs = Array.from({ length: 15 }, (_, i) => i + 1)
    const purges = rangsAPurger(rangs)
    expect(purges, 'le rang 1 est purgé — l’application d’origine disparaît').not.toContain(1)
    // Les dix derniers (6..15) sont gardés, plus le rang 1 : il reste 2..5.
    expect(purges).toEqual([2, 3, 4, 5])
  })

  it('② EN DEÇÀ DU PLAFOND, RIEN NE SE PURGE', () => {
    expect(rangsAPurger([1, 2, 3])).toEqual([])
    expect(rangsAPurger(Array.from({ length: VERSIONS_GARDEES }, (_, i) => i + 1))).toEqual([])
  })

  it('③ UNE VERSION DE PIPELINE N’EST PAS RESTAURABLE', () => {
    // Mesuré sur les dix lignes d'origine : leur `etat` porte des compteurs
    // de pipeline, AUCUN fichier. Proposer « revenir à celle-ci » dessus
    // promettrait un retour vide.
    expect(estRestaurable({ forme: 'pipeline', phase: 'p0', tours: [] })).toBe(false)
    expect(estRestaurable({ forme: 'document', fichiers: {}, nom: null })).toBe(false)
    expect(estRestaurable(null)).toBe(false)
    expect(estRestaurable({ forme: 'document', fichiers: { 'index.tsx': 'x' }, nom: 'Hayine' })).toBe(true)
  })

  it('④ LE PRIX DIT « ENVIRON », ET SE TAIT QUAND IL NE SAIT PAS', () => {
    expect(prixEstime([0.12, 0.14])).toBe('environ 0.13 $')
    // AUCUN coût connu : on ne devine pas un prix, on ne dit rien.
    expect(prixEstime([])).toBeNull()
    expect(prixEstime([0, 0])).toBeNull()
  })
})
