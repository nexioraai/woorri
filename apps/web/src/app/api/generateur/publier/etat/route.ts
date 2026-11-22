import 'server-only'
/**
 * CE QUE « PUBLIER » VA FAIRE, LU AVANT LE CLIC (2026-11-22).
 *
 * GET ?id=<appli> → { action, nom, adresse }
 *   action  — 'publier' | 'payer' | 'fermee' (decisionDePublication) ;
 *   nom     — le nom d'adresse déjà ENREGISTRÉ pour cette appli, ou null :
 *             l'écran ne le redemande pas ;
 *   adresse — l'adresse EN LIGNE, ou null : un nom enregistré sans
 *             publication n'en a pas.
 * Lecture seule. Restreinte au propriétaire par la requête.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { adressePubliee } from '@/lib/apps/sous-domaine'
import { decisionDePublication, PHRASE_DECISION_ILLISIBLE } from '@/lib/apps/decision-publication'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('publication_slug, publication_jeton')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) return NextResponse.json({ error: 'generation inconnue' }, { status: 404 })

  const action = await decisionDePublication(id, garde.userId, garde.email)
  if (action === null) return NextResponse.json({ error: PHRASE_DECISION_ILLISIBLE }, { status: 503 })
  const l = lu.data as { publication_slug: string | null; publication_jeton: string | null }
  return NextResponse.json(
    {
      action,
      nom: typeof l.publication_slug === 'string' && l.publication_slug !== '' ? l.publication_slug : null,
      adresse: adressePubliee(l.publication_slug, l.publication_jeton),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
