/**
 * CE QUE « PUBLIER » PROPOSE POUR CE SITE (lot L5, 2026-11-25).
 * GET → { enLigne, lien, moyens, payeJusquAu, rappel } : les moyens ouverts
 * (carte si son prix Stripe est configuré ; mobile money si son interrupteur
 * l'ouvre, que le type le permet — jamais le dropshipping — et que le prix est
 * réglé), et l'échéance d'un site payé en mobile money. Propriétaire seulement.
 */
import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { etatPublicationSite } from '@/lib/payments/site-mobile-money'

export const runtime = 'nodejs'

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireSiteOwner(req, slug, 'id, slug, mode, published, subscription_status, owner_id')
  if (!auth.ok) return auth.response
  if (auth.viaAdmin) return NextResponse.json({ error: 'Réservé au propriétaire du site.' }, { status: 403 })
  const s = auth.site as { id: string; slug: string; mode: unknown; published: unknown; subscription_status: unknown; owner_id: string }
  return NextResponse.json(await etatPublicationSite(s, s.owner_id, auth.email ?? null), { headers: { 'Cache-Control': 'no-store' } })
}
