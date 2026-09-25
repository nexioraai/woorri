// ============================================================
// CLIQUET — ON NE SUPPRIME PAS UNE BOUTIQUE DEPUIS LA LISTE DES AUTRES.
//
// SIGNALÉ PAR UN UTILISATEUR : « on peut supprimer par erreur, c'est trop
// risqué ». C'était exact, et la capture le montrait sans ambiguïté.
//
// ── LE DÉFAUT D'ORIGINE.
//
// La corbeille vivait dans la RANGÉE D'ACTIONS de la carte, en `flex-wrap`.
// Sur un téléphone cette rangée passe à la ligne : la corbeille se retrouvait
// SEULE sur une deuxième ligne, directement sous « Voir » — le bouton qu'on
// vise le plus souvent. Un pouce qui glisse d'un demi-centimètre tombe
// dessus.
//
// ── POURQUOI LA CONFIRMATION NE SUFFISAIT PAS.
//
// Elle existait déjà. Une boîte de dialogue qui surgit après un geste qu'on
// n'a pas voulu se valide aussi par réflexe : on appuie sur « OK » parce
// qu'on était en train d'appuyer. La bonne réponse n'était pas un
// avertissement de plus, c'était d'ÉLOIGNER le geste.
//
// ── ET POURQUOI LE PREMIER CORRECTIF NE SUFFISAIT PAS NON PLUS.
//
// Un menu « ⋯ » en haut de la carte éloignait du pouce, mais laissait la
// suppression à UN geste de la liste, sur l'écran qu'on ouvre le plus
// souvent. Elle vit désormais au BAS de la page d'édition de la boutique
// concernée, repliée, derrière un mot à taper — l'idiome que ce dépôt
// utilisait déjà pour la suppression de compte.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const lire = (...p: string[]) => readFileSync(join(process.cwd(), 'src', ...p), 'utf8')
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^[ \t]*\/\/.*$/gmu, '')

const DASHBOARD = sansCommentaires(lire('app', 'dashboard', 'page.tsx'))
const EDIT = sansCommentaires(lire('app', 'edit', '[slug]', 'page.tsx'))

describe('le tableau de bord ne peut plus supprimer quoi que ce soit', () => {
  it('AUCUN chemin de suppression n’y subsiste', () => {
    // LE CŒUR DE LA CORRECTION. Tant qu'un bouton d'effacement vit sur
    // l'écran qui liste TOUTES les boutiques, une erreur de visée détruit la
    // mauvaise. La suppression appartient à la page de la boutique concernée.
    for (const trace of ['handleDelete', 'Trash2', '/archive']) {
      expect(
        DASHBOARD.includes(trace),
        `« ${trace} » est revenu dans le tableau de bord : on pourrait à ` +
          `nouveau effacer une boutique depuis la liste de toutes les autres`,
      ).toBe(false)
    }
  })

  it('les actions utiles y sont TOUTES restées — on n’a rien perdu', () => {
    // La moitié qui empêche de « corriger » en vidant la carte.
    for (const attendu of ['dashboard.view', 'dashboard.edit', 'handlePublish']) {
      expect(DASHBOARD.includes(attendu), `${attendu} a disparu de la carte`).toBe(true)
    }
  })
})

describe('la suppression vit au bas de la page d’édition, derrière un mot', () => {
  it('la zone sensible existe et porte l’action', () => {
    expect(EDIT.includes("t('edit.dangerZone')"), 'aucune zone sensible').toBe(true)
    expect(EDIT.includes('supprimerLaBoutique'), 'la zone sensible ne supprime rien').toBe(true)
    expect(EDIT.includes('/archive'), 'l’appel d’archivage a disparu').toBe(true)
  })

  it('elle est REPLIÉE par défaut — rien de rouge ne s’offre au doigt', () => {
    expect(/zoneSensible\s*\]\s*=\s*useState\(false\)|useState\(false\)/u.test(EDIT)).toBe(true)
    expect(/!zoneSensible \?/u.test(EDIT), 'la zone n’est pas repliée par défaut').toBe(true)
  })

  it('le bouton reste DÉSACTIVÉ tant que le mot exact n’est pas tapé', () => {
    // Sans cette garde, on aurait déplacé le bouton sans rien protéger.
    expect(
      /disabled=\{motDeSuppression\.trim\(\) !== t\('edit\.deleteWord'\)/u.test(EDIT),
      'le bouton de suppression n’est plus conditionné au mot exact',
    ).toBe(true)
    // Et l'action elle-même revérifie : un bouton activé par l'inspecteur du
    // navigateur ne doit pas suffire.
    expect(
      /if \(motDeSuppression\.trim\(\) !== t\('edit\.deleteWord'\)\) return/u.test(EDIT),
      'l’action ne revérifie pas le mot : la garde ne tient qu’à l’affichage',
    ).toBe(true)
  })

  it('le motif d’un refus est RENDU, jamais avalé', () => {
    // Une boutique qu'on ne peut pas supprimer à cause de commandes en cours
    // doit le dire, sinon le marchand croit à une panne.
    expect(EDIT.includes('erreurSuppression'), 'aucun rendu d’erreur').toBe(true)
    expect(EDIT.includes("t('edit.deleteBlocked')"), 'le blocage pour commandes n’est pas expliqué').toBe(true)
  })

  it('le mot exigé est celui que le libellé ANNONCE, dans les quatre langues', () => {
    // Sans cette clé, l'arabe demanderait « حذف » et le code attendrait
    // « SUPPRIMER » : la suppression y serait impossible.
    const MOTS: Record<string, string> = { fr: 'SUPPRIMER', en: 'DELETE', es: 'ELIMINAR', ar: 'حذف' }
    for (const [langue, mot] of Object.entries(MOTS)) {
      const dict = lire('lib', 'translations', `${langue}.ts`)
      expect(dict.includes(`'edit.deleteWord': '${mot}'`), `${langue} : mot exigé manquant ou différent`).toBe(true)
      expect(dict.includes(mot), `${langue} : le libellé n’annonce pas le mot`).toBe(true)
      for (const cle of ['edit.dangerZone', 'edit.deleteSite', 'edit.confirmDelete', 'edit.deleteBlocked']) {
        expect(dict.includes(`'${cle}'`), `${langue} : ${cle} manquant`).toBe(true)
      }
    }
  })
})
