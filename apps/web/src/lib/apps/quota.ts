/**
 * LE QUOTA DES MODIFICATIONS, CÔTÉ ROUTES (étape ②, 2026-11-19).
 *
 * La règle vit dans la base (supabase/sql/quota_modifications.sql, appliqué
 * le 2026-11-19, vérifié 9·4·4·false·false) : `reserver_modification` réserve
 * OU refuse en une instruction. Ce module ne fait que l'appeler et dire le
 * résultat avec des mots.
 *
 * ── FERMÉ PAR DÉFAUT.
 *
 * Si le compteur ne répond pas, la modification n'a pas lieu : un appel payant
 * non compté est exactement ce que ce chantier existe pour empêcher. Les
 * comptes exemptés (`sansQuota`) ne passent jamais par ici.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export type Reservation =
  | { readonly ok: true; readonly restantes: number }
  | { readonly ok: false; readonly raison: 'epuise' | 'indisponible'; readonly detail?: string }

/** Le refus dit pourquoi, ce qui le lève, et que l'appli reste en ligne. */
export const PHRASE_EPUISE =
  'Vous n’avez plus de modification disponible pour cette application. ' +
  'Elle reste en ligne et ses données ne bougent pas. Le compteur repart au prochain paiement de l’abonnement, ' +
  'ou avec un lot de modifications supplémentaires.'

export const PHRASE_COMPTEUR_INDISPONIBLE =
  'Le compteur de modifications ne répond pas : rien n’a été fait, et rien n’a été décompté. Réessayez dans un instant.'

export async function reserverModification(app: string, proprietaire: string): Promise<Reservation> {
  const r = await supabaseAdmin.rpc('reserver_modification', { p_app: app, p_owner: proprietaire })
  if (r.error !== null) return { ok: false, raison: 'indisponible', detail: r.error.message }
  if (r.data === null || r.data === undefined) return { ok: false, raison: 'epuise' }
  return { ok: true, restantes: Number(r.data) }
}

/** Une modification refusée ne compte pas. Ne lève jamais : un échec se dit. */
export async function libererModification(app: string, proprietaire: string): Promise<{ ok: boolean; detail?: string }> {
  const r = await supabaseAdmin.rpc('liberer_modification', { p_app: app, p_owner: proprietaire })
  return r.error === null ? { ok: true } : { ok: false, detail: r.error.message }
}

/** Les issues qui CONSOMMENT une modification : livrée, ou prête à confirmer. */
export const ISSUES_DECOMPTEES: ReadonlySet<string> = new Set(['livree', 'en_attente'])
