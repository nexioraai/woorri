/**
 * IDENTITÉ COURTE DE L'ATELIER (2026-11-18) — les couleurs de Deribfy, par leurs jetons.
 *
 * Décision du propriétaire : la barre du haut, la colonne de gauche et le fond
 * portent le bleu, la prune et l'or de Deribfy, sans halo, dégradé ni maquette.
 * Captures avant/après : docs/elite-protocol/evidence/atelier-identite-courte/.
 *
 * ① chaque zone emploie un jeton de la marque (globals.css @theme), jamais un
 *   code couleur en dur — la règle du design system du dépôt ;
 * ② la teinte est assez forte pour se voir : une première version à 16 % et
 *   6 % était imperceptible sur les captures.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

const atelier = readFileSync(path.join(__dirname, '../../../app/atelier/[id]/page.tsx'), 'utf8')

describe('identité courte de l’atelier', () => {
  it('① fond, barre du haut et colonne portent les jetons de la marque', () => {
    expect(atelier).toMatch(motifTexte('overflow-hidden bg-bg-deep text-white'))
    expect(atelier).toMatch(motifTexte('border-b border-brand-gold/45 bg-brand-prune/[0.35] px-4'))
    expect(atelier.split('border-brand-blue/35 bg-brand-blue/[0.12]').length - 1).toBe(2)
    expect(atelier).not.toMatch(motifTexte('bg-[#0A050E]'))
  })
})
