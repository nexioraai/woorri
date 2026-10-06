import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ════════════════════════════════════════════════════════════════════
//  « RENDRE PRO » — UN BOUTON, ET QUI SERT L'EXISTANT.
//
// ── POURQUOI CE N'EST PLUS AUTOMATIQUE.
//
// Ça l'était. Mesuré sur TROIS VRAIES PHOTOS d'`alloufshop` : deux réussites
// franches — une main tenant un flacon devant un rayon entier de parfums en
// ressort détourée sur blanc — et UN ÉCHEC.
//
// La troisième n'était pas une photo de téléphone mais une CAPTURE D'ÉCRAN de
// site, avec sa colonne de vignettes et son filigrane. Le modèle a pris le
// cadran de la montre pour le sujet, et le cadrage a perdu le bracelet :
// l'image est ressortie DÉGRADÉE, pas améliorée.
//
// Appliqué sans demander, ce traitement aurait donc abîmé une fiche qui allait
// bien, sans que personne ne le voie.
//
// ── ET POURQUOI IL PART D'UNE URL.
//
// C'est ce qui le rend utilisable sur les boutiques DÉJÀ EN LIGNE. Un bouton
// qui n'aurait traité que les fichiers fraîchement choisis aurait corrigé les
// photos futures et laissé les anciennes telles quelles : la boutique serait
// restée à moitié amateur, et le marchand aurait dû tout ré-envoyer.
//
// Les deux propriétés sont tenues ici parce qu'elles sont faciles à perdre
// l'une comme l'autre — et leur perte est silencieuse.
// ════════════════════════════════════════════════════════════════════

const SRC = readFileSync(join(import.meta.dirname, '..', 'ProductManager.tsx'), 'utf8')

describe("le détourage n'est PAS automatique", () => {
  it("la boucle d'envoi ne détoure plus", () => {
    // La ligne retirée : `const detouree = await detourerDansLeNavigateur(file)`
    // juste avant la construction du `FormData`.
    const envoi = /corps\.append\('file',\s*(\w+)\)/.exec(SRC)
    expect(envoi?.[1], "l'envoi doit porter le fichier CHOISI, pas une version traitée").toBe(
      'file',
    )
  })

  it('le détourage reste atteignable par un geste explicite', () => {
    expect(SRC).toMatch(/async function rendrePro\(/)
    expect(SRC).toMatch(/detourerDansLeNavigateur\(/)
  })
})

describe('le bouton sert les boutiques DÉJÀ EN LIGNE', () => {
  it('il part d’une URL, pas d’un fichier', () => {
    // La propriété qui rattrape une boutique entière sans rien ré-envoyer.
    expect(SRC).toMatch(/async function rendrePro\(url: string\)/)
    expect(SRC).toMatch(/await fetch\(url\)/)
  })

  it('il repasse par la chaîne d’envoi habituelle', () => {
    // Pour recevoir AUSSI l'exposition, la balance des blancs et le cadre
    // carré. Déposer le détourage seul aurait donné une photo propre mais
    // toujours mal cadrée.
    const corps = SRC.slice(SRC.indexOf('async function rendrePro('))
    expect(corps).toMatch(/\/api\/images\/upload/)
  })

  it("l'originale reste connue — le retour est possible", () => {
    const corps = SRC.slice(SRC.indexOf('async function rendrePro('))
    expect(corps).toMatch(/setOriginaux/)
  })

  it('un échec ne perd JAMAIS la photo', () => {
    // Le `catch` est vide À DESSEIN : la vignette garde son URL d'origine.
    const corps = SRC.slice(SRC.indexOf('async function rendrePro('))
    expect(corps).toMatch(/catch \{/)
  })
})

describe("le bouton ne se propose pas deux fois", () => {
  it('il disparaît quand une version d’origine existe', () => {
    // Une photo déjà traitée n'a pas besoin d'un second passage : le geste
    // suivant est le RETOUR, pas une nouvelle couche.
    expect(SRC).toMatch(/originaux\[url\] === undefined && \(/)
  })
})
