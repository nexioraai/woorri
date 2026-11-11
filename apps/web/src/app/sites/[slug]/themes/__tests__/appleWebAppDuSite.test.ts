// 2026-11-11 — le gabarit racine pose `appleWebApp.title = "Deribfy"` pour
// l'app installée sur iPhone. Le gabarit racine enveloppe AUSSI les sites des
// marchands : chacun doit REMPLACER ce bloc par le sien, sinon une boutique
// installée s'appellerait « Deribfy » sous son icône.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { metadonneesDuSite } from '../metadonneesDuSite'

describe('appleWebApp', () => {
  it('un site de marchand porte SON nom sous l’icône iPhone', () => {
    const m = metadonneesDuSite({ name: "Centrale Pharmaceutique d'Achats (CPA)" }, 'https://cpa-tchad.deribfy.app', 'cpa')
    expect(m.appleWebApp).toEqual({ capable: true, title: "Centrale Pharmaceutique d'Achats (CPA)" })
  })

  it('le guide d’installation de Deribfy n’est rendu que sur les pages de la plateforme', () => {
    const layout = readFileSync(join(__dirname, '../../../../layout.tsx'), 'utf8')
    expect(layout).toMatch(/\{plateforme && <InstallerDeribfy \/>\}/)
  })
})
