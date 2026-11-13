/**
 * LA LECTURE DU BRIEF — ce qu'on en enregistre, et ce qu'on en fait.
 *
 * ── LE RÉSULTAT, ENREGISTRÉ POUR CHAQUE GÉNÉRATION (étape 1, M6).
 * 34 générations sur 34 sans aucune trace de ce résultat : la lecture
 * échouait (M5 : 2 fois sur 3 sur des cahiers riches) et le pipeline
 * continuait SANS TABLE, en silence. La route rend désormais un résultat dans
 * toutes ses branches ; le client le transmit ; la route de génération
 * l'écrit, en succès comme en échec. Absent, il s'écrit `non_transmise`.
 *
 * ── PAR TRANCHES, SANS BORNE DE LECTURE (G30 élargi, 2026-11-13).
 * La lecture coupait le cahier à 24 000 signes (`entreeCoupee`, muet pour la
 * personne). Un client qui apporte un cahier de deux cents pages est le
 * meilleur client possible : il ne doit JAMAIS lire qu'il a trop écrit. Le
 * cahier est découpé en tranches à des frontières de paragraphes ; chaque
 * tranche est lue par le même appel ; les lectures sont FUSIONNÉES. Le seul
 * garde-fou est un fusible anti-abus côté serveur, de l'ordre du méga-octet,
 * invisible en usage normal.
 *
 * ── LE COÛT DE LA LECTURE EST MESURÉ, JAMAIS ESTIMÉ (G30, 2026-11-13).
 * La preuve `9cc16d10` a dû écrire « lecture : ordre de 0,005 $ — estimation,
 * pas mesure » : rien n'enregistrait ce que la lecture avait coûté. La route
 * `lire-brief` compte désormais les jetons de CHAQUE appel (tranches et
 * reprises comprises) et les tarife à l'heure de l'appel, comme la route de
 * génération ; le montant voyage avec le résultat et s'écrit dans la ligne.
 *
 * ── CE QUE LA ROUTE PEUT CROIRE, ET CE QU'ELLE NE PEUT PAS.
 * Le résultat vient du NAVIGATEUR : c'est une DÉCLARATION, et la ligne le dit
 * (`source: 'client'`). Le nombre de tables REÇUES, lui, est compté par la
 * route sur ce qu'elle a validé : c'est le seul chiffre qu'elle atteste.
 */

/** Ce que la route `lire-brief` peut rendre comme résultat. */
export const RESULTATS_LECTURE = ['reussie', 'illisible', 'json_casse', 'tronquee', 'erreur', 'demande_vide'] as const
export type ResultatLecture = (typeof RESULTATS_LECTURE)[number]

/** Taille d'une tranche de lecture — PAS une borne : au-delà, on lit la suivante. */
export const TAILLE_TRANCHE = 24_000

/**
 * LE FUSIBLE ANTI-ABUS, côté serveur, de l'ordre du méga-octet.
 * Il n'apparaît nulle part dans l'interface : aucun compteur, aucun message
 * de longueur. Un cahier de deux cents pages (≈ 400 000 signes) passe.
 */
export const FUSIBLE_SIGNES = 1_000_000

/**
 * CE QU'UNE TRANCHE A DONNÉ, pour que la ligne dise d'où vient chaque chose.
 * Mesuré (tir de la découpe, 2026-11-13) : le nom retenu venait de la 2ᵉ
 * tranche, et rien ne disait ce que la 1ʳᵉ avait proposé ni pourquoi c'était
 * refusé. `nomRefuse` garde le nom que la validation a écarté (80 signes).
 */
export type TrancheLue = {
  readonly signes: number
  readonly tentatives: number
  readonly resultat: 'reussie' | 'illisible' | 'tronquee' | 'json_casse'
  readonly tables: number
  readonly nom: string | null
  readonly nomRefuse: string | null
  readonly ecrans: number
  readonly roles: number
  readonly questionsOuvertes: number
}

/** Rendu par `lire-brief`, transmis tel quel par le client. */
export type LectureBrief = {
  readonly resultat: ResultatLecture
  /** Tables sorties de la lecture fusionnée (avant revalidation par la route). */
  readonly tables: number
  /** Appels au modèle, toutes tranches et reprises comprises. */
  readonly tentatives: number
  /** Tranches lues ; 0 pour une demande vide. */
  readonly tranches: number
  /** Tranches dont la lecture n'a pas abouti après la reprise unique. */
  readonly tranchesEchouees: number
  /** Signes effectivement soumis au modèle : la longueur entière du cahier. */
  readonly signesLus: number
  /** Ce que la lecture a coûté, en dollars, sur l'usage RENDU par le modèle et au tarif de l'heure — jamais une estimation. */
  readonly coutUsd: number
  /** Jetons consommés, toutes tranches et reprises comprises (entrée = lus + relus en cache). */
  readonly jetons: { readonly entree: number; readonly sortie: number }
  /** Tranche par tranche, dans l'ordre de lecture. */
  readonly parTranche: readonly TrancheLue[]
  readonly roles: readonly string[]
  readonly ecrans: readonly string[]
  /** Ce que le cahier lui-même laisse à décider — pas d'affichage encore (étape intention). */
  readonly questionsOuvertes: readonly string[]
  /** Le chemin principal, en noms d'écrans lus (3c-2). */
  readonly parcours?: readonly string[]
  /** Les contraintes fermées, lues telles quelles (3c-2, correction 3). */
  readonly langues?: readonly string[]
  readonly devises?: readonly string[]
  readonly moyensPaiement?: readonly string[]
  readonly pays?: readonly string[]
}

/** Ce que la route de génération écrit en base. */
export type LectureBriefEnregistree = {
  readonly resultat: ResultatLecture | 'non_transmise'
  readonly tablesLues: number | null
  /** Compté par la route sur les entités qu'elle a revalidées. */
  readonly tablesRecues: number
  readonly source: 'client' | 'absente'
  readonly tentatives: number | null
  readonly tranches: number | null
  readonly tranchesEchouees: number | null
  readonly signesLus: number | null
  /** Déclaré par le navigateur, revalidé (un nombre fini, positif ou nul) ; `null` sinon. */
  readonly coutUsd: number | null
  readonly jetonsEntree: number | null
  readonly jetonsSortie: number | null
  /** Revalidée entrée par entrée, bornée à 50 tranches. */
  readonly parTranche: readonly TrancheLue[]
  readonly roles: readonly string[]
  readonly ecrans: readonly string[]
  readonly questionsOuvertes: readonly string[]
  readonly parcours: readonly string[]
  readonly langues: readonly string[]
  readonly devises: readonly string[]
  readonly moyensPaiement: readonly string[]
  readonly pays: readonly string[]
}

const BORNES = { roles: 20, ecrans: 60, questionsOuvertes: 30, signes: 200, tranches: 50, nom: 80 } as const
const RESULTATS_TRANCHE = ['reussie', 'illisible', 'tronquee', 'json_casse'] as const

/** Une liste de chaînes telle que le navigateur la prétend : bornée, jamais crue. */
function listeDeChaines(brut: unknown, max: number): readonly string[] {
  if (!Array.isArray(brut)) return []
  const vues = new Set<string>()
  const res: string[] = []
  for (const x of brut) {
    if (typeof x !== 'string') continue
    const t = x.trim().slice(0, BORNES.signes)
    const c = cle(t)
    if (t === '' || vues.has(c)) continue
    vues.add(c)
    res.push(t)
    if (res.length >= max) break
  }
  return res
}
const entierOuNull = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : null)
/** Un montant tel que le navigateur le prétend : fini, positif ou nul, six décimales — ou rien. */
const montantOuNull = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Number(x.toFixed(6)) : null)
const chaineOuNull = (x: unknown, max: number) => (typeof x === 'string' && x.trim() !== '' ? x.trim().slice(0, max) : null)

/** Les tranches telles que le navigateur les prétend : chaque entrée revalidée, les douteuses écartées. */
function tranchesLues(brut: unknown): readonly TrancheLue[] {
  if (!Array.isArray(brut)) return []
  const res: TrancheLue[] = []
  for (const x of brut.slice(0, BORNES.tranches)) {
    if (typeof x !== 'object' || x === null) continue
    const o = x as Record<string, unknown>
    const signes = entierOuNull(o.signes)
    const tentatives = entierOuNull(o.tentatives)
    const resultat = typeof o.resultat === 'string' && (RESULTATS_TRANCHE as readonly string[]).includes(o.resultat) ? (o.resultat as TrancheLue['resultat']) : null
    if (signes === null || tentatives === null || resultat === null) continue
    res.push({
      signes, tentatives, resultat,
      tables: entierOuNull(o.tables) ?? 0,
      nom: chaineOuNull(o.nom, BORNES.nom),
      nomRefuse: chaineOuNull(o.nomRefuse, BORNES.nom),
      ecrans: entierOuNull(o.ecrans) ?? 0,
      roles: entierOuNull(o.roles) ?? 0,
      questionsOuvertes: entierOuNull(o.questionsOuvertes) ?? 0,
    })
  }
  return res
}

/**
 * Revalide ce que le navigateur prétend, et compose la ligne à écrire.
 * Une valeur douteuse ne devient JAMAIS un résultat : elle devient
 * `non_transmise`, et c'est dit.
 *
 * ── LE CHAMP S'APPELLE `resultat`, PAS `statut` : EP-310 relève tout
 * `statut: '…'` du code comme une écriture de la COLONNE `statut`, dont la
 * contrainte refuse ces valeurs. Ce n'est pas ce statut-là.
 */
export function lectureAEnregistrer(brut: unknown, tablesRecues: number): LectureBriefEnregistree {
  const o = typeof brut === 'object' && brut !== null ? (brut as Record<string, unknown>) : null
  const resultat = o?.resultat
  if (o === null || typeof resultat !== 'string' || !(RESULTATS_LECTURE as readonly string[]).includes(resultat)) {
    return { resultat: 'non_transmise', tablesLues: null, tablesRecues, source: 'absente', tentatives: null, tranches: null, tranchesEchouees: null, signesLus: null, coutUsd: null, jetonsEntree: null, jetonsSortie: null, parTranche: [], roles: [], ecrans: [], questionsOuvertes: [], parcours: [], langues: [], devises: [], moyensPaiement: [], pays: [] }
  }
  const jetons = typeof o.jetons === 'object' && o.jetons !== null ? (o.jetons as Record<string, unknown>) : {}
  return {
    resultat: resultat as ResultatLecture,
    tablesLues: entierOuNull(o.tables),
    tablesRecues,
    source: 'client',
    tentatives: entierOuNull(o.tentatives),
    tranches: entierOuNull(o.tranches),
    tranchesEchouees: entierOuNull(o.tranchesEchouees),
    signesLus: entierOuNull(o.signesLus),
    coutUsd: montantOuNull(o.coutUsd),
    jetonsEntree: entierOuNull(jetons.entree),
    jetonsSortie: entierOuNull(jetons.sortie),
    parTranche: tranchesLues(o.parTranche),
    roles: listeDeChaines(o.roles, BORNES.roles),
    ecrans: listeDeChaines(o.ecrans, BORNES.ecrans),
    questionsOuvertes: listeDeChaines(o.questionsOuvertes, BORNES.questionsOuvertes),
    parcours: listeDeChaines(o.parcours, 8),
    // Un code de langue est deux lettres ; une devise, trois majuscules : le reste ne passe pas.
    langues: listeDeChaines(o.langues, 12).map((x) => x.toLowerCase()).filter((x) => /^[a-z]{2}$/u.test(x)),
    devises: listeDeChaines(o.devises, 8).map((x) => x.toUpperCase()).filter((x) => /^[A-Z]{3}$/u.test(x)),
    moyensPaiement: listeDeChaines(o.moyensPaiement, 12),
    pays: listeDeChaines(o.pays, 30),
  }
}

/**
 * LE MOT VISIBLE QUAND LA LECTURE N'A PAS ABOUTI — jamais silencieux (2b).
 * Signaler, pas bloquer : la génération part, et la phrase le dit.
 */
export function noteDeLecture(lecture: { readonly resultat: string; readonly tentatives?: number } | undefined): string {
  if (lecture === undefined || lecture.resultat === 'reussie' || lecture.resultat === 'demande_vide') return ''
  const fois = lecture.tentatives === undefined ? '' : ` (${String(lecture.tentatives)} tentative${lecture.tentatives > 1 ? 's' : ''})`
  const suite = ' La génération part sans les tables déduites du cahier — vous pourrez les ajouter dans l’atelier.'
  if (lecture.resultat === 'tronquee') return `Lecture du cahier incomplète : la réponse a été coupée avant la fin${fois}.${suite}`
  if (lecture.resultat === 'erreur') return `Lecture du cahier impossible : le service de lecture n’a pas répondu.${suite}`
  return `Lecture du cahier incomplète : rien d’exploitable n’a pu être lu${fois}.${suite}`
}

// ═══════════════════════════════════════════════════════════════════════════
// LES TRANCHES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Découpe un texte en tranches d'au plus `taille` signes, aux frontières de
 * PARAGRAPHES (lignes vides). Un paragraphe plus long qu'une tranche se coupe
 * aux fins de ligne, puis aux fins de phrase, puis — en dernier recours — au
 * signe. Un texte vide donne zéro tranche ; un texte qui tient donne une.
 */
export function decouperEnTranches(texte: string, taille = TAILLE_TRANCHE): string[] {
  const t = texte.trim()
  if (t === '') return []
  const tranches: string[] = []
  let courante = ''
  const pousser = (morceau: string) => {
    if (morceau === '') return
    if (courante === '') courante = morceau
    else if (courante.length + 2 + morceau.length <= taille) courante = `${courante}\n\n${morceau}`
    else { tranches.push(courante); courante = morceau }
  }
  for (const paragraphe of t.split(/\n\s*\n/u).map((p) => p.trim()).filter((p) => p !== '')) {
    if (paragraphe.length <= taille) { pousser(paragraphe); continue }
    // Un paragraphe trop long : lignes, puis phrases, puis signes.
    for (const ligne of paragraphe.split('\n')) {
      if (ligne.length <= taille) { pousser(ligne.trim()); continue }
      for (const phrase of ligne.split(/(?<=[.!?…])\s+/u)) {
        if (phrase.length <= taille) { pousser(phrase.trim()); continue }
        for (let i = 0; i < phrase.length; i += taille) pousser(phrase.slice(i, i + taille))
      }
    }
  }
  if (courante !== '') tranches.push(courante)
  return tranches
}

// ═══════════════════════════════════════════════════════════════════════════
// LA FUSION
// ═══════════════════════════════════════════════════════════════════════════

/** Une entité telle que le modèle l'écrit, avant revalidation. */
export type EntiteBrute = { readonly name?: unknown; readonly id?: unknown; readonly fields?: unknown; readonly [k: string]: unknown }

/** Ce qu'une tranche a donné, avant fusion. */
export type LecturePartielle = {
  readonly deduites: Readonly<Record<string, string>>
  readonly nomProduit?: { readonly nom: string; readonly citation?: string; readonly dansLeDocument: boolean }
  /** Le nom que le modèle a proposé et que la validation a ÉCARTÉ — gardé pour la ligne, ignoré par la fusion. */
  readonly nomRefuse?: string
  readonly entites: readonly EntiteBrute[]
  readonly questionsIA: readonly { readonly code: string; readonly texte: string; readonly choix: readonly string[] }[]
  readonly roles: readonly string[]
  readonly ecrans: readonly string[]
  readonly questionsOuvertes: readonly string[]
  readonly parcours?: readonly string[]
  readonly langues?: readonly string[]
  readonly devises?: readonly string[]
  readonly moyensPaiement?: readonly string[]
  readonly pays?: readonly string[]
}

/** La clé d'identité d'un nom : accents, casse et espaces ne font pas deux noms. */
export function cle(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/gu, ' ')
}

function unionDeChaines(listes: readonly (readonly string[])[], max: number): string[] {
  const vues = new Set<string>()
  const res: string[] = []
  for (const l of listes) for (const x of l) {
    const t = x.trim()
    const c = cle(t)
    if (t === '' || vues.has(c)) continue
    vues.add(c)
    res.push(t)
    if (res.length >= max) return res
  }
  return res
}

/**
 * FUSIONNE les lectures de plusieurs tranches en une seule :
 *   · tables dédoublonnées par NOM (clé normalisée), champs UNIS par nom — la
 *     première forme d'une table ou d'un champ fait foi, les suivantes
 *     n'ajoutent que ce qui manque ;
 *   · rôles, écrans et questions ouvertes UNIS, dans l'ordre de lecture ;
 *   · nom du produit = la PREMIÈRE tranche qui en donne un ; chaque réglage
 *     déduit (devise, marché…) = la première tranche qui le donne ;
 *   · questions du modèle : les trois premières.
 */
export function fusionnerLectures(parties: readonly LecturePartielle[]): LecturePartielle {
  const deduites: Record<string, string> = {}
  for (const p of parties) for (const [k, v] of Object.entries(p.deduites)) if (!(k in deduites)) deduites[k] = v
  const nomProduit = parties.find((p) => p.nomProduit !== undefined)?.nomProduit
  const tables = new Map<string, { brut: Record<string, unknown>; champs: Map<string, unknown>; nomsChamps: string[] }>()
  for (const p of parties) for (const e of p.entites) {
    const nom = typeof e.name === 'string' ? e.name : typeof e.id === 'string' ? e.id : ''
    if (nom === '') continue
    const k = cle(nom)
    const champsBruts = Array.isArray(e.fields) ? (e.fields as unknown[]) : []
    let t = tables.get(k)
    if (t === undefined) { t = { brut: { ...e, fields: [] }, champs: new Map(), nomsChamps: [] }; tables.set(k, t) }
    for (const c of champsBruts) {
      const nc = typeof (c as { name?: unknown })?.name === 'string' ? cle(String((c as { name: string }).name)) : ''
      if (nc === '' || t.champs.has(nc)) continue
      t.champs.set(nc, c)
      t.nomsChamps.push(nc)
    }
  }
  const entites: EntiteBrute[] = [...tables.values()].map((t) => ({ ...t.brut, fields: t.nomsChamps.map((n) => t.champs.get(n)) }))
  return {
    deduites,
    ...(nomProduit === undefined ? {} : { nomProduit }),
    entites,
    questionsIA: parties.flatMap((p) => p.questionsIA).slice(0, 3).map((q, n) => ({ ...q, code: `IA_${String(n)}` })),
    roles: unionDeChaines(parties.map((p) => p.roles), BORNES.roles),
    ecrans: unionDeChaines(parties.map((p) => p.ecrans), BORNES.ecrans),
    questionsOuvertes: unionDeChaines(parties.map((p) => p.questionsOuvertes), BORNES.questionsOuvertes),
    // Le parcours : celui de la première tranche qui en décrit un (un chemin ne se fusionne pas).
    parcours: parties.find((p) => (p.parcours ?? []).length > 0)?.parcours ?? [],
    langues: unionDeChaines(parties.map((p) => (p.langues ?? []).map((x) => x.toLowerCase())), 12),
    devises: unionDeChaines(parties.map((p) => (p.devises ?? []).map((x) => x.toUpperCase())), 8),
    moyensPaiement: unionDeChaines(parties.map((p) => p.moyensPaiement ?? []), 12),
    pays: unionDeChaines(parties.map((p) => p.pays ?? []), 30),
  }
}
