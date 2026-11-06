// ============================================================
// A2 (b) -- LE CYCLE DE VIE VISIBLE D'UN AVIS DE MARCHE.
//
// L'ETAT AFFICHE N'EST PAS L'ETAT STOCKE, ET C'EST LA RAISON D'ETRE DE CE
// FICHIER. Un avis `ouvert` dont l'echeance est passee affichait « Ouvert » :
// sur un portail de marches, c'est une invitation a deposer une offre qui
// sera rejetee.
//
// ── CE QUI EST STOCKE NE BOUGE JAMAIS TOUT SEUL.
//
// Aucune bascule automatique de `etat` en base. Seul l'acheteur sait s'il a
// attribue ; une echeance depassee change ce qui est AFFICHE, jamais ce qui
// est ENREGISTRE. Deux autorites sur le meme champ divergent toujours, et
// celle qu'on lit n'est jamais celle qui decide.
//
// ── `maintenant` EST UN PARAMETRE, JAMAIS L'HORLOGE AMBIANTE.
//
// Une fonction qui lit `Date.now()` ne se teste pas : son cliquet passerait
// aujourd'hui et rougirait en decembre, et personne ne saurait pourquoi. Le
// moment se recoit, donc il se fixe dans un test.
// ============================================================

/** Les quatre etats VISIBLES. `clos` n'existe pas en base : il se derive. */
export type EtatVisible = 'preparation' | 'ouvert' | 'clos' | 'attribue'

/** Le strict necessaire pour trancher -- jamais l'avis entier. */
export type AvisCycle = { etat: string; remise_le: string | null }

/**
 * L'etat tel qu'il doit PARAITRE.
 *
 * Les regles, et ce qu'elles refusent de faire :
 *
 *   `attribue`  -> `attribue`. Terminal. L'echeance ne le concerne plus :
 *                  un marche attribue l'est, echeance passee ou non.
 *   `preparation` -> `preparation`. Une procedure non ouverte n'a pas
 *                  d'echeance opposable ; la faire « cloturer » serait
 *                  annoncer la fin de ce qui n'a pas commence.
 *   `ouvert` + echeance PASSEE   -> `clos`.
 *   `ouvert` + echeance a venir  -> `ouvert`.
 *   `ouvert` SANS echeance       -> `ouvert`. Une echeance absente n'est pas
 *                  une echeance depassee : les confondre fermerait un avis
 *                  que l'acheteur a laisse ouvert exprès.
 *
 * Un etat INCONNU se rend tel quel plutot que d'etre avale : si la base
 * gagnait un quatrieme etat, l'ecran le montrerait au lieu de mentir.
 */
export function etatVisible(avis: AvisCycle, maintenant: Date): EtatVisible | string {
  // UNE SEULE AUTORITÉ, UNE SEULE LIGNE. Seul `ouvert` dépend de l'échéance ;
  // tout autre état se rend tel quel — `attribue` parce qu'il est terminal,
  // `preparation` parce qu'on n'annonce pas la fin de ce qui n'a pas
  // commencé, et un état INCONNU parce qu'un écran qui avale ce qu'il ne
  // comprend pas ment mieux qu'il n'informe.
  //
  // La première rédaction nommait `attribue` et `preparation` dans un
  // `return` séparé, AVANT cette ligne. C'était une branche redondante : la
  // retirer ne changeait aucun comportement. Mesuré le 2026-11-06 en la
  // mutant — 43 tests verts, parce qu'il n'y avait rien à casser. Une branche
  // qu'aucune mutation ne peut faire rougir est une branche qu'aucun test ne
  // défend ; elle se supprime, elle ne se commente pas.
  if (avis.etat !== 'ouvert') return avis.etat

  if (avis.remise_le === null) return 'ouvert'
  const echeance = new Date(avis.remise_le)
  // Une date illisible n'est pas une date passee. Refermer un avis sur une
  // valeur qu'on n'a pas su lire serait exactement l'erreur qu'on traque :
  // confondre « rien a cet endroit » et « je n'ai rien pu lire ».
  if (Number.isNaN(echeance.getTime())) return 'ouvert'

  return echeance.getTime() <= maintenant.getTime() ? 'clos' : 'ouvert'
}

/** Un avis est-il ENCORE en cours pour un soumissionnaire ? */
export function estEnCours(e: EtatVisible | string): boolean {
  return e === 'ouvert' || e === 'preparation'
}

/**
 * Partage la liste en deux : ce qui est encore ouvert a une offre, et ce qui
 * ne l'est plus.
 *
 * LES AVIS PASSES RESTENT PUBLICS, ET C'EST UNE DECISION. Le site CPA affirme
 * « Les appels d'offres, attributions et rapports sont publies en acces libre
 * sur le site ». Retirer un avis cloture de la page tiendrait la moitie de
 * cette phrase et trahirait l'autre.
 *
 * ORDRES OPPOSES, POUR DEUX LECTURES OPPOSEES :
 *   en cours  -> echeance la plus PROCHE d'abord  (« quand dois-je remettre »)
 *   clotures  -> echeance la plus RECENTE d'abord (« qu'est-ce qui vient de
 *                se passer »)
 * Les avis sans echeance ferment chaque groupe : une absence ne se classe pas.
 */
export function partager<T extends AvisCycle>(
  avis: T[],
  maintenant: Date
): { enCours: T[]; clotures: T[] } {
  const enCours: T[] = []
  const clotures: T[] = []
  for (const a of avis) {
    (estEnCours(etatVisible(a, maintenant)) ? enCours : clotures).push(a)
  }
  const cle = (a: AvisCycle) => (a.remise_le === null ? null : new Date(a.remise_le).getTime())
  const trier = (xs: T[], sens: 1 | -1) =>
    xs.sort((x, y) => {
      const a = cle(x), b = cle(y)
      if (a === null && b === null) return 0
      if (a === null) return 1 // sans echeance : toujours en fin de groupe
      if (b === null) return -1
      return (a - b) * sens
    })
  return { enCours: trier(enCours, 1), clotures: trier(clotures, -1) }
}
