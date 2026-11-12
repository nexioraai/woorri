// 2026-11-12 — LE JUGE MONTE AUSSI L'ESPACE DE GESTION.
//
// Mesuré sur une vraie génération (tir « tableau de bord », 0,107 $) :
// l'accueil public démarrait, la gestion PLANTAIT à l'ouverture, et l'œuvre
// a été ACCEPTÉE — le juge partait de l'accueil, et aucun lien public ne
// mène à #gestion. Cette fixture reproduit exactement cette forme.
import { describe, it, expect } from 'vitest'
import { assembler } from '../bac-a-sable'
import { jugerExecution } from '../juge-execution'
import { ADRESSE_GESTION } from '../entites-declarees'

const APP = `
import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
function Gestion() {
  const points = undefined
  return <div>{points.length}</div>
}
function App() {
  const [route, setRoute] = useState(location.hash.startsWith('#gestion') ? 'gestion' : 'public')
  useEffect(() => {
    const f = () => setRoute(location.hash.startsWith('#gestion') ? 'gestion' : 'public')
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return route === 'gestion' ? <Gestion /> : <main><h1>Annonces</h1><p>Aucune annonce publiée.</p></main>
}
createRoot(document.getElementById('racine')).render(<App />)
`

describe('le juge monte l’espace de gestion', () => {
  it('l’accueil seul passe ; la gestion, montée, est refusée', async () => {
    const v = await assembler(new Map([['index.tsx', APP]]))
    expect(v.ok, v.ok ? '' : v.erreur).toBe(true)
    if (!v.ok) return
    const accueil = await jugerExecution(v.code)
    expect(accueil.indisponible).toBeUndefined()
    expect(accueil.monteDansSimulateur, 'l’accueil public démarre bien').toBe(true)
    const gestion = await jugerExecution(v.code, { adresse: ADRESSE_GESTION })
    expect(gestion.indisponible).toBeUndefined()
    expect(gestion.monteDansSimulateur, 'la gestion qui plante doit être VUE').toBe(false)
    expect(gestion.erreurs.map((e) => e.message).join(' ')).toMatch(/length/)
  }, 60_000)

  it('une adresse qui n’est pas une ancre est ignorée (pas d’injection d’URL)', async () => {
    const v = await assembler(new Map([['index.tsx', APP]]))
    if (!v.ok) return
    const r = await jugerExecution(v.code, { adresse: 'https://ailleurs.example/#gestion' })
    expect(r.monteDansSimulateur, 'une adresse refusée retombe sur l’accueil public').toBe(true)
  }, 60_000)
})
