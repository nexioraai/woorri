/**
 * D2 (2026-11-16) — UNE DÉCLARATION REFUSÉE SE DIT, ET LE GABARIT ENSEIGNÉ PASSE.
 *
 * Mesuré (EXPERIENCE_UNE_VRAIE_APPLI.md §5.2) : le modèle déclarait sa table
 * selon le gabarit de la consigne ; le contrat la refusait (pas d'`id`) ; le
 * refus n'était dit nulle part. Le motif du tour suivant était identique au
 * mot près.
 *
 * ① le refus du tour part au modèle, au tour suivant ;
 * ② les deux gabarits que la consigne enseigne passent le contrat — un
 *    gabarit refusé enseigne l'erreur.
 */
import { describe, expect, it } from 'vitest'
import { projectAirSchema } from '@deribfy/air-schema'
import { boucleEcriture, REGLE_6_SANS_BASE } from '../boucle-directe'
import { blocBase, type EntiteDeclaree } from '../entites-declarees'
import { jugeMuet } from './juge-muet'

const valider = (e: unknown) => projectAirSchema.shape.entities.element.safeParse(e).success
const DEPENSE = {
  id: 'ent_depense', name: 'depense',
  fields: [{ id: 'fld_libelle', name: 'libelle', type: 'text', required: true }],
} as unknown as EntiteDeclaree
const facesMuettes = (async () => ({ aTourne: true, motif: null, defauts: [], silencesIndiscernables: false, montages: [] })) as never

/** Le premier tableau JSON qui suit « === DONNEES.json === », lignes jointes. */
function gabaritDe(consigne: string): unknown[] {
  const apres = consigne.slice(consigne.indexOf('=== DONNEES.json ==='))
  const debut = apres.indexOf('[')
  let prof = 0
  for (let i = debut; i < apres.length; i += 1) {
    if (apres[i] === '[') prof += 1
    if (apres[i] === ']') prof -= 1
    if (prof === 0) return JSON.parse(apres.slice(debut, i + 1).replace(/\n\s*/gu, ' ')) as unknown[]
  }
  throw new Error('gabarit introuvable')
}

describe('D2 · la déclaration refusée', () => {
  it('① le refus du tour arrive au modèle au tour suivant', async () => {
    const vus: string[] = []
    const SANS_ID = '=== index.tsx ===\nexport const a = 1\n=== DONNEES.json ===\n[{"name":"depense","lecturePublique":true,"fields":[{"name":"libelle","type":"text","required":true}]}]'
    const appeler = async (m: readonly { role: string; content: string }[]) => {
      vus.push(m[m.length - 1]!.content)
      return { texte: SANS_ID, tronquee: false }
    }
    await boucleEcriture({
      demande: 'un carnet de dépenses', appeler: appeler as never, toursMax: 2,
      juger: jugeMuet, jugerFaces: facesMuettes, entites: [DEPENSE], validerEntite: valider,
    })
    expect(vus.length).toBe(2)
    expect(vus[1], 'le refus n’est pas dit au modèle').toMatch(/TA DÉCLARATION DONNEES\.json A ÉTÉ REFUSÉE/u)
    expect(vus[1]).toMatch(/depense : forme refusée par le contrat de données/u)
  })

  it('② les gabarits enseignés passent le contrat, dans les deux branches', () => {
    for (const [branche, consigne] of [['sans base', REGLE_6_SANS_BASE], ['avec base', blocBase([DEPENSE])]] as const) {
      const g = gabaritDe(consigne)
      // « chose » est refusé EXPRÈS par le lecteur (nom vide de sens) : on
      // éprouve la FORME, donc on lui donne un vrai nom.
      const forme = g.map((e) => ({ ...(e as object), name: 'depense_bis', id: 'ent_depense_bis' }))
      for (const e of forme) expect(valider(e), `le gabarit « ${branche} » est refusé par le contrat`).toBe(true)
    }
  })
})
