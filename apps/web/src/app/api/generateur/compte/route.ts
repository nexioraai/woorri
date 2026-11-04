/**
 * LE COMPTE D'UNE ŒUVRE, VU DE L'ATELIER — et son renouvellement.
 *
 * ── LE DÉFAUT QUE CETTE ROUTE FERME, ET IL EST EN PRODUCTION.
 *
 * La publication crée un compte dont le mot de passe fait 31 signes, et le
 * rend UNE FOIS dans sa réponse JSON. Aucun écran ne le montre. Donc à cet
 * instant, chaque œuvre publiée crée une clé PERDUE À LA SECONDE OÙ ELLE
 * EST FAITE — et le propriétaire ne peut pas atteindre ses propres données.
 *
 * Le bouton de renouvellement rend la perte réparable : c'est pourquoi ce
 * n'est pas une catastrophe. Mais elle s'accumule à chaque publication tant
 * que l'écran n'existe pas.
 *
 * ── CE QUE LE GET REND, ET CE QU'IL NE PEUT PAS RENDRE.
 *
 * L'ADRESSE, toujours : elle se déduit de l'identifiant de l'œuvre, elle
 * n'est pas un secret, et le propriétaire doit la voir sans rien cliquer.
 *
 * LE MOT DE PASSE, jamais : on ne relit pas un mot de passe. Prétendre le
 * contraire serait mentir à l'écran. Il se RENOUVELLE.
 *
 * ── POURQUOI UNE ROUTE ET PAS UNE LECTURE DIRECTE.
 *
 * L'atelier est un composant client. La clé secrète de la base des œuvres
 * n'a rien à faire dans un paquet navigateur — EP-322 ⑥ l'interdit pour le
 * module qui pose les schémas, et la même raison vaut ici.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { preuvesDeMemoire } from '@/lib/apps/juge-persistance'
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import {
  adresseCompteOeuvre,
  CE_QUE_LE_COMPTE_OUVRE,
  renouvelerMotDePasse,
} from '@/lib/apps/compte-oeuvre'

export const runtime = 'nodejs'

/**
 * L'ŒUVRE APPARTIENT-ELLE À QUI DEMANDE, ET EST-ELLE PUBLIÉE ?
 *
 * L'identité filtre la requête, elle ne la vérifie pas après coup :
 * invariant du dépôt, appris à ses dépens. Lire d'abord puis comparer
 * laisserait une fenêtre où l'on a déjà la donnée d'autrui.
 */
async function oeuvreDe(
  id: string,
  proprietaire: string,
): Promise<{
  publiee: boolean
  aDesDonnees: boolean
  enMemoire: readonly { table: string; lue: boolean; ecrite: boolean }[]
  /** Ce que le code LIVRÉ range dans le navigateur — mesuré, pas supposé. */
  rangementNavigateur: readonly { fichier: string; quoi: string }[]
} | null> {
  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('publication_jeton, document, sections_acquises')
    .eq('id', id)
    .eq('owner_id', proprietaire)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) return null
  const doc = lu.data.document as {
    schema?: string
    fichiers?: Record<string, string>
  } | null
  // ── LE VERDICT DE PERSISTANCE VIT DANS `sections_acquises`, avec les
  //    quatre autres juges. On le relit ici parce que c'est le SEUL défaut
  //    dont la conséquence tombe APRÈS la livraison : les jetons tuent au
  //    démarrage, un contrôle mort se voit, une couverture partielle se
  //    lit. Une table en mémoire, elle, marche à l'écran — et c'est le
  //    rechargement qui l'apprend, à la personne qui perd sa saisie.
  const sections = lu.data.sections_acquises as {
    persistance?: { table: string; lue: boolean; ecrite: boolean }[] | null
  } | null
  return {
    publiee: typeof lu.data.publication_jeton === 'string' && lu.data.publication_jeton !== '',
    aDesDonnees: (doc?.schema ?? '').includes('create table'),
    enMemoire: sections?.persistance ?? [],
    // ── ON RELIT LES FICHIERS, parce que la phrase porte sur EUX.
    //
    // `sections_acquises` date de la génération ; les fichiers sont ce qui
    // a été livré. Pour dire ce qu'une application fait de ses saisies, on
    // regarde ce qui part, pas ce qu'un juge a noté en passant.
    rangementNavigateur: preuvesDeMemoire(new Map(Object.entries(doc?.fichiers ?? {}))).filter(
      (p) => p.quoi.includes('appel'),
    ),
  }
}

export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const oeuvre = await oeuvreDe(id, garde.userId)
  if (oeuvre === null) {
    return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  }

  // ── TROIS ÉTATS, ET L'ÉCRAN DOIT POUVOIR LES DISTINGUER.
  //
  // Une œuvre sans données déclarées n'a pas de compte, et c'est normal : il
  // n'y a rien à protéger. Une œuvre non publiée n'en a pas encore. Les
  // confondre ferait chercher une panne là où il n'y a qu'une étape.
  if (!oeuvre.aDesDonnees) {
    return NextResponse.json(
      {
        etat: 'sans-donnees',
        explication: CE_QUE_LE_COMPTE_OUVRE,
        enMemoire: oeuvre.enMemoire,
        // ── CE QUE LE CODE LIVRÉ FAIT VRAIMENT (2026-11-04).
        //
        // L'écran disait « ce que l'on y saisit disparaît au rechargement ».
        // Mesuré sur une œuvre réelle : QUATRE appels à `localStorage` dans
        // son `App.tsx`. Ses relevés survivaient au rechargement — la phrase
        // mentait, dans l'autre sens, et promettait une perte qui n'avait
        // pas lieu. On rend la mesure ; l'écran dira ce qu'elle dit.
        rangementNavigateur: oeuvre.rangementNavigateur,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
  if (!oeuvre.publiee) {
    return NextResponse.json(
      { etat: 'non-publiee', explication: CE_QUE_LE_COMPTE_OUVRE, enMemoire: oeuvre.enMemoire },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
  return NextResponse.json(
    {
      etat: 'actif',
      adresse: adresseCompteOeuvre(id),
      // CE QUI NE SE CONSERVE PAS, dit sur l'écran des DONNÉES — là où la
      // personne revient quand elle cherche ses données.
      enMemoire: oeuvre.enMemoire,
      // LE MOT DE PASSE N'EST PAS RENDU : il ne se relit pas. L'écran dit
      // qu'il se renouvelle, plutôt que de laisser chercher où le lire.
      explication: CE_QUE_LE_COMPTE_OUVRE,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

/**
 * REFAIT LE MOT DE PASSE — ce qui rend la limite du compte partagé vivable.
 *
 * Un mot de passe partagé ne se révoque pas individuellement. Sans ce geste,
 * la seule réponse à une fuite serait « republiez », et personne ne le
 * devinerait. Avec lui, la limite devient « un mot de passe partagé qu'on
 * renouvelle » — l'usage normal d'une clé d'atelier.
 */
export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const oeuvre = await oeuvreDe(id, garde.userId)
  if (oeuvre === null) {
    return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  }
  if (!oeuvre.aDesDonnees) {
    return NextResponse.json(
      { error: 'cette application ne conserve aucune donnée : elle n’a pas de compte' },
      { status: 409 },
    )
  }

  const cfg = configBaseOeuvres(process.env)
  if (!cfg.ok) {
    return NextResponse.json(
      { error: `base des œuvres indisponible : ${cfg.refus.motif}`, quoiFaire: cfg.refus.quoiFaire },
      { status: 503 },
    )
  }

  try {
    const c = await renouvelerMotDePasse({
      idOeuvre: id,
      url: cfg.config.url,
      cleSecrete: cfg.config.cleSecrete,
    })
    return NextResponse.json(
      {
        adresse: c.adresse,
        // RENDU UNE FOIS, et l'écran doit le dire : il ne se relira pas.
        motDePasse: c.motDePasse,
        explication: CE_QUE_LE_COMPTE_OUVRE,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    // ── LE REFUS DE VOL REMONTE TEL QUEL.
    //
    // Si le compte porte l'œuvre de quelqu'un d'autre, `renouvelerMotDePasse`
    // refuse — et ce refus doit arriver à l'écran, pas être avalé en « échec
    // du renouvellement ». Couper le voisin de son application serait pire
    // que ne rien faire.
    const motif = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'le renouvellement a échoué', motif }, { status: 409 })
  }
}
