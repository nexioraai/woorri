/**
 * POSER UN PRODUIT DÉCOUPÉ SUR UN FOND, AVEC SON OMBRE.
 *
 * Le détourage seul ne suffit pas, et c'est visible immédiatement : un sujet
 * collé sur du blanc pur **flotte**. L'œil ne lui trouve pas de sol. C'est la
 * différence la plus nette entre une photo passée par un outil professionnel
 * et une découpe brute — pas la finesse du contour, l'ombre.
 *
 * Deux ombres, parce qu'elles répondent à deux choses différentes :
 *
 *  ① L'OMBRE DE CONTACT — une tache sombre, écrasée, juste sous la base de
 *    l'objet. C'est elle qui le POSE. Sans elle, aucune ombre portée ne
 *    rattrape l'impression de flottement.
 *  ② L'OMBRE PORTÉE — large, très douce, légèrement décalée vers le bas.
 *    Elle donne le volume et détache l'objet du fond.
 *
 * Les deux sont ténues. Une ombre qu'on remarque est une ombre ratée.
 */
import sharp from 'sharp'
import type { OverlayOptions } from 'sharp'

/** Côté du carré produit. Même valeur que `recadrer()`, par cohérence. */
export const COTE = 1200

/**
 * Le canal alpha du sujet, redimensionné, débordé puis flouté.
 *
 * LE DÉBORDEMENT N'EST PAS UN DÉTAIL : un flou appliqué sur une image aux
 * dimensions exactes du sujet est COUPÉ AU BORD, et l'ombre se termine net là
 * où elle devrait s'éteindre. On ajoute donc une bordure transparente large
 * de trois sigmas avant de flouter.
 */
async function ombreDe(
  sujet: Buffer,
  largeur: number,
  hauteur: number,
  sigma: number,
): Promise<{ donnees: Buffer; largeur: number; hauteur: number; marge: number }> {
  const marge = Math.ceil(sigma * 3)
  const alpha = await sharp(sujet)
    .resize(largeur, hauteur, { fit: 'fill' })
    .extend({
      top: marge,
      bottom: marge,
      left: marge,
      right: marge,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extractChannel('alpha')
    // SANS CECI, `sharp` repromeut le canal unique en trois canaux et le
    // tampon brut ne fait plus la taille attendue. Déjà rencontré.
    .toColourspace('b-w')
    .blur(sigma)
    .raw()
    .toBuffer()
  return { donnees: alpha, largeur: largeur + marge * 2, hauteur: hauteur + marge * 2, marge }
}

/**
 * Un tampon RGBA dont la COULEUR est constante et dont l'ALPHA porte l'ombre.
 *
 * On construit le RGBA à la main. Les tentatives via `joinChannel` et via
 * `blend: 'dest-in'` sur un tampon à un seul canal ont toutes deux échoué —
 * la seconde silencieusement, en rendant l'image inchangée.
 *
 * La couleur n'est pas un noir pur mais un gris CHAUD : une ombre neutre sur
 * fond blanc tire au bleu et fait sale.
 */
function teinter(alpha: Buffer, opacite: number): Buffer {
  const out = Buffer.alloc(alpha.length * 4)
  for (let i = 0; i < alpha.length; i += 1) {
    out[i * 4] = 28
    out[i * 4 + 1] = 25
    out[i * 4 + 2] = 22
    out[i * 4 + 3] = Math.round(alpha[i]! * opacite)
  }
  return out
}

export type Pose = {
  readonly donnees: Buffer
  /** Ce qui a été posé, pour le dire au marchand. */
  readonly appliquees: string[]
}

/**
 * Pose le sujet détouré au centre d'un carré blanc, avec ses deux ombres.
 *
 * LE SUJET NE TOUCHE JAMAIS LE BORD. Il occupe au plus 72 % du côté et sa
 * base s'arrête à 84 % de la hauteur : le reste est l'air sous l'objet, là où
 * l'ombre de contact a besoin de place. Un produit calé au milieu exact d'un
 * carré paraît tomber ; posé un peu haut, il tient.
 */
export async function poser(sujet: Buffer, cote = COTE): Promise<Pose> {
  const m = await sharp(sujet).metadata()
  const sw = m.width ?? 1
  const sh = m.height ?? 1

  const boite = Math.round(cote * 0.72)
  // PLAFOND D'AGRANDISSEMENT. Une photo d'origine petite — un article isolé
  // dans une image basse définition — serait sinon soufflée jusqu'à 864 px et
  // rendue molle. Au-delà du double, aucun rééchantillonnage ne rattrape le
  // détail absent : mieux vaut un article plus petit dans le carré et NET
  // qu'un article à la bonne taille et flou. Le cadre, lui, reste identique
  // pour tous — c'est lui qui tient la cohérence de la vitrine.
  const facteur = Math.min(boite / sw, boite / sh, 2)
  const w = Math.max(1, Math.round(sw * facteur))
  const h = Math.max(1, Math.round(sh * facteur))

  const gauche = Math.round((cote - w) / 2)
  // Base à 84 % — mais jamais au prix d'une marge haute inférieure à 7 %.
  const haut = Math.max(Math.round(cote * 0.07), Math.round(cote * 0.84) - h)

  const couches: OverlayOptions[] = []

  // ② L'OMBRE PORTÉE, large et presque invisible, décalée vers le bas.
  const portee = await ombreDe(sujet, w, h, Math.max(4, cote * 0.014))
  couches.push({
    input: teinter(portee.donnees, 0.17),
    raw: { width: portee.largeur, height: portee.hauteur, channels: 4 },
    left: Math.max(0, gauche - portee.marge),
    top: Math.max(0, haut - portee.marge + Math.round(cote * 0.013)),
  })

  // ① L'OMBRE DE CONTACT : la même silhouette, écrasée à un dixième de sa
  //    hauteur, glissée sous la base de l'objet. C'est elle qui le pose.
  const hc = Math.max(6, Math.round(h * 0.09))
  const wc = Math.max(6, Math.round(w * 0.9))
  const contact = await ombreDe(sujet, wc, hc, Math.max(3, hc / 2.6))
  couches.push({
    input: teinter(contact.donnees, 0.36),
    raw: { width: contact.largeur, height: contact.hauteur, channels: 4 },
    left: Math.max(0, gauche + Math.round((w - wc) / 2) - contact.marge),
    top: Math.max(0, haut + h - Math.round(hc * 0.55) - contact.marge),
  })

  // Le sujet, en dernier : il passe par-dessus ses propres ombres.
  couches.push({
    input: await sharp(sujet).resize(w, h, { fit: 'fill' }).png().toBuffer(),
    left: gauche,
    top: haut,
  })

  const donnees = await sharp({
    create: {
      width: cote,
      height: cote,
      channels: 3,
      // Blanc, comme `recadrer()` : c'est le fond sur lequel les places de
      // marché normalisent, et celui qu'attend une fiche produit.
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite(couches)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()

  return { donnees, appliquees: ['fond retiré', 'ombre portée', 'cadre carré'] }
}
