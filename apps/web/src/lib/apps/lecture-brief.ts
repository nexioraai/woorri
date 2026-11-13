/**
 * LE RÉSULTAT DE LA LECTURE DU BRIEF — enregistré pour CHAQUE génération.
 *
 * ── MESURÉ (M6, docs/elite-protocol/evidence/generateur-2026-11-12) :
 * 34 générations sur 34 sans aucune trace de ce résultat. La lecture
 * échouait (M5 : 2 fois sur 3 sur des cahiers riches — réponse illisible,
 * JSON mal formé) et le pipeline continuait SANS TABLE, en silence : un
 * `catch` rendait `{ deduites: {} }`, indiscernable de « rien à déduire ».
 *
 * La lecture rend désormais un STATUT dans toutes ses branches ; le client
 * le transmet ; la route l'écrit dans `sections_acquises.lectureBrief`, en
 * succès comme en échec. Absent, il s'écrit `non_transmise` — jamais vide.
 *
 * ── CE QUE LA ROUTE PEUT CROIRE, ET CE QU'ELLE NE PEUT PAS.
 * Le statut vient du NAVIGATEUR : il est une DÉCLARATION, et la ligne le dit
 * (`source: 'client'`). Le nombre de tables REÇUES, lui, est compté par la
 * route sur ce qu'elle a validé : c'est le seul chiffre qu'elle atteste.
 */

/** Ce que la route `lire-brief` peut rendre. */
export const RESULTATS_LECTURE = ['reussie', 'illisible', 'json_casse', 'tronquee', 'erreur', 'demande_vide'] as const
export type ResultatLecture = (typeof RESULTATS_LECTURE)[number]

/** Rendu par `lire-brief`, transmis tel quel par le client. */
export type LectureBrief = {
  readonly resultat: ResultatLecture
  /** Le cahier dépassait 24 000 signes : la lecture n'en a vu que le début. */
  readonly entreeCoupee: boolean
  /** Tables sorties de la lecture (avant revalidation par la route). */
  readonly tables: number
}

/** Ce que la route écrit en base. */
export type LectureBriefEnregistree = {
  readonly resultat: ResultatLecture | 'non_transmise'
  readonly entreeCoupee: boolean | null
  readonly tablesLues: number | null
  /** Compté par la route sur les entités qu'elle a revalidées. */
  readonly tablesRecues: number
  readonly source: 'client' | 'absente'
}

/** Limite de lecture du cahier — la même que `lire-brief/route.ts`. */
export const SIGNES_LUS = 24_000

/**
 * Revalide ce que le navigateur prétend, et compose la ligne à écrire.
 * Une valeur douteuse ne devient JAMAIS un résultat : elle devient
 * `non_transmise`, et c'est dit.
 *
 * ── LE CHAMP S'APPELLE `resultat`, PAS `statut` (2026-11-12) : EP-310 relève
 * tout `statut: '…'` du code comme une écriture de la COLONNE `statut`, dont
 * la contrainte refuse ces valeurs. Ce n'est pas ce statut-là — le nommer
 * pareil était l'ambiguïté que ce cliquet existe pour empêcher.
 */
export function lectureAEnregistrer(brut: unknown, tablesRecues: number): LectureBriefEnregistree {
  const o = typeof brut === 'object' && brut !== null ? (brut as Record<string, unknown>) : null
  const resultat = o?.resultat
  if (o === null || typeof resultat !== 'string' || !(RESULTATS_LECTURE as readonly string[]).includes(resultat)) {
    return { resultat: 'non_transmise', entreeCoupee: null, tablesLues: null, tablesRecues, source: 'absente' }
  }
  return {
    resultat: resultat as ResultatLecture,
    entreeCoupee: typeof o.entreeCoupee === 'boolean' ? o.entreeCoupee : null,
    tablesLues: typeof o.tables === 'number' && Number.isInteger(o.tables) && o.tables >= 0 ? o.tables : null,
    tablesRecues,
    source: 'client',
  }
}
