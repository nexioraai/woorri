/**
 * OU EST LA RACINE DU DEPOT.
 *
 * Les modules d'emission vivent hors de `apps/web`. Les atteindre depuis une
 * route demande un chemin absolu, et `process.cwd()` vaut `apps/web` quand le
 * site tourne. Cette fonction est le SEUL endroit qui le sait : un chemin
 * recopie ailleurs finirait par diverger.
 */
import { join } from 'node:path'

export function racineDepot(): string {
  return join(process.cwd(), '..', '..')
}
