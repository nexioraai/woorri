// ============================================================
// CLIQUET — TOUTES LES VITRINES, ET DES POINTS QU'ON VOIT.
//
// Deux défauts distincts, découverts en vérifiant si la correction précédente
// couvrait VRAIMENT toutes les boutiques — livrées et à venir.
//
// ── 1. UNE VITRINE OUBLIÉE.
//
// La galerie avait été posée dans quatre grilles ; `NoirShopSection` n'en
// avait pas, ni prix barré. Aucune boutique à produits marchands n'utilise
// Noir AUJOURD'HUI — mais le sélecteur de thème l'offre à tout le monde
// (`components/edit/ThemeSelector.tsx`) et l'agent peut l'appliquer
// (`api/agent/[slug]/apply`, ALLOWED_THEMES). Un marchand qui bascule dessus
// aurait reperdu ses cinq photos et sa remise sans rien changer d'autre.
//
// ── 2. DES POINTS DANS LE DOM, ET INVISIBLES À L'ÉCRAN.
//
// Les points étaient rendus SOUS le cadre. Or les grilles enferment la
// galerie dans un conteneur à taille fixe ET `overflow-hidden` : le cadre y
// remplit toute la hauteur, les points débordaient et étaient ROGNÉS.
//
// MESURÉ SUR LE HTML RÉELLEMENT SERVI PAR `chanorfie.com` : 25 boutons de
// points dans le document, aucun visible. C'est la leçon la plus coûteuse de
// ce lot — j'avais « vérifié en production » en COMPTANT DES NŒUDS, ce qui ne
// prouve rien sur ce que le visiteur voit. Il fallait lire la structure CSS.
// ============================================================
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const THEMES = join(process.cwd(), 'src', 'app', 'sites', '[slug]', 'themes')
const lire = (f: string) =>
  readFileSync(join(THEMES, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^[ \t]*\/\/.*$/gmu, '')

/** Les vitrines qui rendent une GRILLE de produits du marchand. */
const GRILLES = [
  'EditorialShopSection.tsx',
  'VifShopSection.tsx',
  'StorefrontDense.tsx', // la vitrine d'Aurora, qui lui délègue tout son Shop
  'FamilyFilter.tsx',
  'NoirShopSection.tsx',
  // M2-247 — la grille des produits d'une page personnalisee. « Une page par
  // article : page colliers, page chaussures » — la demande des marchands.
  // C'est bien une grille de produits : elle doit donc porter la galerie et
  // le prix barre comme les autres.
  'PageProduits.tsx',
]

/**
 * Fichiers qui touchent à `p.image(s)` SANS être une grille de boutique.
 * Chacun porte sa raison : sans elle, ce registre deviendrait une liste
 * d'exemptions qu'on allonge pour faire taire le test.
 */
const HORS_GRILLE: Record<string, string> = {
  'CatalogSearch.tsx': 'catalogue FOURNISSEUR (CJ) — images du fournisseur, pas du marchand',
  'ProductModal.tsx': 'fiche d’un produit du catalogue fournisseur, montée par CatalogSearch',
  'NoirTheme.tsx': 'carrousel de HERO (5 produits), pas la grille — celle-ci est NoirShopSection',
  'EditorialTheme.tsx': '`p` y désigne une PAGE du site (site.pages), pas un produit',
  'VifTheme.tsx': 'idem — `p` y désigne une page',
  // M2-247 — Aurora filtrait ses pages sur le seul titre ; elle teste
  // desormais aussi `p.image`, comme les trois autres vitrines. `p` y designe
  // toujours une PAGE, jamais un produit : sa grille est StorefrontDense.
  'AuroraTheme.tsx': '`p` y désigne une PAGE du site — sa grille produits est StorefrontDense',
  'CartDrawer.tsx': 'lignes de panier, aucune image',
  'shared.tsx': 'projection et normalisation, aucun rendu',
  'MerchantProductModal.tsx': 'fiche détaillée — a déjà sa galerie, hors grille',
}

describe('aucune vitrine ne montre une seule photo', () => {
  it('les cinq grilles montent la galerie ET affichent le prix barré', () => {
    for (const f of GRILLES) {
      const src = lire(f)
      expect(src.includes('<GalerieProduit'), `${f} : une seule photo visible`).toBe(true)
      expect(src.includes('compareAt'), `${f} : la remise n’est pas visible sans clic`).toBe(true)
    }
  })

  it('AUCUNE vitrine n’échappe au registre — une 5e grille ne peut pas naître nue', () => {
    // Le vrai risque n'est pas celui d'aujourd'hui : c'est le thème qu'on
    // ajoutera demain, et qui repartira d'une copie d'un thème d'avant.
    const suspects = readdirSync(THEMES)
      .filter((f) => f.endsWith('.tsx'))
      .filter((f) => /\bp\.images?\b/u.test(lire(f)))
    for (const f of suspects) {
      expect(
        GRILLES.includes(f) || f in HORS_GRILLE,
        `${f} rend l’image d’un produit sans être déclaré : soit c’est une ` +
          `grille (ajoutez-le à GRILLES et montez-y la galerie), soit non ` +
          `(ajoutez-le à HORS_GRILLE AVEC SA RAISON)`,
      ).toBe(true)
    }
    expect(suspects.length, 'le balayage ne trouve plus rien — instrument cassé').toBeGreaterThan(5)
  })
})

describe('les points de progression sont VISIBLES, pas seulement présents', () => {
  const FICHIERS = readdirSync(THEMES).filter((f) => f.endsWith('.tsx'))

  it('toute galerie enfermée dans un conteneur qui ROGNE pose ses points en surimpression', () => {
    let vues = 0
    for (const f of FICHIERS) {
      const src = lire(f)
      let i = src.indexOf('<GalerieProduit')
      while (i > -1) {
        const fin = src.indexOf('/>', i)
        const balise = src.slice(i, fin > -1 ? fin : i + 600)
        const amont = src.slice(Math.max(0, i - 600), i)
        if (/overflow-hidden/u.test(amont)) {
          vues += 1
          expect(
            /points=["'](?:bas|haut)["']/u.test(balise),
            `${f} : galerie dans un conteneur \`overflow-hidden\` sans ` +
              `\`points\` — les points seront rendus SOUS le cadre et ROGNÉS, ` +
              `donc présents dans le DOM et invisibles à l’écran`,
          ).toBe(true)
        }
        i = src.indexOf('<GalerieProduit', i + 1)
      }
    }
    expect(vues, 'aucune galerie sous conteneur rognant — instrument cassé').toBeGreaterThanOrEqual(5)
  })

  it('la fiche et la modale gardent leurs points SOUS le cadre — rien ne les rogne', () => {
    // La moitié qui empêche de « corriger » en mettant `points` partout : en
    // surimpression, les points mangeraient le bas de la photo là où la place
    // ne manque pas.
    const modale = lire('MerchantProductModal.tsx')
    const i = modale.indexOf('<GalerieProduit')
    expect(i, 'galerie absente de la modale').toBeGreaterThan(-1)
    expect(/points=/u.test(modale.slice(i, i + 400))).toBe(false)
  })
})
