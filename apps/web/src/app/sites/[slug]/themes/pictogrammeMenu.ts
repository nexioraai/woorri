// ============================================================================
// LOT 15.1 / 15.7 — UN PICTOGRAMME PAR ENTRÉE DE MENU.
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
// CE FICHIER NOMME, IL NE DESSINE PAS. Le tracé est dans
// `PictogrammeMenu.tsx`. La séparation n'est pas de la mise en ordre : elle
// permet au cliquet d'énumérer les DEUX listes et d'exiger qu'elles
// coïncident — un nom sans dessin ne rendrait rien, et personne ne le
// verrait.
//
// ── CE QUI A CHANGÉ LE 2026-11-09, ET POURQUOI (LOT 15.7).
//
// La version du 15.1 renvoyait des CARACTÈRES — ▣ ◈ ▤ ◆. Mesuré en ligne,
// rendu Safari : des carrés gris. La police de la vitrine n'a pas de glyphe
// pour ces signes et sert sa forme la plus pauvre. Un pictogramme confié à
// la police du lecteur est un pari, pas un pictogramme.
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

/** Les dessins disponibles. Ajouter un nom ici EXIGE d'ajouter son tracé. */
export type NomDePictogramme =
  | 'maison'
  | 'immeuble'
  | 'activite'
  | 'colis'
  | 'camion'
  | 'document'
  | 'journal'
  | 'dossier'
  | 'telephone'
  | 'ecusson'
  | 'plan'
  | 'personne'

/**
 * La correspondance, FERMÉE.
 *
 * Les clés sont les racines de chemin que le générateur produit lui-même
 * pour un site institutionnel. Tout le reste ne reçoit rien.
 */
const PICTOGRAMMES: Record<string, NomDePictogramme> = {
  // L'accueil. Il n'est pas une page déclarée — c'est une ancre — mais les
  // quatre vitrines l'affichent dans la même barre, et une barre où une
  // entrée sur sept n'a pas d'icône se lit comme un oubli.
  accueil: 'maison',
  home: 'maison',

  // Qui l'organisation est
  'qui-sommes-nous': 'immeuble',
  'a-propos': 'immeuble',
  presentation: 'immeuble',

  // Ce qu'elle fait
  activites: 'activite',
  services: 'activite',
  missions: 'activite',

  // Ce qu'elle fournit
  catalogue: 'colis',
  produits: 'colis',

  // Ce qu'elle achète, et auprès de qui
  'appels-offres': 'document',
  marches: 'document',
  fournisseurs: 'camion',

  // Ce qu'elle publie
  actualites: 'journal',
  blog: 'journal',
  publications: 'journal',
  documents: 'dossier',
  ressources: 'dossier',

  // Comment la joindre
  contact: 'telephone',
  'nous-contacter': 'telephone',

  // Les pages de pied
  'mentions-legales': 'ecusson',
  confidentialite: 'ecusson',
  accessibilite: 'ecusson',
  'plan-du-site': 'plan',

  // LOT 17 — le compte du visiteur. Un buste : « moi, ici ».
  'espace-client': 'personne',
  'mon-compte': 'personne',
  connexion: 'personne',
  inscription: 'personne',
}

/**
 * Le nom du pictogramme d'une entrée, ou `null`.
 *
 * `null` est une réponse, pas un échec : l'appelant n'affiche alors rien,
 * et l'entrée garde son libellé seul.
 */
export function pictogrammeDe(chemin: string): NomDePictogramme | null {
  return PICTOGRAMMES[racine(chemin)] ?? null
}

/** Les racines reconnues. Exportée pour que le cliquet énumère au lieu de supposer. */
export const RACINES_RECONNUES = Object.keys(PICTOGRAMMES)
