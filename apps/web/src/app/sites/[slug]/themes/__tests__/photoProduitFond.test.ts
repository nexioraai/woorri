import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ════════════════════════════════════════════════════════════════════
//  LES PHOTOS DE MARCHAND NE LAISSENT PLUS DE BANDES VIDES.
//
// ── LE DÉFAUT, DÉCRIT PAR LES MARCHANDS.
//
// Ils photographient au téléphone — donc en PORTRAIT, souvent petit — et
// envoient tel quel. Le cadre de la vitrine est carré ou paysage. Le visiteur
// voyait la photo au milieu et DEUX BANDES VIDES de part et d'autre.
//
// ── POURQUOI CE CLIQUET LIT DU TEXTE.
//
// Le défaut est VISUEL : il ne se prouve qu'à l'œil, sur un vrai navigateur,
// et aucun test de ce dépôt ne calcule un rendu. Ce qu'on peut tenir ici, en
// revanche, c'est que la MÉCANIQUE reste en place — un `object-contain` seul,
// sans fond derrière, et les bandes reviennent sans que rien ne proteste.
//
// C'est un cliquet de NON-RETOUR, pas une preuve de beauté. La différence est
// dite plutôt que maquillée.
// ════════════════════════════════════════════════════════════════════

const ICI = join(import.meta.dirname, '..')
const lire = (f: string) => readFileSync(join(ICI, f), 'utf8')

describe('aucune photo de produit ne reste sur un cadre vide', () => {
  it('la grille de boutique passe par le composant partagé', () => {
    const src = lire('EditorialShopSection.tsx')
    expect(src).toContain('PhotoProduit')
  })

  it('la galerie produit le fait sur SES DEUX chemins de rendu', () => {
    // `optimisee` choisit entre `next/image` et `<img>`. Ne corriger qu'un
    // côté rendrait la boutique incohérente selon le thème — et le défaut
    // reviendrait pour la moitié des marchands.
    const src = lire('GalerieProduit.tsx')
    expect(src).toContain('PhotoProduit')
    expect(src).toMatch(/filter:\s*'blur\(/)
  })

  it('la fiche en modale remplit son cadre fixe de 480 px', () => {
    const src = lire('ProductModal.tsx')
    expect(src).toMatch(/filter:\s*'blur\(/)
  })
})

describe('le fond ne vole jamais la place à la photo', () => {
  const composant = readFileSync(
    join(import.meta.dirname, '..', '..', '..', '..', '..', 'components', 'boutique', 'PhotoProduit.tsx'),
    'utf8',
  )

  it("la photo reste ENTIÈRE — `object-contain`, jamais `cover`", () => {
    // `cover` remplirait le cadre en RECOGNANT : une chaussure sort coupée en
    // deux, un vêtement perd ses manches. Pour un produit, montrer l'objet
    // entier n'est pas négociable — c'est ce que le visiteur achète.
    expect(composant).toContain('object-contain')
  })

  it("le fond est MUET pour un lecteur d'écran", () => {
    // C'est une texture, pas une information. Sans `aria-hidden`, la même
    // photo serait annoncée deux fois.
    expect(composant).toContain('aria-hidden="true"')
    expect(composant).toMatch(/alt=""/)
  })

  it("le fond n'est JAMAIS prioritaire au chargement", () => {
    // Il ne doit pas retarder la photo que le visiteur vient voir.
    expect(composant).toMatch(/priority=\{false\}/)
  })

  it("le fond est AGRANDI avant d'être flouté", () => {
    // Un flou gaussien éclaircit les bords : sans agrandissement, un liseré
    // pâle apparaît tout autour du cadre.
    expect(composant).toContain('scale-110')
    expect(composant).toContain('blur-2xl')
  })
})
