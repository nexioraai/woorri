/**
 * UNE APPLI EXISTE-T-ELLE ENCORE ? — pour libérer une adresse sans enfermer personne.
 *
 * `compte-oeuvre.ts` (`liberer`) en a besoin : le compte d'une appli DISPARUE
 * perd son mot de passe et est banni ; celui d'une appli qui a seulement changé
 * de nom garde sa clé. Une appli supprimée garde sa ligne (pierre tombale,
 * EP-308) avec le statut `supprimee` — elle n'existe plus pour ce choix.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from './journal'

/** Le statut d'une appli supprimée (même valeur que `STATUT_SUPPRIMEE` de la route). */
export const STATUT_DISPARUE = 'supprimee'

export async function oeuvreExiste(id: string): Promise<boolean> {
  const lu = await supabaseAdmin.from(TABLE_GENERATIONS).select('statut').eq('id', id).maybeSingle()
  // Une lecture en échec n'est pas une preuve de disparition : on n'enferme personne.
  if (lu.error !== null) return true
  if (lu.data === null) return false
  return (lu.data as { statut?: string }).statut !== STATUT_DISPARUE
}
