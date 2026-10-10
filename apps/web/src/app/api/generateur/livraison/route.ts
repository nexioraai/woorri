/**
 * ETAGE 4 — LA LIVRAISON. Le zip est RECOMPILE depuis `document`, jamais
 * stocke (la colonne document est la seule verite ; livree_a_document
 * garantit qu'elle existe). Restreint au proprietaire.
 */
import { NextResponse } from 'next/server'
import { compileWeb } from '@deribfy/compiler'
import { projectAirSchema } from '@deribfy/air-schema'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { zipper } from '@/lib/apps/zip'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const r = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('statut, document')
    .eq('id', id)
    .eq('owner_id', garde.userId) // dette 6a : l'identite est l'id du jeton
    .maybeSingle()
  if (r.error !== null || r.data === null || r.data.statut !== 'livree' || r.data.document === null) {
    return NextResponse.json({ error: 'rien a livrer' }, { status: 404 })
  }

  const lu = projectAirSchema.safeParse(r.data.document)
  if (!lu.success) {
    return NextResponse.json({ error: 'document illisible' }, { status: 500 })
  }
  try {
    const projet = compileWeb(lu.data)
    const archive = zipper(new Map<string, string | Buffer>(projet.files))
    return new Response(new Uint8Array(archive), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${lu.data.app.slug}.zip"`,
        'Content-Length': String(archive.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Construction impossible.' },
      { status: 500 },
    )
  }
}
