/**
 * POINT 1 (2026-11-18) — UN SEUL LIEN VERS L'ESPACE DE GESTION SUR LA FACE PUBLIQUE.
 *
 * Mesuré sur la vitrine de pharma : « Ouvrir l'espace de gestion » deux fois,
 * dans l'en-tête et dans la carte — un visiteur de stand le voit. La consigne
 * disait « sur chaque écran public » sans dire « un seul ».
 *
 * ① le juge des faces COMPTE les liens dans le RENDU (montage sans session) ;
 * ② deux liens → un reproche qui le dit et dit quoi faire ; un seul → rien ;
 * ③ la consigne dit « UN SEUL par écran ».
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { jugerFaces, reprocheFaces, type VerdictFaces } from '../juge-faces'
import { consignePour } from '../boucle-directe'
import type { EntiteDeclaree } from '../entites-declarees'
import { motifTexte } from './motif-texte'

const vitrine = (liens: number) => `
const racine = document.getElementById('racine')
racine.innerHTML = '<header><h1>Pharmacie</h1>' +
  ${liens >= 1 ? `'<a href="#gestion">Ouvrir l’espace de gestion</a>'` : `''`} + '</header>' +
  '<main><p>Bienvenue.</p>' + ${liens >= 2 ? `'<a href="#gestion">Ouvrir l’espace de gestion</a>'` : `''`} + '</main>'
`
const VENTE = {
  id: 'ent_vente', name: 'vente',
  fields: [{ id: 'fld_total', name: 'total', type: 'decimal', required: true }],
} as unknown as EntiteDeclaree

describe('point 1 · un seul lien vers la gestion', () => {
  let deux: VerdictFaces
  let un: VerdictFaces
  beforeAll(async () => {
    deux = await jugerFaces(vitrine(2), [VENTE], { attenteMs: 600 })
    un = await jugerFaces(vitrine(1), [VENTE], { attenteMs: 600 })
  }, 90_000)

  it('① le juge compte les liens dans le rendu', () => {
    expect(deux.aTourne, String(deux.motif)).toBe(true)
    expect(deux.liensGestion).toBe(2)
    expect(un.liensGestion).toBe(1)
  })

  it('② deux liens → reproche ; un seul → rien', () => {
    expect(reprocheFaces(deux)).toMatch(motifTexte('TA FACE PUBLIQUE PORTE 2 LIENS VERS L\'ESPACE DE GESTION'))
    expect(reprocheFaces(deux)).toMatch(motifTexte('UN SEUL suffit'))
    expect(reprocheFaces(un) ?? '').not.toMatch(motifTexte('LIENS VERS L\'ESPACE DE GESTION'))
  })

  it('③ la consigne le dit', () => {
    expect(consignePour([VENTE])).toMatch(motifTexte('UN SEUL par écran, dans l’en-tête'))
  })
})
