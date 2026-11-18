/**
 * LA GARDE `truncate` SUR CHAQUE TABLE DU SCHÉMA — ou l'échec (2026-11-18).
 *
 * Mesuré en production : 0 table sur 30 la portait, aucun code ne la posait.
 * Depuis que `deribfy_oeuvres` est propriétaire, il aurait le droit de vider
 * une table. `deribfy_garder_tables` (propriétaire `postgres`,
 * `proprietaire_oeuvres.sql`) la pose et rend le nombre de tables ENCORE
 * sans garde : tout autre chiffre que 0 annule la transaction.
 */
export const SQL_GARDER_TABLES = (schema: string): string =>
  `select public.deribfy_garder_tables('${schema}') as restantes`
