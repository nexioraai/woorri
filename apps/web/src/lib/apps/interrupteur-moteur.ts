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
 * ── LE DÉFAUT PAR DÉFAUT EST LE CONNU.
 *
 * Variable absente, vide, mal orthographiée, ou valant n'importe quoi : on
 * sert `air`. Un interrupteur qui bascule sur l'inconnu à la moindre faute
 * de frappe est un piège, pas une commande.
 */

export type Moteur = 'air' | 'direct'

/**
 * Quel moteur sert cette génération.
 *
 * FAIL-SAFE VERS LE CONNU : seule la valeur exacte `direct` bascule. Tout le
 * reste — `undefined`, `""`, `DIRECT`, `1`, `true` — rend `air`.
 */
export function moteurChoisi(valeur: string | undefined): Moteur {
  return valeur === 'direct' ? 'direct' : 'air'
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
