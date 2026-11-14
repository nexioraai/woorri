/**
 * EP-337 · LE JUGE DE PERSISTANCE CESSE DE CERTIFIER L'AMNÉSIE.
 *
 * ── CE QUI EST PARTI EN PRODUCTION LE 2026-11-04.
 *
 * Demande : « application mobile pour calculer la consommation d'énergie
 * sur mon compteur de SNE ». Livré :
 *
 *     schema   : « -- AUCUNE DONNÉE DÉCLARÉE »        → 0 table
 *     fichiers : composants/Historique.tsx            → un écran de mémoire
 *     App.tsx  : 4 appels à localStorage
 *     juge de persistance : AUCUN DÉFAUT
 *
 * Le juge commençait par `if (entites.length === 0) return []`. Avec zéro
 * table il n'avait rien à comparer, donc il se taisait — et son silence
 * voyageait jusqu'au document comme un verdict favorable.
 *
 *   « Une garde qui se tait précisément quand ce qu'elle garde échoue est
 *     pire qu'une garde absente : son vert se lit comme une preuve. »
 *
 * C'est la garde silencieuse nommée deux jours plus tôt, le 2026-11-02, et
 * elle venait de laisser passer une vraie application d'un vrai client.
 *
 * ── LA PROPRIÉTÉ, EN UNE PHRASE.
 *
 * Zéro table n'est pas un cas sans objet : c'est l'affirmation « cette
 * application n'a rien à conserver ». Elle se vérifie comme les autres, et
 * le code livré porte sa réfutation — un écran dont le métier est de se
 * souvenir, ou un rangement du navigateur.
 */
import { describe, expect, it } from 'vitest'
import { motifTexte } from './motif-texte'
import {
  jugerPersistance,
  preuvesDeMemoire,
  reprochePersistance,
} from '../juge-persistance'
import { lireDeclarationEnRoute, fusionnerEntites } from '../declaration-en-route'

const ENTITE = {
  id: 'ent_releve',
  name: 'releve',
  fields: [{ id: 'f1', name: 'date', type: 'date' as const, required: true }],
}
const VALIDE = () => true

describe('EP-337 · l’amnésie ne se certifie plus', () => {
  it('① UN ÉCRAN DE MÉMOIRE SANS TABLE EST UN DÉFAUT, pas un cas sans objet', () => {
    const f = new Map([
      ['index.tsx', 'export const x = 1'],
      ['composants/Historique.tsx', 'export const H = () => null'],
    ])
    expect(
      jugerPersistance([], f),
      'une œuvre qui livre un écran « historique » sans table passe encore',
    ).toHaveLength(1)
  })

  it('② QUATRE APPELS À localStorage SONT LA PREUVE MATÉRIELLE', () => {
    // ── LES MOTS DU PROPRIÉTAIRE, VERBATIM.
    //
    // « quatre appels à localStorage dans le code livré sont la preuve
    //   matérielle que l'application voulait conserver quelque chose. »
    const f = new Map([
      ['index.tsx', 'export const x = 1'],
      [
        'composants/App.tsx',
        "localStorage.getItem('a'); localStorage.setItem('a','b');",
      ],
    ])
    const p = preuvesDeMemoire(f)
    expect(p, 'le rangement du navigateur n’est pas vu').toHaveLength(1)
    expect(p[0]?.quoi, 'la preuve ne dit pas combien').toContain('2 appel')
    expect(jugerPersistance([], f), 'le juge ignore la preuve matérielle').toHaveLength(1)
  })

  it('③ UNE APPLICATION QUI N’A VRAIMENT RIEN À CONSERVER RESTE VERTE', () => {
    // Sans ça le contrôle refuserait une calculatrice honnête — et un
    // cliquet qui rougit sur le cas normal se fait désarmer dans la semaine.
    const f = new Map([
      ['index.tsx', 'export const x = 1'],
      ['composants/Calcul.tsx', 'const [v, setV] = useState(0)'],
    ])
    expect(jugerPersistance([], f), 'une calculatrice sans mémoire est refusée').toEqual([])
  })

  it('④ NOTRE BIBLIOTHÈQUE NE COMPTE PAS CONTRE LE MODÈLE', () => {
    // `systeme/` est à NOUS. Un rangement qui y vivrait serait notre
    // décision, et la reprocher au modèle lui demanderait de corriger du
    // code qu'il n'a pas écrit.
    const f = new Map([
      ['index.tsx', 'export const x = 1'],
      ['systeme/ui.tsx', "localStorage.getItem('theme')"],
    ])
    expect(jugerPersistance([], f), 'notre propre bibliothèque est reprochée au modèle').toEqual([])
  })

  it('⑤ LE REPROCHE EST SATISFAISABLE — il demande une DÉCLARATION', () => {
    // ── POURQUOI CE CONTRÔLE EXISTE.
    //
    // Un défaut de persistance fait RÉESSAYER la boucle (mesuré : au
    // dernier tour elle livre quand même, avec les défauts attachés). Si le
    // reproche demandait une requête vers une table qui n'existe pas, le
    // modèle ne pourrait RIEN en faire : les tables venaient du cahier,
    // donc d'une entrée de la boucle.
    //
    // Un reproche auquel on ne peut pas répondre est un reproche qu'on
    // apprend à ignorer.
    const f = new Map([['composants/Historique.tsx', 'export const H = () => null']])
    const texte = reprochePersistance(jugerPersistance([], f), preuvesDeMemoire(f))
    expect(texte, 'le reproche ne demande pas de déclarer').toMatch(/DÉCLARE LES TABLES/u)
    expect(texte, 'le reproche ne nomme pas l’endroit').toContain('composants/Historique.tsx')
    expect(texte, 'le reproche laisse croire qu’un rangement navigateur suffit').toMatch(
      /N’EST PAS une base/u,
    )
  })

  it('⑥ ET LE CONSTRUCTEUR PEUT Y RÉPONDRE — même grammaire, pas une seconde', () => {
    // La déclaration en route emploie EXACTEMENT la forme que rend la
    // lecture du brief. Deux grammaires divergeraient, et la divergence se
    // découvrirait sur une table posée de travers, en production.
    const f = new Map([
      ['index.tsx', 'export const x = 1'],
      ['DONNEES.json', JSON.stringify([ENTITE])],
    ])
    const d = lireDeclarationEnRoute(f, VALIDE)
    expect(d.entites, 'la déclaration du constructeur n’est pas lue').toHaveLength(1)
    expect(d.entites[0]?.name).toBe('releve')
    // ── ET ELLE NE PART PAS DANS L'APPLICATION.
    expect(
      d.fichiers.has('DONNEES.json'),
      'la déclaration est livrée comme un fichier mort de l’archive',
    ).toBe(false)
    expect(d.fichiers.has('index.tsx'), 'le filtre a emporté le code').toBe(true)
  })

  it('⑦ LE CAHIER GAGNE SUR UN NOM COMMUN, le constructeur AJOUTE', () => {
    // Le cahier porte ce que la personne a DEMANDÉ. Le constructeur n'a pas
    // à le redéfinir au passage — il complète ce que le cahier n'a pas vu.
    const duCahier = [{ ...ENTITE, fields: [...ENTITE.fields] }]
    const duConstructeur = [
      { ...ENTITE, id: 'autre', fields: [] },
      { ...ENTITE, id: 'ent_note', name: 'note', fields: [] },
    ]
    const f = fusionnerEntites(duCahier, duConstructeur)
    expect(f.entites.map((e) => e.name), 'la fusion perd ou duplique une table').toEqual([
      'releve',
      'note',
    ])
    expect(f.entites[0]?.id, 'le constructeur a écrasé la table du cahier').toBe('ent_releve')
    // Le constructeur rendait `fields: []` sur `releve` : rien à ajouter, donc
    // aucune perte. La fusion ne parle que quand elle refuse QUELQUE CHOSE.
    expect(f.pertes, 'une fusion sans conflit ne reproche rien').toEqual([])
  })

  it('⑧ UN JSON ILLISIBLE NE FAIT PAS ÉCHOUER LA CONSTRUCTION', () => {
    // Il ne déclare rien, et le juge dira que l'application veut se souvenir
    // sans table. Un reproche vaut mieux qu'une exception : le modèle peut
    // répondre à l'un, pas à l'autre.
    const f = new Map([['DONNEES.json', '{ pas du json']])
    const d = lireDeclarationEnRoute(f, VALIDE)
    expect(d.entites).toEqual([])
    expect(d.fichiers.has('DONNEES.json'), 'le fichier mort reste dans l’archive').toBe(false)
  })

  it('⑨ ET LA ROUTE ÉMET LE SCHÉMA DEPUIS CE QUE LA BOUCLE A APPRIS', async () => {
    // ── SANS CETTE LIGNE, CINQUIÈME MODULE PROUVÉ SANS APPELANT.
    //
    // `extraction-exigences`, `poserOeuvre`, l'injection de la base,
    // `assurerCompteOeuvre` — et la déclaration en route aurait suivi : la
    // boucle déclarerait la table, et le schéma s'émettrait quand même
    // depuis la liste d'entrée.
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(
      join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'direct', 'route.ts'),
      'utf8',
    )
    // V4 (2026-11-14) : aucune table n'est découverte en route — les tables
    // sont celles du cahier, et le schéma s'émet depuis CETTE liste-là.
    expect(src, 'la route n’émet plus depuis les entités du cahier').toMatch(
      /entitesCourantes = entitesDeclarees\n/u,
    )
    expect(src, 'le schéma s’émet encore depuis la liste d’entrée').toMatch(
      /emettreSchemaSql\(entitesCourantes\)/u,
    )
    expect(src, 'les politiques s’émettent encore depuis la liste d’entrée').toMatch(
      /emettrePolitiquesSql\(entitesCourantes,/u,
    )
    // ── V4 (2026-11-14) : la génération ASSEMBLE. Les fiches de chaque écran
    // (table et colonnes) sont tirées des entités que la route lui passe — les
    // mêmes que celles du schéma.
    expect(src, 'la route ne passe pas ses entités à la génération').toMatch(
      /genererApplication\(\{[\s\S]{0,900}\n\s+entites: entitesDeclarees,\n/u,
    )
    const generation = readFileSync(join(__dirname, '..', 'contrat', 'generation.ts'), 'utf8')
    expect(generation, 'les fiches ne voient pas les entités').toMatch(
      motifTexte('const tables = tablesDesEntites(o.entites)'),
    )
  })
})
