// ============================================================
// CLIQUET — LA CHAÎNE D'IMAGES NE PERD NI L'ORIENTATION, NI LA VIE PRIVÉE.
//
// TROIS DÉFAUTS RÉELS DU CHEMIN D'ORIGINE (dépôt brut depuis le navigateur) :
//   1. une photo de 8 Mo servie telle quelle à des visiteurs en 3G ;
//   2. l'orientation EXIF non appliquée — les photos de portrait couchées ;
//   3. LES MÉTADONNÉES PUBLIÉES AVEC L'IMAGE, dont les coordonnées GPS du lieu
//      de la prise de vue : très souvent le domicile du marchand.
//
// Le troisième n'est pas un défaut de performance, c'est une fuite de données
// personnelles — et c'est celui qu'aucun test ne surveillait.
// ============================================================
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  FORMATS,
  LARGEURS,
  SEUIL_FLOU,
  analyser,
  apercuFlou,
  avertissements,
  flou,
  nettoyerPourImpression,
  produireVariantes,
  redresser,
} from '../traitement'

/** Une photo de test au contenu RICHE : un aplat uni ne prouverait rien sur la
 *  compression ni sur la netteté. */
async function photo(largeur: number, hauteur: number): Promise<Buffer> {
  return sharp({
    create: {
      width: largeur,
      height: hauteur,
      channels: 3,
      background: { r: 140, g: 90, b: 60 },
      noise: { type: 'gaussian', mean: 128, sigma: 45 },
    },
  })
    .jpeg({ quality: 92 })
    .toBuffer()
}

/** La même, avec une orientation EXIF de portrait et des métadonnées. */
async function photoAvecExif(largeur: number, hauteur: number, orientation: number): Promise<Buffer> {
  return sharp(await photo(largeur, hauteur))
    .withMetadata({ orientation })
    .jpeg({ quality: 92 })
    .toBuffer()
}

describe('orientation EXIF', () => {
  it('les dimensions ANNONCÉES tiennent compte de la rotation', async () => {
    // Orientation 6 = « tournée d'un quart de tour ». L'image STOCKÉE fait
    // 1600×1200, mais l'image telle qu'on la voit fait 1200×1600. Sans cet
    // échange, l'avertissement « trop petite » porterait sur le mauvais côté.
    const a = await analyser(await photoAvecExif(1600, 1200, 6))
    expect(a.orientation).toBe(6)
    expect([a.largeur, a.hauteur]).toEqual([1200, 1600])
  })

  it('`redresser` APPLIQUE la rotation, et ne la laisse pas à faire', async () => {
    const redressee = await redresser(await photoAvecExif(1600, 1200, 6)).jpeg().toBuffer()
    const m = await sharp(redressee).metadata()
    expect([m.width, m.height]).toEqual([1200, 1600])
  })
})

describe('vie privée — ce qui ne doit JAMAIS sortir avec l’image', () => {
  it('l’EXIF ne survit PAS au traitement', async () => {
    const avant = await sharp(await photo(800, 600))
      .withMetadata({ orientation: 1, exif: { IFD0: { Copyright: 'Marchand', Artist: 'iPhone' } } })
      .jpeg()
      .toBuffer()
    expect((await sharp(avant).metadata()).exif, 'le fixture doit PORTER de l’EXIF').toBeDefined()

    const apres = await redresser(avant).jpeg().toBuffer()
    // `sharp` n'emporte aucune métadonnée par défaut. Ce test existe pour que
    // l'ajout d'un `.withMetadata()` sur ce chemin — qui les réintroduirait
    // toutes — soit impossible à faire passer inaperçu.
    expect((await sharp(apres).metadata()).exif).toBeUndefined()
  })

  it('AUCUNE variante servie ne porte de métadonnées', async () => {
    const source = await sharp(await photo(1400, 1400))
      .withMetadata({ exif: { IFD0: { Copyright: 'confidentiel' } } })
      .jpeg()
      .toBuffer()
    for (const v of await produireVariantes(source)) {
      const m = await sharp(v.donnees).metadata()
      expect(m.exif, `${v.format} ${String(v.largeur)}px porte de l’EXIF`).toBeUndefined()
    }
  })
})

describe('variantes servies', () => {
  it('les trois formats sont produits, du plus efficace au plus compatible', async () => {
    const v = await produireVariantes(await photo(1600, 1600))
    expect([...new Set(v.map((x) => x.format))]).toEqual([...FORMATS])
  })

  it('AUCUNE variante plus large que l’original — pas de doublon stocké', async () => {
    // Défaut mesuré pendant l'écriture : une photo de 1206 px produisait une
    // variante « 1600 » que `withoutEnlargement` ramenait à 1206, exacte copie
    // de la 1200. Du stockage payé deux fois pour le même fichier.
    const v = await produireVariantes(await photo(900, 900))
    const largeurs = [...new Set(v.map((x) => x.largeur))].sort((a, b) => a - b)
    expect(largeurs).toEqual([400, 800])
    for (const variante of v) {
      const m = await sharp(variante.donnees).metadata()
      expect(m.width, 'une variante dépasse l’original').toBeLessThanOrEqual(900)
    }
  })

  it('une photo MINUSCULE garde quand même une variante', async () => {
    // Sinon elle n'est plus servable du tout, et la fiche produit se retrouve
    // sans image alors que le marchand en a fourni une.
    const v = await produireVariantes(await photo(120, 120))
    expect(v.length).toBeGreaterThan(0)
    expect([...new Set(v.map((x) => x.largeur))]).toEqual([LARGEURS[0]])
  })

  it('l’AVIF est PLUS LÉGER que le JPEG à largeur égale — sinon il ne sert à rien', async () => {
    const v = await produireVariantes(await photo(1200, 1200))
    const avif = v.find((x) => x.format === 'avif' && x.largeur === 800)
    const jpeg = v.find((x) => x.format === 'jpeg' && x.largeur === 800)
    expect(avif).toBeDefined()
    expect(jpeg).toBeDefined()
    expect(avif!.octets).toBeLessThan(jpeg!.octets)
  })
})

describe('aperçu flou', () => {
  it('tient dans le HTML — quelques centaines d’octets, pas plus', async () => {
    // S'il grossissait, il coûterait la bande passante qu'il est censé
    // économiser : le visiteur en 3G paierait deux fois pour la même image.
    const a = await apercuFlou(await photo(1600, 1600))
    expect(a.startsWith('data:image/webp;base64,')).toBe(true)
    expect(a.length).toBeLessThan(2000)
  })
})

describe('netteté — le seuil est calibré, pas estimé', () => {
  it('une photo nette n’est PAS signalée', async () => {
    const r = await flou(await photo(1200, 1200))
    expect(r.variance).toBeGreaterThan(SEUIL_FLOU)
    expect(r.floue).toBe(false)
  })

  it('une photo NETTEMENT floue EST signalée', async () => {
    // Le premier seuil que j'avais posé (60) ne détectait rien : une image
    // délibérément floutée rendait 98 et passait pour nette. Un détecteur qui
    // ne détecte pas est pire qu'absent — il rassure.
    const floutee = await sharp(await photo(1200, 1200)).blur(14).jpeg().toBuffer()
    const r = await flou(floutee)
    expect(r.variance).toBeLessThan(SEUIL_FLOU)
    expect(r.floue).toBe(true)
  })
})

// ============================================================
// CLIQUET — UN DESIGN D'IMPRESSION SE NETTOIE SANS SE DÉTRUIRE.
//
// MÊME DÉFAUT QUE L'ENVOI DES PHOTOS, AUTRE PARCOURS : `/api/shop/upload-design`
// déposait le fichier BRUT dans un seau PUBLIC. Les coordonnées GPS partaient
// donc avec le design quand celui-ci est une photo prise au téléphone, et
// elles étaient lisibles par quiconque obtenait l'URL.
//
// MAIS LA CORRECTION NE PEUT PAS ÊTRE LA MÊME, et c'est tout l'enjeu de ces
// tests. Ce fichier part chez un imprimeur. Trois propriétés y sont vitales
// que la chaîne de vitrine détruirait — transparence, définition, couleurs.
// Un nettoyage qui les emporterait « réparerait » la fuite en ruinant le
// produit imprimé.
// ============================================================
describe('design d’impression — nettoyé, et intact', () => {
  /** Un logo : fond TRANSPARENT, c'est le cas qui casse tout si on l'aplatit. */
  async function logoTransparent(): Promise<Buffer> {
    return sharp({
      create: { width: 600, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 300, height: 200, channels: 4, background: { r: 250, g: 93, b: 30, alpha: 1 } },
          })
            .png()
            .toBuffer(),
          top: 100,
          left: 150,
        },
      ])
      .withMetadata({ exif: { IFD0: { Copyright: 'GPS-DU-MARCHAND' } }, icc: 'srgb' })
      .png()
      .toBuffer()
  }

  it('l’EXIF DISPARAÎT — c’est la raison d’être de ce nettoyage', async () => {
    const avant = await logoTransparent()
    expect((await sharp(avant).metadata()).exif, 'le fixture doit PORTER de l’EXIF').toBeDefined()

    const { donnees, exifRetire } = await nettoyerPourImpression(avant)
    expect((await sharp(donnees).metadata()).exif).toBeUndefined()
    // La route REMONTE ce booléen au marchand : nettoyer en silence le
    // laisserait ignorer que sa photo portait sa position.
    expect(exifRetire).toBe(true)
  })

  it('le PROFIL COLORIMÉTRIQUE SURVIT — sans lui, les couleurs dérivent à l’impression', async () => {
    // Un profil ICC décrit des couleurs, pas une personne. Le jeter avec
    // l'EXIF serait une correction qui casse le produit qu'elle protège.
    const { donnees } = await nettoyerPourImpression(await logoTransparent())
    expect((await sharp(donnees).metadata()).icc).toBeDefined()
  })

  it('LA TRANSPARENCE SURVIT — un logo aplati arrive avec un rectangle blanc imprimé', async () => {
    const { donnees, type } = await nettoyerPourImpression(await logoTransparent())
    expect(type).toBe('image/png')
    const m = await sharp(donnees).metadata()
    expect(m.channels, 'le canal alpha a été perdu').toBe(4)
    expect(m.hasAlpha).toBe(true)

    // Et le coin doit être RÉELLEMENT transparent, pas seulement déclaré tel.
    const coin = await sharp(donnees).extract({ left: 0, top: 0, width: 10, height: 10 }).toBuffer()
    const stats = await sharp(coin).stats()
    expect(stats.channels[3]!.mean, 'le coin n’est plus transparent').toBeLessThan(5)
  })

  it('LA DÉFINITION SURVIT — aucun redimensionnement', async () => {
    // Réduire un fichier d'impression le rend inutilisable : l'imprimeur
    // refuse, ou imprime flou.
    const { donnees } = await nettoyerPourImpression(await logoTransparent())
    const m = await sharp(donnees).metadata()
    expect([m.width, m.height]).toEqual([600, 400])
  })

  it('l’ORIENTATION est APPLIQUÉE — sinon le design part couché chez l’imprimeur', async () => {
    // Défaut invisible jusqu'à la livraison du vêtement : personne ne regarde
    // le fichier, on regarde le t-shirt.
    const couche = await sharp(await logoTransparent()).withMetadata({ orientation: 6 }).png().toBuffer()
    const { donnees } = await nettoyerPourImpression(couche)
    const m = await sharp(donnees).metadata()
    expect([m.width, m.height], 'la rotation EXIF n’a pas été appliquée').toEqual([400, 600])
    expect(m.orientation, 'l’orientation devait être neutralisée').toBeUndefined()
  })

  it('le FORMAT D’ENTRÉE est conservé — jamais tout converti en JPEG', async () => {
    // Sans cette branche, chaque design transparent serait ruiné.
    const jpeg = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 10, g: 20, b: 30 } } }).jpeg().toBuffer()
    expect((await nettoyerPourImpression(jpeg)).type).toBe('image/jpeg')

    const webp = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0.5 } } }).webp().toBuffer()
    const r = await nettoyerPourImpression(webp)
    expect(r.type).toBe('image/webp')
    expect((await sharp(r.donnees).metadata()).hasAlpha).toBe(true)
  })

  it('un fichier SANS EXIF le signale honnêtement', async () => {
    const propre = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer()
    expect((await nettoyerPourImpression(propre)).exifRetire).toBe(false)
  })
})

describe('conseils au marchand — ils AVERTISSENT, ils ne bloquent pas', () => {
  it('une petite photo est signalée, avec ses dimensions réelles', () => {
    const a = avertissements({ largeur: 400, hauteur: 400, format: 'jpeg', octets: 50_000, gps: false, orientation: 1 })
    expect(a.map((x) => x.code)).toContain('trop_petite')
    expect(a[0]!.message).toContain('400')
  })

  it('une photo très allongée est signalée — le produit y paraîtrait minuscule', () => {
    const a = avertissements({ largeur: 3000, hauteur: 800, format: 'jpeg', octets: 900_000, gps: false, orientation: 1 })
    expect(a.map((x) => x.code)).toContain('cadrage')
  })

  it('une photo CORRECTE ne déclenche AUCUN conseil', () => {
    // Un avertissement affiché à tort fait perdre toute crédibilité aux
    // suivants : le marchand cesse de les lire.
    const a = avertissements({ largeur: 1500, hauteur: 1500, format: 'jpeg', octets: 900_000, gps: false, orientation: 1 })
    expect(a).toEqual([])
  })
})
