/**
 * « ACTIVER CE PAIEMENT » — fondateur seul (lot L2, 2026-11-23).
 * POST { id } : une demande REFUSÉE, réelle, confirmée par le prestataire,
 * s'inscrit au registre (source manuelle, référence du prestataire, nom du
 * fondateur). Voir activation-main.ts pour les garde-fous.
 */
import { NextResponse } from 'next/server'
import { estAdmin } from '@/lib/admin-emails'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { activerALaMain } from '@/lib/payments/mobile-money/activation-main'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  if (!estAdmin(garde.email)) return NextResponse.json({ error: 'Réservé au fondateur.' }, { status: 403 })
  const corps = (await req.json().catch(() => ({}))) as { id?: unknown }
  const id = typeof corps.id === 'string' ? corps.id : ''
  if (!/^[0-9a-f-]{36}$/u.test(id)) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  try {
    const r = await activerALaMain(id, garde.email ?? garde.userId)
    return r.ok ? NextResponse.json({ ok: true, statut: r.statut }) : NextResponse.json({ error: r.erreur }, { status: r.status })
  } catch (e) {
    return NextResponse.json({ error: 'Activation impossible.', motif: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
