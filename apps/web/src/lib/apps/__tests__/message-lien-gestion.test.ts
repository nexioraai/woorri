/**
 * LE MESSAGE DE PUBLICATION DIT LA VÉRITÉ SUR LE LIEN DE GESTION (2026-11-27).
 *
 * Le propriétaire a relevé sur « Suivi de colis » : le lien « Espace de
 * gestion » est visible des visiteurs, alors que l'écran des identifiants
 * affirmait « Elle n'apparaît nulle part dans votre application ». La règle
 * du générateur (PLAN_CHEMIN_VISIBLE, décision du 16/11, maintenue le 27/11)
 * EXIGE ce lien visible : c'est la phrase qui mentait, pas l'appli.
 *
 * Le cliquet lie les deux : tant que le générateur exige un lien visible,
 * l'écran ne peut pas dire le contraire — et il nomme le lien.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { blocBase } from '../entites-declarees'
import { motifTexte } from './motif-texte'

describe('le message de publication et la règle du lien de gestion', () => {
  const ecran = readFileSync(join(__dirname, '../../../components/apps/IdentifiantsOeuvre.tsx'), 'utf8')
  const regle = blocBase([{ id: 'ent_x', name: 'chose', fields: [{ id: 'fld_nom', name: 'nom', type: 'text', required: true }] }])

  it('le générateur exige toujours un lien « Espace de gestion » visible', () => {
    expect(regle).toMatch(motifTexte('PORTER UN CHEMIN VISIBLE ET NOMMÉ VERS LA GESTION'))
  })

  it('l’écran des identifiants ne prétend plus que le lien est caché, et le nomme', () => {
    expect(ecran).not.toMatch(/n’appara[iî]t\s+nulle\s+part\s+dans\s+votre\s+application/u)
    expect(ecran).not.toMatch(/pas\s+même\s+savoir\s+que\s+cet\s+espace\s+existe/u)
    expect(ecran).toMatch(motifTexte('porte un lien « Espace de'))
  })
})
