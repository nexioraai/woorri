// 2026-11-12 — LE JUGE MONTE AUSSI L'ESPACE DE GESTION.
//
// Mesuré sur une vraie génération (tir « tableau de bord », 0,107 $) :
// l'accueil public démarrait, la gestion PLANTAIT à l'ouverture, et l'œuvre
// a été ACCEPTÉE — le juge partait de l'accueil, et aucun lien public ne
// mène à #gestion. Cette fixture reproduit exactement cette forme.
import { describe, it, expect } from 'vitest'
import { assembler } from '../bac-a-sable'
import { jugerExecution } from '../juge-execution'
import { ADRESSE_GESTION, type EntiteDeclaree } from '../entites-declarees'
import { boucleEcriture } from '../boucle-directe'

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

// LA MÊME ŒUVRE, AVEC UN CHEMIN VISIBLE vers la gestion (décision 2 du
// propriétaire, 2026-11-16) : le juge, qui part de l'accueil et clique,
// doit y arriver PAR CE LIEN et y voir le plantage.
const AVEC_LIEN = APP.replace(
  '<p>Aucune annonce publiée.</p></main>',
  '<p>Aucune annonce publiée.</p><a href="#gestion">Espace de gestion</a></main>',
)

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

  it('DÉCISION 1 · avec un lien visible, le juge parti de l’accueil atteint la gestion et y voit le plantage', async () => {
    expect(AVEC_LIEN).not.toBe(APP)
    const v = await assembler(new Map([['index.tsx', AVEC_LIEN]]))
    expect(v.ok, v.ok ? '' : v.erreur).toBe(true)
    if (!v.ok) return
    const r = await jugerExecution(v.code)
    expect(r.indisponible).toBeUndefined()
    expect(r.erreurs.map((e) => e.message).join(' '), 'le plantage de la gestion, atteinte par son lien').toMatch(/length/)
    expect(r.monteDansSimulateur).toBe(false)
  }, 60_000)

  it('une adresse qui n’est pas une ancre est ignorée (pas d’injection d’URL)', async () => {
    const v = await assembler(new Map([['index.tsx', APP]]))
    if (!v.ok) return
    const r = await jugerExecution(v.code, { adresse: 'https://ailleurs.example/#gestion' })
    expect(r.monteDansSimulateur, 'une adresse refusée retombe sur l’accueil public').toBe(true)
  }, 60_000)

  it('DÉCISION 1 · la boucle ne monte JAMAIS l’œuvre directement sur #gestion', async () => {
    // Un juge espion : il note chaque option reçue. Une œuvre à tables
    // déclenchait le second montage (adresse #gestion) avant le 2026-11-16.
    const options: unknown[] = []
    const espion = (async (_code: string, o?: unknown) => {
      options.push(o ?? null)
      return { monteDansSimulateur: true, erreurs: [], octetsRendus: 1, texte: '', ms: 0 }
    }) as typeof jugerExecution
    const DEPENSE: EntiteDeclaree = {
      id: 'ent_depense', name: 'depense',
      fields: [{ id: 'fld_libelle', name: 'libelle', type: 'text', required: true }],
    } as EntiteDeclaree
    const r = await boucleEcriture({
      demande: 'un carnet de dépenses',
      appeler: (async () => ({ texte: '=== index.tsx ===\nexport const a = 1', tronquee: false })) as never,
      toursMax: 1,
      juger: espion,
      jugerFaces: (async () => ({ aTourne: true, motif: null, defauts: [], silencesIndiscernables: false, montages: [] })) as never,
      entites: [DEPENSE],
    })
    expect(r.ok, r.ok ? '' : r.motif).toBe(true)
    expect(options.length, 'le juge d’exécution a bien tourné').toBeGreaterThan(0)
    expect(JSON.stringify(options), 'une adresse a été passée au juge').not.toMatch(/gestion|adresse/u)
  })
})

