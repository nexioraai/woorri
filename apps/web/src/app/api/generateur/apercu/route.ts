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
import { Veille, alerter } from '@/lib/apps/surveillance'

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

  // SOUS SURVEILLANCE — chaque temps est mesuré, et ce qui sort d'une borne
  // est dit : au demandeur dans la réponse, à l'administrateur par courriel.
  const veille = new Veille(demande)
  try {
    const emission = await veille.temps('emission', () => emettreSansIa(demande))
    if (!emission.ok) return NextResponse.json({ error: emission.raison }, { status: 422 })

    const a = await veille.temps('apercu', () => construireApercu(emission.document))
    // Un aperçu de trois kilo-octets « réussit » et ne montre rien. La taille
    // fait partie du verdict, pas seulement l'absence d'exception.
    veille.mesurerSortie('apercu', a.octets)

    const rapport = veille.conclure()
    await alerter(rapport)
    return NextResponse.json({
      html: a.html,
      octets: a.octets,
      ms: a.ms,
      // LE VERDICT SORT AVEC LE RÉSULTAT. L'utilisateur n'a pas à deviner que
      // quelque chose a boité pendant que ça marchait.
      surveillance: { saine: rapport.saine, anomalies: rapport.anomalies },
    })
  } catch (e) {
    const rapport = veille.conclure()
    await alerter(rapport)
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Aperçu impossible.',
        surveillance: { saine: false, anomalies: rapport.anomalies },
      },
      { status: 500 },
    )
  }
}
