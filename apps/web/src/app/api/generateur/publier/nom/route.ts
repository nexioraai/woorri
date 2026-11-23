import 'server-only'
/**
 * « CHANGER L'ADRESSE » AVANT LA PREMIÈRE MISE EN LIGNE (décision du propriétaire, 2026-11-22).
 *
 * POST ?id=<appli>&sous=<nouveau nom> → { nom }
 *   · seulement si un nom est enregistré ET que l'appli n'a JAMAIS été en
 *     ligne (nom-enregistre.ts) ; après, 409 : le nom ne change plus ;
 *   · les MÊMES contrôles que « Publier » (refusDuNom) ;
 *   · l'ancien nom est libéré : il est remplacé, rien ne le garde. Il n'a
 *     jamais été une adresse — aucun lien envoyé ne pointe vers lui.
 * La condition « jamais publiée » est REDITE dans l'écriture même (filtres
 * `is null`) : une publication survenue entre la lecture et l'écriture
 * l'emporte, et rien n'est changé.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { refusDuNom } from '@/lib/apps/publier-oeuvre'
import { nomModifiable, jamaisPubliee, PHRASE_NOM_FIGE, PHRASE_SANS_NOM } from '@/lib/apps/nom-enregistre'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const params = new URL(req.url).searchParams
  const id = params.get('id') ?? ''
  const sous = params.get('sous')?.toLowerCase().trim() ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })
  if (sous === '') return NextResponse.json({ error: 'Choisissez une adresse.' }, { status: 400 })

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('publication_slug, publication_jeton, publie_le')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  const l = lu.data as { publication_slug: string | null; publication_jeton: string | null; publie_le: string | null }
  if (!jamaisPubliee(l)) return NextResponse.json({ error: PHRASE_NOM_FIGE }, { status: 409 })
  if (!nomModifiable(l)) return NextResponse.json({ error: PHRASE_SANS_NOM }, { status: 409 })
  if (sous === l.publication_slug) return NextResponse.json({ nom: sous }, { headers: { 'Cache-Control': 'no-store' } })

  const refus = await refusDuNom(id, sous)
  if (refus !== null) return refus

  const ecrit = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .update({ publication_slug: sous })
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .is('publication_jeton', null)
    .is('publie_le', null)
  if (ecrit.error !== null) return NextResponse.json({ error: 'L’adresse n’a pas pu être changée. Réessayez.' }, { status: 500 })
  return NextResponse.json({ nom: sous }, { headers: { 'Cache-Control': 'no-store' } })
}
