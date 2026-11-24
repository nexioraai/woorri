import 'server-only'
/**
 * CE QUE FAIT « PUBLIER » POUR CETTE APPLI — une seule décision (2026-11-22).
 *
 * Lue par l'écran AVANT de demander le nom (`/api/generateur/publier/etat`)
 * et par la route au moment de publier : les deux boutons « Publier »
 * (atelier, « Mes projets ») et la route ne peuvent donc pas diverger.
 *
 *   'publier' — compte exempté, ou appli payée ;
 *   'payer'   — non payée, et au moins un moyen ouvert : carte (prix lisible)
 *               ou mobile money (interrupteur ouvert, tarif réglé) ;
 *   'fermee'  — non payée, carte fermée (ou prix illisible) ;
 *   null      — le compteur ne répond pas : on ne décide rien.
 */
import { sansQuota } from '@/lib/admin-emails'
import { lireCompteur } from '@/lib/apps/quota'
import { actionPublier, moyensDePublication, publicationOuverte, type ActionPublier, type MoyenPublication } from '@/lib/apps/compteur-phrases'
import { lireTarifMobileMoney, mobileMoneyOuvert } from '@/lib/payments/mobile-money/encaissement'
import { mobileMoneyPermis } from '@/lib/payments/moyens-par-produit'
import { abonnementCarteOuvert, lirePrixAppli } from '@/lib/payments/abonnement-appli'

export const PHRASE_DECISION_ILLISIBLE =
  'La vérification de l’abonnement ne répond pas : rien n’a été publié. Réessayez dans un instant.'

export const PHRASE_MOYEN_FERME = 'Ce moyen de paiement n’est pas ouvert pour votre compte.'

export type DecisionPublication = { readonly action: ActionPublier; readonly moyens: readonly MoyenPublication[] }

/**
 * La décision ET les moyens de paiement proposés (2026-11-24). Le mobile money
 * n'est proposé que si son interrupteur est ouvert pour ce compte, que le
 * produit l'accepte (jamais le dropshipping) et que son tarif est réglé :
 * un tarif incomplet ne propose rien, plutôt qu'un prix faux.
 */
export async function decisionEtMoyens(app: string, proprietaire: string, email: string | null): Promise<DecisionPublication | null> {
  if (sansQuota(email)) return { action: 'publier', moyens: [] }
  const compteur = await lireCompteur(app, proprietaire)
  if (compteur === null) return null
  if (publicationOuverte(compteur)) return { action: 'publier', moyens: [] }
  const [carte, mm] = await Promise.all([abonnementCarteOuvert(proprietaire, email), mobileMoneyPropose(proprietaire, email)])
  const prix = carte ? await lirePrixAppli() : null
  return { action: actionPublier(compteur, carte, prix, mm), moyens: moyensDePublication(carte, prix, mm) }
}

async function mobileMoneyPropose(proprietaire: string, email: string | null): Promise<boolean> {
  if (!mobileMoneyPermis('application')) return false
  if (!(await mobileMoneyOuvert(proprietaire, email))) return false
  return (await lireTarifMobileMoney()).ok
}

export async function decisionDePublication(app: string, proprietaire: string, email: string | null): Promise<ActionPublier | null> {
  return (await decisionEtMoyens(app, proprietaire, email))?.action ?? null
}
