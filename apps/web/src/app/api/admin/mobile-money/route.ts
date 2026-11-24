/**
 * LE JOURNAL DU MOBILE MONEY — fondateur seul (lot L2, 2026-11-23).
 * Chaque demande : montant, prix, frais, opérateur, numéro masqué, l'avis
 * reçu, la décision et sa raison, et l'activation à la main s'il y en a eu.
 * Et l'état des deux clés MoneRails : préfixe juste ou non, sans aucune valeur.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_DEMANDES } from '@/lib/payments/mobile-money/demandes'
import { estAdmin } from '@/lib/admin-emails'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { etatDesCles } from '@/lib/payments/mobile-money/cles'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  if (!estAdmin(garde.email)) return NextResponse.json({ error: 'Réservé au fondateur.' }, { status: 403 })
  const r = await supabaseAdmin.from(TABLE_DEMANDES).select('*').order('cree_le', { ascending: false }).limit(200)
  if (r.error !== null) return NextResponse.json({ error: 'Lecture impossible.', motif: r.error.message }, { status: 502 })
  // Les clés : deux booléens (préfixe juste ou non), JAMAIS une valeur.
  return NextResponse.json({ demandes: r.data ?? [], cles: etatDesCles(process.env) }, { headers: { 'Cache-Control': 'no-store' } })
}
