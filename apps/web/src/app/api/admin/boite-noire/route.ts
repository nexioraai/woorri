/**
 * LES BOÎTES NOIRES — la liste (fondateur seul, 2026-11-23). Les plus récentes
 * d'abord, avec le nom de l'appli et le résumé de l'analyse ; jamais les étapes.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { TABLE_BOITE_NOIRE } from '@/lib/apps/boite-noire'

import { estAdmin } from '@/lib/admin-emails'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  // LE FONDATEUR SEUL — aucun client, pas même le propriétaire de l'appli.
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  if (!estAdmin(garde.email)) return NextResponse.json({ error: 'Réservé au fondateur.' }, { status: 403 })
  const r = await supabaseAdmin
    .from(TABLE_BOITE_NOIRE)
    .select('id, cree_le, generation_id, nature, issue, tronquee, taille_octets, resume:analyse_phrases->resume')
    .order('cree_le', { ascending: false })
    .limit(200)
  if (r.error !== null) return NextResponse.json({ error: 'Lecture impossible.', motif: r.error.message }, { status: 502 })
  const lignes = (r.data ?? []) as { generation_id: string | null }[]
  const ids = [...new Set(lignes.map((l) => l.generation_id).filter((x): x is string => x !== null))]
  const noms = new Map<string, string | null>()
  if (ids.length > 0) {
    const n = await supabaseAdmin.from(TABLE_GENERATIONS).select('id, nom').in('id', ids)
    for (const x of (n.data ?? []) as { id: string; nom: string | null }[]) noms.set(x.id, x.nom)
  }
  return NextResponse.json(
    { boites: lignes.map((l) => ({ ...l, nom: l.generation_id === null ? null : noms.get(l.generation_id) ?? null })) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
