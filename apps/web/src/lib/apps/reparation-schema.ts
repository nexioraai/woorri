/**
 * RÉPARER LE SCHÉMA SANS PAYER — ET SANS RIEN INVENTER.
 *
 * ── POURQUOI CE MODULE EXISTE.
 *
 * Un refus de schema fait tout perdre : le document n'est pas compilable,
 * donc rien n'est livre, et la boucle de reparation du moteur repaie des
 * appels pour un defaut qu'elle ne sait pas viser. MESURE le 2026-10-10 :
 * trois defauts `SCHEMA`, « stagnation au tour 2 : 3 → 3 », zero livre.
 *
 * Or une partie de ces defauts n'a besoin d'AUCUN modele pour etre corrigee.
 * Une cle inconnue, c'est une cle EN TROP : l'erreur dit exactement laquelle
 * et ou elle se trouve. La retirer est une operation de texte.
 *
 * ── LA LIMITE, POSEE EXPRES ET NON NEGOCIABLE.
 *
 * On ne traite QUE `unrecognized_keys`. Un champ requis absent, un type
 * faux, une enumeration violee : tout cela exigerait d'INVENTER une valeur
 * que personne n'a decidee. Le depot s'interdit d'inventer, et ce module
 * aussi. Ce qu'on ne sait pas retirer, on le laisse — et le refus reste un
 * refus, honnetement.
 *
 * Aucun appel reseau, aucun modele, aucun cout. Le validateur est INJECTE :
 * ce module ne connait pas `zod`, et se prouve avec un schema jouet.
 */

/** Une anomalie telle que `zod` la rend — mesure le 2026-10-11 :
 *  `{ code: "unrecognized_keys", path: ["sous"], keys: ["zzz"] }`. */
export type AnomalieSchema = {
  readonly code: string
  readonly path: readonly (string | number)[]
  readonly keys?: readonly string[]
}

export type Validation = {
  readonly success: boolean
  readonly issues: readonly AnomalieSchema[]
}

/**
 * LE NOMBRE DE PASSES. Retirer une cle peut en reveler une autre (un objet
 * imbrique n'est visite qu'une fois son parent accepte). Borne : une boucle
 * qui ne converge pas s'arrete au lieu de tourner.
 */
export const PASSES_MAX = 8

/** Descend un chemin dans un objet. Rend `null` si le chemin n'existe pas —
 *  on ne cree jamais ce qui manque. */
function descendre(racine: unknown, chemin: readonly (string | number)[]): Record<string, unknown> | null {
  let courant: unknown = racine
  for (const pas of chemin) {
    if (courant === null || typeof courant !== 'object') return null
    courant = (courant as Record<string | number, unknown>)[pas]
  }
  return courant !== null && typeof courant === 'object'
    ? (courant as Record<string, unknown>)
    : null
}

/**
 * @param document le document refuse, tel que le moteur l'a rendu
 * @param valider le juge — injecte, pour que les preuves n'aient besoin
 *                d'aucun vrai schema
 * @returns le document nettoye et la liste EXACTE de ce qui a ete retire —
 *          jamais un nettoyage muet : ce qui disparait se dit.
 */
export function retirerClesInconnues(
  document: unknown,
  valider: (d: unknown) => Validation,
): { readonly document: unknown; readonly retirees: readonly string[] } {
  if (document === null || typeof document !== 'object') {
    return { document, retirees: [] }
  }
  // COPIE : le document du moteur ne se modifie pas sous ses pieds.
  const copie = JSON.parse(JSON.stringify(document)) as unknown
  const retirees: string[] = []

  for (let passe = 0; passe < PASSES_MAX; passe++) {
    const v = valider(copie)
    if (v.success) break
    const inconnues = v.issues.filter(
      (i) => i.code === 'unrecognized_keys' && (i.keys?.length ?? 0) > 0,
    )
    if (inconnues.length === 0) break // plus rien de MECANIQUEMENT reparable

    let agi = false
    for (const anomalie of inconnues) {
      const hote = descendre(copie, anomalie.path)
      if (hote === null) continue
      for (const cle of anomalie.keys ?? []) {
        if (!(cle in hote)) continue
        delete hote[cle]
        retirees.push([...anomalie.path, cle].join('.'))
        agi = true
      }
    }
    if (!agi) break // aucune progression : on s'arrete plutot que boucler
  }

  return { document: copie, retirees }
}
