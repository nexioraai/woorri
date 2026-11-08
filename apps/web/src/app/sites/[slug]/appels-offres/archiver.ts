import { etatVisible, type AvisCycle } from './cycleDeVie'

// ============================================================
// LOT 5d — L'ARCHIVE DES CONSULTATIONS CLOSES.
//
// LE DEFAUT. Les avis clos restent TOUS sur /appels-offres, sous les avis en
// cours. Au bout de deux ans la page devient illisible, et ce qu'un
// fournisseur vient chercher -- ce a quoi il peut encore repondre -- se noie
// sous ce qui est fini.
//
// LA COUPURE EST L'ANNEE CIVILE, et c'est un choix de CACHE autant que de
// lisibilite : une page dont le contenu change tous les jours ne peut pas
// etre mise en cache, et un fournisseur qui revient une semaine plus tard ne
// retrouve pas ce qu'il avait vu. L'annee civile bouge UNE fois par an, a
// une date que tout le monde connait.
//
// ELLE SE DECIDE SUR L'ECHEANCE, PAS SUR LA PUBLICATION. Un avis publie en
// decembre dont la remise tombe en janvier n'est pas « de l'annee derniere ».
// C'est la meme lecon que le filtre : juger sur ce qui fait sens a l'ecran,
// pas sur la colonne la plus commode.
//
// RIEN NE DISPARAIT. L'archive est une AUTRE ADRESSE, pas une suppression :
// un marche public attribue reste consultable, c'est la raison d'etre du
// portail.
// ============================================================

/** L'annee qui range un avis. `null` quand aucune date ne permet de trancher. */
export function anneeDeClassement(a: AvisCycle): number | null {
  if (!a.remise_le) return null
  const d = new Date(a.remise_le)
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear()
}

/**
 * Partage les avis CLOS entre la page principale et l'archive.
 *
 * Un avis sans echeance exploitable reste sur la page principale : le
 * reléguer a l'archive serait le ranger dans une annee qu'on ne connait pas.
 * Mieux vaut une page un peu plus longue qu'un avis range au hasard.
 */
export function partagerArchive<T extends AvisCycle>(
  clos: T[],
  maintenant: Date
): { recents: T[]; archives: T[] } {
  const anneeCourante = maintenant.getUTCFullYear()
  const recents: T[] = []
  const archives: T[] = []
  for (const a of clos) {
    const an = anneeDeClassement(a)
    ;(an === null || an >= anneeCourante ? recents : archives).push(a)
  }
  return { recents, archives }
}

/** Les annees presentes dans l'archive, de la plus recente a la plus ancienne. */
export function anneesArchivees<T extends AvisCycle>(archives: T[]): number[] {
  const vues = new Set<number>()
  for (const a of archives) {
    const an = anneeDeClassement(a)
    if (an !== null) vues.add(an)
  }
  return [...vues].sort((x, y) => y - x)
}

/** Les avis d'une annee donnee. `null` rend toute l'archive. */
export function parAnnee<T extends AvisCycle>(archives: T[], annee: number | null): T[] {
  if (annee === null) return archives
  return archives.filter((a) => anneeDeClassement(a) === annee)
}

/** Lit l'annee demandee dans l'adresse. Tout ce qui n'est pas une annee presente → `null`. */
export function lireAnnee(brut: unknown, disponibles: number[]): number | null {
  const v = typeof brut === 'string' ? brut : Array.isArray(brut) ? brut[0] : undefined
  if (!v || !/^\d{4}$/.test(v)) return null
  const n = Number(v)
  return disponibles.includes(n) ? n : null
}

/** Un avis est-il CLOS au sens de l'ecran ? L'archive ne parle que de ceux-la. */
export function estClos(a: AvisCycle, maintenant: Date): boolean {
  const e = etatVisible(a, maintenant)
  return e === 'clos' || e === 'attribue'
}
