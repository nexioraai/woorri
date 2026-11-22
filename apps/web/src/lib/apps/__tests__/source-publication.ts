/**
 * LA PUBLICATION VIT EN DEUX FICHIERS DEPUIS LE 2026-11-22.
 *
 * `api/generateur/publier/route.ts` garde la décision du paiement, le contrôle
 * du nom et la lecture de l'accord dans la requête ; `lib/apps/publier-oeuvre.ts`
 * porte, DÉPLACÉ TEL QUEL, le cœur que le webhook Stripe emploie aussi :
 * refus d'une œuvre amnésique, garde de la lecture publique, pose des données,
 * jeton, sous-domaine. Un cliquet qui parle de « la publication » lit les
 * deux, dans cet ordre (la route d'abord) : la garde qu'il tient n'a pas
 * changé, seulement son fichier.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lireSource } from './lire-source'

const SRC = join(__dirname, '..', '..', '..')
export const ROUTE_PUBLIER = join(SRC, 'app', 'api', 'generateur', 'publier', 'route.ts')
export const COEUR_PUBLIER = join(SRC, 'lib', 'apps', 'publier-oeuvre.ts')
/** Les deux fichiers SANS leur prose (lireSource). */
export function sourcePublication(): string {
  return `${lireSource(ROUTE_PUBLIER)}\n${lireSource(COEUR_PUBLIER)}`
}
/** Les deux fichiers BRUTS, pour les cliquets qui lisaient la route brute. */
export function sourcePublicationBrute(): string {
  return `${readFileSync(ROUTE_PUBLIER, 'utf8')}\n${readFileSync(COEUR_PUBLIER, 'utf8')}`
}
