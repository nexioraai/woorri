/**
 * LA BASE D'UNE ŒUVRE, TELLE QU'ON L'INJECTE DANS SA PAGE.
 *
 * ── LE DÉFAUT MESURÉ LE 2026-11-04, et il est grave.
 *
 * Une œuvre d'essai a été publiée par la vraie route :
 *
 *     publication : HTTP 200 · compte créé
 *     schéma posé : oeuvre_bb1d4d1b_… — 1 table « releve »
 *     page servie : window.DERIBFY_BASE.url    → VIDE
 *                   window.DERIBFY_BASE.schema → VIDE
 *                   bandeau « pas reliée »     → PRÉSENT
 *
 * `pageAutonome` accepte une configuration depuis D4 (2026-11-03), et ses
 * CINQ appelants l'appelaient avec deux arguments. L'injection était
 * écrite, éprouvée par tir — et N'AVAIT AUCUN APPELANT.
 *
 * Conséquence : l'application publiée ne pouvait PAS atteindre sa base.
 * Le schéma existait, le compte existait, et la page ne les voyait pas.
 *
 * ── CE QUE CE MODULE DÉCIDE, ET CE QU'IL REFUSE DE DEVINER.
 *
 * Une œuvre SANS table n'a pas de base : on rend `undefined`, la page
 * porte son bandeau, et c'est la vérité.
 *
 * Une œuvre AVEC des tables reçoit l'adresse, la clé publiable et SON
 * schéma. Si la base des œuvres n'est pas configurée, on rend `undefined`
 * plutôt qu'une configuration à moitié remplie : une page qui croit avoir
 * une base et n'en a pas est pire qu'une page qui sait qu'elle n'en a pas.
 */
import { configBaseOeuvres } from './base-oeuvres'
import { nomSchemaOeuvre } from './poser-oeuvre'
import type { ConfigurationOeuvre } from './boucle-directe'

/** Un document d'œuvre porte son schéma SQL — vide s'il n'y a rien à conserver. */
export function baseDeLOeuvre(
  idOeuvre: string,
  document: unknown,
): ConfigurationOeuvre | undefined {
  const schemaSql = (document as { schema?: string } | null)?.schema ?? ''
  // LE MÊME TEST QUE LA PUBLICATION : « create table » décide. Un autre
  // critère ici ferait diverger ce qui est POSÉ de ce qui est INJECTÉ.
  if (!schemaSql.includes('create table')) return undefined
  const cfg = configBaseOeuvres(process.env)
  if (!cfg.ok) return undefined
  return {
    url: cfg.config.url,
    clePubliable: cfg.config.clePubliable,
    schema: nomSchemaOeuvre(idOeuvre),
  }
}
