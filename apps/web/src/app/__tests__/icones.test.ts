// ============================================================
// CLIQUET — LE FAVICON DE `create-next-app` NE REVIENT PAS.
//
// LE DÉFAUT PAYÉ : `src/app/favicon.ico` pesait 25 931 octets — octet pour
// octet le fichier livré par l'échafaudage Next. Personne ne l'avait remplacé,
// et Google affichait le triangle de Vercel à côté de deribfy.com pendant toute
// la vie du site.
//
// CE QUI REND CE DÉFAUT SOURNOIS : il n'y avait rien à corriger. Aucun code
// n'était faux, aucun test ne pouvait échouer, aucune page ne se comportait
// mal. Un fichier par défaut est INVISIBLE tant qu'on ne va pas le regarder.
// D'où ce cliquet : il regarde.
// ============================================================
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(process.cwd(), 'src', 'app')
const PUBLIC = join(process.cwd(), 'public')

/** Taille EXACTE du favicon livré par `create-next-app`. */
const FAVICON_ECHAFAUDAGE = 25_931

describe('icônes de marque — le défaut par défaut ne revient pas', () => {
  it('le favicon N EST PAS celui de l’échafaudage Next', () => {
    const chemin = join(APP, 'favicon.ico')
    expect(existsSync(chemin), 'aucun favicon : Google n’affichera rien').toBe(true)
    expect(
      statSync(chemin).size,
      'le favicon de `create-next-app` est revenu — relance `node scripts/generer-icones.mjs`',
    ).not.toBe(FAVICON_ECHAFAUDAGE)
  })

  it('le favicon est un ICO VALIDE portant plusieurs tailles', () => {
    // Un .ico d’une seule taille laisse le navigateur redimensionner lui-même,
    // et le résultat est flou là où il compte : l’onglet et le résultat Google.
    const donnees = readFileSync(join(APP, 'favicon.ico'))
    expect(donnees.readUInt16LE(0), 'octets réservés').toBe(0)
    expect(donnees.readUInt16LE(2), 'type ICO').toBe(1)
    expect(donnees.readUInt16LE(4), 'une seule taille ne suffit pas').toBeGreaterThanOrEqual(3)
  })

  it('les icônes attendues par Next et par le manifeste existent TOUTES', () => {
    for (const rel of ['icon.png', 'apple-icon.png']) {
      expect(existsSync(join(APP, rel)), `${rel} manquant`).toBe(true)
    }
    for (const taille of [48, 96, 192, 512]) {
      expect(
        existsSync(join(PUBLIC, 'icons', `icon-${taille}.png`)),
        `icon-${taille}.png manquant — le manifeste le référence`,
      ).toBe(true)
    }
    expect(existsSync(join(PUBLIC, 'og-deribfy.png')), 'image Open Graph manquante').toBe(true)
  })

  it('aucun reste de l’échafaudage Vercel dans `public/`', () => {
    // `next.svg` et `vercel.svg` sont livrés par l’échafaudage. Les laisser ne
    // casse rien, mais ils traînent sur un domaine de production et se
    // retrouvent parfois indexés — c’est la même négligence que le favicon.
    for (const reste of ['next.svg', 'vercel.svg']) {
      expect(existsSync(join(PUBLIC, reste)), `${reste} est un reste de l’échafaudage`).toBe(false)
    }
  })

  it('CONTRÔLE NÉGATIF : cette lecture sait voir un fichier absent', () => {
    expect(existsSync(join(APP, 'fichier-qui-n-existe-pas.ico'))).toBe(false)
  })
})
