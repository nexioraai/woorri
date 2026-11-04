/**
 * EP-335 · ZÉRO QUESTION AVANT DE CONSTRUIRE.
 *
 * ── LA DÉCISION, DANS LES MOTS DU PROPRIÉTAIRE (2026-11-04).
 *
 *   « ON ARRÊTE DE RENDRE LES QUESTIONS MEILLEURES. ON LES SUPPRIME. »
 *   « Une hypothèse ratée se corrige. Une interrogation avant d'avoir rien
 *     montré fait fuir. »
 *
 * Trois tours de suite, on a amélioré la PERTINENCE des questions de
 * pré-vol — jusqu'à les faire écrire par le modèle. Ce n'était pas la
 * demande. La demande était : qu'il n'y en ait aucune.
 *
 * ── CE QUI REMPLACE LA QUESTION SUR LA DEVISE.
 *
 * Une déduction, et un défaut annoncé. Le pays s'il est écrit dans la
 * demande, sinon le franc CFA. Ce n'est pas une devinette sur la personne
 * — celles-là restent interdites — c'est un DÉFAUT, et il se change dans
 * l'atelier en deux secondes comme le reste.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'

const ECRAN = lireSource(
  join(__dirname, '..', '..', '..', 'components', 'onboarding', 'ConversationApplication.tsx'),
)
const ACCUEIL = lireSource(
  join(__dirname, '..', '..', '..', 'components', 'onboarding', 'OnboardingChat.tsx'),
)

describe('EP-335 · zéro question', () => {
  it('① LE PREMIER TOUR CONSTRUIT, il ne demande rien', () => {
    // ── LA PROPRIÉTÉ : entre la phrase de la personne et `construire`, il
    //    ne doit RIEN y avoir qui pose une question.
    const iPremier = ECRAN.indexOf("setDemandeEnAttente(texte)")
    expect(iPremier, 'le premier tour a changé de forme : ce contrôle ne situe plus rien')
      .toBeGreaterThan(0)
    const bloc = ECRAN.slice(iPremier, iPremier + 1400)
    expect(bloc, 'le premier tour ne construit pas').toMatch(/await construire\(\{/u)
    expect(bloc, 'le premier tour pose encore une question').not.toMatch(/setQuestionAvant\(\w/u)
  })

  it('② AUCUN CHEMIN N’AFFICHE PLUS DE QUESTION', () => {
    // ── ON COMPTE CE QUI EN POSE, pas ce qui en efface.
    //
    // `setQuestionAvant(null)` ferme ; `setQuestionAvant(q)` ouvre. Seuls
    // les seconds comptent, et il ne doit plus y en avoir aucun.
    const ouvrent = [...ECRAN.matchAll(/setQuestionAvant\(([^)]*)\)/gu)]
      .map((m) => m[1]?.trim() ?? '')
      .filter((x) => x !== 'null')
    expect(ouvrent, 'un chemin affiche encore une question avant de construire').toEqual([])
  })

  it('③ LA DEVISE SE DÉDUIT, AVEC UN DÉFAUT ANNONCÉ', () => {
    expect(ECRAN, 'aucune déduction de configuration').toMatch(/deduireConfiguration/u)
    expect(ECRAN, 'aucun défaut de devise').toMatch(/DEVISE_PAR_DEFAUT = 'XAF'/u)
    // ── ET LA DÉDUCTION NE PEUT PAS EMPÊCHER DE CONSTRUIRE.
    //
    // Deux appels réseau pour une devise : s'ils échouent, on construit
    // quand même avec le défaut. Une commodité qui bloque la construction
    // serait pire que pas de commodité.
    const i = ECRAN.indexOf('const deduireConfiguration')
    const bloc = ECRAN.slice(i, ECRAN.indexOf('\n  const ', i + 40))
    expect(bloc, 'une panne de déduction empêcherait de construire').toMatch(
      /catch \{[\s\S]{0,120}DEVISE_PAR_DEFAUT/u,
    )
  })

  it('④ LE TEXTE TAPÉ SUIT LA PERSONNE À TRAVERS L’AIGUILLAGE', () => {
    // ── LE DÉFAUT SIGNALÉ LE 2026-11-04.
    //
    // La personne écrivait sa demande, l'aiguillage la basculait vers
    // l'écran des applications, et ELLE DEVAIT TOUT RETAPER : le composant
    // ne recevait que `onRetour`.
    // ── LES DEUX CHEMINS, pas l un des deux.
    //
    // On bascule de DEUX façons : l aiguillage automatique quand le modèle
    // reconnaît une application, et le bouton « Application ». Une
    // assertion qui se contente d une occurrence laissait passer la
    // mutation qui retirait la première — et c est justement celle du
    // défaut signalé.
    // ── ET LA PROPRIÉTÉ, PAS LE NOMBRE (2026-11-04).
    //
    // `toBe(2)` a rougi en ajoutant un TROISIÈME chemin — celui qui reçoit
    // la demande par l'adresse, quand l'atelier propose une régénération
    // après un refus de retouche. La propriété n'était pas « il y a deux
    // chemins » : c'était « aucun chemin ne bascule sans emporter le
    // texte ». Un nombre gelé rougit quand on en ajoute un JUSTE, et reste
    // vert si on en casse un.
    //
    // On compare donc les deux comptes. Ajouter une bascule muette fait
    // rougir ; en ajouter une complète ne fait rien.
    const bascules = (ACCUEIL.match(/setCibleApplication\(true\)/gu) ?? []).length
    const textes = (ACCUEIL.match(/setDemandeBasculee\(/gu) ?? []).length
    expect(bascules, 'plus aucun chemin ne bascule vers les applications').toBeGreaterThanOrEqual(2)
    expect(
      textes,
      `${String(bascules)} chemin(s) basculent et ${String(textes)} emportent le texte : ` +
        'un chemin bascule sans la demande, et la personne doit tout retaper',
    ).toBe(bascules)
    expect(ACCUEIL, 'le texte n’est pas transmis à l’écran suivant').toMatch(
      /demandeInitiale=\{demandeBasculee\}/u,
    )
    expect(ECRAN, 'l’écran des applications ne reçoit pas la demande').toMatch(
      /demandeInitiale\?: string/u,
    )
    // ET ELLE PART TOUTE SEULE, UNE SEULE FOIS : un effet qui relance une
    // génération payante à chaque rendu coûterait de l'argent en silence.
    expect(ECRAN, 'la demande transmise reste affichée sans rien faire').toMatch(
      /demarrage\.current = true/u,
    )
  })

  it('⑤ AUCUNE PHRASE EN DUR N’AFFIRME QUE LES DONNÉES NE SE CONSERVENT PAS', () => {
    // ── LA PHRASE QUI A MENTI CONTRE NOUS.
    //
    // « Les écrans ne s'en servent pas encore : ce que vous saisissez
    // disparaît quand la page est rechargée. » Vraie le 2026-11-02, FAUSSE
    // depuis D5 ④ — mesuré le 2026-11-03 : un membre inscrit depuis le
    // formulaire de l'œuvre, retrouvé après rechargement dans un processus
    // neuf.
    //
    // Personne ne l'avait relue. Une phrase écrite en dur qui affirme un
    // état du produit est un mensonge en attente.
    const source = lireSource(join(__dirname, '..', 'entites-declarees.ts'))
    expect(source, 'la phrase ment de nouveau sur la conservation').not.toMatch(
      /disparaît quand la page est rechargée/u,
    )
    expect(source, 'la phrase ment de nouveau sur les écrans').not.toMatch(
      /ne s’en servent pas encore/u,
    )
    // ET ELLE DIT CE QUI EST VRAI, mesuré : les écrans s'en servent.
    expect(source, 'la phrase ne dit plus ce que font les écrans').toMatch(
      /les écrans s’en servent/u,
    )
  })
})
