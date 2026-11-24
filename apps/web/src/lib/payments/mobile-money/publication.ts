import 'server-only'
/**
 * LE PAIEMENT MOBILE MONEY REÇU PUBLIE L'APPLI (décision du propriétaire, 2026-11-24).
 *
 * Comme la carte (`publier-apres-paiement.ts`, appelé par le webhook Stripe) :
 * le nom a été ENREGISTRÉ au clic sur « Publier », dans la fenêtre ; l'avis
 * signé et enregistré (`enregistrer_paiement` : abonnée, +30 jours) le change
 * en adresse, sans autre clic. Même cœur, rien n'est recopié.
 *
 * L'accord de lecture publique est celui GARDÉ avec l'appli au clic
 * (`sections_acquises`) : il ne vaut que pour la liste exacte acceptée — une
 * table publique ajoutée depuis arrête la publication automatique, et le
 * prochain « Publier » repose la question (sans repayer).
 *
 * Appelé APRÈS la réponse au prestataire (`after`) : la publication (nom,
 * Cloudflare, Vercel) ne compte pas dans le budget de 10 s de l'avis. Ne lève
 * jamais : un échec se dit par l'alerte de `publierApresPaiement`.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { accordGarde } from '@/lib/apps/accord-stripe'
import { publierApresPaiement, type EffetPublication } from '@/lib/payments/publier-apres-paiement'

export async function publierApresEncaissement(
  app: string,
  proprietaire: string,
  publier: typeof publierApresPaiement = publierApresPaiement,
): Promise<EffetPublication> {
  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('sections_acquises')
    .eq('id', app)
    .eq('owner_id', proprietaire)
    .maybeSingle()
    .then((r) => r, () => ({ data: null, error: { message: 'lecture impossible' } }))
  const accord = lu.error === null && lu.data !== null ? accordGarde((lu.data as { sections_acquises: unknown }).sections_acquises) : null
  return publier({ app, proprietaire, accordLecture: accord })
}
