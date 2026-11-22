import 'server-only'
/**
 * CE QUE FAIT « PUBLIER » POUR CETTE APPLI — une seule décision (2026-11-22).
 *
 * Lue par l'écran AVANT de demander le nom (`/api/generateur/publier/etat`)
 * et par la route au moment de publier : les deux boutons « Publier »
 * (atelier, « Mes projets ») et la route ne peuvent donc pas diverger.
 *
 *   'publier' — compte exempté, ou appli payée ;
 *   'payer'   — non payée, carte ouverte pour ce compte, prix lisible ;
 *   'fermee'  — non payée, carte fermée (ou prix illisible) ;
 *   null      — le compteur ne répond pas : on ne décide rien.
 */
import { sansQuota } from '@/lib/admin-emails'
import { lireCompteur } from '@/lib/apps/quota'
import { actionPublier, publicationOuverte, type ActionPublier } from '@/lib/apps/compteur-phrases'
import { abonnementCarteOuvert, lirePrixAppli } from '@/lib/payments/abonnement-appli'

export const PHRASE_DECISION_ILLISIBLE =
  'La vérification de l’abonnement ne répond pas : rien n’a été publié. Réessayez dans un instant.'

export async function decisionDePublication(app: string, proprietaire: string, email: string | null): Promise<ActionPublier | null> {
  if (sansQuota(email)) return 'publier'
  const compteur = await lireCompteur(app, proprietaire)
  if (compteur === null) return null
  if (publicationOuverte(compteur)) return 'publier'
  const carte = await abonnementCarteOuvert(proprietaire, email)
  return actionPublier(compteur, carte, carte ? await lirePrixAppli() : null)
}
