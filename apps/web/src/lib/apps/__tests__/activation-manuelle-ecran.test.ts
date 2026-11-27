/**
 * /admin (2026-11-27) : « Offrir (épreuve) » dans la MÊME rangée que « Vérifier avant d’activer »,
 * et la liste dit « offerte » ou « payée » par `formuleLisible`, jamais par un libellé écrit en dur.
 * Fichier à part : il lit du source, l'autre non (EP-364 compte les ancres des fichiers qui lisent du source).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { motifTexte } from './motif-texte'

describe('l’écran de /admin', () => {
  it('« Offrir (épreuve) » est dans la MÊME rangée que « Vérifier avant d’activer » (visible sans défiler)', () => {
    const src = readFileSync(join(__dirname, '../../../components/admin/ActivationManuelle.tsx'), 'utf8')
    const rangee = /<div className="mt-4 flex[^"]*">\s*<button[^]*?<\/div>/u.exec(src)?.[0] ?? ''
    expect(rangee).toMatch(motifTexte('Vérifier avant d’activer'))
    expect(rangee).toMatch(motifTexte('Offrir (épreuve)'))
    expect(src.match(/>Offrir \(épreuve\)</gu)).toHaveLength(1)
    expect(src).toMatch(motifTexte('formuleLisible(a, jour)'))
    expect(src).not.toMatch(/`payée\s+jusqu’au/u)
  })
})
