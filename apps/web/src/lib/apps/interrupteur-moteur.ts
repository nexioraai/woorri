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
 * LES DEUX MONDES SONT-ILS D'ACCORD ? (EP-306)
 *
 * ── PREMIERE VERSION, ET POURQUOI ELLE MENTAIT.
 *
 * Elle comparait `GENERATEUR_MOTEUR` et `NEXT_PUBLIC_GENERATEUR_MOTEUR`,
 * LUS TOUS DEUX COTE SERVEUR. Le proprietaire l'a corrigee le 2026-10-31 :
 * `NEXT_PUBLIC_*` est FIGE dans le paquet client au moment du build. La
 * valeur que l'ecran emploie est celle CUITE dans le JavaScript telecharge.
 * Changer le reglage chez l'hebergeur SANS REDEPLOYER laisse donc l'ecran
 * sur l'ancienne valeur — et l'ancienne version de ce controle aurait dit
 * « coherent ». Un faux vert, exactement la famille qu'on ferme.
 *
 * La comparaison porte desormais sur DEUX MONDES REELS, lus chacun LA OU IL
 * VIT : la valeur que le NAVIGATEUR a recue (lue dans la page publique
 * deployee, balise `deribfy-moteur-client`, posee par un composant client
 * dont la valeur est substituee a la compilation) et l'environnement
 * d'EXECUTION du serveur (lu par la sonde). Une version precedente gravait
 * cette valeur dans un fichier au build : elle deplacait le faux vert d'un
 * cran, puisque rien ne prouvait que l'hebergeur avait regenere.
 *
 * ── ET « ABSENTE » N'EST PAS « LUE ».
 *
 * Une variable absente tombe sur le fail-safe (EP-305 : `direct`). Ce n'est
 * pas une faute — le moteur servi reste le bon — mais ce n'est pas la meme
 * chose qu'une valeur posee, et les confondre rend le controle aveugle au
 * cas le plus courant : la variable oubliee. L'etat porte donc les deux.
 */
export type EtatInterrupteur = {
  readonly serveur: Moteur
  readonly client: Moteur
  readonly serveurPresente: boolean
  readonly clientCuitPresente: boolean
  readonly coherent: boolean
  readonly raison?: string
}

export function etatInterrupteur(
  valeurServeur: string | undefined,
  luClient: { readonly presente: boolean; readonly moteur: Moteur },
): EtatInterrupteur {
  const serveur = moteurChoisi(valeurServeur)
  const client = luClient.moteur
  const base = {
    serveur,
    client,
    serveurPresente: valeurServeur !== undefined,
    clientCuitPresente: luClient.presente,
  }
  if (serveur === client) return { ...base, coherent: true }
  return {
    ...base,
    coherent: false,
    raison:
      `Les deux mondes se contredisent : le serveur sert « ${serveur} » (execution), ` +
      `l'ecran appelle « ${client} » (cuit au build). Une generation lancee frappera une ` +
      'porte fermee. Alignez GENERATEUR_MOTEUR et NEXT_PUBLIC_GENERATEUR_MOTEUR chez ' +
      'l\'hebergeur, PUIS REDEPLOYEZ : changer le reglage sans redeployer ne change pas ' +
      "ce que l'ecran a recu.",
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
