/**
 * LE LOT DE MODIFICATIONS (2026-11-24) — fenêtre « Ajouter des modifications ».
 *   GET  ?id=  → { possible, raison } ou { possible, taille, moyens } ;
 *   POST ?id=  → la page Stripe d'un paiement UNIQUE (carte) : { paiement }.
 * Le mobile money passe par la route du mobile money des applis, avec `objet=lot`.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { PHRASE_COMPTEUR_INDISPONIBLE } from '@/lib/apps/quota'
import { etatDuLot, ouvrirPaiementLot, PHRASE_LOT_SANS_ABONNEMENT, type EtatLot } from '@/lib/payments/lot-appli'
import { PHRASE_MOYEN_FERME } from '@/lib/apps/decision-publication'

export const runtime = 'nodejs'

const SANS_CACHE = { 'Cache-Control': 'no-store' }

type Garde =
  | { readonly reponse: Response }
  | { readonly id: string; readonly garde: { readonly userId: string; readonly email: string }; readonly etat: EtatLot }

async function garder(req: Request): Promise<Garde> {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return { reponse: garde.response }
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return { reponse: NextResponse.json({ error: 'id requis' }, { status: 400 }) }
  const lu = await supabaseAdmin.from(TABLE_GENERATIONS).select('id').eq('id', id).eq('owner_id', garde.userId).maybeSingle()
  if (lu.error !== null || lu.data === null) return { reponse: NextResponse.json({ error: 'application inconnue' }, { status: 404 }) }
  const etat = await etatDuLot(id, garde.userId, garde.email)
  if (etat === null) return { reponse: NextResponse.json({ error: PHRASE_COMPTEUR_INDISPONIBLE }, { status: 503 }) }
  return { id, garde: { userId: garde.userId, email: garde.email }, etat }
}

export async function GET(req: Request) {
  const g = await garder(req)
  if ('reponse' in g) return g.reponse
  return NextResponse.json(g.etat, { headers: SANS_CACHE })
}

export async function POST(req: Request) {
  const g = await garder(req)
  if ('reponse' in g) return g.reponse
  if (!g.etat.possible) return NextResponse.json({ error: PHRASE_LOT_SANS_ABONNEMENT }, { status: 409 })
  if (!g.etat.moyens.includes('carte')) return NextResponse.json({ error: PHRASE_MOYEN_FERME }, { status: 409 })
  try {
    const r = await ouvrirPaiementLot({ app: g.id, proprietaire: g.garde.userId, email: g.garde.email, origine: req.headers.get('origin') ?? 'https://www.deribfy.com' })
    if (!r.ok) return NextResponse.json({ error: r.erreur }, { status: r.status })
    return NextResponse.json({ paiement: r.url }, { headers: SANS_CACHE })
  } catch (e) {
    console.error('[lot] ouverture du paiement', e)
    return NextResponse.json({ error: 'La page de paiement n’a pas pu s’ouvrir. Réessayez.' }, { status: 502 })
  }
}
