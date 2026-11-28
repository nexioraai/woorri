/**
 * LA GÉNÉRATION LIT DONNEES.json COMME LA RETOUCHE (2026-11-28).
 *
 * ① Un JSON suivi de prose (la forme mesurée à 18:06) est lu : aucun refus ne
 *   part au modèle.
 * ② Un fichier sans JSON trouvable n'est plus tu : l'erreur exacte part au
 *   modèle au tour suivant, par le canal des refus (D2).
 * ③ Un JSON qui n'est pas une liste de tables se dit aussi.
 */
import { describe, expect, it } from 'vitest'
import { projectAirSchema } from '@deribfy/air-schema'
import { boucleEcriture } from '../boucle-directe'
import type { EntiteDeclaree } from '../entites-declarees'
import { jugeMuet } from './juge-muet'

const valider = (e: unknown) => projectAirSchema.shape.entities.element.safeParse(e).success
const DEPENSE = {
  id: 'ent_depense', name: 'depense',
  fields: [{ id: 'fld_libelle', name: 'libelle', type: 'text', required: true }],
} as unknown as EntiteDeclaree
const facesMuettes = (async () => ({ aTourne: true, motif: null, defauts: [], silencesIndiscernables: false, montages: [] })) as never

async function tours(donnees: string): Promise<string[]> {
  const vus: string[] = []
  const texte = `=== index.tsx ===\nexport const a = 1\n=== DONNEES.json ===\n${donnees}\n`
  await boucleEcriture({
    demande: 'un carnet de dépenses',
    appeler: (async (m: readonly { role: string; content: string }[]) => {
      vus.push(m[m.length - 1]!.content)
      return { texte, tronquee: false }
    }) as never,
    toursMax: 2, juger: jugeMuet, jugerFaces: facesMuettes, entites: [DEPENSE], validerEntite: valider,
  })
  return vus
}

describe('la génération et DONNEES.json', () => {
  it('① JSON suivi de prose : lu, aucun refus de déclaration', async () => {
    const vus = await tours(
      '[{"id":"ent_depense","name":"depense","fields":[{"id":"fld_montant","name":"montant","type":"decimal","required":true}]}]\n\nCe que j’ai ajouté : un montant.',
    )
    // Un second tour peut venir d'un AUTRE juge (le code factice ne lit pas
    // sa table) : ce qui compte, c'est qu'aucun refus de déclaration n'y soit.
    for (const m of vus.slice(1)) expect(m).not.toMatch(/DONNEES\.json A ÉTÉ REFUSÉE/u)
  })

  it('② aucun JSON trouvable : l’erreur exacte part au modèle', async () => {
    const vus = await tours('[{"id": "ent_depense", cassé')
    expect(vus).toHaveLength(2)
    expect(vus[1]).toMatch(/TA DÉCLARATION DONNEES\.json A ÉTÉ REFUSÉE/u)
    expect(vus[1]).toMatch(/DONNEES\.json : aucun JSON lisible \(.*JSON/u)
  })

  it('③ un JSON qui n’est pas une liste de tables se dit', async () => {
    const vus = await tours('{"bonjour": 1}')
    expect(vus).toHaveLength(2)
    expect(vus[1]).toMatch(/pas une liste de tables/u)
  })
})
