// ============================================================
// CLIQUET — UN LOGO QUI N'EN EST PAS UN DOIT ÊTRE DIT.
//
// Le seul garde-fou qui existait regardait le RAPPORT largeur/hauteur et
// refusait au-delà de 2,5. Une PHOTO DE DEVANTURE déposée comme enseigne —
// 1504×688, des pick-up devant un magasin — valait 2,19 : elle passait
// dessous. Un critère de FORME ne peut pas voir un problème de CONTENU.
//
// Les seuils ici sont ceux mesurés sur le parc réel le 2026-10-06 ; les
// chiffres sont dans `qualiteLogo.ts`, et les tests les tiennent par leurs
// deux bouts — ce qui doit déclencher, et ce qui ne doit SURTOUT pas.
// ============================================================
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { evaluerLogo, mesurerAplats } from '../qualiteLogo'

/** Un vrai logo : un aplat de couleur sur fond transparent. */
const vraiLogo = (cote = 512): Promise<Buffer> =>
  sharp({ create: { width: cote, height: cote, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${cote}" height="${cote}"><circle cx="${cote / 2}" cy="${cote / 2}" r="${cote * 0.35}" fill="#FA5D1E"/></svg>`,
        ),
      },
    ])
    .png()
    .toBuffer()

/** Du bruit : l'image la moins « aplat » possible, donc une photo au pire. */
const bruit = async (l = 600, h = 600): Promise<Buffer> => {
  const px = Buffer.alloc(l * h * 3)
  // Suite déterministe — un test ne tire pas au sort.
  let x = 7
  for (let i = 0; i < px.length; i += 1) {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    px[i] = x >> 16
  }
  return sharp(px, { raw: { width: l, height: h, channels: 3 } }).jpeg({ quality: 92 }).toBuffer()
}

describe('CLIQUET — la mesure d’aplats sépare un logo d’une photo', () => {
  it('un vrai logo : peu de couleurs, forte dominante', async () => {
    const m = await mesurerAplats(await vraiLogo())
    expect(m.couleurs).toBeLessThan(90)
    expect(m.dominante).toBeGreaterThan(0.3)
  })

  it('du bruit : AUCUNE dominante — et c’est elle qui tient, pas le compte', async () => {
    const m = await mesurerAplats(await bruit())
    // CE TEST A CORRIGÉ DEUX FOIS CE QUE JE CROYAIS. J'ai d'abord attendu
    // « beaucoup de couleurs » ; puis, voyant le bruit s'étaler sur les 4096
    // bacs sans qu'aucun pèse 0,1 %, j'ai écrit l'inverse. Les deux étaient
    // faux : la compression JPEG regroupe le bruit, et le compte tombe
    // EXACTEMENT sur la frontière de 90.
    //
    // On n'assertionne donc pas une valeur qui campe sur le seuil. Ce qui est
    // robuste ici, c'est l'absence d'aplat, et c'est la dominante qui attrape
    // ce cas. Les deux mesures ne disent pas la même chose : `couleurs`
    // décrit une photo réelle, où les teintes se regroupent ; `dominante`
    // tient le cas dégénéré. Garder les deux n'est pas une redondance.
    expect(m.dominante).toBeLessThan(0.3)
  })
})

describe('CLIQUET — les avis rendus au marchand', () => {
  it('UN VRAI LOGO NE DÉCLENCHE RIEN — sinon l’avertissement perd son sens', async () => {
    expect(await evaluerLogo(await vraiLogo())).toEqual([])
  })

  it('LE CAS DE LA DEVANTURE : une photo est signalée comme telle', async () => {
    // Rapport 2,18 — SOUS le seuil de 2,5 qui existait seul auparavant, donc
    // invisible pour l'ancien contrôle.
    const avis = await evaluerLogo(await bruit(1504, 688))
    expect(avis.map((a) => a.code)).toContain('semble_une_photo')
    expect(avis.map((a) => a.code)).not.toContain('tres_allonge')
  })

  it('LE CAS DU RECTANGLE NOIR : un fond plein sans transparence est signalé', async () => {
    // Un logo clair sur aplat sombre, en JPEG : la transparence est perdue, et
    // sur un en-tête clair le visiteur voit un rectangle.
    const dore = await sharp({
      create: { width: 500, height: 500, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="500" height="500"><circle cx="250" cy="250" r="120" fill="#C9A84C"/></svg>',
          ),
        },
      ])
      .jpeg({ quality: 95 })
      .toBuffer()
    expect((await evaluerLogo(dore)).map((a) => a.code)).toContain('fond_opaque')
  })

  it('un PNG transparent sur le même dessin NE déclenche PAS le fond plein', async () => {
    const avis = await evaluerLogo(await vraiLogo())
    expect(avis.map((a) => a.code)).not.toContain('fond_opaque')
  })

  it('les gardes de forme survivent : trop petit reste signalé', async () => {
    expect((await evaluerLogo(await vraiLogo(200))).map((a) => a.code)).toContain('definition_juste')
  })
})
