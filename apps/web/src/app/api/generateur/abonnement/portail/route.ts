import 'server-only'
/**
 * GÉRER SON ABONNEMENT — le portail Stripe du compte (2026-11-20).
 *
 * POST ?id=<appli> → { url } : résilier (en fin de période, réglage du
 * portail), changer de carte, lire ses factures. Le retour ramène à l'atelier.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { ouvrirPortail } from '@/lib/payments/abonnement-appli'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  const origine = req.headers.get('origin') ?? 'https://www.deribfy.com'
  try {
    const url = await ouvrirPortail({ proprietaire: garde.userId, email: garde.email, retour: `${origine}/atelier/${id}` })
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[abonnement] portail', e)
    return NextResponse.json({ error: 'Le portail n’a pas pu s’ouvrir. Réessayez.' }, { status: 502 })
  }
}
