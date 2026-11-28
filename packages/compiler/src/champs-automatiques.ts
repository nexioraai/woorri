/**
 * LES CHAMPS AUTOMATIQUES — c'est la BASE qui les remplit, jamais le
 * navigateur (2026-11-28, décision O1 élargie du propriétaire).
 *
 * ── LE DÉFAUT MESURÉ : « Suivi de colis » (0178c047).
 *
 * La consigne disait au modèle « la base TIRE la clé à l'ajout — n'en écris
 * pas ». C'était vrai SEULEMENT si la lecture par clé était posée, et sans
 * préfixe. Le modèle a écrit un ajout sans numéro ; la déclaration a été
 * perdue ; la colonne est restée vide (relu en base le 2026-11-28 : aucun
 * défaut sur `numero_suivi`). Une promesse de la consigne doit être une
 * propriété du SQL, pas une espérance.
 *
 * ── TROIS GENRES, DÉCLARÉS SUR LE CHAMP : `"auto": { "genre": … }`.
 *
 * · `identifiant` — texte `unique`, `PRÉFIXE-XXXXXXXX` (8 signes 0-9A-F
 *   tirés de `gen_random_uuid`, ~4,3 milliards de valeurs ; une collision
 *   est refusée par la contrainte `unique`, jamais avalée) ;
 * · `date_creation` — `date` (AAAA-MM-JJ) ou `datetime` (ISO, UTC), l'heure
 *   de la BASE à l'insertion ;
 * · `compteur` — `number`, 1, 2, 3… par une séquence propre à la colonne.
 *
 * ── OÙ VIT LE DÉFAUT : DANS LES POLITIQUES, PAS DANS `create table`.
 *
 * Même endroit que le tirage de la clé (É1) : les politiques se
 * réappliquent EN ENTIER à chaque publication et à chaque migration. Une
 * colonne qui existe déjà reçoit donc son défaut par `alter column … set
 * default` — un AJOUT : seules les lignes à venir sont touchées, les
 * existantes ne changent pas.
 */
import type { ChampDonnees } from './schema-donnees.ts'
import { nomColonne } from './schema-donnees.ts'

export const GENRES_AUTO = ['identifiant', 'date_creation', 'compteur'] as const
export type GenreAuto = (typeof GENRES_AUTO)[number]

/** Le préfixe d'un identifiant : majuscules (accents compris) et chiffres. */
export const PREFIXE_AUTO = /^[A-Z0-9ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]{1,10}$/u

/** Les 8 signes tirés — une source, relue par la liste blanche du migrateur. */
export const TIRAGE_AUTO_8 = "upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))"
export const DATE_AUTO = "to_char(now() at time zone 'utc', 'YYYY-MM-DD')"
export const DATETIME_AUTO = `to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`

export type AutoLu =
  | { readonly ok: true; readonly genre: GenreAuto; readonly prefixe?: string }
  | { readonly ok: false; readonly motif: string }

/**
 * LE CHAMP AUTOMATIQUE EST-IL COHÉRENT ? Le motif dit quoi corriger — il
 * repart au modèle tel quel (relance-declaration).
 */
export function autoLu(f: { readonly name?: string; readonly id: string; readonly type: string; readonly unique?: boolean; readonly auto?: unknown }): AutoLu | null {
  if (f.auto === undefined) return null
  const nom = f.name ?? f.id.replace(/^fld_/u, '')
  const a = f.auto
  if (a === null || typeof a !== 'object') return { ok: false, motif: `« ${nom} » : "auto" doit être un objet { "genre": … }` }
  const genre = 'genre' in a ? a.genre : undefined
  const prefixe = 'prefixe' in a ? a.prefixe : undefined
  if (genre === 'identifiant') {
    if (f.type !== 'text' && f.type !== 'string') return { ok: false, motif: `« ${nom} » : un identifiant automatique est de type "text"` }
    if (f.unique !== true) return { ok: false, motif: `« ${nom} » : un identifiant automatique porte "unique": true` }
    if (typeof prefixe !== 'string' || !PREFIXE_AUTO.test(prefixe)) {
      return { ok: false, motif: `« ${nom} » : "prefixe" en majuscules et chiffres, 1 à 10 signes (ex. "SUIVI", "FAC")` }
    }
    return { ok: true, genre: 'identifiant', prefixe }
  }
  if (genre === 'date_creation') {
    if (f.type !== 'date' && f.type !== 'datetime') return { ok: false, motif: `« ${nom} » : une date de création est de type "date" ou "datetime"` }
    return { ok: true, genre: 'date_creation' }
  }
  if (genre === 'compteur') {
    if (f.type !== 'number') return { ok: false, motif: `« ${nom} » : un compteur est de type "number"` }
    return { ok: true, genre: 'compteur' }
  }
  return { ok: false, motif: `« ${nom} » : "genre" vaut "identifiant", "date_creation" ou "compteur"` }
}

/** La séquence d'un compteur. */
export const sequenceAuto = (table: string, colonne: string): string => `${table}_${colonne}_seq`

/** L'expression SQL du défaut, ou `null` (pas automatique, ou incohérent). */
export function defautAuto(table: string, f: ChampDonnees): string | null {
  const lu = autoLu(f)
  if (!lu?.ok) return null
  if (lu.genre === 'identifiant') return `'${lu.prefixe ?? ''}-' || ${TIRAGE_AUTO_8}`
  if (lu.genre === 'date_creation') return f.type === 'date' ? DATE_AUTO : DATETIME_AUTO
  return `nextval('${sequenceAuto(table, nomColonne(f))}')`
}

/** Les lignes SQL qui posent les défauts d'une table — vides sans champ automatique. */
export function lignesChampsAutomatiques(table: string, champs: readonly ChampDonnees[], rolePorte: string): string[] {
  const l: string[] = []
  for (const f of champs) {
    const d = defautAuto(table, f)
    if (d === null) continue
    const c = nomColonne(f)
    if (autoLu(f)?.ok === true && (f.auto as { genre: string }).genre === 'compteur') {
      const s = sequenceAuto(table, c)
      l.push(`create sequence if not exists ${s};`, `grant usage, select on sequence ${s} to ${rolePorte};`)
    }
    l.push(`alter table ${table} alter column ${c} set default ${d};`)
  }
  return l.length === 0 ? [] : ['-- CHAMPS AUTOMATIQUES : la base les remplit à l’ajout, jamais le navigateur.', ...l]
}

/** La clé de lecture est-elle déjà un identifiant automatique ? Alors le tirage de É1 ne la réécrit pas. */
export function cleDejaAutomatique(champs: readonly ChampDonnees[], cle: string): boolean {
  const f = champs.find((x) => nomColonne(x) === cle)
  return f !== undefined && defautAuto('t', f) !== null
}
