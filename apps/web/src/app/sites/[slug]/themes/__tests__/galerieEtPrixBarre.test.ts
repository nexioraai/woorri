// ============================================================
// CLIQUET — CE QUE LE VISITEUR VOIT SANS CLIQUER, ET TOUTES LES PHOTOS.
//
// DEUX DÉFAUTS SIGNALÉS PAR LE MARCHAND, tous deux mesurés avant correction :
//
//   1. « les barrés ne sont visibles que si on clique sur le produit ».
//      Exact : `compareAt` n'était lu QUE par `MerchantProductModal`. Une
//      remise qu'on ne voit pas dans la grille ne fait pas vendre — l'acheteur
//      n'a aucune raison d'ouvrir la fiche.
//
//   2. « quand j'ajoute beaucoup de photos, les visiteurs n'en voient qu'une ».
//      Exact aussi : `mapShopProducts` n'émettait que `images[0]`. Les autres
//      étaient stockées, payées, et n'atteignaient jamais la grille ni la
//      modale.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const THEMES = join(process.cwd(), 'src', 'app', 'sites', '[slug]', 'themes')
const lire = (f: string) => readFileSync(join(THEMES, f), 'utf8')

/** Les quatre grilles qu'un visiteur parcourt avant de cliquer. */
const GRILLES = [
  'EditorialShopSection.tsx',
  'VifShopSection.tsx',
  'StorefrontDense.tsx',
  'FamilyFilter.tsx',
] as const

describe('le prix barré se voit SANS cliquer', () => {
  it('les QUATRE grilles affichent `compareAt`', () => {
    for (const g of GRILLES) {
      expect(lire(g).includes('compareAt'), `${g} : la remise reste invisible dans la grille`).toBe(true)
    }
  })

  it('elles le rendent BARRÉ — sinon ce n’est qu’un second prix, incompréhensible', () => {
    for (const g of GRILLES) {
      const src = lire(g)
      const i = src.indexOf('compareAt')
      expect(
        src.slice(Math.max(0, i - 200), i + 200).includes('line-through'),
        `${g} : \`compareAt\` affiché sans être barré`,
      ).toBe(true)
    }
  })
})

describe('on glisse DANS LA CARTE, sans avoir à cliquer', () => {
  // LE DÉFAUT SIGNALÉ APRÈS MA PREMIÈRE CORRECTION : j'avais mis la galerie
  // dans la modale et sur la fiche — c'est-à-dire DERRIÈRE un clic. Le
  // marchand met cinq photos et n'en voit toujours qu'une dans sa boutique :
  // rien n'indique que les autres existent, donc personne ne les cherche.
  it('les QUATRE grilles montent la galerie', () => {
    for (const g of GRILLES) {
      expect(lire(g).includes('<GalerieProduit'), `${g} : une seule photo dans la carte`).toBe(true)
    }
  })

  it('elles la rendent OPTIMISÉE — sinon la grille télécharge les originaux', () => {
    // Les photos stockées sont les ORIGINAUX (qualité 95, pleine définition).
    // Vingt articles sans optimiseur, c'est vingt originaux sur une 3G.
    for (const g of GRILLES) {
      const src = lire(g)
      const i = src.indexOf('<GalerieProduit')
      expect(src.slice(i, i + 460).includes('optimisee'), `${g} : galerie non optimisée`).toBe(true)
    }
  })

  it('un GLISSEMENT n’ouvre pas la fiche — la carte entière est cliquable', () => {
    // Sans cela, chaque glissement pour voir la photo suivante ouvrirait le
    // produit : le visiteur ne verrait jamais la deuxième vue, et croirait
    // l'avoir demandée par erreur.
    const g = lire('GalerieProduit.tsx')
    expect(g.includes('onClickCapture'), 'le clic qui suit le glissement n’est pas avalé').toBe(true)
    expect(g.includes('stopPropagation'), 'le glissement remonte à la carte').toBe(true)
  })
})

describe('toutes les photos atteignent le visiteur', () => {
  it('la projection émet le TABLEAU, pas seulement la première', () => {
    const src = lire('shared.tsx')
    expect(
      /images: Array\.isArray\(p\.images\) \? p\.images : \[\]/u.test(src),
      'la boutique n’émet toujours que `images[0]`',
    ).toBe(true)
  })

  it('la modale et la fiche passent par la GALERIE, plus par une `<img>` seule', () => {
    expect(lire('MerchantProductModal.tsx').includes('<GalerieProduit'), 'modale').toBe(true)
    const fiche = readFileSync(
      join(process.cwd(), 'src', 'app', 'sites', '[slug]', 'produits', '[id]', 'ProductPageView.tsx'),
      'utf8',
    )
    expect(fiche.includes('<GalerieProduit'), 'fiche produit').toBe(true)
  })

  it('la galerie écoute le GLISSEMENT — le geste du téléphone', () => {
    // Sur le marché visé, l'achat se fait au téléphone : viser une vignette de
    // 64 px n'y est pas un geste, glisser en est un.
    const g = lire('GalerieProduit.tsx')
    expect(g.includes('onTouchStart'), 'aucun départ de glissement').toBe(true)
    expect(g.includes('onTouchEnd'), 'aucune fin de glissement').toBe(true)
    // Sans cela, la page ne défile plus verticalement dès que le doigt passe
    // sur une photo — on aurait réparé la galerie en cassant la page.
    expect(g.includes("touchAction: 'pan-y'"), 'le défilement vertical est bloqué').toBe(true)
  })

  it('la galerie ne ROGNE pas — une galerie qui coupe ne montre pas le produit', () => {
    expect(lire('GalerieProduit.tsx')).toContain("objectFit: 'contain'")
  })
})
