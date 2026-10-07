/**
 * CE QUE DERIBFY A COMPRIS — LA PREMIÈRE RÉPONSE DE LA CONVERSATION.
 *
 * ── POURQUOI CETTE ROUTE NE GÉNÈRE RIEN.
 *
 * Chez Bolt et Lovable, on décrit, on VOIT, puis on corrige en reparlant. Le
 * premier temps n'est pas une livraison : c'est un accusé de compréhension.
 * Un générateur qui produit immédiatement oblige l'utilisateur à découvrir ce
 * qu'il a demandé en lisant le résultat.
 *
 * ── DEUX LECTURES, ET ON DIT TOUJOURS LAQUELLE.
 *
 * Avec `GO_EMISSION_IA`, c'est P0 qui lit : il tire les acteurs, les concepts,
 * les parcours. Sans le jeton, une lecture pauvre — un nom, un ordre de
 * grandeur — qui ANNONCE sa pauvreté.
 *
 * Le champ `parIA` sort dans la réponse, et l'interface le montre. Laisser
 * croire qu'une IA a lu quand c'est une expression régulière serait le genre
 * de mensonge qu'on ne rattrape pas : l'utilisateur ajusterait sa phrase en
 * pensant parler à quelqu'un qui comprend.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { comprendre, depenseAutorisee, direCeQuOnACompris } from '@/lib/apps/comprendre'
import { emettreSansIa } from '@/lib/apps/emission'
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

  const veille = new Veille(demande)
  if (depenseAutorisee()) {
    const lu = await veille.temps('comprehension', () => comprendre(demande))
    if (lu.ok) {
      return NextResponse.json({
        parIA: true,
        compris: direCeQuOnACompris(lu.modele),
        // LE COÛT SORT. Celui qui paie doit pouvoir le voir, pas le deviner.
        coutUsd: lu.coutUsd,
      })
    }
    // Un échec de lecture ne se déguise pas en lecture pauvre : on le dit, et
    // on propose quand même ce qu'on sait faire sans modèle.
    //
    // ET L'ADMINISTRATEUR EST PRÉVENU. Un utilisateur qui voit « lecture
    // simple » pense à une limite du produit ; seul le courriel dit que la
    // lecture par IA est TOMBÉE.
    const repli = emettreSansIa(demande)
    const rapport = veille.conclure()
    await alerter({
      ...rapport,
      anomalies: [
        ...rapport.anomalies,
        { phase: 'comprehension', code: 'echec', message: `Lecture par IA indisponible : ${lu.raison}` },
      ],
      saine: false,
    })
    return NextResponse.json({
      parIA: false,
      echecIA: lu.raison,
      compris: repli.ok ? repli.compris : [],
    })
  }

  const repli = emettreSansIa(demande)
  return NextResponse.json({
    parIA: false,
    compris: repli.ok ? repli.compris : [],
  })
}
