import 'server-only'
/**
 * LE PAIEMENT REÇU PUBLIE L'APPLI (décision du propriétaire, 2026-11-22).
 *
 * « Paiement reçu (invoice.paid) : l'appli est publiée automatiquement au nom
 * choisi, sans autre clic du client. » Le nom a été ENREGISTRÉ au clic sur
 * « Publier », avant Stripe ; ici, il devient une adresse.
 *
 * LE MÊME CŒUR QUE LE BOUTON (`publier-oeuvre.ts`) : refus d'une œuvre
 * amnésique, garde de la lecture publique, pose des données, sous-domaine.
 * Rien n'est recopié.
 *
 * NE LÈVE JAMAIS. Le paiement est déjà enregistré quand on arrive ici (F1) :
 * un échec de publication ne doit pas faire renvoyer l'avis par Stripe
 * pendant trois jours. Il se DIT — alerte /admin et courriel à chaque fois —
 * et le client garde « Publier », qui republie sans repasser par Stripe.
 *
 * Une appli déjà en ligne (renouvellement mensuel) : rien.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAnomaly } from '@/lib/anomaly'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { COLONNES_PUBLICATION, publierOeuvre, refusAvantPublication, tablesPubliques, type LignePubliee } from '@/lib/apps/publier-oeuvre'
import { accordCouvre } from '@/lib/apps/accord-stripe'

export const TYPE_ALERTE_PUBLICATION = 'stripe_publication_application'

/** L'origine des liens rendus : le produit, pas une requête (il n'y en a pas). */
const ORIGINE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.deribfy.com'

export type EffetPublication =
  | 'publiee' | 'publiee_sans_nom' | 'deja_publiee' | 'appli_introuvable' | 'rien_a_publier' | 'refusee' | 'echec'

async function alerter(app: string, effet: EffetPublication, details: Record<string, unknown>): Promise<void> {
  await logAnomaly({ type: TYPE_ALERTE_PUBLICATION, severity: 'blocked', details: { app, effet, ...details } })
}

export async function publierApresPaiement(p: { readonly app: string; readonly proprietaire: string; readonly accordLecture: string | null }): Promise<EffetPublication> {
  try {
    const lu = await supabaseAdmin
      .from(TABLE_GENERATIONS)
      .select(COLONNES_PUBLICATION)
      .eq('id', p.app)
      .eq('owner_id', p.proprietaire)
      .maybeSingle()
    if (lu.error !== null || lu.data === null) {
      await alerter(p.app, 'appli_introuvable', { erreur: lu.error?.message ?? 'aucune ligne' })
      return 'appli_introuvable'
    }
    const ligne = { data: lu.data as LignePubliee }
    if (ligne.data.publication_jeton !== null) return 'deja_publiee'
    if (ligne.data.statut !== 'livree' || ligne.data.document === null || ligne.data.document === undefined) {
      await alerter(p.app, 'rien_a_publier', { statut: ligne.data.statut })
      return 'rien_a_publier'
    }
    const refus = refusAvantPublication(ligne, accordCouvre(p.accordLecture, tablesPubliques(ligne.data)))
    if (refus !== null) {
      const d = (await refus.json().catch(() => ({}))) as { error?: unknown }
      await alerter(p.app, 'refusee', { status: refus.status, erreur: String(d.error ?? '') })
      return 'refusee'
    }
    const sous = typeof ligne.data.publication_slug === 'string' ? ligne.data.publication_slug : ''
    const r = await publierOeuvre({ id: p.app, proprietaire: p.proprietaire, lu: ligne, sous, origine: ORIGINE })
    const d = (await r.json().catch(() => ({}))) as { error?: unknown; motif?: unknown; erreurSousDomaine?: unknown; lien?: unknown }
    if (!r.ok) {
      await alerter(p.app, 'echec', { status: r.status, erreur: String(d.error ?? ''), motif: d.motif ?? null })
      return 'echec'
    }
    if (typeof d.erreurSousDomaine === 'string') {
      await alerter(p.app, 'publiee_sans_nom', { nom: sous, erreur: d.erreurSousDomaine, lien: d.lien ?? null })
      return 'publiee_sans_nom'
    }
    return 'publiee'
  } catch (e) {
    await alerter(p.app, 'echec', { erreur: e instanceof Error ? e.message : String(e) }).catch(() => undefined)
    return 'echec'
  }
}
