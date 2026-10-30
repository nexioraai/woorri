/**
 * LIRE AVANT DE DEMANDER.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-19.
 *
 * Le propriétaire a joint un cahier des charges de douze pages — pays,
 * devise, encaissement, numéros : tout y était écrit. Le pré-vol a posé
 * « Que fait votre application avec l'argent ? ». `configurationADemander`
 * ne reçoit QUE les réponses : le brief ne lui parvient jamais.
 *
 * ── LA FRONTIÈRE AVEC LA DEVINETTE D'EP-255 B.
 *
 * Ce module ne DEVINE pas : il CITE. Déduire « France » de la langue
 * française est une devinette — l'erreur de v0. Lire « Tchad » écrit en
 * toutes lettres n'en est pas une. La consigne l'exige textuellement, et
 * ce qui n'est pas énoncé reste absent : la question sera posée.
 *
 * ── POURQUOI PAS DANS `/avant`.
 *
 * L'absence de dépense de `/avant` tient par la FORME de son fichier —
 * aucun client, aucune clé — et EP-257 la mesure sur le texte source. Un
 * appel ici l'aurait cassée. Cette route-ci coûte, peu, et le dit.
 *
 * ── RIEN N'EST CRU SUR PAROLE.
 *
 * La sortie est filtrée contre `QUESTIONS_DE_CONFIGURATION` : un code
 * inconnu ou une valeur hors choix est jetée. Le modèle ne peut donc pas
 * élargir la table, seulement la remplir.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { racineDepot } from '@/lib/apps/racine'
import { clientIA, MODELE_LEGER } from '@/lib/ia/client'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * ── LA CONSIGNE DISTINGUE DEUX SILENCES, ET C'EST LA CORRECTION DU 2026-10-30.
 *
 * L'ancienne version disait : « si ce n'est pas écrit noir sur blanc, tu
 * OMETS la clé ». Le modèle OBÉISSAIT parfaitement — mesuré : un cahier des
 * charges institutionnel complet, sans un mot sur l'argent, rendait
 * `{"MARCHE_VISE":"Cameroun"}` et la question « Que fait votre application
 * avec l'argent ? » était posée QUAND MÊME. Le propriétaire a joint douze
 * pages trois fois, et trois fois la même question est revenue.
 *
 * Le défaut était dans la règle, pas dans le modèle : elle confondait
 *
 *   · DEVINER — le pays depuis la langue, un numéro depuis un indice.
 *     Une faute, à juste titre interdite (EP-255 B, l'erreur de v0).
 *   · LIRE L'ABSENCE — un document COMPLET qui ne mentionne ni paiement ni
 *     vente dit, par son silence même : « elle n'encaisse rien ». La valeur
 *     `aucun` existe précisément pour cela, et la règle interdisait au
 *     modèle de la choisir.
 *
 * La frontière n'est plus « écrit ou pas » mais « document complet ou
 * fragment » : un brief détaillé qui se tait sur l'argent → `aucun` ; un
 * brief court ou vague → on omet, et la question se pose — elle est alors
 * légitime. Se tromper coûte un clic (la question garde son échappatoire
 * « si aucune ne correspond, dites-le ») ; poser une question dont la
 * réponse est dans le document coûte la confiance de la personne.
 */
const CONSIGNE = [
  'Tu lis la demande d’une personne qui veut faire construire une application.',
  'Tu ne construis rien. Tu relèves ce que le texte ÉNONCE — y compris par son silence.',
  '',
  'INTERDIT ABSOLU : deviner depuis la langue, le style ou un nom propre.',
  'Le pays ne se déduit JAMAIS de la langue. Un numéro ne s’invente JAMAIS.',
  '',
  'Rends UN SEUL objet JSON, sans texte autour. Clés possibles, toutes facultatives :',
  '  ARGENT_DANS_APP : "aucun" | "paiements" | "produits"',
  '      paiements = le texte dit qu’elle encaisse (abonnement, cotisation, facture, vente de services payés dans l’application)',
  '      produits  = le texte dit qu’elle vend des articles à livrer',
  '      aucun     = AUSSI quand le document est un cahier des charges COMPLET',
  '                  (sections, fonctionnalités détaillées) et qu’AUCUNE de ses',
  '                  fonctions ne mentionne encaisser ou vendre. Le silence d’un',
  '                  document complet est une réponse : elle n’encaisse rien.',
  '                  Un refus explicite (« commande en ligne : non ») compte aussi.',
  '  MARCHE_VISE : le pays NOMMÉ dans le texte, tel qu’il est écrit',
  '  NUMERO_ENCAISSEUR : un numéro de téléphone écrit en toutes lettres dans le texte',
  '',
  'Demande COURTE ou VAGUE (une phrase, une idée sans détail) ? Omets ce qui',
  'n’y figure pas — les questions se poseront, et elles seront légitimes.',
].join('\n')

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => null)) as { demande?: unknown } | null
  const demande = typeof corps?.demande === 'string' ? corps.demande.trim() : ''
  // Un texte vide n'a rien à dire. On ne paie pas pour l'apprendre.
  if (demande === '') return NextResponse.json({ deduites: {}, coutUsd: 0 })

  try {
    const { QUESTIONS_DE_CONFIGURATION } = (await import(
      /* webpackIgnore: true */ `${racineDepot()}/benchmarks/air-emission/elicitation.mjs`
    )) as { QUESTIONS_DE_CONFIGURATION: Record<string, { choix?: { valeur: string }[] }> }

    const r = await clientIA().messages.create({
      model: MODELE_LEGER,
      // ── 8 000, ET 400 FAISAIT EXACTEMENT CE QUE CETTE ROUTE DOIT EMPECHER.
      //
      // MESURE LE 2026-10-30, contre l'API reellement servie :
      //
      //     max_tokens=400   → blocs [thinking] SEUL, texte VIDE
      //     max_tokens=4000  → blocs [thinking, text], 831 caracteres
      //
      // Ce fournisseur rend DEUX blocs et facture la reflexion sur
      // `max_tokens`. A 400, tout le budget part a reflechir et il ne reste
      // RIEN pour repondre. `brut` vaut "", `indexOf('{')` vaut -1, et la
      // route rendait `{}` — en silence.
      //
      // Le proprietaire a donc joint un cahier des charges de douze pages et
      // s'est vu demander « Que fait votre application avec l'argent ? ». La
      // route ecrite POUR eviter cette question la provoquait.
      //
      // 400 etait calibre sur un modele qui ne reflechissait pas. Un brief
      // COURT demande deja 962 jetons de sortie ; douze pages en demandent
      // plus. 8 000 laisse la marge et reste sous le seuil de 21 312 au-dela
      // duquel le SDK exige le flux.
      max_tokens: 8000,
      system: CONSIGNE,
      // Le brief est borné : au-delà, on lit le début, qui porte l'intention.
      messages: [{ role: 'user', content: demande.slice(0, 24_000) }],
    })

    const brut = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const d = brut.indexOf('{')
    const f = brut.lastIndexOf('}')
    if (d === -1 || f <= d) {
      // ── « RIEN DEDUIT » ET « PAS PU LIRE » NE SONT PAS LA MEME CHOSE.
      //
      // C'est le defaut PROFOND, celui qui a rendu le precedent invisible.
      // Cette route rendait `{}` dans les DEUX cas : un brief muet et une
      // lecture ratee produisaient la meme reponse. L'ecran posait donc
      // toutes ses questions, et personne ne pouvait savoir pourquoi.
      //
      // Elle le DIT maintenant, et distingue la TRONCATURE du reste : meme
      // lecon que sur l'autre moteur, ou « Expected } but found EOF » se
      // lisait « mauvais code » alors que c'etait une coupure.
      const tronquee = r.stop_reason === 'max_tokens'
      console.warn('[lire-brief] reponse illisible', {
        stop_reason: r.stop_reason,
        blocs: r.content.map((b) => b.type),
        caracteres: brut.length,
      })
      return NextResponse.json({
        deduites: {},
        illisible: true,
        motif: tronquee
          ? 'La lecture du brief a ete coupee avant la fin : la limite de longueur est atteinte.'
          : 'La lecture du brief n a rien rendu d exploitable.',
      })
    }
    const lu = JSON.parse(brut.slice(d, f + 1)) as Record<string, unknown>

    // ── LE FILTRE. La table décide, jamais le modèle.
    const deduites: Record<string, string> = {}
    for (const [code, valeur] of Object.entries(lu)) {
      const q = QUESTIONS_DE_CONFIGURATION[code]
      if (q === undefined) continue
      if (typeof valeur !== 'string' || valeur.trim() === '') continue
      if (q.choix !== undefined && !q.choix.some((c) => c.valeur === valeur)) continue
      deduites[code] = valeur
    }
    return NextResponse.json({ deduites })
  } catch {
    // UNE LECTURE RATÉE NE BLOQUE RIEN : on retombe sur le questionnaire.
    return NextResponse.json({ deduites: {} })
  }
}
