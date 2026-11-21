import 'server-only'
/**
 * UN INTERRUPTEUR DE PAIEMENT LU DANS LES RÉGLAGES (2026-11-20, généralisé le 2026-11-21).
 *
 * Valeur de la clé dans `quota_reglages` :
 *   absente ou vide → ÉTEINT ;
 *   liste séparée par des virgules (identifiants de compte ou courriels) → ces comptes seuls ;
 *   'tous' → tout le monde.
 * Une lecture ratée vaut ÉTEINT : un paiement ne s'ouvre jamais par défaut.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function interrupteurOuvert(cle: 'abonnement_carte' | 'mobile_money', proprietaire: string, email: string | null): Promise<boolean> {
  const r = await supabaseAdmin.from('quota_reglages').select('valeur').eq('cle', cle).maybeSingle()
  if (r.error !== null || r.data === null) return false
  const v = String((r.data as { valeur?: unknown }).valeur ?? '').trim().toLowerCase()
  if (v === '') return false
  if (v === 'tous') return true
  const liste = v.split(',').map((x) => x.trim()).filter((x) => x !== '')
  return liste.includes(proprietaire.toLowerCase()) || (email !== null && liste.includes(email.toLowerCase()))
}
