/**
 * EP-256 · CLIQUET — LE `package.json` RACINE RESTE CANONIQUE.
 *
 * ── LE DÉFAUT QUE CE FICHIER EXISTE POUR INTERDIRE, ET QUI EST LE MIEN.
 *
 * Le 2026-10-17, pour ajouter une commande (`verifier:une-app`), j'ai
 * RÉÉCRIT le `package.json` racine en entier : `json.load` en mémoire,
 * mutation, `json.dumps` par-dessus. Le résultat était juste — deux lignes
 * au diff, mesuré — mais je ne l'ai su qu'APRÈS, et par chance.
 *
 * La méthode du dépôt (CLAUDE.md) est le remplacement CIBLÉ avec
 * `assert s.count(old) == 1`. Une réécriture globale, elle, peut
 * reformater tout le fichier sans rien casser fonctionnellement : le JSON
 * reste valide, `npm` lit les mêmes commandes, la gate reste verte — et le
 * diff devient illisible, ce qui est exactement l'endroit où une vraie
 * modification se cache.
 *
 * ── CE QUI NE COUVRAIT PAS CE RISQUE.
 *
 * Mesuré le même jour : AUCUN formateur n'existe dans ce dépôt — ni
 * `.prettierrc`, ni `prettier` dans une quelconque dépendance, ni une étape
 * de la gate qui lise la forme de ce fichier. Un reformatage silencieux
 * passait les 25 étapes au vert.
 *
 * ── CE QUI EST MESURÉ, ET CE QUI NE L'EST PAS.
 *
 * MESURÉ : le `package.json` RACINE est octet pour octet le rendu canonique
 * de son propre contenu — indentation de deux espaces, clés dans l'ordre
 * d'écriture, saut de ligne final, aucun échappement superflu.
 *
 * PAS MESURÉ, ET DÉLIBÉRÉMENT : les 45 autres `package.json` du dépôt. Au
 * 2026-10-17, TREIZE d'entre eux ne sont pas canoniques (dont
 * `packages/compiler`, `packages/design-tokens`, `packages/router`). Les
 * aligner serait un refactor hors du périmètre demandé — CLAUDE.md dit de
 * SIGNALER une dette hors périmètre, pas de la corriger au passage. Le
 * fichier racine est celui que j'ai touché, et celui qui porte les 25
 * commandes de la gate.
 *
 * Le jour où cette dette sera traitée, ce cliquet s'étendra par la liste
 * ci-dessous — un fichier à la fois, chacun avec sa mesure.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')

/** Les fichiers dont la forme est TENUE. Un ajout ici exige une mesure. */
const TENUS = ['package.json'] as const

describe('EP-256 · la forme du package.json racine est tenue', () => {
  for (const relatif of TENUS) {
    it(`${relatif} est le rendu canonique de son propre contenu`, () => {
      const brut = readFileSync(join(RACINE, relatif), 'utf8')

      // ── POURQUOI CETTE FORME EST « LA » FORME.
      //
      // `JSON.stringify(x, null, 2)` est le rendu que produit tout outil
      // qui réécrit un JSON sans opinion propre — y compris le `json.dumps`
      // qui a servi ce jour-là. Comparer le fichier à ce rendu dit donc
      // précisément : « une réécriture globale n'y changerait rien ». Si
      // le fichier en diverge, c'est qu'une réécriture L'A DÉJÀ reformaté,
      // ou qu'une main y a mis une forme que la prochaine effacera.
      const canonique =
        JSON.stringify(JSON.parse(brut) as unknown, null, 2) + '\n'

      if (brut !== canonique) {
        // Le message doit LOCALISER, sinon il envoie relire 90 lignes.
        const a = brut.split('\n')
        const b = canonique.split('\n')
        const i = a.findIndex((l, k) => l !== b[k])
        expect.fail(
          `${relatif} n’est plus canonique — ligne ${String(i + 1)} :\n` +
            `  sur disque  : ${JSON.stringify(a[i])}\n` +
            `  canonique   : ${JSON.stringify(b[i])}\n` +
            `(${String(a.length)} lignes sur disque, ${String(b.length)} canoniques)`,
        )
      }
      expect(brut).toBe(canonique)
    })
  }

  it('LE CLIQUET SAIT ÉCHOUER — contrôle négatif', () => {
    // ── SANS CECI, LE CONTRÔLE POURRAIT ÊTRE VERT PARCE QU'IL NE REGARDE
    // RIEN. On lui donne les trois dérives qu'une réécriture produit, et il
    // doit les voir toutes les trois.
    const vrai = readFileSync(join(RACINE, 'package.json'), 'utf8')
    const objet = JSON.parse(vrai) as unknown
    const canonique = JSON.stringify(objet, null, 2) + '\n'

    // ① indentation de quatre espaces
    expect(JSON.stringify(objet, null, 4) + '\n').not.toBe(canonique)
    // ② tout sur une ligne
    expect(JSON.stringify(objet) + '\n').not.toBe(canonique)
    // ③ saut de ligne final perdu
    expect(JSON.stringify(objet, null, 2)).not.toBe(canonique)
  })
})
