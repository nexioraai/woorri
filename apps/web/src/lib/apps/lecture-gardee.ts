/**
 * M13 · LA LECTURE GARDÉE — même cahier, même application (2026-11-14).
 *
 * MESURÉ : le même cahier Hayine, lu trois fois, rendait 8, 10 puis 7 tables.
 * En température 0 : 6 / 6 / 6 tables, mêmes écrans, mêmes rôles — mais des
 * colonnes encore variables (`montant_final` / `montant_total`). Une lecture qui
 * varie, c'est une application qui change d'une génération à l'autre.
 *
 * Donc la PREMIÈRE lecture réussie d'un texte est GARDÉE, entière (tables,
 * questions, valeurs déduites, nom), sous l'empreinte de ce texte, pour CE
 * compte ; les lectures suivantes du même texte la réutilisent, sans appel.
 *
 * L'empreinte porte aussi la consigne, le modèle et la température : changer
 * la façon de lire invalide ce qui a été gardé — on ne réutilise jamais une
 * lecture faite autrement.
 *
 * Table absente, refus de la base, réponse illisible : la lecture se fait comme
 * avant, et rien n'est caché — `lectureGardee` reste faux.
 */
import { createHash } from 'node:crypto'

export const TABLE_LECTURES = 'app_lectures'

/** Ce que ce module emploie d'un client de base — injecté (la route passe `supabaseAdmin`). */
export type ClientLectures = {
  from(table: string): {
    select(colonnes: string): { eq(c: string, v: string): { eq(c: string, v: string): { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> } } }
    upsert(valeurs: object, o?: { onConflict?: string }): PromiseLike<{ error: unknown }>
  }
}

/** L'empreinte d'une lecture : le texte, ET la façon de le lire. */
export function empreinteDeLecture(demande: string, facon: { readonly consigne: string; readonly modele: string; readonly temperature: number }): string {
  const lecture = createHash('sha256').update(`${facon.modele}\n${String(facon.temperature)}\n${facon.consigne}`).digest('hex').slice(0, 16)
  return createHash('sha256').update(`${lecture}\n${demande}`).digest('hex')
}

/** La lecture gardée de ce texte pour ce compte, ou null (absente, ou la base n'a pas répondu). */
export async function lectureGardee(client: ClientLectures, proprietaire: string, empreinte: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await client.from(TABLE_LECTURES).select('reponse').eq('owner_id', proprietaire).eq('empreinte', empreinte).maybeSingle()
    if (r.error !== null && r.error !== undefined) return null
    const reponse = (r.data as { reponse?: unknown } | null)?.reponse
    return typeof reponse === 'object' && reponse !== null && !Array.isArray(reponse) ? (reponse as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Garde une lecture RÉUSSIE ; un échec à garder ne fait jamais échouer la lecture. */
export async function garderLecture(client: ClientLectures, proprietaire: string, empreinte: string, reponse: Record<string, unknown>): Promise<boolean> {
  try {
    const r = await client.from(TABLE_LECTURES).upsert({ owner_id: proprietaire, empreinte, reponse }, { onConflict: 'owner_id,empreinte' })
    return r.error === null || r.error === undefined
  } catch {
    return false
  }
}

/** La lecture réutilisée : aucun appel, donc aucun coût et aucune tentative — et elle le DIT. */
export function reponseReutilisee(gardee: Record<string, unknown>): Record<string, unknown> {
  const lecture = typeof gardee.lecture === 'object' && gardee.lecture !== null ? (gardee.lecture as Record<string, unknown>) : {}
  return { ...gardee, lectureGardee: true, lecture: { ...lecture, tentatives: 0, coutUsd: 0, jetons: { entree: 0, sortie: 0 }, gardee: true } }
}
