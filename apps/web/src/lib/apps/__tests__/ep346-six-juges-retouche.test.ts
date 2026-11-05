/**
 * EP-346 · (b) — LA RETOUCHE PASSE LES SIX JUGES, COMME LA GÉNÉRATION.
 *
 * ── POURQUOI DEUX SUFFISAIENT HIER, ET PLUS AUJOURD'HUI.
 *
 * La retouche était COSMÉTIQUE : textes, couleurs, libellés, un champ
 * sur un écran existant. `jetons` et `contrôles muets` couvraient ce
 * qu'elle pouvait abîmer.
 *
 * Elle change désormais de la logique et ajoute des écrans. Deux juges
 * ouvriraient alors un chemin qui LIVRE DU CODE MOINS JUGÉ que celui
 * qu'on juge — et c'est précisément par là que passerait tout ce qu'on
 * refuse à la génération.
 *
 * ── ET DEUX JUGES ÉTAIENT DÉJÀ INERTES, MESURÉ AVANT D'ÉCRIRE.
 *
 * · COUVERTURE : appelée avec `[]` comme écrans, puis comparée sur
 *   `exigences.length` — le nombre de choses que LE CAHIER demande.
 *   Une retouche ne change pas le cahier : ce contrôle ne pouvait pas
 *   rougir. Elle se compare désormais sur le TAUX, avec les vrais
 *   écrans que l'exécution a visités.
 *
 * · DEVISE : `sections_acquises.configuration` vaut `{}` sur les œuvres
 *   existantes. Le juge n'avait rien à comparer. La configuration voyage
 *   donc dans le document, comme la déclaration.
 *
 *   « Un juge inerte est pire qu'un juge absent : son zéro se lit comme
 *     aucun défaut. »
 *
 * ── ET LA COMPARAISON RESTE UN AVANT/APRÈS.
 *
 * Une retouche n'a pas à réparer ce qu'elle n'a pas cassé : on refuse la
 * RÉGRESSION, pas le défaut préexistant. Exiger zéro refuserait toute
 * modification d'une œuvre imparfaite — c'est-à-dire presque toutes.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { comparerJuges } from '../retouche'
import { lireSource } from './lire-source'

const SRC = join(__dirname, '..', '..', '..')
const ROUTE = join(SRC, 'app', 'api', 'generateur', 'retoucher', 'route.ts')

describe('EP-346 · les six juges de la retouche', () => {
  it('① LES SIX SONT NOTÉS, pas deux', () => {
    const src = lireSource(ROUTE)
    const deb = src.indexOf('async function noter(')
    expect(deb, 'la notation a disparu').toBeGreaterThan(0)
    const bloc = src.slice(deb, src.indexOf('\n}', deb))
    for (const juge of [
      'jugerJetons',
      'jugerVivacite',
      'jugerDevise',
      'jugerExecution',
      'jugerCouverture',
      'jugerPersistance',
    ]) {
      expect(bloc, `la retouche ne passe plus par ${juge}`).toContain(`${juge}(`)
    }
  })

  it('② LA COUVERTURE REÇOIT LES VRAIS ÉCRANS — sinon elle ne mesure rien', () => {
    // Elle était appelée avec `[]`. Un juge de couverture sans écrans
    // compte des exigences ; il ne constate aucune couverture.
    const src = lireSource(ROUTE)
    expect(src, 'la couverture est de nouveau appelée sans écrans').not.toMatch(
      /jugerCouverture\([^)]*,\s*\[\]\s*\)/u,
    )
    expect(src, 'les écrans de l’exécution n’atteignent pas la couverture').toMatch(
      /jugerCouverture\(o\.demande, fichiers, ecrans\)/u,
    )
  })

  it('③ ET ELLE SE COMPARE SUR LE TAUX, pas sur un nombre qui ne bouge jamais', () => {
    // `exigences.length` compte ce que LE CAHIER demande. Une retouche ne
    // change pas le cahier : l'ancien contrôle ne pouvait pas rougir.
    const src = lireSource(ROUTE)
    expect(src, 'la couverture se compare encore sur un comptage d’exigences').not.toMatch(
      /exigences\.length/u,
    )
    expect(src, 'le taux de couverture n’est pas comparé').toMatch(
      /avant: noteAvant\.taux[\s\S]{0,40}apres: noteApres\.taux/u,
    )
  })

  it('④ LA PERSISTANCE REÇOIT LA DÉCLARATION, qu’on sait enfin retrouver', () => {
    // Sans elle, `jugerPersistance([])` ne juge rien d'une œuvre qui a
    // des tables — et son vert certifierait l'amnésie, exactement ce
    // qu'EP-337 a fermé pour la génération.
    expect(lireSource(ROUTE), 'la déclaration n’atteint pas le juge').toMatch(
      /entites: declarationDe\(docAvant\)/u,
    )
  })

  it('⑤ LA DEVISE A UNE DEVISE — la configuration voyage avec l’œuvre', () => {
    const direct = lireSource(join(SRC, 'app', 'api', 'generateur', 'direct', 'route.ts'))
    // ── L'ANCRE EST LE LITTÉRAL DU DOCUMENT, PAS UNE FENÊTRE.
    //
    // `[\s\S]{0,700}` après `entites:` était satisfait par un autre
    // `configuration` plus loin dans la route : la mutation qui retirait
    // CELUI DU DOCUMENT restait verte. Quatrième fois cette semaine
    // qu'une ancre trop large est satisfaite par un voisin.
    const i = direct.indexOf('entites: entitesCourantes,')
    expect(i, 'la déclaration n’est plus stockée').toBeGreaterThan(0)
    const litteral = direct.slice(i, direct.indexOf(': null,', i))
    expect(litteral, 'la configuration n’est pas stockée dans le document').toMatch(
      /^\s*configuration,$/mu,
    )
    expect(lireSource(ROUTE), 'la retouche ne lit pas la devise de l’œuvre').toMatch(
      /configuration[\s\S]{0,60}currency/u,
    )
  })

  it('⑥ UN DOCUMENT QUI NE S’ASSEMBLE PAS COMPTE COMME UN DÉFAUT, pas comme zéro', () => {
    // Un zéro ressemblerait à « parfait ». Le document d'avant peut très
    // bien ne pas s'assembler — c'est alors une régression de ne PAS le
    // dire.
    const src = lireSource(ROUTE)
    expect(src, 'un assemblage raté produit un zéro silencieux').toMatch(
      /execution === null \? 1 : execution\.erreurs\.length/u,
    )
  })

  it('⑦ ET ON REFUSE LA RÉGRESSION, PAS LE DÉFAUT PRÉEXISTANT', () => {
    // Exiger zéro refuserait toute modification d'une œuvre imparfaite —
    // c'est-à-dire presque toutes.
    const avant = [{ nom: 'jetons', defauts: 3 }]
    expect(
      comparerJuges(avant, [{ nom: 'jetons', defauts: 3 }], null).regressions,
      'un défaut qui ne bouge pas est pris pour une régression',
    ).toEqual([])
    expect(
      comparerJuges(avant, [{ nom: 'jetons', defauts: 2 }], null).regressions,
      'une AMÉLIORATION est refusée',
    ).toEqual([])
    expect(
      comparerJuges(avant, [{ nom: 'jetons', defauts: 4 }], null).regressions,
      'une vraie régression passe',
    ).toHaveLength(1)
    // ET LA COUVERTURE EN BAISSE EST UNE RÉGRESSION, elle aussi.
    expect(
      comparerJuges(avant, avant, { avant: 0.9, apres: 0.5 }).couvertureEnBaisse,
      'une couverture qui s’effondre passe',
    ).not.toBeNull()
  })
})
