/**
 * LES CHAMPS AUTOMATIQUES, CÔTÉ ÉCRAN — copie de `autoLu`
 * (@deribfy/compiler, champs-automatiques.ts), pour la même raison que
 * `lectureParCleLue` : le compilateur tire `node:sqlite` et n'entre pas dans
 * le paquet navigateur. PROUVÉE ÉGALE par `champs-automatiques.test.ts`, sur
 * les mêmes déclarations bonnes et mauvaises.
 */
export const GENRES_AUTO = ['identifiant', 'date_creation', 'compteur'] as const
export type GenreAuto = (typeof GENRES_AUTO)[number]

/** Le préfixe d'un identifiant : majuscules (accents compris) et chiffres. */
export const PREFIXE_AUTO = /^[A-Z0-9ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]{1,10}$/u

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
