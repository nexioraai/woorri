/**
 * D1 (2026-11-16) — LE JUGE D'EXÉCUTION POSE LA BASE QUE LA PAGE POSE.
 *
 * Mesuré (EXPERIENCE_UNE_VRAIE_APPLI.md §5.2) : la consigne dit au modèle de
 * lire `window.DERIBFY_BASE.url` ; la vraie page le pose toujours ; le
 * simulateur du juge ne le posait pas. L'œuvre écrite selon la consigne
 * mourait à l'import et était refusée.
 *
 * ① une œuvre qui suit la consigne se monte ;
 * ② l'objet vu par l'œuvre dans le juge est EXACTEMENT celui de la page
 *    d'aperçu — comparé à la sortie de `pageAutonome`, pas recopié.
 */
import { describe, expect, it } from 'vitest'
import { assembler } from '../bac-a-sable'
import { jugerExecution } from '../juge-execution'
import { pageAutonome } from '../boucle-directe'

const SELON_LA_CONSIGNE = `
import React from 'react'
import { createRoot } from 'react-dom/client'
const b = (window as any).DERIBFY_BASE
const enBase = b.url !== '' && window.origin !== 'null'
function App() { return <main><h1>Carnet</h1><p>{enBase ? 'base' : 'mémoire'}</p><pre id="base">{JSON.stringify(b)}</pre></main> }
createRoot(document.getElementById('racine')!).render(<App />)
`

describe('D1 · la base de la page, dans le juge', () => {
  it('① une œuvre qui lit window.DERIBFY_BASE comme le dit la consigne se monte', async () => {
    const v = await assembler(new Map([['index.tsx', SELON_LA_CONSIGNE]]))
    expect(v.ok, v.ok ? '' : v.erreur).toBe(true)
    if (!v.ok) return
    const r = await jugerExecution(v.code)
    expect(r.indisponible).toBeUndefined()
    expect(r.erreurs.map((e) => e.message).join(' ')).not.toMatch(/reading 'url'/u)
    expect(r.monteDansSimulateur).toBe(true)
    expect(r.texte).toMatch(/mémoire/u)
  }, 60_000)

  it('② c’est EXACTEMENT l’objet de la page d’aperçu', async () => {
    const v = await assembler(new Map([['index.tsx', SELON_LA_CONSIGNE]]))
    if (!v.ok) throw new Error(v.erreur)
    const r = await jugerExecution(v.code)
    const page = pageAutonome(v.code, 'x')
    const m = /window\.DERIBFY_BASE=Object\.freeze\((\{.*?\})\);<\/script>/u.exec(page)
    expect(m, 'la page ne pose plus DERIBFY_BASE sous cette forme').not.toBeNull()
    const attendu = JSON.parse(m![1]!) as unknown
    const vu = /(\{"url".*\}\})/u.exec(r.texte)?.[1]
    expect(vu, 'l’objet n’est pas lisible dans le rendu du juge').toBeDefined()
    expect(JSON.parse(vu!)).toEqual(attendu)
  }, 60_000)
})
