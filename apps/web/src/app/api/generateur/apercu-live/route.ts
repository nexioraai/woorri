/**
 * ETAGE 4 — L'APERCU QUI SE CONSTRUIT (v0-style), a ZERO appel IA.
 *
 * L'acquis d'une generation en cours est COMPILE localement par le MEME
 * assembleur que l'apercu synchrone (construireApercu — deterministe, CPU
 * pur). L'ecran n'appelle cette route QUE quand `apercuVersion` change
 * dans le polling d'etat : une compilation par tranche au plus.
 * Pendant les phases ou l'air est invalide (plein tour) : pret=false, et
 * l'ecran garde la derniere version affichee.
 */
import { NextResponse } from 'next/server'
import { projectAirSchema } from '@deribfy/air-schema'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { construireApercu } from '@/lib/apps/apercu'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const r = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('sections_acquises, document, statut')
    .eq('id', id)
    .eq('owner_id', garde.userId) // dette 6a : l'identite est l'id du jeton
    .maybeSingle()
  if (r.error !== null || r.data === null) {
    return NextResponse.json({ error: 'generation inconnue' }, { status: 404 })
  }

  // livree : l'oeuvre finale fait foi ; sinon l'acquis en cours.
  const sa = (r.data.sections_acquises ?? {}) as { acquis?: Record<string, unknown> }
  const source = r.data.statut === 'livree' ? r.data.document : (sa.acquis ?? null)
  const lu = source === null ? null : projectAirSchema.safeParse(source)
  if (lu === null || !lu.success) {
    return NextResponse.json({ pret: false }, { headers: { 'Cache-Control': 'no-store' } })
  }
  try {
    const a = await construireApercu(lu.data)
    return NextResponse.json(
      { pret: true, html: a.html },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    // un acquis mi-plie peut etre schema-valide et incompilable : pas pret,
    // jamais une erreur a l'ecran — la prochaine tranche retentera.
    return NextResponse.json({ pret: false }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
