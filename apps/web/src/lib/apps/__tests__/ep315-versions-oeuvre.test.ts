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
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  estRestaurable,
  phraseVersion,
  prixEstime,
  rangCourant,
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

  it('⑤ UNE NAVIGATION NE CRÉE PAS DE VERSION — le pointeur, pas une ligne', () => {
    // ── LE DÉFAUT TROUVÉ À L'USAGE, PAS PAR UN TEST (2026-11-02).
    //
    // « Revenir à celle-ci » ÉCRIVAIT un rang n+1. Mesuré sur une œuvre
    // réelle : six versions, dont TROIS allers-retours. Avec le plafond de
    // dix, quelques clics auraient effacé de vraies générations.
    //
    // Une version est créée par un TRAVAIL — livraison, régénération, et
    // demain modification. Jamais par une navigation.
    const route = readFileSync(
      join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'version', 'route.ts'),
      'utf8',
    )
    const sansCommentaires = route.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '')
    const apresPost = sansCommentaires.slice(sansCommentaires.indexOf('export async function POST'))
    expect(
      /from\(TABLE_VERSIONS\)[\s\S]{0,120}\.insert\(/u.test(apresPost),
      'le retour écrit de nouveau une version — quelques clics effaceront de vraies générations',
    ).toBe(false)
    // ET IL DÉPLACE LE POINTEUR : sans ça il ne reviendrait nulle part.
    expect(apresPost).toContain('version_courante: rang')
  })

  it('⑥ LE POINTEUR DÉCIDE DE LA COURANTE, PAS LA POSITION', () => {
    expect(rangCourant(1, [1, 2, 3])).toBe(1)
    expect(rangCourant(3, [1, 2, 3])).toBe(3)
    // `null` = la plus haute : les œuvres d'avant ce lot restent lisibles
    // sans migration de données.
    expect(rangCourant(null, [1, 2, 3])).toBe(3)
    // Un pointeur vers une version purgée ne rend pas l'œuvre illisible.
    expect(rangCourant(7, [1, 8, 9])).toBe(9)
    expect(rangCourant(null, [])).toBe(0)
  })

  it('⑦ LES MOTS SONT CEUX DE LA PERSONNE, ET « régénérée » EN FAIT PARTIE', () => {
    // « construction » était le repli de tout ce que la fonction ne
    // connaissait pas — et il attrapait un cas RÉEL, la régénération. Un
    // repli qui attrape un cas réel n'est plus un repli.
    const d = '2026-11-02T01:26:43.000Z'
    expect(phraseVersion({ rang: 2, etape: 'regeneration', creeIl: d, actuelle: true })).toContain('régénérée')
    expect(phraseVersion({ rang: 1, etape: 'livraison', creeIl: d, actuelle: false })).toContain('livrée')
    // Les retours d'avant le pointeur restent, avec leur libellé honnête.
    expect(phraseVersion({ rang: 3, etape: 'retour vers 1', creeIl: d, actuelle: false }))
      .toContain('ancien comportement')
    // L'HEURE EST LÀ : cinq des six versions mesurées datent du même jour.
    expect(phraseVersion({ rang: 1, etape: 'livraison', creeIl: d, actuelle: false })).toMatch(/\d{2}:\d{2}/u)
    expect(phraseVersion({ rang: 2, etape: 'regeneration', creeIl: d, actuelle: true })).toContain('actuelle')
  })
})
