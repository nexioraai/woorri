/**
 * ⑬ (2026-11-18) — LA RÈGLE DES ÉCRITURES ARRIVE AU MODÈLE, PAR LES TROIS CHEMINS.
 *
 * Mesuré sur atita, en production : suppressions sans confirmation, erreur
 * de la base jamais lue, ligne retirée de l'écran quoi que la base ait
 * répondu. On ne répare pas atita : on répare la consigne. Ce test lit la
 * consigne PRODUITE — ce que le modèle reçoit —, pas le source qui l'assemble.
 *
 * ① génération AVEC base ; ② génération SANS base ; ③ retouche.
 * Chaque fois les quatre clauses : lire `error`, l'écran après succès,
 * retirer se confirme, le geste se dit.
 */
import { describe, expect, it } from 'vitest'
import { consignePour } from '../boucle-directe'
import { CONSIGNE_RETOUCHE } from '../retouche'
import type { EntiteDeclaree } from '../entites-declarees'
import { motifTexte } from './motif-texte'

const CLAUSES = [
  'lis TOUJOURS `error`',
  'l’écran ne change qu’APRÈS une réponse sans erreur',
  'RETIRER SE CONFIRME',
  'chaque geste réussi se dit',
]
const VENTE = {
  id: 'ent_vente', name: 'vente',
  fields: [{ id: 'fld_total', name: 'total', type: 'decimal', required: true }],
} as unknown as EntiteDeclaree

const contientTout = (texte: string) => {
  for (const c of CLAUSES) expect(texte, `clause absente : ${c}`).toMatch(motifTexte(c))
}

describe('⑬ la règle des écritures', () => {
  it('① génération avec base', () => contientTout(consignePour([VENTE])))
  it('② génération sans base', () => contientTout(consignePour([])))
  it('③ retouche', () => contientTout(CONSIGNE_RETOUCHE))
})
