// Types PURS du thème `institution` (lot 4b, 4c) — importables par le navigateur.
export type RubriqueInstitution = {
  chemin: string
  titre: string
  chapeau: string | null
  couleur: string
  image: string | null
  enfants: { chemin: string; titre: string }[]
}
/** Une entrée de la recherche interne : une page publiée, son titre et un extrait de son texte. */
export type EntreeRecherche = { chemin: string; titre: string; texte: string }
/** Une carte « Programmes en cours » : une sous-page publiée de « Projets ». */
export type ProgrammeInstitution = {
  chemin: string
  titre: string
  description: string | null
  image: string | null
  statut: string | null
  date: string | null
  bailleur: string | null
}
export type DonneesInstitution = {
  rubriques: RubriqueInstitution[]
  bandeau: string[]
  chiffres: { valeur: string; libelle: string }[]
  /** Le PROPRIÉTAIRE regarde (jeton d'aperçu vérifié, et c'est bien le sien) : les cases « À compléter » lui sont montrées. */
  proprietaire: boolean
  /** Lot 4c : la page est lue avec un cookie d'aperçu (propriétaire, ou sa « vue visiteur ») : l'enseigne passe par la route d'aperçu. */
  apercu?: boolean
  recherche?: EntreeRecherche[]
  programmes?: ProgrammeInstitution[]
}
