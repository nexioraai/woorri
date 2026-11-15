import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { COOKIE_APERCU, cheminDuCookie, dureeDuCookie } from '@/lib/apercu'

// ============================================================================
// POSE LE COOKIE D'APERÇU D'UN SITE — 2026-11-15. Voir src/lib/apercu.ts.
//
// Le navigateur envoie le jeton de session (en-tête Authorization, comme
// toutes les routes de l'éditeur). Le MÊME garde que l'éditeur décide :
// propriétaire du site, ou administrateur de la plateforme. Le cookie :
//   · porte ce jeton, tel quel — c'est la base qui juge ce qu'il ouvre
//     (vue `sites_public`), jamais ce cookie ;
//   · HttpOnly : le JavaScript des pages ne peut pas le lire ;
//   · limité à `/sites/<slug>` : aucune autre page, aucune route API ;
//   · vit au plus une heure, et jamais plus que le jeton.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug, 'id')
  if (!garde.ok) return garde.response

  const jeton = req.headers.get('authorization')!.replace('Bearer ', '')
  const duree = dureeDuCookie(jeton)
  if (duree <= 0) return NextResponse.json({ error: 'Session expirée. Reconnectez-vous.' }, { status: 401 })

  const reponse = NextResponse.json({ adresse: cheminDuCookie(slug) })
  reponse.cookies.set(COOKIE_APERCU, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: cheminDuCookie(slug),
    maxAge: duree,
  })
  reponse.headers.set('Cache-Control', 'private, no-store')
  return reponse
}
