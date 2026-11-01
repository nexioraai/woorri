/**
 * EP-312 — UNE ACTION NE DÉPEND JAMAIS D'UNE CONDITION QUI NE LA CONCERNE PAS.
 *
 * ── QUATRE FOIS. QUATRE.
 *
 * 19 octobre : une génération refusée laissait l'écran SANS AUCUN BOUTON, et
 * le propriétaire a dû vider le stockage de son navigateur à la main pour se
 * débarrasser d'une ligne morte.
 *
 * 1er novembre : la suppression existe, elle est écrite, elle est prouvée de
 * bout en bout contre la vraie base… et elle est INVISIBLE sur les lignes
 * refusées. Toute la rangée de boutons était conditionnée à `a.revoyable`
 * (« les fichiers existent-ils »), donc « Supprimer » disparaissait avec
 * « Revoir ». Or la plupart des cartes du propriétaire sont des refusées : la
 * fonction qu'on venait de construire ne résolvait pas son problème.
 *
 * ── LA RÈGLE, ET POURQUOI ELLE SE CLIQUÈTE ICI.
 *
 * « Revoir », « Publier » et « Télécharger » ont besoin de la matière — sans
 * elle ils promettent un 404, et faire croire à quelqu'un qu'il a perdu son
 * application une seconde fois est pire que pas de bouton.
 *
 * « Supprimer » n'a besoin que du droit de supprimer. Le lier aux fichiers,
 * c'est exiger une condition qui ne le concerne pas — et c'est d'autant plus
 * absurde que la suppression a été écrite POUR les lignes mortes.
 *
 * Ce cliquet lit le JSX et vérifie les deux sens : la suppression DEHORS, les
 * trois autres DEDANS. Un contrôle à sens unique laisserait quelqu'un
 * « corriger » en sortant tout, et on promettrait des 404.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const BORD = readFileSync(join(__dirname, '..', '..', '..', 'app', 'dashboard', 'page.tsx'), 'utf8')

/**
 * La région du JSX gardée par « les fichiers existent-ils ».
 *
 * On délimite par le ternaire lui-même : de `{a.revoyable ? (` jusqu'à la
 * fin de sa branche négative. Les bornes sont CHERCHÉES, pas comptées en
 * lignes — un numéro de ligne se périme au premier ajout.
 */
function regionDesFichiers(): string {
  const debut = BORD.indexOf('{a.revoyable ? (')
  expect(debut, 'la condition sur les fichiers a changé de forme — relire ce cliquet').toBeGreaterThan(0)
  const negative = BORD.indexOf('Aucun fichier conservé', debut)
  expect(negative, 'la branche « aucun fichier » a disparu').toBeGreaterThan(debut)
  const fin = BORD.indexOf(')}', negative)
  expect(fin).toBeGreaterThan(negative)
  return BORD.slice(debut, fin)
}

describe('EP-312 — action et condition', () => {
  it('① « SUPPRIMER » EST DEHORS : il ne dépend pas des fichiers', () => {
    const region = regionDesFichiers()
    expect(
      region.includes('void supprimer('),
      'le bouton « Supprimer » est de nouveau enfermé dans la condition sur les ' +
        'fichiers : il disparaîtra des générations refusées, qui sont justement ' +
        'celles qu’on veut pouvoir retirer (4e occurrence du même défaut)',
    ).toBe(false)
    // Et il existe bien quelque part : un cliquet qui passerait parce que le
    // bouton a disparu serait le pire des verts.
    expect(BORD.includes('void supprimer(')).toBe(true)
  })

  it('② « REVOIR », « PUBLIER » et « TÉLÉCHARGER » SONT DEDANS', () => {
    // L'AUTRE SENS. Sans lui, « sortir tout de la condition » passerait pour
    // un correctif — et chaque bouton promettrait un 404 sur une ligne morte.
    const region = regionDesFichiers()
    for (const action of ['void revoir(', 'void publier(', 'void telecharger(']) {
      expect(
        region.includes(action),
        `${action} est sorti de la condition sur les fichiers : il promettra un 404 sur une ligne sans matière`,
      ).toBe(true)
    }
  })

  it('③ L’INFORMATION N’A PAS REMPLACÉ L’ACTION', () => {
    // « Aucun fichier conservé » doit rester — c'est une information utile —
    // mais à l'intérieur de la condition, à côté de l'action, jamais à sa
    // place. L'ordre dans le fichier le dit : la note précède la suppression.
    const note = BORD.indexOf('Aucun fichier conservé')
    const suppression = BORD.indexOf('void supprimer(', note)
    expect(note, 'la note a disparu : la personne ne saura pas pourquoi « Revoir » manque').toBeGreaterThan(0)
    expect(
      suppression,
      'plus de suppression après la note : la ligne morte redevient impossible à retirer',
    ).toBeGreaterThan(note)
  })

  it('④ RIEN D’AUTRE N’EST CACHÉ PAR UNE CONDITION QUI NE LE CONCERNE PAS', () => {
    // L'AUDIT, FIGÉ EN CLIQUET : chaque action du tableau de bord, avec la
    // condition qui la garde. Une action neuve posée sous une condition
    // étrangère fera rougir, et le message dira laquelle.
    //
    // `adresseSite` sous `site.published` est VOULU : une adresse qui pointe
    // sur un brouillon rendrait 404. C'est une dépendance qui la concerne.
    const attendu: Readonly<Record<string, 'fichiers' | 'publie' | 'aucune'>> = {
      revoir: 'fichiers',
      publier: 'fichiers',
      telecharger: 'fichiers',
      supprimer: 'aucune',
      renommer: 'aucune',
      adresseSite: 'publie',
    }
    const region = regionDesFichiers()
    const trouvees = [...BORD.matchAll(/void (\w+)\(/gu)].map((m) => m[1])
    const actions = [...new Set(trouvees)].filter((a) => attendu[a] !== undefined || /^(supprimer|renommer|revoir|publier|telecharger|adresseSite)$/u.test(a))
    for (const a of actions) {
      const dansFichiers = region.includes(`void ${a}(`)
      expect(
        dansFichiers,
        `« ${a} » : attendu ${attendu[a] ?? '?'}, trouvé ${dansFichiers ? 'fichiers' : 'hors condition fichiers'}`,
      ).toBe(attendu[a] === 'fichiers')
    }
    // Et la liste n'a pas maigri en silence : six actions auditées.
    expect(actions.length, `actions auditées : ${actions.join(', ')}`).toBe(6)
  })
})
