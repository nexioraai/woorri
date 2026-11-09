// ============================================================================
// LOT 15.1 — UN PICTOGRAMME PAR ENTRÉE DE MENU.
//
// EPSS en pose un devant chaque rubrique : maison, bâtiment, mégaphone,
// document, dossier, journal, téléphone. Ça aide à retrouver une rubrique
// sans relire tout le menu.
//
// IL SE DÉDUIT DU CHEMIN, et aucune colonne n'est ajoutée : les 42 sites en
// profitent le jour même, sans que personne ait à remplir quoi que ce soit.
//
// AUCUN PICTOGRAMME PLUTÔT QU'UN FAUX. La correspondance est FERMÉE et porte
// sur le PREMIER segment du chemin. Un chemin inconnu ne reçoit rien : une
// icône de téléphone sur une page qui n'est pas « contact » trompe le
// lecteur plus qu'elle ne l'aide, et il la croira.
//
// CE SONT DES CARACTÈRES, jamais une image à charger : rien à télécharger,
// rien qui manque si le réseau est lent.
// ============================================================================

/**
 * Le premier segment du chemin, en minuscules et sans accent.
 *
 * On range sur la RACINE : `activites/stockage` porte le pictogramme de
 * « activites ». Une sous-page appartient à sa rubrique, et lui donner une
 * icône différente casserait la lecture de la hiérarchie.
 */
function racine(chemin: string): string {
  return (chemin ?? '')
    .split('/')[0]
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * La correspondance, FERMÉE.
 *
 * Les clés sont les racines de chemin que le générateur produit lui-même
 * pour un site institutionnel. Tout le reste ne reçoit rien.
 */
const PICTOGRAMMES: Record<string, string> = {
  // Qui l'organisation est
  'qui-sommes-nous': '▣',
  'a-propos': '▣',
  presentation: '▣',

  // Ce qu'elle fait
  activites: '◈',
  services: '◈',
  missions: '◈',

  // Ce qu'elle fournit
  catalogue: '▤',
  produits: '▤',

  // Ce qu'elle achète
  'appels-offres': '◉',
  marches: '◉',
  fournisseurs: '◆',

  // Ce qu'elle publie
  actualites: '◰',
  blog: '◰',
  publications: '◰',
  documents: '▥',
  ressources: '▥',

  // Comment la joindre
  contact: '✆',
  'nous-contacter': '✆',

  // Les pages de pied
  'mentions-legales': '§',
  confidentialite: '§',
  accessibilite: '§',
  'plan-du-site': '⌗',
}

/**
 * Le pictogramme d'une entrée, ou `null`.
 *
 * `null` est une réponse, pas un échec : l'appelant n'affiche alors rien,
 * et l'entrée garde son libellé seul.
 */
export function pictogrammeDe(chemin: string): string | null {
  return PICTOGRAMMES[racine(chemin)] ?? null
}

/** Les racines reconnues. Exportée pour que le cliquet énumère au lieu de supposer. */
export const RACINES_RECONNUES = Object.keys(PICTOGRAMMES)
