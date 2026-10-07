/**
 * L'APERÇU — l'application à l'écran, sans téléchargement.
 *
 * Rend une page HTML COMPLÈTE et autonome. L'interface la met dans un cadre
 * isolé : ce qui s'affiche est la vraie application, montée par son vrai
 * runtime, pas une maquette dessinée à côté.
 *
 * Le paquet est assemblé EN MÉMOIRE à chaque appel. Mesuré : ~940 ko en
 * ~200 ms. Pas de cache pour l'instant — un aperçu qui montrerait une version
 * périmée après une correction serait pire qu'un aperçu lent.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { emettreSansIa } from '@/lib/apps/emission'
import { construireApercu } from '@/lib/apps/apercu'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => null)) as { demande?: unknown } | null
  const demande = typeof corps?.demande === 'string' ? corps.demande.trim() : ''
  if (demande === '') {
    return NextResponse.json({ error: 'Dites ce que vous voulez construire.' }, { status: 400 })
  }

  const emission = emettreSansIa(demande)
  if (!emission.ok) return NextResponse.json({ error: emission.raison }, { status: 422 })

  try {
    const a = await construireApercu(emission.document)
    return NextResponse.json({ html: a.html, octets: a.octets, ms: a.ms })
  } catch (e) {
    // Un aperçu qui échoue ne doit pas emporter la conversation : l'archive
    // reste produisible, et c'est ce que l'interface propose.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Aperçu impossible.' },
      { status: 500 },
    )
  }
}
