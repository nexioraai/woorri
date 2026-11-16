/**
 * D13 / D14 / D15 (2026-11-16) — l'Atelier de réparation (b010d704).
 *
 * MESURÉ sur son code (export CSV de app_generations.document->'fichiers') :
 *   D13 · Clients.tsx et Vehicules.tsx employaient GrilleTableau comme un
 *         tableau : colonnes=[{ libelle, acces }], enfants=lignes (objets).
 *         GrilleTableau est une grille de cartes (colonnes: number). Rejoué
 *         avec le vrai juge : vide → monte ; UNE ligne → React #31.
 *   D14/D15 · le modèle a écrit son PROPRE ChoixApparence (useState, aucun
 *         enregistrement, <input type="color">) au lieu du fourni.
 *
 * ① la consigne le dit ; ② la grille mal employée lève une erreur NOMMÉE,
 * que le juge voit dès que la grille est rendue ; ③ l'emploi juste monte.
 */
import { describe, expect, it } from 'vitest'
import { assembler } from '../bac-a-sable'
import { jugerExecution } from '../juge-execution'
import { fichiersSysteme } from '../bibliotheque-ui'
import { consignePour } from '../boucle-directe'
import { motifTexte } from './motif-texte'

const oeuvre = (grille: string) => `
import React from 'react'
import { createRoot } from 'react-dom/client'
import { GrilleTableau, Carte } from './systeme/ui'
function App() { return ${grille} }
createRoot(document.getElementById('racine')!).render(<App />)
`
async function juger(grille: string) {
  const v = await assembler(new Map<string, string>([['index.tsx', oeuvre(grille)], ...fichiersSysteme('XAF')]))
  if (!v.ok) throw new Error(v.erreur)
  return jugerExecution(v.code)
}

describe('D13 · D14 · D15 — la grille et les réglages', () => {
  it('① la consigne dit ce qu’est GrilleTableau, et que ChoixApparence se pose tel quel', () => {
    const c = consignePour([])
    expect(c).toMatch(motifTexte('GrilleTableau est une grille de CARTES (colonnes = un nombre), jamais un tableau'))
    expect(c).toMatch(motifTexte('n\'en écris jamais un à toi'))
  })

  it('② une grille employée comme tableau lève une erreur nommée — même sans aucune ligne', async () => {
    const r = await juger(`<GrilleTableau colonnes={[{ libelle: 'Nom', acces: 'nom' }] as unknown as number} enfants={[]} />`)
    expect(r.monteDansSimulateur).toBe(false)
    expect(r.erreurs.map((e) => e.message).join(' ')).toMatch(/GrilleTableau est une GRILLE DE CARTES/u)
  }, 60_000)

  it('③ une grille de cartes juste monte', async () => {
    const r = await juger(`<GrilleTableau colonnes={3}><Carte>a</Carte><Carte>b</Carte></GrilleTableau>`)
    expect(r.erreurs).toEqual([])
    expect(r.monteDansSimulateur).toBe(true)
  }, 60_000)
})
