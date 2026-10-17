/**
 * LE PRÉ-VOL — LA SEULE ROUTE DU GÉNÉRATEUR QUI NE PEUT RIEN COÛTER.
 *
 * ── CE QU'ELLE RÉPOND, ET QUAND.
 *
 * Avant tout appel payant : ce qu'il reste à demander, et ce qui est déjà
 * acquis. Deux questions pour tout le monde — ce que l'application fait de
 * l'argent, et où elle sera utilisée — puis zéro à deux de plus, selon la
 * réponse de l'humain lui-même.
 *
 * ── POURQUOI UNE ROUTE À PART, ET PAS UN MODE DE `comprendre`.
 *
 * `comprendre` appelle `documentPour`, qui déclenche la lecture par P0 :
 * c'est sa raison d'être, et c'est payant. Y greffer un mode gratuit aurait
 * fait dépendre « ça ne coûte rien » d'une branche — donc d'une condition
 * qu'une modification future peut oublier. Ici l'absence de dépense tient
 * par la FORME du fichier : il n'importe aucun client, aucune clé, aucun
 * moteur. EP-257 le mesure sur le texte source plutôt que sur une promesse.
 *
 * ── L'ÉTAT VIT CHEZ LE CLIENT, comme pour l'addendum d'EP-136.
 *
 * Les réponses reviennent à chaque tour. Aucune session serveur, aucune
 * table — et un dialogue qui survit à un rechargement de page. Rien n'est
 * cru sur parole pour autant : une valeur hors de la table des choix ne
 * compte pas comme une réponse, et sa question revient.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { preVol } from '@/lib/apps/avant-de-depenser'

export const runtime = 'nodejs'

// ── TRENTE SECONDES, ET C'EST LARGE.
//
// Les trois autres routes du générateur portent 300 s parce qu'une lecture
// par IA a été chronométrée à 96 s. Celle-ci lit une table en mémoire :
// au-delà de quelques millisecondes, quelque chose est cassé, et un timeout
// court le DIT au lieu de faire attendre.
export const maxDuration = 30

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => null)) as { reponses?: unknown } | null
  // Un objet, ou rien. Un tableau ou une chaîne arrivant ici ne serait pas
  // une table de réponses, et la traiter comme telle rendrait un pré-vol
  // vide — donc « plus rien à demander », le pire des faux positifs.
  const reponses =
    corps?.reponses !== null &&
    typeof corps?.reponses === 'object' &&
    !Array.isArray(corps.reponses)
      ? (corps.reponses as Record<string, unknown>)
      : {}

  const r = await preVol(reponses)
  return NextResponse.json({
    questions: r.questions,
    configuration: r.configuration,
    complet: r.complet,
    // DIT À CHAQUE TOUR, parce que c'est l'information que personne n'avait :
    // à ce stade, rien n'a été dépensé.
    coutUsd: 0,
  })
}
