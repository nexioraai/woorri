import 'server-only'
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
import { nomValide } from '@/lib/apps/sous-domaine'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PHRASE_ABONNEMENT_REQUIS } from '@/lib/apps/compteur-phrases'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { COLONNES_PUBLICATION, publierOeuvre, refusAvantPublication, tablesPubliques, type LignePubliee } from '@/lib/apps/publier-oeuvre'
import { decisionDePublication, PHRASE_DECISION_ILLISIBLE } from '@/lib/apps/decision-publication'
import { accordPourStripe } from '@/lib/apps/accord-stripe'
import { ouvrirPaiementAppli } from '@/lib/payments/abonnement-appli'
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
    .select(COLONNES_PUBLICATION)
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

  // ── PUBLIER DEMANDE L'ABONNEMENT (décision du propriétaire, 2026-11-20).
  //
  // Un compte non exempté ne publie qu'une appli abonnée ET payée à l'heure
  // de l'appel. Le refus vient AVANT toute écriture (nom, jeton, base de
  // l'oeuvre). Une appli déjà publiée n'est jamais dépubliée ici : la garde
  // n'agit qu'au geste de publier. Compteur illisible : on refuse, sans rien
  // écrire — publier sans savoir si c'est payé, c'est publier gratuitement.
  //
  // ── PUBLIER EST PUBLIER, OÙ QU'IL SE TROUVE (2026-11-22). Une seule
  // décision, la même que celle que l'écran lit avant de demander le nom :
  // payé → publier ; non payé, carte ouverte → le nom s'enregistre et Stripe
  // s'ouvre ; carte fermée → 402, comme avant.
  const decision = await decisionDePublication(id, garde.userId, garde.email)
  if (decision === null) {
    return NextResponse.json({ error: PHRASE_DECISION_ILLISIBLE }, { status: 503 })
  }
  if (decision === 'fermee') {
    return NextResponse.json(
      { error: PHRASE_ABONNEMENT_REQUIS, abonnementRequis: true },
      { status: 402 },
    )
  }

  // ── LE NOM PUBLIC, SI LA PERSONNE EN CHOISIT UN (EP-291, 2026-10-30).
  //
  // `?sous=cpa-tchad` cree cpa-tchad.deribfy.com : CNAME chez Cloudflare,
  // domaine chez Vercel, adresse en base. Optionnel — sans lui, le lien par
  // jeton continue de servir, comme avant.
  const sous = new URL(req.url).searchParams.get('sous')?.toLowerCase().trim() ?? ''
  if (sous !== '' && !nomValide(sous)) {
    return NextResponse.json(
      { error: 'Ce nom n est pas utilisable : minuscules, chiffres et tirets, 3 a 40 signes, sans nom reserve.' },
      { status: 400 },
    )
  }
  if (sous !== '') {
    // LE NOM EST UNIQUE, et l unicite se verifie contre les AUTRES oeuvres :
    // republier la sienne sous le meme nom doit rester possible.
    //
    // ── NE FILTREZ JAMAIS PAR STATUT ICI. C'EST VOLONTAIRE.
    //
    // Une oeuvre SUPPRIMEE garde son `publication_slug` : la ligne survit en
    // PIERRE TOMBALE, et c'est ELLE qui tient la quarantaine du nom
    // (EP-308). Ajouter `.eq('statut', 'livree')` — « pour ne regarder que
    // les vraies applications » — rendrait la pierre tombale INVISIBLE et
    // libererait le nom EN SILENCE.
    //
    // Ce que ca couterait : quelqu'un d'autre reprend `nom.deribfy.app`, et
    // les anciens liens — partages par courriel, en signature, sur une carte
    // de visite — resolvent vers l'application d'un INCONNU. Pas un 404 :
    // une SUBSTITUTION SILENCIEUSE. Un nom publie ne se recycle pas.
    const pris = await supabaseAdmin
      .from(TABLE_GENERATIONS)
      .select('id')
      .eq('publication_slug', sous)
      .neq('id', id)
      .maybeSingle()
    if (pris.data !== null) {
      return NextResponse.json({ error: `« ${sous} » est deja pris par une autre application.` }, { status: 409 })
    }
    // ET PAR UN SITE : le proxy sert les sites D'ABORD sur deribfy.app —
    // un nom d'application qui heurte un slug de site serait une adresse
    // qui montre autre chose que ce qu'on vient de publier.
    const prisSite = await supabaseAdmin
      .from('sites')
      .select('id')
      .eq('slug', sous)
      .maybeSingle()
    if (prisSite.data !== null) {
      return NextResponse.json({ error: `« ${sous} » est deja pris par un site.` }, { status: 409 })
    }
  }

  let accord = false
  try {
    const corps = (await req.clone().json()) as { lecturePubliqueAcceptee?: unknown }
    accord = corps.lecturePubliqueAcceptee === true
  } catch {
    accord = false
  }
  const ligne = { data: lu.data as LignePubliee }
  const refus = refusAvantPublication(ligne, accord)
  if (refus !== null) return refus

  // ── NON PAYÉ, CARTE OUVERTE : LE NOM D'ABORD, PUIS STRIPE (2026-11-22).
  //
  // Le nom est ENREGISTRÉ avant le départ : s'il ne paie pas, il le garde, et
  // le prochain « Publier » — d'où qu'il vienne — va droit à Stripe. Un nom
  // enregistré ne publie RIEN : `/a/[sous]` exige un jeton, et le jeton n'est
  // écrit qu'à la publication. Une appli DÉJÀ en ligne (jeton présent) ne
  // reçoit pas de nouveau nom ici : il deviendrait public sans paiement.
  // Le paiement reçu, le webhook publie au nom enregistré (publier-apres-paiement).
  if (decision === 'payer') {
    if (lu.data.statut !== 'livree') {
      return NextResponse.json({ error: 'Seule une application livrée peut être abonnée.' }, { status: 409 })
    }
    if (sous !== '' && lu.data.publication_jeton === null && sous !== lu.data.publication_slug) {
      const nom = await supabaseAdmin
        .from(TABLE_GENERATIONS)
        .update({ publication_slug: sous })
        .eq('id', id)
        .eq('owner_id', garde.userId)
        .is('publication_jeton', null)
      if (nom.error !== null) {
        return NextResponse.json({ error: 'Le nom n’a pas pu être enregistré : rien n’a été prélevé. Réessayez.' }, { status: 500 })
      }
    }
    try {
      const r = await ouvrirPaiementAppli({
        app: id,
        proprietaire: garde.userId,
        email: garde.email,
        origine: req.headers.get('origin') ?? 'https://www.deribfy.com',
        accordLecture: accord ? accordPourStripe(tablesPubliques(ligne.data)) : null,
      })
      if (!r.ok) return NextResponse.json({ error: r.erreur }, { status: r.status })
      return NextResponse.json({ paiement: r.url }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (e) {
      console.error('[publier] ouverture du paiement', e)
      return NextResponse.json({ error: 'La page de paiement n’a pas pu s’ouvrir. Réessayez.' }, { status: 502 })
    }
  }

  return publierOeuvre({ id, proprietaire: garde.userId, lu: ligne, sous, origine: new URL(req.url).origin })
}

