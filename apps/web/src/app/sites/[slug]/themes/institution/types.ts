// Types PURS du thème `institution` (lot 4b) — importables par le navigateur.
export type RubriqueInstitution = {
  chemin: string
  titre: string
  chapeau: string | null
  couleur: string
  image: string | null
  enfants: { chemin: string; titre: string }[]
}
export type DonneesInstitution = {
  rubriques: RubriqueInstitution[]
  bandeau: string[]
  chiffres: { valeur: string; libelle: string }[]
  /** Le propriétaire regarde (cookie d'aperçu de l'éditeur) : les cases « À compléter » lui sont montrées. */
  proprietaire: boolean
}
