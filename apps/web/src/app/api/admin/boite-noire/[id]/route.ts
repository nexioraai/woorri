/** UNE BOÎTE NOIRE, entière (fondateur seul, 2026-11-23). */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_BOITE_NOIRE } from '@/lib/apps/boite-noire'

import { estAdmin } from '@/lib/admin-emails'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'

export const runtime = 'nodejs'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // LE FONDATEUR SEUL — aucun client, pas même le propriétaire de l'appli.
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  if (!estAdmin(garde.email)) return NextResponse.json({ error: 'Réservé au fondateur.' }, { status: 403 })
  const { id } = await ctx.params
  const r = await supabaseAdmin.from(TABLE_BOITE_NOIRE).select('*').eq('id', id).maybeSingle()
  if (r.error !== null || r.data === null) return NextResponse.json({ error: 'Boîte noire introuvable.' }, { status: 404 })
  return NextResponse.json({ boite: r.data }, { headers: { 'Cache-Control': 'no-store' } })
}
