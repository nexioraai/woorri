import 'server-only'
/**
 * PUBLIER UNE ŒUVRE — le cœur, partagé (2026-11-22).
 *
 * Déplacé TEL QUEL de `api/generateur/publier/route.ts`. Deux appelants :
 *   · la route, au clic sur « Publier » (atelier ou « Mes projets ») ;
 *   · le webhook Stripe, quand le paiement d'une appli est reçu : l'appli se
 *     publie au nom déjà choisi, sans autre clic (décision du propriétaire,
 *     2026-11-22).
 * Un seul chemin de publication : ni la garde de la lecture publique, ni le
 * refus d'une œuvre amnésique, ni la pose des données ne se recopient.
 *
 * `refusAvantPublication` ne pose RIEN : elle refuse, ou rend `null`.
 * `publierOeuvre` pose et publie ; elle suppose la garde du paiement passée.
 */
import { NextResponse } from 'next/server'
import { lecturePubliqueDe, nomTable, type EntiteDeclaree } from '@/lib/apps/entites-declarees'
import { contenusPublics, phraseContenus, PHRASE_LISTE_ENTIERE } from '@/lib/apps/contenu-public'
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import { poserOeuvre } from '@/lib/apps/poser-oeuvre'
import { assurerCompteOeuvre } from '@/lib/apps/compte-oeuvre'
import { oeuvreExiste } from '@/lib/apps/oeuvre-existe'
import { creerSousDomaine, nomValide } from '@/lib/apps/sous-domaine'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { jetonPour, lienDePublication } from '@/lib/apps/publication'

/** Ce que la publication lit de la ligne — la route et le webhook lisent la même chose. */
export const COLONNES_PUBLICATION = 'publication_jeton, publication_slug, document, statut, demande, sections_acquises'
export type LignePubliee = {
  readonly publication_jeton: string | null
  readonly publication_slug: string | null
  readonly document: unknown
  readonly statut: string
  readonly demande: unknown
  readonly sections_acquises: unknown
}

/**
 * LE NOM D'ADRESSE EST-IL UTILISABLE PAR CETTE APPLI ? `null` si oui.
 *
 * Déplacé TEL QUEL de la route (2026-11-22) : « Publier » et « Changer
 * l'adresse » contrôlent un nom de la même façon — format, nom réservé, pris
 * par une AUTRE œuvre (pierres tombales comprises), pris par un site.
 * `sous` vide : rien à contrôler (lien simple).
 */
export async function refusDuNom(id: string, sous: string): Promise<NextResponse | null> {
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
  return null
}

/** Les tables que tout le monde pourra lire, telles que la garde les nomme. */
export function tablesPubliques(ligne: LignePubliee): string[] {
  const doc = ligne.document as { entites?: readonly EntiteDeclaree[] } | null
  return (doc?.entites ?? []).filter(lecturePubliqueDe).map(nomTable)
}

/**
 * LES REFUS QUI PASSENT AVANT TOUTE ÉCRITURE — et avant tout paiement : on ne
 * fait pas payer une appli qu'on refusera de publier. `accord` = la personne a
 * vu la liste publique et l'a acceptée.
 */
export function refusAvantPublication(lu: { readonly data: LignePubliee }, accord: boolean): NextResponse | null {
  // ── LES DONNÉES AVANT LE JETON, ET C'EST LA MÊME RÈGLE QUE LA SERRURE.
  //
  // Publier une application dont la couche de données est cassée, c'est
  // laisser quelqu'un y saisir du travail qui disparaîtra. Un échec propre
  // vaut mieux : rien n'est publié, et on dit à quelle étape ça a cédé.
  //
  // C'est l'inverse du sous-domaine, plus bas, qui vient APRÈS : lui est un
  // confort, la publication par jeton tient sans lui. Les données, non.
  //
  // ── ET UNE ŒUVRE SANS DONNÉES DÉCLARÉES NE POSE RIEN.
  //
  // Tant que le modèle ne déclare pas d'entités, il n'y a ni table à créer
  // ni porte à poser. Créer un schéma vide par œuvre ferait grossir la liste
  // des schémas exposés pour rien — et PostgREST la relit à chaque
  // rechargement.
  const docPublie = lu.data.document as {
    schema?: string
    politiques?: string
    entites?: readonly EntiteDeclaree[]
  } | null
  const schemaSql = docPublie?.schema ?? ''
  const aDesDonnees = schemaSql.includes('create table')

  // ── UNE ŒUVRE AMNÉSIQUE NE SE PUBLIE PAS (B, 2026-11-04).
  //
  // MESURÉ SUR L'ŒUVRE 60bf2c40 : le juge de persistance a tiré, a
  // reproché DEUX FOIS, le modèle n'a pas corrigé, et la boucle a livré
  // au dernier tour — le comportement voulu pour les quatre autres
  // juges, parce que refuser re-brûlerait l'argent du propriétaire.
  //
  // MAIS CE DÉFAUT-LÀ N'EST PAS RATTRAPABLE. Une application mutilée
  // visuellement se corrige ; une application qui oublie tout se
  // découvre APRÈS que des clients y ont saisi leurs données.
  //
  // LE MAL NAÎT DONC À LA PUBLICATION, PAS À LA LIVRAISON. On laisse la
  // personne garder ce qu'elle a payé — l'aperçu marche en mémoire, par
  // conception — et on ferme la seule porte qui expose ses clients.
  const persistance = (
    lu.data.sections_acquises as { persistance?: { table: string }[] } | null
  )?.persistance
  if (
    !aDesDonnees &&
    Array.isArray(persistance) &&
    persistance.length === 1 &&
    persistance[0]?.table === ''
  ) {
    const demande = typeof lu.data.demande === 'string' ? lu.data.demande : ''
    return NextResponse.json(
      {
        error:
          'Cette application affiche un historique, mais elle ne conserve rien : ' +
          'ce que vos clients y saisiront disparaîtra. Elle ne peut pas être ' +
          'publiée en l’état.',
        // ── UNE PUBLICATION BLOQUÉE SANS SORTIE EST UN MUR.
        //
        // Sans ça, la personne a payé, tient une application qu'elle ne
        // peut pas publier, et n'a aucune idée de quoi faire. C'est pire
        // que de l'avoir refusée à la livraison.
        amnesique: true,
        regenerer: `${demande}\n\nEt conserve les données : je veux les retrouver au prochain démarrage.`.trim(),
        quoiFaire:
          'Régénérez en précisant que vous voulez conserver les données, ou ' +
          'demandez une modification qui retire cet écran.',
      },
      { status: 409 },
    )
  }
  // ── P5 · L'ÉCRAN DIT CE QUI SERA PUBLIC, AVANT QUE L'ADRESSE EXISTE.
  //
  // ── POURQUOI CE REFUS EXISTE, ET POURQUOI P4 NE SUFFIT PAS.
  //
  // P4 fait voir à M1 une table qui DEVIENT publique dans une
  // modification. Mais LA PREMIÈRE GÉNÉRATION N'A PAS DE DIFF : une table
  // publique dès sa naissance ne passe devant personne. Sans ce refus,
  // l'écran du propriétaire ne nommerait jamais ce qu'il ouvre.
  //
  // ── LE CAS QUI LE JUSTIFIE, ET IL N'EST PAS THÉORIQUE.
  //
  // Un modèle qui lit « les appels d'offres sont publics » dans un cahier
  // peut déclarer publique la table des SOUMISSIONS des fournisseurs. Sur
  // un marché public, ce serait une faute grave : les offres concurrentes
  // doivent rester SCELLÉES jusqu'à l'ouverture des plis. Un appel
  // d'offres est public ; ce qu'on y répond ne l'est pas.
  //
  // RIEN DANS LA FORME DE LA DÉCLARATION NE DISTINGUE CES DEUX TABLES.
  // Aucune grammaire ne peut donc trancher — seul un humain qui lit la
  // liste le peut, et il faut qu'il la lise AVANT, pas après.
  //
  // ── ET C'EST UN REFUS, PAS UN AVERTISSEMENT.
  //
  // « Un secret dans une page publiée ne se rattrape pas : elle est déjà
  // servie. » Une liste affichée à côté d'un bouton qu'on peut presser
  // sans la lire n'est pas une garde. Le second appel porte l'accord, et
  // c'est lui qui prouve que la liste est passée devant quelqu'un.
  const publiques = (docPublie?.entites ?? []).filter(lecturePubliqueDe).map(nomTable)
  if (publiques.length > 0 && !accord) {
    const liste = publiques.map((t) => `« ${t} »`).join(', ')
    // ── LE CONTENU, PAS SEULEMENT LE NOM (décision 2, 2026-11-16) : un
    // commerçant ne tire rien de « vehicule, reparation ». On dit ce qui
    // sera lu, colonne par colonne, et que la liste ENTIÈRE se télécharge.
    const contenus = contenusPublics(docPublie?.entites ?? [])
    return NextResponse.json(
      {
        error:
          `${publiques.length > 1 ? 'Ces listes seront lisibles' : 'Cette liste sera lisible'} ` +
          `PAR TOUT LE MONDE, sans compte : ${liste}. ` +
          `Tout le monde pourra lire : ${phraseContenus(contenus)}. ` +
          `${PHRASE_LISTE_ENTIERE} ` +
          'Personne ne pourra y écrire ; tout le monde pourra y lire.',
        // LE DRAPEAU ET LA LISTE VOYAGENT : l'écran doit pouvoir nommer
        // chaque table, pas seulement répéter une phrase.
        lecturePublique: true,
        tables: publiques,
        contenus,
        quoiFaire:
          'Relisez cette liste. Si une de ces listes contient quelque chose ' +
          'qui ne doit pas être lu par n’importe qui, demandez une ' +
          'modification AVANT de publier — une page servie ne se rattrape pas.',
      },
      { status: 409 },
    )
  }

  return null
}

/** POSE ET PUBLIE. La garde du paiement et `refusAvantPublication` sont passées. */
export async function publierOeuvre(o: {
  readonly id: string
  readonly proprietaire: string
  readonly lu: { readonly data: LignePubliee }
  readonly sous: string
  readonly origine: string
}): Promise<NextResponse> {
  const { id, lu, sous } = o
  const garde = { userId: o.proprietaire }
  const docPublie = lu.data.document as { schema?: string; politiques?: string } | null
  const schemaSql = docPublie?.schema ?? ''
  const aDesDonnees = schemaSql.includes('create table')

  let compte: { adresse: string; motDePasse: string | null } | null = null

  if (aDesDonnees) {
    const cfg = configBaseOeuvres(process.env)
    if (!cfg.ok) {
      return NextResponse.json(
        { error: `base des œuvres indisponible : ${cfg.refus.motif}`, quoiFaire: cfg.refus.quoiFaire },
        { status: 503 },
      )
    }
    const connexion = process.env.OEUVRES_DATABASE_URL_POOLER_TRANSACTION ?? ''
    if (connexion === '') {
      return NextResponse.json(
        {
          error:
            'OEUVRES_DATABASE_URL_POOLER_TRANSACTION absente — le schéma ne peut pas être posé.',
        },
        { status: 503 },
      )
    }
    const pose = await poserOeuvre({
      id,
      schemaSql,
      politiquesSql: docPublie?.politiques ?? '',
      connexion,
    })
    // ── CE QUI A ETE ELAGUE SE DIT, meme quand tout va bien.
    //
    // Une entree morte dans la liste exposee ne casse pas son oeuvre : elle
    // les casse TOUTES (PostgREST construit un seul cache pour toute la
    // liste). L'elagage est donc une REPARATION, et une reparation muette
    // ne s'explique pas le jour ou l'on cherche pourquoi une oeuvre a
    // disparu de la liste.
    if (pose.ok && pose.elagues.length > 0) {
      console.warn(
        `[publier] liste exposee elaguee : ${String(pose.elagues.length)} schema(s) ` +
          `absent(s) de la base retires — ${pose.elagues.join(', ')}`,
      )
    }
    if (!pose.ok) {
      return NextResponse.json(
        { error: `les données n’ont pas pu être posées (${pose.etape})`, motif: pose.motif },
        { status: 500 },
      )
    }
    try {
      const c = await assurerCompteOeuvre({
        idOeuvre: id,
        url: cfg.config.url,
        cleSecrete: cfg.config.cleSecrete,
        // L'ADRESSE LISIBLE (2026-11-18) : admin@<nom>.deribfy.app — le nom
        // demandé, sinon celui déjà publié. Sans nom, l'adresse longue reste.
        nom: sous !== '' ? sous : ((lu.data as { publication_slug?: string | null }).publication_slug ?? null),
        oeuvreExiste,
      })
      compte = { adresse: c.adresse, motDePasse: c.motDePasse }
    } catch (e) {
      // LE SCHÉMA EST POSÉ ET FERMÉ : rien ne fuit. Il manque la clé, et on
      // le dit au lieu de publier une porte que personne ne peut franchir.
      return NextResponse.json(
        {
          error: 'le compte de cette application n’a pas pu être préparé',
          motif: e instanceof Error ? e.message : String(e),
        },
        { status: 500 },
      )
    }
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
  const origine = o.origine
  const lienJeton = lienDePublication(jeton, origine)

  // ── LE SOUS-DOMAINE, APRES le jeton : s il echoue, la publication par
  // jeton TIENT quand meme, et l erreur est dite au lieu d etre avalee.
  if (sous !== '') {
    const clefs = {
      cloudflareToken: process.env.CLOUDFLARE_API_TOKEN ?? '',
      vercelToken: process.env.VERCEL_API_TOKEN ?? '',
      vercelProjectId: process.env.VERCEL_PROJECT_ID ?? '',
    }
    if (Object.values(clefs).some((v) => v === '')) {
      return NextResponse.json(
        { lien: lienJeton, dejaPublie, compte, erreurSousDomaine: 'cles de sous-domaine absentes du serveur' },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    const sd = await creerSousDomaine(sous, clefs)
    if (!sd.ok) {
      return NextResponse.json(
        { lien: lienJeton, dejaPublie, compte, erreurSousDomaine: sd.erreur },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    const ecritSlug = await supabaseAdmin
      .from(TABLE_GENERATIONS)
      .update({ publication_slug: sous })
      .eq('id', id)
      .eq('owner_id', garde.userId)
    if (ecritSlug.error !== null) {
      return NextResponse.json(
        { lien: lienJeton, dejaPublie, compte, erreurSousDomaine: 'adresse creee mais non enregistree — reessayez' },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    return NextResponse.json(
      { lien: `https://${sd.hote}`, lienJeton, dejaPublie, compte },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    { lien: lienJeton, dejaPublie, compte },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
