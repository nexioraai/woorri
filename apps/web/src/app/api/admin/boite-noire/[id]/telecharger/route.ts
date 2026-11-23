/**
 * « TÉLÉCHARGER » — UN seul fichier lisible par un humain (Markdown), que le
 * fondateur peut transmettre tel quel (fondateur seul, 2026-11-23).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { TABLE_BOITE_NOIRE } from '@/lib/apps/boite-noire'
import { boiteEnTexte } from '@/lib/apps/boite-noire-lecture'

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
  const l = r.data as Parameters<typeof boiteEnTexte>[0]
  let nom: string | null = null
  if (l.generation_id !== null) {
    const n = await supabaseAdmin.from(TABLE_GENERATIONS).select('nom').eq('id', l.generation_id).maybeSingle()
    nom = (n.data as { nom?: string | null } | null)?.nom ?? null
  }
  return new Response(boiteEnTexte(l, nom), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="boite-noire-${id.slice(0, 8)}.md"`,
      'Cache-Control': 'no-store',
    },
  })
}
