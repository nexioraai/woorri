// ============================================================
// CLIQUET — LE DÉTOURAGE SAIT REFUSER, ET L'OMBRE POSE L'OBJET.
//
// Un détourage rend TOUJOURS une image, et cette image a TOUJOURS l'air
// découpée. C'est exactement ce qui le rend dangereux : un masque qui coupe au
// milieu d'une montre produit un résultat net, propre, et faux. Ces tests
// portent donc sur le JUGEMENT, pas sur le découpage.
//
// Les quatre refus ont été calibrés sur des photos réelles de boutiques en
// ligne ; les chiffres cités dans chaque cas sont ceux qui ont été MESURÉS, et
// c'est pourquoi ils sont écrits ici : si un seuil bouge, ce fichier dit quel
// constat il contredit.
// ============================================================
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { verdict, type Detourage } from '../detourage'
import { poser } from '../ombre'

/** Un détourage plausible, que chaque test dégrade sur un seul axe. */
const sain = (p: Partial<Detourage> = {}): Detourage => ({
  sujet: Buffer.alloc(0),
  part: 0.3,
  boite: { left: 10, top: 10, width: 100, height: 100 },
  contraste: 45,
  fondMediane: 120,
  fondEtendue: 80,
  ...p,
})

describe('CLIQUET — le verdict refuse ce qu’il doit refuser', () => {
  it('traite une photo ordinaire : article détaché sur un fond chargé', () => {
    expect(verdict(sain()).traiter).toBe(true)
  })

  it('refuse quand le détourage a échoué et ne rend rien', () => {
    const v = verdict(null)
    expect(v.traiter).toBe(false)
  })

  it('refuse quand le « sujet » couvre presque toute l’image', () => {
    // Le masque a pris le fond. Découper ne retirerait rien et recadrerait
    // sur du vide.
    const v = verdict(sain({ part: 0.9 }))
    expect(v.traiter).toBe(false)
    expect(v.motif).toMatch(/rien à retirer/)
  })

  it('refuse quand le sujet est une poussière', () => {
    const v = verdict(sain({ part: 0.01 }))
    expect(v.traiter).toBe(false)
  })

  it('refuse un fond PARFAITEMENT plat : la photo est déjà détourée', () => {
    // Mesuré 0 sur une photo passée par un outil professionnel avant dépôt.
    const v = verdict(sain({ fondEtendue: 0, fondMediane: 193 }))
    expect(v.traiter).toBe(false)
    expect(v.motif).toMatch(/plat/)
  })

  it('NE refuse PAS un fond simplement clair : la garde reste étroite', () => {
    // Une garde plus large refusait une photo posée sur du carrelage, parce
    // qu'elle lisait le cadre blanc laissé par NOTRE propre passage précédent.
    // Retraiter une photo propre ne la dégrade pas ; la traiter DEUX FOIS, si.
    // Cette seconde garantie est tenue par le registre du lot, pas ici.
    expect(verdict(sain({ fondEtendue: 76, fondMediane: 183 })).traiter).toBe(true)
  })

  it('LE CAS DE LA MONTRE : refuse une découpe qui ne sépare rien', () => {
    // Le masque avait pris le cadran et laissé le bracelet dehors. Part et
    // fond paraissaient normaux ; SEUL le contraste au contour l'a vu —
    // 20, contre 42 à 72 sur les découpes justes.
    const v = verdict(sain({ contraste: 20, part: 0.19 }))
    expect(v.traiter).toBe(false)
    expect(v.motif).toMatch(/contour/)
  })
})

describe('CLIQUET — l’ombre pose l’objet au lieu de le laisser flotter', () => {
  /** Un carré opaque sur fond transparent : un sujet détouré minimal. */
  const sujet = async (): Promise<Buffer> =>
    sharp({
      create: { width: 300, height: 400, channels: 4, background: { r: 20, g: 90, b: 160, alpha: 1 } },
    })
      .extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

  it('rend un carré, aux bords blancs, sans jamais coller l’article au cadre', async () => {
    const { donnees } = await poser(await sujet(), 600)
    const m = await sharp(donnees).metadata()
    expect(m.width).toBe(600)
    expect(m.height).toBe(600)

    // Le coin supérieur gauche doit rester blanc : l'article a de l'air.
    const { data } = await sharp(donnees).extract({ left: 0, top: 0, width: 24, height: 24 }).raw().toBuffer({ resolveWithObject: true })
    expect(Math.min(...data)).toBeGreaterThan(246)
  })

  it('DÉPOSE UNE OMBRE SOUS L’ARTICLE — c’est elle qui le pose', async () => {
    const { donnees } = await poser(await sujet(), 600)
    // Juste sous la base de l'article (base à 84 % de 600 ≈ 504), une bande
    // centrale doit être plus sombre que le blanc du fond. Sans ombre de
    // contact, elle resterait à 255 et l'article flotterait.
    const bande = await sharp(donnees)
      .extract({ left: 220, top: 500, width: 160, height: 40 })
      .greyscale()
      .raw()
      .toBuffer()
    expect(Math.min(...bande)).toBeLessThan(242)
  })

  it('l’ombre reste DISCRÈTE : une ombre qu’on remarque est une ombre ratée', async () => {
    const { donnees } = await poser(await sujet(), 600)
    const bande = await sharp(donnees)
      .extract({ left: 220, top: 500, width: 160, height: 40 })
      .greyscale()
      .raw()
      .toBuffer()
    // Jamais de tache franche : le plus sombre reste largement au-dessus du gris.
    expect(Math.min(...bande)).toBeGreaterThan(150)
  })

  it('N’AGRANDIT JAMAIS un petit article au-delà du double', async () => {
    // Un article de 60 px soufflé à 432 px serait une bouillie. On préfère un
    // article plus petit dans le carré, et net.
    const minuscule = await sharp({
      create: { width: 60, height: 60, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } },
    })
      .png()
      .toBuffer()
    const { donnees } = await poser(minuscule, 600)
    // À 2× au plus, l'article fait 120 px : il reste très loin des 432 px que
    // donnerait un ajustement sans plafond.
    const { data, info } = await sharp(donnees).greyscale().raw().toBuffer({ resolveWithObject: true })
    let sombres = 0
    for (const v of data) if (v < 60) sombres += 1
    const cote = Math.sqrt(sombres)
    expect(cote).toBeLessThan(180)
    expect(cote).toBeGreaterThan(90)
    expect(info.width).toBe(600)
  })

  it('annonce ce qu’elle a appliqué, pour que le marchand puisse le lire', async () => {
    const { appliquees } = await poser(await sujet(), 600)
    expect(appliquees).toContain('fond retiré')
    expect(appliquees).toContain('ombre portée')
  })
})
