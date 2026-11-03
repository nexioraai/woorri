/**
 * EP-334 · PENDANT QU'IL TRAVAILLE, QUELQUE CHOSE DE VRAI BOUGE.
 *
 * ── LA CAPTURE DU 2026-11-03, LTE FAIBLE.
 *
 * Une seule étape allumée, les cinq autres éteintes, et plus rien pendant
 * une minute. L'écran était enfin HONNÊTE — le plancher tenait, le minuteur
 * ne dépassait plus le serveur.
 *
 * Et c'était insuffisant : « une étape figée ressemble à une panne même
 * quand elle est honnête ».
 *
 * ── LA CAUSE, MESURÉE.
 *
 * Le premier jalon n'arrivait qu'APRÈS le modèle. Or l'appel principal est
 * DÉJÀ un flux côté fournisseur (`messages.stream(…).finalMessage()`) : on
 * ne le regardait simplement pas. Entre le début et la réponse — quarante à
 * quatre-vingt-dix secondes — le serveur n'avait rien à dire.
 *
 * ── CE QUI BOUGE MAINTENANT, ET POURQUOI ÇA NE PEUT PAS MENTIR.
 *
 * · le NOMBRE DE SIGNES écrits par le modèle, émis toutes les deux
 *   secondes. Il ne bouge que si le modèle écrit vraiment ; s'il se bloque,
 *   le nombre se fige.
 * · le TEMPS DEPUIS LE DERNIER SIGNE REÇU, remis à zéro par chaque
 *   battement. S'il monte, c'est que plus rien n'arrive.
 *
 * Un rond qui tourne ne prouve rien — il tournait aussi quand c'était mort.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'

const ROUTE = lireSource(join(__dirname, '..', '..', '..', 'app', 'api', 'chat', 'route.ts'))
const ECRAN = lireSource(
  join(__dirname, '..', '..', '..', 'components', 'onboarding', 'OnboardingChat.tsx'),
)

describe('EP-334 · la preuve de vie', () => {
  it('① UN JALON PART AVANT LE MODÈLE, PAS SEULEMENT APRÈS', () => {
    const iJalon = ROUTE.indexOf("progres('Rédaction de votre boutique…')")
    const iModele = ROUTE.indexOf('ia().messages.stream(mainCallParams)')
    expect(iJalon, 'aucun jalon avant la rédaction').toBeGreaterThan(0)
    expect(iModele, 'l’appel au modèle a changé de forme : ce contrôle ne situe plus rien')
      .toBeGreaterThan(0)
    expect(
      iJalon < iModele,
      'le premier jalon arrive encore APRÈS le modèle : l’écran restera figé',
    ).toBe(true)
  })

  it('② LE PROGRÈS VIENT DU MODÈLE LUI-MÊME, pas d’un minuteur', () => {
    // ── LA DIFFÉRENCE QUI FAIT TOUT.
    //
    // Un compteur local avancerait aussi quand le modèle est bloqué — ce
    // serait le minuteur de huit secondes, déguisé. Ici on s'abonne au flux
    // du fournisseur : le nombre ne bouge QUE si des signes arrivent.
    expect(ROUTE, 'le flux du modèle n’est pas écouté').toMatch(/fil\.on\('text'/u)
    expect(ROUTE, 'les signes ne sont pas comptés').toMatch(/signes \+= bout\.length/u)
    expect(ROUTE, 'le progrès n’est pas borné dans le temps : il inonderait le fil')
      .toMatch(/maintenant - dernier >= 2000/u)
    expect(ROUTE, 'le compte n’est pas dit à l’écran').toMatch(/signes écrits/u)
  })

  it('③ LA REPRISE SE DIT AUSSI — sinon l’écran se fige deux fois plus longtemps', () => {
    // Le retry sur `max_tokens` relance un appel complet. Muet, il doublait
    // le temps d'écran figé sans un mot.
    expect(ROUTE, 'la reprise est muette').toMatch(/progres\('Reprise/u)
    expect(
      (ROUTE.match(/ecrireAvecProgres\(\)/gu) ?? []).length,
      'la reprise n’est pas instrumentée comme le premier essai',
    ).toBeGreaterThanOrEqual(2)
  })

  it('④ L’ÉCRAN NE BOUGE QUE QUAND LE SERVEUR PARLE', () => {
    expect(ECRAN, 'le détail vivant n’existe pas').toMatch(/detailVivant/u)
    // LE COMPTEUR SE REMET À ZÉRO SUR UN SIGNE REÇU, pas sur une horloge :
    // c'est ce qui le rend incapable de mentir.
    // ── LES DEUX RAPPELS LE REMETTENT À ZÉRO, pas un seul.
    //
    // Ma première forme exigeait UNE occurrence. Une mutation qui en
    // retirait une sur deux restait verte : le compteur aurait continué de
    // monter pendant les battements, donc affiché « dernier signe il y a
    // 40 s » sur une connexion parfaitement vivante.
    expect(
      (ECRAN.match(/setDernierSigne\(Date\.now\(\)\)/gu) ?? []).length,
      'un des deux rappels ne remet pas le compteur à zéro',
    ).toBe(2)

    // ── LE BATTEMENT NE FAIT PAS AVANCER LES COCHES.
    //
    // On découpe le SECOND rappel passé à `lireLeFil` — celui des
    // battements — et on vérifie qu'il ne touche ni l'étape ni le détail.
    // Un battement qui allumerait une coche rejouerait le minuteur de huit
    // secondes sous un autre nom.
    const iAppel = ECRAN.indexOf('await lireLeFil(')
    expect(iAppel, 'l’appel au lecteur de fil a disparu : ce contrôle ne découpe plus rien')
      .toBeGreaterThan(0)
    const bloc = ECRAN.slice(iAppel, ECRAN.indexOf('if (!genData.ok', iAppel))
    const iSecond = bloc.lastIndexOf('() => {')
    expect(iSecond, 'le second rappel est introuvable').toBeGreaterThan(0)
    const rappelBattement = bloc.slice(iSecond)
    expect(rappelBattement, 'un battement fait avancer les coches').not.toMatch(
      /setEtapeReelle|setDetailVivant/u,
    )
    expect(rappelBattement, 'le battement ne prouve plus rien').toMatch(/setDernierSigne/u)
    expect(ECRAN, 'le battement n’est pas écouté').toMatch(/o\.t === 'battement'/u)
    // ET IL EST AFFICHÉ : une preuve de vie qu'on ne montre pas n'en est pas une.
    expect(ECRAN, 'le silence du serveur n’est pas montré').toMatch(/dernier signe il y a/u)
  })
})
