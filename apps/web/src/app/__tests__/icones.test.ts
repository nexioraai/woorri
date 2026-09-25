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

// ── LES ICÔNES ONT DÉMÉNAGÉ DANS `public/`. M2-242.
//
// Sous `src/app/`, Next les traitait comme une CONVENTION et injectait
// lui-même `<link rel="icon" href="/favicon.ico?favicon.<hachage>.ico">` dans
// TOUTES les pages — y compris celles des boutiques marchandes, où cette
// balise arrivait EN PREMIER avec une URL qui change à chaque déploiement.
// Depuis `public/`, chaque page ne déclare que ses propres icônes.
//
// Ce cliquet a fait son travail au moment du déplacement : il est tombé sur
// les trois anciens chemins. C'est exactement ce qu'on lui demande.
const PLATEFORME = join(process.cwd(), 'public')
const PUBLIC = join(process.cwd(), 'public')

/** Taille EXACTE du favicon livré par `create-next-app`. */
const FAVICON_ECHAFAUDAGE = 25_931

describe('icônes de marque — le défaut par défaut ne revient pas', () => {
  it('le favicon N EST PAS celui de l’échafaudage Next', () => {
    const chemin = join(PLATEFORME, 'favicon.ico')
    expect(existsSync(chemin), 'aucun favicon : Google n’affichera rien').toBe(true)
    expect(
      statSync(chemin).size,
      'le favicon de `create-next-app` est revenu — relance `node scripts/generer-icones.mjs`',
    ).not.toBe(FAVICON_ECHAFAUDAGE)
  })

  it('le favicon est un ICO VALIDE portant plusieurs tailles', () => {
    // Un .ico d’une seule taille laisse le navigateur redimensionner lui-même,
    // et le résultat est flou là où il compte : l’onglet et le résultat Google.
    const donnees = readFileSync(join(PLATEFORME, 'favicon.ico'))
    expect(donnees.readUInt16LE(0), 'octets réservés').toBe(0)
    expect(donnees.readUInt16LE(2), 'type ICO').toBe(1)
    expect(donnees.readUInt16LE(4), 'une seule taille ne suffit pas').toBeGreaterThanOrEqual(3)
  })

  it('les icônes attendues par Next et par le manifeste existent TOUTES', () => {
    for (const rel of ['icon.png', 'apple-icon.png']) {
      expect(existsSync(join(PLATEFORME, rel)), `${rel} manquant`).toBe(true)
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
    expect(existsSync(join(PLATEFORME, 'fichier-qui-n-existe-pas.ico'))).toBe(false)
  })
})

describe('les icônes de la plateforme ne retournent PAS dans src/app', () => {
  it('aucun fichier de convention Next ne subsiste sous `src/app/`', () => {
    // LE DÉFAUT QU'ON EMPÊCHE DE REVENIR. Sous `src/app/`, ces trois noms sont
    // des CONVENTIONS : Next injecte alors ses propres balises dans TOUTES les
    // pages de l'application, boutiques marchandes comprises, avec une URL
    // portant un hachage de build qui change à chaque déploiement.
    //
    // Le contenu servi restait correct — `proxy.ts` réécrit `/favicon.ico`
    // vers l'icône du marchand — mais l'adresse était instable, et c'est
    // précisément ce que les moteurs demandent d'éviter pour une icône.
    for (const nom of ['favicon.ico', 'icon.png', 'apple-icon.png']) {
      expect(
        existsSync(join(process.cwd(), 'src', 'app', nom)),
        `src/app/${nom} est revenu : Next va réinjecter une balise d’icône ` +
          `à URL changeante dans toutes les pages, marchandes comprises`,
      ).toBe(false)
    }
  })

  it('la plateforme DÉCLARE ses icônes, puisqu’elles ne sont plus déduites', () => {
    // La moitié qui empêche de « corriger » en déplaçant sans rien déclarer :
    // deribfy.com se retrouverait alors sans icône du tout.
    const layout = readFileSync(join(process.cwd(), 'src', 'app', 'layout.tsx'), 'utf8')
    expect(/icons:\s*\{/u.test(layout), 'le layout racine ne déclare aucune icône').toBe(true)
    expect(layout.includes("'/favicon.ico'") || layout.includes('"/favicon.ico"')).toBe(true)
  })
})
