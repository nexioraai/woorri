// ============================================================
// CLIQUET — LA SUPPRESSION N'EST PAS DANS LA ZONE DU POUCE.
//
// SIGNALÉ PAR UN UTILISATEUR : « on peut supprimer par erreur, c'est trop
// risqué ». C'était exact, et la capture le montrait sans ambiguïté.
//
// La corbeille vivait dans la RANGÉE D'ACTIONS de la carte, en `flex-wrap`.
// Sur un téléphone, cette rangée passe à la ligne : la corbeille se
// retrouvait SEULE sur une deuxième ligne, directement sous « Voir » — le
// bouton qu'on vise le plus souvent. Un pouce qui glisse d'un demi-centimètre
// tombe dessus.
//
// Une confirmation existait déjà, et elle n'a pas suffi : une boîte de
// dialogue qui surgit après un geste qu'on n'a pas voulu se valide aussi par
// réflexe. La bonne réponse n'était pas d'ajouter un avertissement, c'était
// d'ÉLOIGNER le geste.
//
// Ce que ce cliquet garde :
//   · la suppression n'est plus dans la rangée d'actions ;
//   · elle est derrière un menu, donc deux gestes volontaires ;
//   · la confirmation reste — on n'échange pas une garde contre l'autre.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE = readFileSync(join(process.cwd(), 'src', 'app', 'dashboard', 'page.tsx'), 'utf8')
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^[ \t]*\/\/.*$/gmu, '')

/** Le bloc de la rangée d'actions : de son ouverture à sa fermeture. */
function rangeeDActions(): string {
  const i = CODE.indexOf('className="flex flex-wrap gap-2"')
  expect(i, 'rangée d’actions introuvable — instrument cassé').toBeGreaterThan(-1)
  // Elle se termine au `</div>` qui précède la fermeture de la carte ; on
  // prend une fenêtre large, largement suffisante pour la contenir.
  return CODE.slice(i, i + 2200)
}

describe('la corbeille a quitté la rangée d’actions', () => {
  it('la rangée d’actions ne contient AUCUN appel à la suppression', () => {
    // LE DÉFAUT EXACT : `flex-wrap` renvoyait la corbeille à la ligne, juste
    // sous « Voir ». La remettre ici la replacerait sous le pouce.
    const rangee = rangeeDActions()
    expect(
      rangee.includes('handleDelete'),
      'la suppression est revenue dans la rangée d’actions : sur un téléphone ' +
        'elle repassera à la ligne, directement sous « Voir »',
    ).toBe(false)
    expect(rangee.includes('Trash2'), 'la corbeille est revenue dans la rangée d’actions').toBe(false)
  })

  it('la rangée d’actions porte TOUJOURS les actions utiles — on n’a rien perdu', () => {
    // La moitié qui empêche de « corriger » en vidant la rangée.
    const rangee = rangeeDActions()
    expect(rangee.includes('dashboard.view'), '« Voir » a disparu').toBe(true)
    expect(rangee.includes('dashboard.edit'), '« Éditer » a disparu').toBe(true)
    expect(rangee.includes('handlePublish'), 'la publication a disparu').toBe(true)
  })
})

describe('la suppression demande deux gestes, et garde sa confirmation', () => {
  it('elle vit dans un menu, pas en accès direct', () => {
    expect(CODE.includes('role="menu"'), 'aucun menu : la suppression est en accès direct').toBe(true)
    const i = CODE.indexOf('role="menu"')
    const bloc = CODE.slice(i, i + 900)
    expect(bloc.includes('handleDelete'), 'la suppression n’est pas DANS le menu').toBe(true)
  })

  it('le menu se referme au clic extérieur ET à Échap', () => {
    // Un menu qui reste ouvert sous le doigt rend le geste suivant dangereux :
    // on aurait déplacé le risque au lieu de le retirer.
    expect(/addEventListener\('click'/u.test(CODE), 'le menu ne se referme pas au clic extérieur').toBe(true)
    expect(/'Escape'/u.test(CODE), 'le menu ne se referme pas à Échap').toBe(true)
  })

  it('la confirmation est TOUJOURS là', () => {
    // On n'échange pas une garde contre une autre : éloigner le geste ET
    // demander confirmation, les deux.
    expect(
      /confirm\(t\('dashboard\.confirmDelete'\)\)/u.test(CODE),
      'la confirmation a été retirée en même temps qu’on déplaçait le bouton',
    ).toBe(true)
  })

  it('les libellés du menu existent dans les QUATRE langues', () => {
    for (const langue of ['fr', 'en', 'es', 'ar']) {
      const dict = readFileSync(join(process.cwd(), 'src', 'lib', 'translations', `${langue}.ts`), 'utf8')
      for (const cle of ['dashboard.more', 'dashboard.delete']) {
        expect(dict.includes(`'${cle}'`), `${langue} : ${cle} manquant`).toBe(true)
      }
    }
  })
})
