/**
 * EP-338 · UN REFUS DE RETOUCHE PROPOSE CE QUI MARCHE.
 *
 * ── CE QUI EST ARRIVÉ À UN PROPRIÉTAIRE LE 2026-11-04.
 *
 * Il décrit le barème réel de sa facture d'électricité : 85 F le kWh
 * jusqu'à 150, 125 F au-delà, plus 402 F fixes d'entretien. Trois lignes,
 * une vraie règle de métier — et sans elle son application affichait
 * 12 750 F au lieu de 13 277 F. Elle était donc inutile pour ce à quoi
 * elle sert.
 *
 * Réponse reçue, après paiement :
 *
 *   « le document PERIMETRE.md exclut explicitement la gestion de tranches
 *     tarifaires multiples au profit d'un seul tarif modifiable. »
 *
 * Un document écrit par le GÉNÉRATEUR LUI-MÊME, à la création, était
 * devenu une loi qui interdisait au propriétaire de corriger son
 * application.
 *
 *   « Un périmètre protège contre la dérive. Il ne décide pas de ce dont
 *     quelqu'un a besoin. »
 *
 * Et le texte gris sous le champ promettait « dites-le-moi et je vous
 * dirai si c'est possible autrement ». Il l'avait dit. Il n'y a eu aucun
 * autrement — juste un non, payé.
 *
 *   « Une promesse non tenue après paiement est pire qu'un silence. »
 *
 * ── CE QUE CE CLIQUET GARDE, ET CE QU'IL NE GARDE PAS.
 *
 * Il ne garde PAS que la retouche accepte tout : elle reste cosmétique, et
 * c'est une décision assumée. Il garde qu'un refus ne soit jamais un
 * cul-de-sac, et qu'il ne s'appuie jamais sur un document que la personne
 * ne connaît pas.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { CONSIGNE_RETOUCHE, PERIMETRE_RETOUCHE } from '../retouche'
import { lireSource } from './lire-source'

const SRC = join(__dirname, '..', '..', '..')

describe('EP-338 · le refus qui propose', () => {
  it('① LA CONSIGNE INTERDIT D’INVOQUER UN FICHIER DE L’APPLICATION', () => {
    expect(
      CONSIGNE_RETOUCHE,
      'rien n’interdit au modèle de citer un document interne comme une loi',
    ).toMatch(/NE CITE JAMAIS UN FICHIER/u)
    // ── ET ELLE DIT QUOI FAIRE À LA PLACE.
    //
    // Une interdiction sans contre-exemple se contourne par accident : le
    // modèle dirait « la configuration du projet l'exclut » et respecterait
    // la lettre. On lui montre donc les deux formes.
    expect(
      CONSIGNE_RETOUCHE,
      'l’interdiction n’est pas montrée : elle se contournera par accident',
    ).toMatch(/Exemple juste/u)
  })

  it('② LE PÉRIMÈTRE NE PROMET PLUS UN « AUTREMENT » QU’IL N’OFFRE PAS', () => {
    expect(
      PERIMETRE_RETOUCHE,
      'le texte gris promet encore de dire si c’est possible autrement',
    ).not.toMatch(/possible autrement/u)
    // ── LA PROPRIÉTÉ, PAS LE MOT (2026-11-05).
    //
    // Ce contrôle exigeait « régénérer » — la sortie du périmètre FERMÉ.
    // Le périmètre est ouvert depuis : la retouche change la logique et
    // ajoute des écrans, et il n'y a plus de régénération à proposer.
    //
    // Exiger le mot aurait fait rougir sur l'amélioration même qu'on
    // venait de livrer. C'est la quatrième fois cette semaine qu'une
    // garde fige un état du produit : on lit la propriété.
    //
    // LA PROPRIÉTÉ : le texte gris annonce ce que le produit FAIT
    // vraiment — ici, prévenir avant de toucher aux données. Et il le
    // fait : `phraseAvantMigration` arrête la modification tant que la
    // personne n'a pas lu ce qui arrivera.
    expect(PERIMETRE_RETOUCHE, 'le texte gris ne dit pas ce qui se passe').toMatch(
      /dira avant/u,
    )
    expect(
      lireSource(join(SRC, 'app', 'api', 'generateur', 'retoucher', 'route.ts')),
      'le texte gris promet un avertissement que la route ne donne pas',
    ).toMatch(/phraseAvantMigration\(plan, instantaneAvant\)/u)
  })

  it('③ L’ÉCRAN PROPOSE LA RÉGÉNÉRATION, DEMANDE DÉJÀ ÉCRITE', () => {
    const atelier = lireSource(join(SRC, 'app', 'atelier', '[id]', 'page.tsx'))
    // LE REFUS POSE LA PROPOSITION — pas seulement un message rouge.
    expect(atelier, 'un refus hors périmètre reste un cul-de-sac').toMatch(
      /horsPerimetre === true[\s\S]{0,200}setARegenerer\(/u,
    )
    // ── LA DEMANDE D'ORIGINE ET LA SIENNE VOYAGENT ENSEMBLE.
    //
    // N'emporter que son texte perdrait ce que l'application EST ; n'emporter
    // que l'origine perdrait la correction qu'il vient de décrire. Les deux,
    // ou il recopie à la main un texte qu'il vient d'écrire.
    expect(atelier, 'la demande d’origine ne voyage pas avec la correction').toMatch(
      /app\?\.demande[\s\S]{0,60}aRegenerer/u,
    )
    expect(atelier, 'la proposition ne mène nulle part').toMatch(
      /onboarding-chat\?demande=\$\{encodeURIComponent/u,
    )
  })

  it('④ ET LE CHAT BASCULE VRAIMENT — les DEUX états, pas un', () => {
    // ── LA MOITIÉ DE BASCULE, TROISIÈME FOIS DANS CE DÉPÔT.
    //
    // Les deux chemins existants posent `setDemandeBasculee` ET
    // `setCibleApplication`. Ma première forme n'en posait qu'un : la
    // demande arrivait, et la personne restait sur l'accueil — après avoir
    // payé un refus pour atterrir là.
    //
    // ── ET ELLE A CESSÉ D'ÊTRE UN EFFET (2026-11-04).
    //
    // Un effet pose l'état APRÈS le premier rendu : la personne voyait
    // l'accueil une fraction de seconde, puis l'écran basculait sous ses
    // yeux. L'état NAÎT maintenant juste — donc rien à rejouer, pas de
    // verrou à oublier, et la dette de lint n'a pas grossi d'un cran.
    const chat = lireSource(join(SRC, 'components', 'onboarding', 'OnboardingChat.tsx'))
    expect(chat, 'le chat ne reçoit plus la demande venue de l’adresse').toMatch(
      /demandeRecue/u,
    )
    // LES DEUX ÉTATS NAISSENT DE LA MÊME VALEUR : l'un sans l'autre
    // laisserait la personne sur l'accueil, ou sur un écran vide.
    expect(chat, 'l’écran ne bascule pas : la demande arrive et rien ne change').toMatch(
      /useState\(demandeRecue\.trim\(\) !== ''\)/u,
    )
    expect(chat, 'la demande reçue n’atteint pas l’écran suivant').toMatch(
      /useState\(demandeRecue\)/u,
    )
    // ET LA PAGE LA LIT VRAIMENT — sinon la propriété vaut toujours ''.
    const page = lireSource(join(SRC, 'app', 'onboarding-chat', 'page.tsx'))
    expect(page, 'la page ne lit pas la demande dans l’adresse').toMatch(
      /params\.get\('demande'\)/u,
    )
    expect(page, 'la demande lue n’est pas passée au chat').toMatch(/demandeRecue=\{/u)
  })
})
