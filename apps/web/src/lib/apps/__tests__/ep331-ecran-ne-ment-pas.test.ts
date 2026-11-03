/**
 * EP-331 · UN ÉCHEC ARRÊTE L'ANIMATION, ET SE DIT EN FRANÇAIS.
 *
 * ── CE QUI S'EST PASSÉ EN PRODUCTION LE 2026-11-03, 16h18 au Tchad.
 *
 * L'écran affichait « Load failed » — le message de WebKit quand un `fetch`
 * est coupé en route — sous une carte où le rond tournait toujours et où
 * CINQ ÉTAPES étaient cochées.
 *
 * Mesuré en base pendant ce temps :
 *
 *   15:18:45 UTC  site `la-boutika-…` écrit (mode 2, 4 pages)
 *   15:18:46 UTC  appel modèle facturé — 169 jetons entrée, 13 046 sortie
 *   15:22    UTC  capture d'écran : rond en rotation, « Load failed »
 *
 * LE SERVEUR AVAIT FINI DEPUIS TROIS MINUTES. Le travail a été fait et
 * payé ; seule la réponse s'est perdue.
 *
 * ── LES DEUX MENSONGES DE L'ÉCRAN, ET LEUR CAUSE EXACTE.
 *
 * ① LES CINQ COCHES NE MESURENT RIEN. Elles avancent sur un
 *    `setInterval(…, 8000)` : une étape toutes les huit secondes, quoi que
 *    fasse le serveur. Au bout de quarante secondes, cinq étapes sont
 *    « réussies » même si la requête est morte à la première.
 *
 * ② L'ANIMATION NE S'ARRÊTAIT JAMAIS. `setGenerating(false)` n'existait
 *    NULLE PART dans le fichier. Le `finally` remettait `loading` à faux et
 *    laissait `generating` à vrai — donc le rond tournait, et le minuteur
 *    continuait d'allumer les coches, indéfiniment.
 *
 * Ce cliquet ne corrige pas ①, qui demande un vrai suivi d'avancement
 * (chiffré, pas commencé). Il garde ce qui pouvait l'être aujourd'hui :
 * l'échec s'arrête, se dit, et propose un geste.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'

const ECRAN = lireSource(
  join(__dirname, '..', '..', '..', 'components', 'onboarding', 'OnboardingChat.tsx'),
)

describe('EP-331 · l’écran ne ment plus sur l’échec', () => {
  it('① L’ÉCHEC ÉTEINT L’ANIMATION ET LES FAUSSES COCHES', () => {
    // ── LE DÉFAUT EXACT : ce geste n'existait nulle part.
    expect(ECRAN, 'l’animation ne s’arrête jamais : le rond tournera après l’échec').toContain(
      'setGenerating(false)',
    )
    expect(ECRAN, 'les coches gardent leur avancement mensonger').toContain('setLoadingStep(0)')
    // ET DANS LE `finally`, pas seulement dans une branche heureuse : un
    // échec qui n'éteint que certains chemins rallume le mensonge ailleurs.
    const bloc = ECRAN.slice(ECRAN.indexOf('} finally {'), ECRAN.indexOf('} finally {') + 400)
    expect(bloc, 'l’arrêt n’est pas dans le `finally`').toContain('setGenerating(false)')
  })

  it('② LE MESSAGE DU NAVIGATEUR N’ARRIVE JAMAIS TEL QUEL À L’ÉCRAN', () => {
    // « Load failed », « Failed to fetch », « NetworkError » : trois
    // navigateurs, trois phrases anglaises, aucune destinée à être lue.
    expect(ECRAN, 'aucune traduction des coupures réseau').toMatch(/load failed/iu)
    expect(ECRAN, 'Chrome et Firefox ne sont pas couverts').toMatch(/failed to fetch/iu)
    expect(ECRAN, 'le message brut est encore affiché').not.toMatch(
      /setError\(err instanceof Error \? err\.message/u,
    )
  })

  it('③ ET IL DIT DE VÉRIFIER AVANT DE RELANCER — pas « réessayez »', () => {
    // ── LA LEÇON DU 2026-11-03, et elle coûte de l'argent si on l'oublie.
    //
    // Le serveur avait fini : la boutique existait. Dire « réessayez » tout
    // court en aurait créé une SECONDE, et facturé un second appel.
    expect(ECRAN, 'l’écran ne dit pas que la boutique existe peut-être déjà').toMatch(
      /peut-être été créée/u,
    )
    expect(ECRAN, 'aucun chemin vers la liste des boutiques').toMatch(/Voir mes boutiques/u)
    expect(ECRAN, 'aucun moyen de relancer').toMatch(/Réessayer/u)
    // ET LE REJEU SAIT QUOI REJOUER : un bouton qui ne rejoue rien est pire
    // qu'absent — il fait croire que le geste a eu lieu.
    expect(ECRAN, 'la tentative n’est pas retenue').toMatch(/setDerniereTentative\(\{ texte: text/u)
  })

  it('④ LE SERVEUR MÈNE LES COCHES, ET LE MINUTEUR NE LE DÉPASSE PAS', () => {
    // ── CE CONTRÔLE A CHANGÉ DE SENS LE JOUR PRÉVU.
    //
    // Sa première forme EXIGEAIT le minuteur de huit secondes et disait :
    // « le jour où l'avancement deviendra réel, ce contrôle rougira, et ce
    // sera exactement le bon moment pour relire cette prose. » Ce jour est
    // arrivé le même jour.
    //
    // Les coches sont maintenant pilotées par des jalons RÉELS envoyés dans
    // le fil. Le minuteur subsiste pour que l'écran ne paraisse pas figé
    // entre deux jalons distants — mais BORNÉ : jamais plus d'une étape
    // au-delà de ce que le serveur a confirmé. Il dit « on y travaille »,
    // plus jamais « c'est fait ».
    expect(ECRAN, 'aucun jalon réel ne pilote les coches').toMatch(/etapeReelle/u)
    expect(ECRAN, 'le plancher du serveur n’existe pas').toMatch(/const plancher = /u)
    // LE PLAFOND EST LA PROPRIÉTÉ : sans lui, le minuteur rejoue le mensonge.
    expect(ECRAN, 'le minuteur peut de nouveau dépasser le serveur').toMatch(
      /Math\.min\(LOADING_STEPS\.length - 1, plancher \+ 1\)/u,
    )
    // ET LE JALON SE REMET À ZÉRO AVEC LE RESTE : un plancher qui survit à
    // l'échec rallumerait des coches au prochain essai.
    expect(ECRAN, 'le jalon survit à l’échec').toMatch(/setEtapeReelle\(null\)/u)
  })

  it('⑤ LE FIL EST LU, ET UN FIL QUI SE TAIT N’EST PAS UN RÉSULTAT VIDE', () => {
    // ── LA FAUTE QUI AURAIT FAIT PAYER DEUX FOIS.
    //
    // Si le fil s'arrête sans `fin`, c'est une COUPURE. Le traiter comme un
    // résultat vide afficherait « Génération échouée » là où la boutique
    // existe peut-être — et le 2026-11-03, elle existait.
    expect(ECRAN, 'le client ne demande pas de flux').toMatch(/application\/x-ndjson/u)
    expect(ECRAN, 'aucun lecteur de fil').toMatch(/async function lireLeFil/u)
    expect(ECRAN, 'un fil interrompu n’est pas distingué d’un résultat').toMatch(
      /if \(fin === null\) throw new Error\(CONNEXION_PERDUE\)/u,
    )
    // ET LE REPLI EXISTE : si un intermédiaire retire l'en-tête, on relit du
    // JSON plutôt que d'échouer sur une réponse parfaitement valide.
    expect(ECRAN, 'aucun repli si le flux n’arrive pas').toMatch(/includes\('application\/x-ndjson'\)/u)
  })
})
