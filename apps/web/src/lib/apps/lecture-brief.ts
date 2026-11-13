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
  /** Appels au modèle faits par la route : 1, ou 2 après la reprise unique (2b). */
  readonly tentatives?: number
}

/** Ce que la route écrit en base. */
export type LectureBriefEnregistree = {
  readonly resultat: ResultatLecture | 'non_transmise'
  readonly entreeCoupee: boolean | null
  readonly tablesLues: number | null
  /** Compté par la route sur les entités qu'elle a revalidées. */
  readonly tablesRecues: number
  readonly source: 'client' | 'absente'
  readonly tentatives: number | null
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
    return { resultat: 'non_transmise', entreeCoupee: null, tablesLues: null, tablesRecues, source: 'absente', tentatives: null }
  }
  return {
    resultat: resultat as ResultatLecture,
    entreeCoupee: typeof o.entreeCoupee === 'boolean' ? o.entreeCoupee : null,
    tablesLues: typeof o.tables === 'number' && Number.isInteger(o.tables) && o.tables >= 0 ? o.tables : null,
    tablesRecues,
    source: 'client',
    tentatives: typeof o.tentatives === 'number' && Number.isInteger(o.tentatives) && o.tentatives >= 0 ? o.tentatives : null,
  }
}

/**
 * LE MOT VISIBLE QUAND LA LECTURE N'A PAS ABOUTI — jamais silencieux (2b, 2026-11-13).
 *
 * MESURÉ (M10) : la réflexion du modèle mangeait la limite 2 fois sur 3, le
 * texte était coupé au milieu des tables, et la génération partait SANS TABLE
 * sans qu'un mot le dise. La route coupe la réflexion et reprend une fois
 * (M11 : reussie 6/6) ; si la reprise échoue encore, CETTE phrase s'affiche
 * avant que la génération parte. Signaler, pas bloquer : la règle « zéro
 * question avant de construire » reste.
 */
export function noteDeLecture(lecture: { readonly resultat: string; readonly tentatives?: number } | undefined): string {
  if (lecture === undefined || lecture.resultat === 'reussie' || lecture.resultat === 'demande_vide') return ''
  const fois = lecture.tentatives === undefined ? '' : ` (${String(lecture.tentatives)} tentative${lecture.tentatives > 1 ? 's' : ''})`
  const suite = ' La génération part sans les tables déduites du cahier — vous pourrez les ajouter dans l’atelier.'
  if (lecture.resultat === 'tronquee') return `Lecture du cahier incomplète : la réponse a été coupée avant la fin${fois}.${suite}`
  if (lecture.resultat === 'erreur') return `Lecture du cahier impossible : le service de lecture n’a pas répondu.${suite}`
  return `Lecture du cahier incomplète : rien d’exploitable n’a pu être lu${fois}.${suite}`
}
