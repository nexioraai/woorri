/**
 * L'INTERRUPTEUR — UNE SEULE PORTE ATTEIGNABLE À LA FOIS.
 *
 * ── CE QUE LE PROPRIÉTAIRE A EXIGÉ, LE 2026-10-18, ET POURQUOI IL A RAISON.
 *
 * « il faut que un soit accessible depuis interface le temps tester ce qui
 * est accessible l'autre ne doit pas etre accessible en meme temps ».
 *
 * Deux boutons côte à côte auraient été plus simples à écrire et bien pires
 * à vivre : on aurait fini par ne plus savoir quel moteur a produit quoi.
 * Treize tirs et 66 $ ont déjà été dépensés sans pouvoir attribuer un
 * résultat ; on ne recommence pas.
 *
 * ── LES DEUX MOTEURS, ET AUCUN N'EST SUPPRIMÉ.
 *
 *   `air`     — l'architecture choisie en août (D-001). L'IA écrit un
 *               DOCUMENT, un compilateur déterministe en fait du code.
 *   `direct`  — l'autre option de D-001, écartée alors, mise à l'épreuve
 *               maintenant. L'IA écrit le CODE, le compilateur lui répond.
 *
 * Celui qui n'est pas choisi reste EN PLACE, intact, simplement inerte. Si
 * l'épreuve échoue, on remet l'interrupteur et rien n'a bougé.
 *
 * ── LE DÉFAUT PAR DÉFAUT EST LE CONNU — ET LE CONNU A CHANGÉ DE CAMP.
 *
 * Règle d'origine, juste : variable absente, vide ou mal orthographiée → on
 * sert le moteur CONNU-BON. Le 2026-10-18, c'était `air`.
 *
 * MESURÉ LE 2026-10-31 : `air` est éteint depuis le 30, son dernier tir a
 * ÉCHOUÉ, toute la production tourne sur `direct` (preuve de comportement :
 * la route directe rend 409 si l'interrupteur n'est pas sur `direct`, et
 * elle a rendu 200), et les cinq juges d'acceptation ne vivent QUE sur le
 * chemin direct. Mesuré aussi, en exerçant la fonction : `undefined`, `""`,
 * `"DIRECT"`, `"dirct"` tombaient TOUS sur le moteur mort — une faute de
 * casse chez l'hébergeur aurait suffi à y renvoyer la production.
 *
 * La règle n'a pas bougé ; les faits ont bougé. Le défaut tombe donc
 * désormais sur `direct`, et c'est `air` qui demande une intention EXACTE —
 * il reste atteignable, intact : on remet l'interrupteur et rien n'a bougé.
 */

export type Moteur = 'air' | 'direct'

/**
 * Quel moteur sert cette génération.
 *
 * FAIL-SAFE VERS LE VIVANT (EP-305) : seule la valeur exacte `air` atteint
 * l'architecture par document. Tout le reste — `undefined`, `""`, `AIR`,
 * `dirct`, `true` — rend `direct`, le moteur que la production sert.
 */
export function moteurChoisi(valeur: string | undefined): Moteur {
  return valeur === 'air' ? 'air' : 'direct'
}

/**
 * CE QUE L'ÉCRAN DIT DE LUI-MÊME.
 *
 * Pendant l'épreuve, la personne doit savoir quel moteur travaille — sinon
 * elle juge un résultat sans savoir qui l'a produit, et c'est exactement ce
 * qui a rendu les treize tirs précédents illisibles.
 *
 * Le texte ne nomme pas les architectures : « air » et « direct » sont du
 * vocabulaire de moteur, pas du français.
 */
export function direLeMoteur(m: Moteur): string {
  return m === 'direct'
    ? 'Écriture directe — version à l’essai'
    : 'Construction par document — version habituelle'
}

/**
 * LE REFUS SYMÉTRIQUE — la porte de l'ANCIEN moteur, quand le nouveau sert.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-19.
 *
 * Le propriétaire avait posé la règle le 2026-10-18 : « il faut que un soit
 * accessible depuis interface le temps tester ; ce qui est accessible,
 * l'autre ne doit pas être accessible en même temps ».
 *
 * J'ai fermé LA PORTE D'ENTRÉE : la route d'écriture directe refuse si
 * l'interrupteur n'est pas sur `direct`. Je n'ai pas fermé les PORTES DE
 * SERVICE. Cinq routes de l'ancien moteur ne consultaient pas l'interrupteur,
 * et l'écran affichait toujours son panneau de suivi avec, dessus, un bouton
 * « Relancer la génération ».
 *
 * Ce bouton appelle `travailleur.relancer(...)`. Coût mesuré d'une émission
 * AIR complète : 8,46 $.
 *
 * C'est le défaut de la veille, à l'identique : boucher un chemin et déclarer
 * la chose close. Un interrupteur qui ne ferme qu'un côté n'est pas un
 * interrupteur — c'est une préférence.
 *
 * ── CE QUE CETTE FONCTION NE FAIT PAS.
 *
 * Elle ne touche PAS au cron. Celui-ci ne DÉMARRE rien : il fait avancer une
 * émission déjà en cours. Le bloquer abandonnerait un travail en vol, alors
 * que le but est d'empêcher d'en LANCER un nouveau.
 */
/**
 * LES DEUX RÉGLAGES SONT-ILS D'ACCORD ? (EP-306)
 *
 * ── LE DÉFAUT, SOULEVÉ PAR LE PROPRIÉTAIRE LE 2026-10-31.
 *
 * L'interrupteur a DEUX réglages chez l'hébergeur : `GENERATEUR_MOTEUR`
 * (lu par le serveur) et `NEXT_PUBLIC_GENERATEUR_MOTEUR` (lu par l'écran,
 * figé au build). RIEN ne force leur égalité — on en change un, on oublie
 * l'autre, et les deux moitiés du produit partent sur deux moteurs.
 *
 * MESURÉ : les deux portes refusent bien (EP-281 tient), donc rien ne
 * DÉPENSE à tort. Le défaut n'est pas une fuite : c'est une IMPASSE MUETTE.
 * L'écran frappe à une porte que le serveur a fermée, la personne lit
 * « cette version n'est pas active » sans avoir rien fait de mal, et le
 * produit paraît cassé alors qu'il se protège.
 *
 * Cette fonction NOMME la divergence pour qu'elle se dise — à la sonde, au
 * démarrage, partout où quelqu'un regarde. Un défaut de configuration qui
 * ne se raconte pas se découvre par un acheteur.
 */
export function coherenceInterrupteur(
  valeurServeur: string | undefined,
  valeurEcran: string | undefined,
): { readonly raison: string } | null {
  const serveur = moteurChoisi(valeurServeur)
  const ecran = moteurChoisi(valeurEcran)
  if (serveur === ecran) return null
  return {
    raison:
      `Les deux réglages du moteur se contredisent : le serveur sert « ${serveur} », ` +
      `l'écran appelle « ${ecran} ». Une génération lancée frappera une porte fermée. ` +
      'Alignez GENERATEUR_MOTEUR et NEXT_PUBLIC_GENERATEUR_MOTEUR chez l’hébergeur.',
  }
}

export function refusSiPasAir(): { readonly raison: string } | null {
  if (moteurChoisi(process.env.GENERATEUR_MOTEUR) === 'air') return null
  return {
    raison:
      'Cette version du générateur n’est pas active. ' +
      'Une autre architecture est en cours d’essai, et deux moteurs joignables ' +
      'en même temps rendraient tout résultat inattribuable.',
  }
}
