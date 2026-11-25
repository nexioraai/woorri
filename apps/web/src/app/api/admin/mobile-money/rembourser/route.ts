/**
 * « REMBOURSER » — fondateur seul (2026-11-23).
 * POST { id, paiementSortant, montant } : l'argent a déjà été renvoyé par le
 * fondateur DEPUIS LE TABLEAU DE BORD MONERAILS ; cette route écrit la ligne
 * « annulation » et coupe le service. Elle N'ENVOIE AUCUN ARGENT. Voir
 * remboursement.ts pour les garde-fous.
 */
import { NextResponse } from 'next/server'
import { estAdmin } from '@/lib/admin-emails'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { rembourserALaMain } from '@/lib/payments/mobile-money/remboursement'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  if (!estAdmin(garde.email)) return NextResponse.json({ error: 'Réservé au fondateur.' }, { status: 403 })
  const corps = (await req.json().catch(() => ({}))) as { id?: unknown; paiementSortant?: unknown; montant?: unknown }
  const id = typeof corps.id === 'string' ? corps.id : ''
  if (!/^[0-9a-f-]{36}$/u.test(id)) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const paiementSortant = typeof corps.paiementSortant === 'string' ? corps.paiementSortant : ''
  const montant = typeof corps.montant === 'number' ? corps.montant : Number.NaN
  try {
    const r = await rembourserALaMain({ id, par: garde.email ?? garde.userId, paiementSortant, montant })
    return r.ok ? NextResponse.json({ ok: true, effet: r.effet, derniere: r.derniere, objet: r.objet }) : NextResponse.json({ error: r.erreur }, { status: r.status })
  } catch (e) {
    return NextResponse.json({ error: 'Remboursement non inscrit.', motif: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
