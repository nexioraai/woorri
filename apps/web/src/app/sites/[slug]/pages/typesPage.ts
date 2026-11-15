// Types PURS (aucune lecture) — 2026-11-15. Séparés du module de lecture, qui est
// serveur (lecteurDuSite) : un composant navigateur peut les importer sans
// faire entrer un module `server-only` dans son graphe (cliquet DEBT-081).
import type { Bloc } from './blocs'

export type PageSite = {
  chemin: string
  parent: string | null
  titre: string
  chapeau: string | null
  corps: string | null
  maj_le: string | null
  /** LOT 4 — le corps STRUCTURE. `[]` tant que la colonne n'est pas posee. */
  blocs: Bloc[]
}

export type EntreeMenu = {
  chemin: string
  parent: string | null
  titre: string
  ordre: number
}
