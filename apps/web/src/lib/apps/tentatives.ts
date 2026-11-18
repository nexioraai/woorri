/**
 * LES TENTATIVES DE GÉNÉRATION — une ligne par exécution, jamais réécrite.
 *
 * ── POURQUOI (manque 4, 2026-11-15).
 *
 * Observé sur le code réparé (docs/elite-protocol/PLAN_MANQUE4.md §1) :
 * chaque tentative réécrivait `sections_acquises`, `cout_usd`, `duree_ms`,
 * les jetons, `tirages` et `diagnostics` de la ligne de l'œuvre. Un échec
 * suivi d'une réussite : les trois tours ratés et leurs 0,0226 $ n'existaient
 * plus nulle part.
 *
 * Décision du propriétaire : « Une trace qu'on peut réécrire n'est pas une
 * trace. » La table est en AJOUT SEUL ; la base refuse toute mise à jour
 * (déclencheur, `supabase/sql/app_generation_attempts.sql`).
 *
 * ── CE MODULE PORTE LE NOM ET LES COLONNES, PAS LE DDL.
 *
 * Le DDL vit dans le fichier SQL ; `journal.ts` reste hors périmètre. Le
 * cliquet `tentatives.test.ts` tient la liste ci-dessous ÉGALE aux colonnes
 * du fichier SQL, et la ligne construite ÉGALE à cette liste : une colonne
 * ajoutée d'un seul côté casse la suite au lieu de partir en production.
 */

export const TABLE_TENTATIVES = 'app_generation_attempts'

/**
 * L'ISSUE D'UNE TENTATIVE, lisible sans parser le JSON.
 * - `livree` : la boucle a abouti et la ligne de l'œuvre est écrite ;
 * - `non_convergee` : la boucle a rendu un échec (code qui ne s'assemble pas…) ;
 * - `interrompue` : la boucle a JETÉ (fournisseur en erreur, panne réseau,
 *   défaut du code) — le plan disait `erreur_fournisseur`, mais rien ne
 *   garantit que la cause soit le fournisseur ;
 * - `ecriture_echouee` : la boucle a abouti, la ligne de l'œuvre a été refusée.
 *
 * RETOUCHE (point 2, 2026-11-18) — rien ne l'enregistrait, ni réussie ni
 * refusée : les six essais de pharma n'existaient que dans Vercel et l'export
 * DeepSeek. Deux issues de plus, propres à elle :
 * - `refusee` : la retouche a été refusée (juges, coupure, hors périmètre,
 *   données) — le motif est dans la trace ;
 * - `en_attente` : mise de côté, elle attend l'accord du propriétaire.
 */
export const ISSUES = ['livree', 'non_convergee', 'interrompue', 'ecriture_echouee', 'refusee', 'en_attente'] as const
export type Issue = (typeof ISSUES)[number]

export const NATURES = ['generation', 'regeneration', 'retouche'] as const
export type Nature = (typeof NATURES)[number]

/** Les colonnes ÉCRITES par la route — `id` et `cree_le` sont posés par la base. */
export const COLONNES_ECRITES = [
  'generation_id',
  'rang',
  'nature',
  'issue',
  'debut_le',
  'fin_le',
  'version_rang',
  'fournisseur',
  'deploiement',
  'cout_usd',
  'duree_ms',
  'jetons_entree',
  'jetons_sortie',
  'tirages',
  'diagnostics',
  'trace',
  'trace_tronquee',
  'consigne',
  'consigne_empreinte',
] as const

/** Toutes les colonnes de la table, dans l'ordre du fichier SQL. */
export const COLONNES_TENTATIVE = ['id', 'cree_le', ...COLONNES_ECRITES] as const

/**
 * LA BORNE DE LA TRACE, DIMENSIONNÉE SUR LA MESURE, PAS AU DOIGT MOUILLÉ.
 *
 * Relevé de production du 2026-11-15 (propriétaire), sur les 75 lignes :
 * `pg_column_size(sections_acquises)` moyenne 15 059 octets, maximum 54 140.
 * `pg_column_size` rend la taille STOCKÉE, éventuellement compressée : la
 * taille brute peut être plus grande, et elle n'a pas été mesurée
 * (`octet_length(sections_acquises::text)`, requête à lancer).
 *
 * 256 Kio de JSON brut : près de cinq fois le maximum stocké observé, pour
 * laisser la place à la consigne (manque 1) et à la réflexion (manque 3). Au
 * delà, on n'ÉCHOUE pas — une tentative perdue est pire qu'une trace
 * abrégée : on retire d'abord les sources, et on le DIT (`trace_tronquee`).
 */
export const LIMITE_TRACE_OCTETS = 256 * 1024

const taille = (v: unknown): number => Buffer.byteLength(JSON.stringify(v ?? null), 'utf8')

/**
 * Ramène la trace sous la borne, par paliers qui gardent le plus utile :
 * 1. retirer la source de chaque tour (`tours[].source`) et couper
 *    `dernierTexte` à 2 000 caractères ;
 * 2. sinon, ne garder des tours que rang / ok / motif (500 caractères).
 */
export function bornerTrace(trace: Record<string, unknown>): {
  trace: Record<string, unknown>
  tronquee: boolean
} {
  if (taille(trace) <= LIMITE_TRACE_OCTETS) return { trace, tronquee: false }
  const tours = Array.isArray(trace.tours) ? (trace.tours as Record<string, unknown>[]) : []
  const palier1: Record<string, unknown> = {
    ...trace,
    tours: tours.map((t) => {
      const { source: _source, ...reste } = t
      void _source
      return reste
    }),
    dernierTexte: typeof trace.dernierTexte === 'string' ? trace.dernierTexte.slice(0, 2_000) : trace.dernierTexte ?? null,
    tailleOrigine: taille(trace),
  }
  if (taille(palier1) <= LIMITE_TRACE_OCTETS) return { trace: palier1, tronquee: true }
  return {
    trace: {
      tailleOrigine: taille(trace),
      tours: tours.map((t) => ({
        rang: t.rang ?? null,
        ok: t.ok ?? null,
        motif: typeof t.motif === 'string' ? t.motif.slice(0, 500) : null,
      })),
    },
    tronquee: true,
  }
}

export type EntreeTentative = {
  readonly generationId: string
  readonly rang: number
  readonly nature: Nature
  readonly issue: Issue
  readonly debut: Date
  readonly fin: Date
  readonly versionRang: number | null
  readonly fournisseur: string
  readonly deploiement: unknown
  readonly coutUsd: number
  readonly jetonsEntree: number
  readonly jetonsSortie: number
  readonly tirages: number
  readonly diagnostics: readonly string[]
  readonly trace: Record<string, unknown>
}

/** La ligne telle qu'elle part en base : exactement `COLONNES_ECRITES`. */
export function ligneDeTentative(e: EntreeTentative): Record<(typeof COLONNES_ECRITES)[number], unknown> {
  const borne = bornerTrace(e.trace)
  return {
    generation_id: e.generationId,
    rang: e.rang,
    nature: e.nature,
    issue: e.issue,
    debut_le: e.debut.toISOString(),
    fin_le: e.fin.toISOString(),
    version_rang: e.versionRang,
    fournisseur: e.fournisseur,
    deploiement: e.deploiement ?? null,
    cout_usd: Number(e.coutUsd.toFixed(4)),
    duree_ms: Math.max(0, e.fin.getTime() - e.debut.getTime()),
    jetons_entree: e.jetonsEntree,
    jetons_sortie: e.jetonsSortie,
    tirages: e.tirages,
    diagnostics: [...e.diagnostics],
    trace: borne.trace,
    trace_tronquee: borne.tronquee,
    // MANQUE 1 : colonnes posées par la migration, non écrites aujourd'hui.
    consigne: null,
    consigne_empreinte: null,
  }
}

/** Le client minimal dont l'écriture a besoin — `supabaseAdmin` le satisfait. */
type Client = {
  from: (table: string) => {
    select: (c: string) => { eq: (k: string, v: unknown) => PromiseLike<{ data: unknown; error: { message: string } | null }> }
    insert: (l: Record<string, unknown>) => PromiseLike<{ error: { message: string; code?: string } | null }>
  }
}

/**
 * ÉCRIT UNE TENTATIVE. Le rang est LU, pas supposé ; une collision sur
 * `(generation_id, rang)` — deux tentatives simultanées — est rejouée une
 * fois avec le rang relu. Ne jette jamais : rend la cause d'un refus, pour
 * que l'appelant la dise. Une tentative perdue ne fait pas échouer la
 * génération (même décision que pour les versions).
 */
export async function ecrireTentative(
  client: Client,
  e: Omit<EntreeTentative, 'rang'>,
): Promise<{ ok: true; rang: number } | { ok: false; cause: string }> {
  for (let essai = 0; essai < 2; essai += 1) {
    const lus = await client.from(TABLE_TENTATIVES).select('rang').eq('generation_id', e.generationId)
    if (lus.error !== null) return { ok: false, cause: `rangs illisibles — ${lus.error.message}` }
    const rangs = (Array.isArray(lus.data) ? lus.data : []).map((x: { rang?: unknown }) => Number(x.rang) || 0)
    const rang = Math.max(0, ...rangs) + 1
    const ecrit = await client.from(TABLE_TENTATIVES).insert(ligneDeTentative({ ...e, rang }))
    if (ecrit.error === null) return { ok: true, rang }
    if (ecrit.error.code !== '23505') return { ok: false, cause: ecrit.error.message }
  }
  return { ok: false, cause: 'rang en collision deux fois de suite' }
}
