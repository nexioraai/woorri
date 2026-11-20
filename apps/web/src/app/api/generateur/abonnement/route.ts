import 'server-only'
/**
 * S'ABONNER À UNE APPLICATION PAR CARTE — la page de paiement Stripe (décision 9A, 2026-11-20).
 *
 * POST ?id=<appli> → { url } : la page Stripe, 20 $ US / mois. Le paiement
 * revient par le webhook (`invoice.paid`), qui active SEUL l'abonnement — la
 * route ne déclare jamais rien de payé. L'appli doit être LIVRÉE et au compte
 * qui demande (filtré dans la requête).
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { ouvrirPaiementAppli } from '@/lib/payments/abonnement-appli'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const lu = await supabaseAdmin.from(TABLE_GENERATIONS).select('id, statut').eq('id', id).eq('owner_id', garde.userId).maybeSingle()
  if (lu.error !== null || lu.data === null) return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  if ((lu.data as { statut: string }).statut !== 'livree') {
    return NextResponse.json({ error: 'Seule une application livrée peut être abonnée.' }, { status: 409 })
  }

  const origine = req.headers.get('origin') ?? 'https://www.deribfy.com'
  try {
    const r = await ouvrirPaiementAppli({ app: id, proprietaire: garde.userId, email: garde.email, origine })
    if (!r.ok) return NextResponse.json({ error: r.erreur }, { status: r.status })
    return NextResponse.json({ url: r.url }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[abonnement] ouverture', e)
    return NextResponse.json({ error: 'La page de paiement n’a pas pu s’ouvrir. Réessayez.' }, { status: 502 })
  }
}
