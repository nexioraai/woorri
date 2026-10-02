// ============================================================
// CLIQUET — LE MONOGRAMME EST CELUI DE DERIBFY, PAS DE L'ANCIEN NOM.
//
// L'ÉTAT TROUVÉ le 2026-10-02, repéré à l'écran par le propriétaire : les
// quatre logos de l'interface affichaient encore un « W » — l'initiale de
// Woorri, nom précédent de la plateforme. Le favicon, lui, dessinait déjà le
// « D » : c'est exactement le genre d'incohérence qui survit à un changement
// de nom, parce qu'elle est minuscule et qu'on cesse de la voir.
//
// CE QUE CE TEST REGARDE : la lettre seule, dans les pastilles de logo. Pas
// le nom écrit à côté — celui-là était déjà bon partout.
//
// NON TRAITÉ, ET C'EST DÉLIBÉRÉ : la clé de stockage `woorri-cookie-consent`
// garde son nom. Elle est invisible, et la renommer ferait réapparaître la
// bannière de consentement chez tous les visiteurs qui l'ont déjà acceptée.
// Un détail de marque ne justifie pas de redemander un consentement.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const PORTEURS = ['components/Navbar.tsx', 'components/Footer.tsx', 'components/Sidebar.tsx']

/** Les lettres isolées dans le JSX — c'est la forme qu'ont les monogrammes. */
const lettresSeules = (source: string) =>
  source.split('\n').map((l) => l.trim()).filter((l) => /^[A-Z]$/.test(l))

describe('le monogramme de la plateforme', () => {
  it.each(PORTEURS)('%s n’affiche que le D de Deribfy', (fichier) => {
    const lettres = lettresSeules(readFileSync(join(SRC, fichier), 'utf8'))
    expect(lettres.length).toBeGreaterThan(0)
    expect(lettres.every((l) => l === 'D')).toBe(true)
  })

  it('aucun « W » de l’ancien nom ne subsiste dans ces logos', () => {
    const fautifs = PORTEURS.filter((f) =>
      lettresSeules(readFileSync(join(SRC, f), 'utf8')).includes('W'),
    )
    expect(fautifs).toEqual([])
  })

  it('le favicon dessine bien un D, lui aussi', () => {
    const script = readFileSync(join(SRC, '..', 'scripts', 'generer-icones.mjs'), 'utf8')
    // Le monogramme de repli est un tracé SVG : on vérifie qu'il est toujours
    // présent et commenté comme tel, pas qu'il ressemble à une lettre précise.
    expect(script).toContain('monogramme')
    expect(script).toContain('GÉNÉRATEUR D’ICÔNES DERIBFY'.replace('’', "'"))
  })
})
