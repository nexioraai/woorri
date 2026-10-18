/**
 * ETAGE 4 — PUBLIER. Donner a l'application une adresse qu'on peut envoyer.
 *
 * ── CE QUE CETTE ROUTE FAIT, ET CE QU'ELLE NE FAIT PAS.
 *
 * Elle ecrit un jeton sur la ligne et rend le lien. ELLE NE CONSTRUIT RIEN :
 * la page est compilee a la LECTURE, par `/p/[jeton]`, exactement comme le
 * zip est recompile a chaque telechargement. La colonne `document` reste la
 * seule verite — rien de derive n'est stocke, donc rien ne peut se perimer.
 *
 * ── IDEMPOTENTE, ET CE N'EST PAS UN DETAIL DE CONFORT.
 *
 * `noteDeLivraison` promet noir sur blanc « le lien ne change pas, et la
 * version complete remplacera celle-ci ». Republier doit donc rendre LE MEME
 * lien : sans quoi tout lien deja envoye meurt, et la personne a qui on l'a
 * envoye ne sait pas pourquoi. `jetonPour` porte cette regle.
 *
 * ── RESTREINTE AU PROPRIETAIRE, PAR LA REQUETE ET PAS PAR UN TEST.
 *
 * `.eq('owner_id', garde.userId)` : la restriction voyage dans le filtre, donc
 * une ligne qui n'est pas la sienne n'est jamais lue, pas meme pour etre
 * refusee ensuite. Meme forme que toutes les routes voisines.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { jetonPour, lienDePublication } from '@/lib/apps/publication'
import { exigencesDuMagasin } from '@/lib/apps/exigences-magasin'
import { projectAirSchema } from '@deribfy/air-schema'
import { compileProject } from '@deribfy/compiler'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * CE QU'UNE PUBLICATION AUX MAGASINS EXIGERAIT ENCORE.
 *
 * ── POURQUOI SUR LA MEME ROUTE QUE `POST`.
 *
 * Les deux verbes parlent de la MEME chose — publier. Le POST donne une
 * adresse web, immediate et gratuite ; le GET dit ce qui manque encore pour
 * Google Play et l'App Store, ou rien n'est gratuit. Les separer laisserait
 * croire que ce sont deux sujets.
 *
 * ── ET LA MESURE VIENT DE L'EMISSION, PAS D'UNE LISTE.
 *
 * On COMPILE le projet natif et on lit son `app.json` reel. Une liste
 * d'exigences ecrite a cote derive le jour ou le moteur gagne une icone, et
 * l'ecran continuerait a reclamer ce qui est deja la.
 */
export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('document')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) {
    return NextResponse.json({ error: 'generation inconnue' }, { status: 404 })
  }
  const air = projectAirSchema.safeParse(lu.data.document)
  if (!air.success) return NextResponse.json({ error: 'pas encore d application' }, { status: 409 })

  try {
    const etat = exigencesDuMagasin(compileProject(air.data).files)
    return NextResponse.json(etat, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    // Un document schema-valide peut etre incompilable. On ne devine pas les
    // exigences d'un projet qui n'existe pas : le panneau se tait.
    return NextResponse.json({ error: 'projet incompilable' }, { status: 409 })
  }
}

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('publication_jeton, document, statut')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) {
    return NextResponse.json({ error: 'generation inconnue' }, { status: 404 })
  }

  // ── RIEN A PUBLIER SANS DOCUMENT, ET ON LE DIT EN CLAIR.
  //
  // La contrainte `publie_a_document` le refuserait de toute facon — mais une
  // erreur de contrainte remonterait un message de Postgres, et personne ne
  // doit lire du Postgres. On repond donc avant, avec une phrase utile.
  if (lu.data.document === null || lu.data.document === undefined) {
    return NextResponse.json(
      {
        error:
          "Cette generation n'a pas encore d'application a montrer. Attendez " +
          'la fin, puis publiez.',
      },
      { status: 409 },
    )
  }

  const jeton = jetonPour(lu.data.publication_jeton)
  const dejaPublie = jeton === lu.data.publication_jeton

  if (!dejaPublie) {
    const ecrit = await supabaseAdmin
      .from(TABLE_GENERATIONS)
      .update({ publication_jeton: jeton, publie_le: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', garde.userId)
    if (ecrit.error !== null) {
      return NextResponse.json({ error: 'la publication a echoue' }, { status: 500 })
    }
  }

  // ── L'ORIGINE VIENT DE LA REQUETE, PAS D'UNE VARIABLE D'ENVIRONNEMENT.
  //
  // Le lien doit etre cliquable depuis la ou la personne regarde : en
  // developpement c'est `localhost`, en production le domaine. Une base
  // configuree ailleurs se trompe toujours sur l'un des deux.
  const origine = new URL(req.url).origin
  return NextResponse.json(
    { lien: lienDePublication(jeton, origine), dejaPublie },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
