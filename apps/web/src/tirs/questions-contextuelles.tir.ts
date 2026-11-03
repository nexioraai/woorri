/**
 * TIR — LE MODÈLE POSE-T-IL DES QUESTIONS QUI ONT UN SENS ?
 *
 * ── LA CAPTURE DU 2026-11-03, 23h48, et elle était indéfendable.
 *
 * Demande : « Application mobile pour calculer la consommation d'énergie
 * sur mon compteur de SNE ».
 *
 * Question posée : « Que fait votre application avec l'argent ? », avec
 * trois choix sur l'encaissement et la vente de produits à livrer.
 *
 * ── POURQUOI ELLE EST ARRIVÉE.
 *
 * `configurationADemander` ne reçoit QUE les réponses déjà données — jamais
 * le texte de la personne. Et la consigne de `lire-brief` disait, mot pour
 * mot : « Demande COURTE ou VAGUE ? Omets ce qui n'y figure pas ». Une
 * demande d'une ligne y tombait toujours.
 *
 * ── CE QUE CE TIR MESURE, SUR CETTE DEMANDE-LÀ.
 *
 * ① la question sur l'argent DISPARAÎT — le modèle comprend qu'un compteur
 *    n'encaisse rien ;
 * ② le modèle propose SES questions, tirées du métier.
 *
 * IL DÉPENSE : un appel au modèle léger. Quelques dix-millièmes de dollar.
 */
import { describe, expect, it } from 'vitest'
import { appendFileSync } from 'node:fs'
import { exigerFeuVert } from '../../vitest.tir.setup'
import { clientIA, MODELE_LEGER } from '@/lib/ia/client'

const DEMANDE = 'Application mobile pour calculer la consommation d’énergie sur mon compteur de SNE'
const trace = (l: string) => {
  appendFileSync('/tmp/questions.txt', l + '\n')
}

describe('tir · les questions du modèle', () => {
  it('ne demande plus ce que l’application fait avec l’argent', async () => {
    exigerFeuVert('lecture de la demande par le modèle (questions contextuelles)')

    // On rejoue la route : même consigne, même modèle, même demande.
    const { CONSIGNE } = await import('@/lib/apps/consigne-lire-brief')
    const r = await clientIA().messages.create({
      model: MODELE_LEGER,
      max_tokens: 2000,
      system: CONSIGNE,
      messages: [{ role: 'user', content: DEMANDE }],
    })
    const brut = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const lu = JSON.parse(brut.slice(brut.indexOf('{'), brut.lastIndexOf('}') + 1)) as Record<
      string,
      unknown
    >

    trace(`-- DEMANDE : ${DEMANDE}`)
    trace(`-- jetons : ${String(r.usage.input_tokens)} / ${String(r.usage.output_tokens)}`)
    trace('')
    trace(`-- ARGENT_DANS_APP rendu : ${String(lu.ARGENT_DANS_APP ?? '(omis)')}`)
    trace(`   -> la question sur l’argent ${lu.ARGENT_DANS_APP === undefined ? 'SERA POSÉE' : 'disparaît'}`)
    trace('')
    trace('-- CE QUE LE MODÈLE DEMANDE, LUI :')
    const qs = Array.isArray(lu.QUESTIONS) ? lu.QUESTIONS : []
    if (qs.length === 0) trace('   (aucune)')
    for (const q of qs as { texte?: string; choix?: string[] }[]) {
      trace(`   · ${String(q.texte)}`)
      for (const c of q.choix ?? []) trace(`       [ ${c} ]`)
    }

    // ── CE QU'ON EXIGE, ET RIEN DE PLUS.
    //
    // Le contenu des questions est du jugement de modèle : on ne l'impose
    // pas. Ce qu'on impose, c'est que l'absurdité mesurée ne revienne pas.
    expect(
      lu.ARGENT_DANS_APP,
      'le modèle n’a pas compris qu’un compteur d’énergie n’encaisse rien : la ' +
        'question sur l’argent sera posée à nouveau',
    ).toBe('aucun')
  }, 120_000)
})
