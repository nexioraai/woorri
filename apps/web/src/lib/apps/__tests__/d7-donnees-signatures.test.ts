/**
 * D7 / D8 / D9 (2026-11-16) — l'œuvre 4d480027 « Suivi de stock ».
 *
 * MESURÉ sur le code servi (suivi.deribfy.app), fonctions exécutées :
 *   parMois(mouvements, "date", "quantite") → [] — « quantite » pris pour un
 *   nombre de mois (NaN) : graphique « Pas encore de données » à côté d'un
 *   compteur « 3 mouvements ce mois ».
 *   compterPar(mouvements, "type") → « entree » à l'écran (D8).
 *   genre: type === "entree" ? "succes" : "alerte" → un ton affiché comme mot,
 *   sans rapport avec le stock (D9).
 *
 * CAUSE : la consigne nommait ces fonctions SANS leurs arguments, et ne disait
 * rien des libellés lisibles. Même famille que L4.
 *
 * ① la consigne donne les signatures et la règle des libellés ;
 * ② l'appel fautif est VU par le vrai juge, même sur une œuvre sans données ;
 * ③ un appel correct monte toujours.
 */
import { describe, expect, it } from 'vitest'
import { assembler } from '../bac-a-sable'
import { jugerExecution } from '../juge-execution'
import { fichiersSysteme } from '../bibliotheque-ui'
import { consignePour } from '../boucle-directe'
import { motifTexte } from './motif-texte'

const oeuvre = (appel: string) => `
import React from 'react'
import { createRoot } from 'react-dom/client'
import { parMois, sommeParMois } from './systeme/donnees'
const mouvements: { date: string; quantite: number }[] = []
function App() { const serie = ${appel}; return <main><h1>Stock</h1><p>{serie.length}</p></main> }
createRoot(document.getElementById('racine')!).render(<App />)
`
async function juger(appel: string) {
  const carte = new Map<string, string>([['index.tsx', oeuvre(appel)], ...fichiersSysteme('XAF')])
  const v = await assembler(carte)
  if (!v.ok) throw new Error(v.erreur)
  return jugerExecution(v.code)
}

describe('D7 · D8 · D9 — les fonctions de données et les libellés', () => {
  it('① la consigne donne les signatures exactes et la règle des libellés lisibles', () => {
    const c = consignePour([])
    expect(c).toMatch(motifTexte('sommeParMois(elements, champDate, champMontant, nombre = 6)'))
    expect(c).toMatch(motifTexte('compterPar(elements, champ, libelles)'))
    expect(c).toMatch(motifTexte('Un COMPTE par mois : parMois ; une SOMME par mois : sommeParMois.'))
    expect(c).toMatch(motifTexte('jamais un ton (« succes », « alerte »)'))
  })

  it('② parMois(…, "date", "quantite") ne rend plus un vide muet : le juge le voit, même sans données', async () => {
    const r = await juger(`parMois(mouvements, 'date', 'quantite' as unknown as number)`)
    expect(r.indisponible).toBeUndefined()
    expect(r.monteDansSimulateur).toBe(false)
    expect(r.erreurs.map((e) => e.message).join(' ')).toMatch(/NOMBRE de périodes, reçu « quantite »/u)
  }, 60_000)

  it('③ un appel correct monte', async () => {
    const r = await juger(`[...parMois(mouvements, 'date'), ...sommeParMois(mouvements, 'date', 'quantite')]`)
    expect(r.erreurs).toEqual([])
    expect(r.monteDansSimulateur).toBe(true)
  }, 60_000)
})
