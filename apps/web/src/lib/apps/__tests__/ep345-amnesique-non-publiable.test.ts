/**
 * EP-345 · UNE ŒUVRE AMNÉSIQUE NE SE PUBLIE PAS, ET ON DIT QUOI FAIRE.
 *
 * ── CE QUI EST PARTI EN PRODUCTION LE 2026-11-04 À 18:52.
 *
 * Demande : « Application mobile pour calculer ma facture d'électricité
 * SNE » — rien de plus. Le modèle a inventé un `composants/Historique.tsx`
 * que personne ne lui demandait.
 *
 *     persistance : [{"table":"", "lue":false, "ecrite":false}]
 *     tour 1 : contrôles sans nom + « DÉCLARE LES TABLES… »
 *     tour 2 : contrôles corrigés · LE MÊME REPROCHE RESTE
 *     tour 3 : ok=true → LIVRÉE, défaut attaché
 *
 * Le juge a tiré, a reproché DEUX FOIS, le modèle n'a pas corrigé, et la
 * boucle a livré au dernier tour — le comportement voulu pour les quatre
 * autres juges, parce que refuser re-brûlerait l'argent du propriétaire.
 *
 * ── MAIS CE DÉFAUT-LÀ N'EST PAS RATTRAPABLE.
 *
 *   « Livrer une application mutilée visuellement est rattrapable.
 *     Livrer une application qui oublie tout ne l'est pas — le
 *     propriétaire ne le découvrira qu'après avoir fait saisir des
 *     données à ses clients. »
 *
 * LE MAL NAÎT DONC À LA PUBLICATION, PAS À LA LIVRAISON. On laisse la
 * personne garder ce qu'elle a payé, et on ferme la seule porte qui
 * expose ses clients.
 *
 * ── ET UN REPROCHE À ISSUE UNIQUE QU'ON REFUSE DEUX FOIS EST MAL POSÉ.
 *
 * Le modèle n'avait qu'une sortie — déclarer la table — et c'est celle
 * qu'il n'a pas prise. Le vrai défaut était en amont : l'écran était de
 * trop. Le dernier tour offre donc les DEUX.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { reprochePersistance } from '../juge-persistance'
import { lireSource } from './lire-source'

const SRC = join(__dirname, '..', '..', '..')
const SENTINELLE = [{ table: '', lue: false, ecrite: false }]
const PREUVES = [{ fichier: 'composants/Historique.tsx', quoi: 'un écran « historique »' }]

describe('EP-345 · l’œuvre amnésique', () => {
  it('① LE DERNIER TOUR OFFRE DEUX SORTIES, pas une', () => {
    const dernier = reprochePersistance(SENTINELLE, PREUVES, true)
    expect(dernier, 'le modèle ne sait pas que c’est le dernier tour').toMatch(/DERNIER TOUR/u)
    expect(dernier, 'la première sortie a disparu').toMatch(/① DÉCLARE la table/u)
    expect(dernier, 'la seconde sortie — retirer l’écran — n’est pas offerte').toMatch(
      /② ou RETIRE cet écran/u,
    )
    // ET LA TROISIÈME EST NOMMÉMENT EXCLUE : sans ça, « livrer quand même »
    // reste une option implicite, et c'est celle qu'il a prise deux fois.
    expect(dernier, 'livrer un écran amnésique reste une sortie tacite').toMatch(
      /PAS une troisième sortie/u,
    )
  })

  it('② ET UN TOUR ORDINAIRE NE SE DIT PAS DERNIER', () => {
    const ordinaire = reprochePersistance(SENTINELLE, PREUVES, false)
    expect(ordinaire, 'tous les tours s’annoncent comme le dernier').not.toMatch(/DERNIER TOUR/u)
    expect(ordinaire, 'le reproche ordinaire a perdu sa demande').toMatch(/DÉCLARE LES TABLES/u)
  })

  it('③ LA BOUCLE SAIT QUEL TOUR EST LE DERNIER', () => {
    // Les reproches partent aux tours 1..toursMax-1 ; la réponse au
    // dernier est LIVRÉE telle quelle. C'est donc `toursMax - 1` qui
    // porte la dernière chance, pas `toursMax`.
    const src = lireSource(join(SRC, 'lib', 'apps', 'boucle-directe.ts'))
    expect(src, 'le dernier reproche ne se sait pas dernier').toMatch(
      /reprochePersistance\([\s\S]{0,80}rang === toursMax - 1/u,
    )
  })

  it('④ LA PUBLICATION REFUSE UNE ŒUVRE AMNÉSIQUE', () => {
    const src = lireSource(join(SRC, 'app', 'api', 'generateur', 'publier', 'route.ts'))
    // Elle lit le verdict du juge, pas une heuristique sur les fichiers.
    expect(src, 'la publication ne lit pas le verdict de persistance').toContain(
      'sections_acquises',
    )
    expect(src, 'rien ne refuse une œuvre amnésique').toMatch(/amnesique: true/u)
    // LE REFUS EST BORNÉ AU CAS SENTINELLE : une œuvre sans données ET
    // sans écran de mémoire se publie normalement, c'est la majorité.
    expect(src, 'le refus n’est pas borné au verdict sentinelle').toMatch(
      /persistance\[0\]\?\.table === ''/u,
    )
  })

  it('⑤ ET IL DONNE LA SORTIE — un mur serait pire que A', () => {
    // « Sans cette sortie, la personne a payé, a une application qu'elle
    //   ne peut pas publier, et aucune idée de quoi faire. »
    const src = lireSource(join(SRC, 'app', 'api', 'generateur', 'publier', 'route.ts'))
    // ── L'ANCRE EST DANS LE BLOC, PAS DANS LE FICHIER.
    //
    // `toMatch(/quoiFaire:/)` sur tout le fichier était satisfait par le
    // refus 503 de `configBaseOeuvres`, qui en porte un aussi : la
    // mutation qui retirait CELUI-CI restait verte.
    const i = src.indexOf('amnesique: true')
    expect(i, 'le bloc de refus a disparu').toBeGreaterThan(0)
    const bloc = src.slice(src.lastIndexOf('return NextResponse.json', i), src.indexOf('}', i + 400))
    expect(bloc, 'le refus ne dit pas pourquoi, en français').toMatch(/ne conserve rien/u)
    expect(bloc, 'le refus ne propose aucun geste').toMatch(/quoiFaire:/u)
    // LA DEMANDE PART DÉJÀ AUGMENTÉE : rien à recopier.
    expect(src, 'la demande de régénération n’est pas préremplie').toMatch(
      /regenerer: `\$\{demande\}[\s\S]{0,80}conserve les données/u,
    )
  })

  it('⑥ ET L’ÉCRAN PORTE CE BOUTON — celui qui existe déjà', () => {
    // L'USAGE, PAS LA DÉFINITION : un refus structuré que personne
    // n'affiche est un mur avec une sortie dessinée au dos.
    const atelier = lireSource(join(SRC, 'app', 'atelier', '[id]', 'page.tsx'))
    expect(atelier, 'le refus d’amnésie n’atteint pas l’écran').toMatch(
      /d\?\.amnesique === true[\s\S]{0,120}setARegenerer\(/u,
    )
    // ── ET LA DEMANDE N'EST PAS RECOLLÉE DEUX FOIS.
    //
    // Le refus de publication rend une demande DÉJÀ complète ; celui de
    // retouche rend seulement la correction. Les traiter pareil
    // produirait la demande d'origine en double.
    expect(atelier, 'la demande d’origine est recollée sur une demande complète').toMatch(
      /aRegenerer\.startsWith\(/u,
    )
  })
})
