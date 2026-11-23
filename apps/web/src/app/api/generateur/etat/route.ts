/**
 * ETAGE 4 — L'ETAT D'UNE GENERATION, pour le polling de l'ecran. Lecture
 * seule, restreinte au proprietaire : la ligne d'un autre n'existe pas.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { etatGeneration, type BaseLecture } from '@/lib/apps/service-generations'
import { reserverLesCoutsAuFondateur } from '@/lib/apps/couts-visibles'

export const runtime = 'nodejs'

async function getSansReserve(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const etat = await etatGeneration({
    base: supabaseAdmin as unknown as BaseLecture,
    table: TABLE_GENERATIONS,
    id,
    proprietaire: garde.userId, // dette 6a : jamais l'email comme identite
  })
  if (etat === null) return NextResponse.json({ error: 'generation inconnue' }, { status: 404 })
  return NextResponse.json(etat, { headers: { 'Cache-Control': 'no-store' } })
}

// LE COÛT N'EST JAMAIS MONTRÉ À UN CLIENT (2026-11-22) : couts-visibles.ts.
export const GET = reserverLesCoutsAuFondateur(getSansReserve)
