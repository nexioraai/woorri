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
 *
 * ── ET MAINTENANT, ELLE PEUT RÉPONDRE PAR UNE QUESTION (EP-136).
 *
 * « On ne peut pas construire un truc qu'on n'a pas compris. » Quand le juge
 * refuse pour une raison que SEUL l'humain peut lever, la route ne rend plus
 * un document de repli : elle rend des QUESTIONS, et rien d'autre. Sans
 * document, l'écran n'a rien à proposer de construire — l'interdit tient par
 * la forme de la réponse, pas par une consigne d'affichage.
 *
 * L'ÉTAT DU DIALOGUE VIT CHEZ LE CLIENT, et revient à chaque tour sous forme
 * d'intention `{ brief, addendum }`. Il est REJOUÉ par `repondre`, qui refuse
 * un code hors de la table des questions projetées : le navigateur ne peut
 * donc pas fabriquer un addendum arbitraire. Aucune session serveur, aucune
 * table — et une conversation qui survit à un rechargement de page.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { documentPour } from '@/lib/apps/pour'
import { intentionDepuis, premiereIntention, sterile } from '@/lib/apps/dialogue'
import { Veille, alerter } from '@/lib/apps/surveillance'

export const runtime = 'nodejs'
// ── 300 SECONDES, ET C'EST UNE MESURE.
//
// La lecture par IA d'une vraie demande — la marketplace du proprietaire,
// 9 406 jetons de sortie — a pris 96 SECONDES chronometrees. Cette route
// coupait a 120 : vingt-quatre secondes de marge pour une operation dont on
// ne controle pas la duree. Une demande un peu plus riche mourait en
// timeout, et l'utilisateur n'aurait vu qu'une erreur reseau.
//
// Les trois routes du generateur peuvent declencher cette lecture : les deux
// autres relisent la phrase quand aucun document ne leur est fourni. Elles
// portaient 120 et 60 — elles seraient mortes AVANT meme comprendre.
export const maxDuration = 300

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => null)) as {
    demande?: unknown
    intention?: unknown
    perimetre?: unknown
  } | null

  // DEUX ENTRÉES, UNE SEULE SORTIE. Premier message : une phrase. Tours
  // suivants : l'intention complète, brief scellé et réponses déjà données.
  const intention =
    corps?.intention === undefined || corps.intention === null
      ? await (async () => {
          const demande = typeof corps?.demande === 'string' ? corps.demande.trim() : ''
          return demande === '' ? null : await premiereIntention(demande)
        })()
      : await intentionDepuis(corps.intention)

  if (intention === null) {
    return NextResponse.json({ error: 'Dites ce que vous voulez construire.' }, { status: 400 })
  }

  const veille = new Veille(intention.brief)
  const r = await veille.temps('comprehension', () =>
    documentPour(intention, garde.email),
  )
  if ('erreur' in r) return NextResponse.json({ error: r.erreur }, { status: 422 })

  // ── DES QUESTIONS : ON NE CONSTRUIT RIEN, ET ON NE REND AUCUN DOCUMENT.
  if ('questions' in r) {
    // UNE RÉPONSE QUI NE RÉDUIT PAS LE PÉRIMÈTRE EST STÉRILE (EP-136). Sans
    // ce test, la même question reviendrait indéfiniment et chaque tour
    // coûterait un appel payant. On le DIT plutôt que de boucler.
    const avant = Array.isArray(corps?.perimetre) ? (corps.perimetre as string[]) : []
    const tourne = avant.length > 0 && (await sterile(avant, [...r.perimetre]))
    return NextResponse.json({
      questions: r.questions,
      perimetre: r.perimetre,
      intention,
      texteLu: r.texteLu,
      ...(r.coutUsd === undefined ? {} : { coutUsd: r.coutUsd }),
      ...(tourne
        ? {
            avertissement:
              'Votre réponse n’a pas levé ce qui manquait. Reformulez-la, ou décrivez autrement ce que vous attendez.',
          }
        : {}),
    })
  }

  // ── ON N'A PAS COMPRIS : AUCUN DOCUMENT NE SORT.
  //
  // L'ecran n'a donc rien a proposer de construire — les deux boutons ne
  // peuvent pas apparaitre. L'interdit tient par la FORME de la reponse, pas
  // par une condition d'affichage qu'un futur bouton pourrait oublier.
  if ('incompris' in r) {
    const rapport = veille.conclure()
    await alerter({
      ...rapport,
      anomalies: [
        ...rapport.anomalies,
        {
          phase: 'comprehension',
          code: 'echec',
          message: `Demande non comprise : ${r.detailTechnique ?? r.raison}`,
        },
      ],
      saine: false,
    })
    return NextResponse.json({ incompris: true, raison: r.raison, texteLu: r.texteLu })
  }

  if (r.echecIA !== undefined) {
    // L'ADMINISTRATEUR EST PRÉVENU même si l'utilisateur voit un repli propre :
    // « lecture simple » ressemble à une limite du produit, seul le courriel
    // dit que l'IA est TOMBÉE.
    const rapport = veille.conclure()
    await alerter({
      ...rapport,
      anomalies: [
        ...rapport.anomalies,
        {
          phase: 'comprehension',
          code: 'echec',
          // L'ALERTE RECOIT LE DETAIL, pas la phrase polie de l'ecran. Le
          // courriel est le seul endroit ou le code du diagnostic sert.
          message: `Lecture par IA indisponible : ${r.detailTechnique ?? r.echecIA}`,
        },
      ],
      saine: false,
    })
  }

  return NextResponse.json({
    parIA: r.parIA,
    compris: r.compris,
    ...(r.echecIA === undefined ? {} : { echecIA: r.echecIA }),
    // L'INTENTION REVIENT TOUJOURS : les tours suivants la renvoient telle
    // quelle, et les deux autres routes lisent `texteLu` — jamais le dernier
    // message seul, qui perdrait tout ce qui a été répondu avant.
    intention,
    texteLu: r.texteLu,
    // LE DOCUMENT SORT AVEC LA RÉPONSE : les deux autres routes le reçoivent
    // et le revalident, au lieu de relire la phrase et de repayer.
    document: r.document,
  })
}
