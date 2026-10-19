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

const CONSIGNE = [
  'Tu lis la demande d’une personne qui veut faire construire une application.',
  'Tu ne construis rien. Tu relèves UNIQUEMENT ce que le texte ÉNONCE EXPLICITEMENT.',
  '',
  'INTERDIT ABSOLU : déduire, supposer, inférer depuis la langue, le style ou un nom.',
  'Si ce n’est pas écrit noir sur blanc, tu OMETS la clé. Une omission est correcte ;',
  'une supposition est une faute.',
  '',
  'Rends UN SEUL objet JSON, sans texte autour. Clés possibles, toutes facultatives :',
  '  ARGENT_DANS_APP : "aucun" | "paiements" | "produits"',
  '      aucun     = l’application affiche des montants sans jamais encaisser',
  '      paiements = elle encaisse de l’argent (abonnement, cotisation, facture)',
  '      produits  = elle vend des articles qu’il faut livrer',
  '  MARCHE_VISE : le pays nommé dans le texte, tel qu’il est écrit',
  '  NUMERO_ENCAISSEUR : un numéro de téléphone écrit en toutes lettres dans le texte',
  '',
  'Rien d’explicite ? Rends {}.',
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
      max_tokens: 400,
      system: CONSIGNE,
      // Le brief est borné : au-delà, on lit le début, qui porte l'intention.
      messages: [{ role: 'user', content: demande.slice(0, 24_000) }],
    })

    const brut = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const d = brut.indexOf('{')
    const f = brut.lastIndexOf('}')
    if (d === -1 || f <= d) return NextResponse.json({ deduites: {}, coutUsd: 0 })
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
