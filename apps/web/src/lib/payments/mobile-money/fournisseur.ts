import 'server-only'
/**
 * QUEL PRESTATAIRE MOBILE MONEY — un seul point de choix (2026-11-21).
 * Remplacer MoneRails = écrire une autre implémentation de
 * `FournisseurMobileMoney` et l'ajouter ici. Rien d'autre ne change.
 */
import { monerails } from './monerails'
import type { FournisseurMobileMoney } from './types'

const FOURNISSEURS: Readonly<Record<string, FournisseurMobileMoney>> = { monerails }

/** Le prestataire en service. */
export function fournisseurMobileMoney(): FournisseurMobileMoney {
  return monerails
}

/** Le prestataire nommé dans l'adresse d'un webhook, ou `null`. */
export function fournisseurNomme(nom: string): FournisseurMobileMoney | null {
  return FOURNISSEURS[nom] ?? null
}
