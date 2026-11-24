import 'server-only'
/**
 * QUEL PRESTATAIRE MOBILE MONEY — un seul point de choix (2026-11-21).
 * Remplacer MoneRails = écrire une autre implémentation de
 * `FournisseurMobileMoney` et l'ajouter ici. Rien d'autre ne change.
 */
import { creerMonerails, monerails } from './monerails'
import type { RegimeMobileMoney } from './regime'
import type { FournisseurMobileMoney } from './types'

const FOURNISSEURS: Readonly<Record<string, FournisseurMobileMoney>> = { monerails }
const REEL = creerMonerails('reel')

/**
 * Le prestataire en service, dans le MODE voulu (2026-11-23) : test par
 * défaut ; le réel seulement quand `mode.ts` l'a décidé pour ce compte.
 */
export function fournisseurMobileMoney(regime: RegimeMobileMoney = 'test'): FournisseurMobileMoney {
  return regime === 'reel' ? REEL : monerails
}

/**
 * Le prestataire nommé dans l'adresse d'un webhook, ou `null`. Son
 * `verifierAvis` accepte les deux secrets (test et live) : une seule adresse.
 */
export function fournisseurNomme(nom: string): FournisseurMobileMoney | null {
  return FOURNISSEURS[nom] ?? null
}
