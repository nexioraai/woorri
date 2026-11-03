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
    // L'ancre ne porte PAS la parenthèse fermante : les jalons portent
    // maintenant un rang (`…', 1)`), et cette ancre-là a rendu -1 — le
    // piège du -1, dans mon propre cliquet. Il l'a dit, parce qu'il vérifie
    // son ancre avant de s'en servir.
    const iJalon = ROUTE.indexOf("progres('Rédaction de votre boutique…'")
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

  it('⑤ LE RANG VIENT DU SERVEUR — plus aucune correspondance de texte', () => {
    // ── LE DÉFAUT MESURÉ LE 2026-11-03, 20h27, LTE faible.
    //
    // Une étape allumée, cinq éteintes, « serveur actif » sous l'escalier.
    // La connexion vivait ; l'escalier était MORT.
    //
    // Le plancher valait `LOADING_STEPS.indexOf(etapeReelle)`. Mesuré :
    // TROIS jalons sur six n'étaient pas dans cette liste. `indexOf`
    // rendait -1, le plafond devenait `min(5, 0) = 0`, et l'escalier ne
    // pouvait plus jamais avancer.
    //
    // Troisième fois du -1 dans la journée — et celui-ci est né DANS la
    // correction du précédent. On supprime la classe : un RANG, pas une
    // chaîne à retrouver.
    expect(ROUTE, 'les jalons ne portent pas de rang').toMatch(/t: 'etape', texte: etape, rang/u)
    expect(ROUTE, 'le type du rappel ne porte pas le rang').toMatch(
      /type Progres = \(etape: string, rang: number\) => void/u,
    )
    // AUCUN JALON SANS RANG : un seul suffirait à refiger l'escalier.
    const sansRang = [...ROUTE.matchAll(/progres\((?:'[^']*'|`[^`]*`)\)/gu)].map((m) => m[0])
    expect(sansRang, 'un jalon est émis sans rang').toEqual([])

    expect(ECRAN, 'le client cherche encore le texte dans sa liste').not.toMatch(
      /LOADING_STEPS\.indexOf\(/u,
    )
    // ET LE PLANCHER NE RECULE JAMAIS : un jalon plus ancien, ou inconnu,
    // laisse l'escalier où il est.
    expect(ECRAN, 'le plancher peut reculer').toMatch(/rang > p \? rang : p/u)
  })

  it('⑥ L’INSTRUMENT QUI NE PEUT PAS SE BRANCHER LE HURLE', () => {
    // ── « Une tolérance muette est la même faute que tout le reste. »
    //
    // Le compteur est protégé par `typeof fil.on === 'function'` pour ne
    // jamais tuer la boutique. Mais se taire quand il saute fait perdre
    // EXACTEMENT l'information qu'il existait pour donner : l'écran
    // retombe sur « serveur actif » et on ne sait plus si le modèle écrit.
    const iGarde = ROUTE.indexOf("typeof fil.on !== 'function'")
    expect(iGarde, 'aucune branche ne traite l’instrument indisponible').toBeGreaterThan(0)
    const bloc = ROUTE.slice(iGarde, iGarde + 900)
    expect(bloc, 'l’écran n’apprend pas que le compteur est indisponible').toMatch(
      /compteur indisponible/u,
    )
    expect(bloc, 'le journal n’en garde aucune trace').toMatch(/alerter\(\{/u)
  })

  it('⑦ CHAQUE JALON PART AUSSI AU JOURNAL — sinon on ne peut rien relire', () => {
    // ── LA LACUNE MESURÉE LE 2026-11-03, une fois les journaux lisibles.
    //
    //   19:26:52.428  [Generation] Detected sector: shop | mode 2 | fr
    //                 ·········· 96 secondes, AUCUNE ligne ··········
    //   19:28:28.047  site écrit · 19:28:29.147  modèle facturé
    //
    // La génération a ABOUTI en 97 s. Mais pendant 96 d'entre elles, rien
    // dans les journaux ne disait où elle en était : les jalons partaient
    // dans le FLUX, donc vers l'écran et nulle part ailleurs.
    //
    // Quand l'écran se fige — ce qu'il faisait, à cause du -1 — il ne
    // reste RIEN à relire. Un instrument qui ne parle qu'à l'écran meurt
    // avec l'écran.
    const iEnvoi = ROUTE.indexOf("envoyer({ t: 'etape', texte: etape, rang })")
    expect(iEnvoi, 'le jalon ne part plus dans le flux').toBeGreaterThan(0)
    const rappel = ROUTE.slice(ROUTE.indexOf('const r = await traiter(req,'), iEnvoi)
    expect(rappel, 'le jalon ne part pas au journal : 96 s sans trace, c’est déjà arrivé')
      .toMatch(/console\.log\(/u)
    // ET IL PORTE LE TEMPS ÉCOULÉ : « jalon 1 » sans seconde ne dit pas si
    // la génération rame ou si elle vient de commencer.
    expect(rappel, 'le journal ne dit pas depuis combien de temps').toMatch(/Date\.now\(\) - t0/u)
    expect(rappel, 'le journal ne dit pas quel rang').toMatch(/String\(rang\)/u)
  })
})
