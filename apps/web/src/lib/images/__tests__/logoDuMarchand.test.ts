// ============================================================
// CLIQUET — LE MARCHAND MET SON LOGO, ET RIEN NE LE MANGE.
//
// Demandé DEUX FOIS avant d'être livré. La cause n'était pas un oubli
// d'interface : la table `sites` ne portait pas de colonne, et `favicon.ts`
// le disait en toutes lettres tout en s'arrêtant là. Un obstacle inscrit en
// commentaire n'est pas une décision — c'est une dette qui se tait.
//
// Ce cliquet garde les quatre choses qui font que ça marche VRAIMENT :
//   1. le logo l'emporte sur le monogramme, et le monogramme reste le repli ;
//   2. un logo ne se ROGNE jamais — il rentre entier dans le carré ;
//   3. le serveur ne va chercher le logo que dans NOTRE stockage (SSRF) ;
//   4. les quatre vitrines montrent l'enseigne par le MÊME composant.
// ============================================================
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { iconeDuSite, logoEnIcone, sourceLogoAutorisee } from '../favicon'

const STOCKAGE = 'https://abcdefgh.supabase.co'

/** Un logo de test : un carré vert franc, pour le reconnaître à l'œil nu. */
async function logoVert(largeur: number, hauteur: number): Promise<Buffer> {
  return sharp({
    create: { width: largeur, height: hauteur, channels: 4, background: { r: 0, g: 200, b: 80, alpha: 1 } },
  })
    .png()
    .toBuffer()
}

describe('la source du logo — une SSRF offerte par un champ de formulaire', () => {
  it('accepte NOTRE stockage, et lui seul', () => {
    expect(sourceLogoAutorisee(`${STOCKAGE}/storage/v1/object/public/site-images/x/logo.png`, STOCKAGE)).toBe(true)
  })

  it('REFUSE tout le reste — c’est là qu’est la garde', () => {
    // `logo_url` est une colonne TEXTE écrite par le marchand. Sans ce refus,
    // il ferait émettre à notre serveur une requête vers l'adresse de son
    // choix, y compris une adresse interne du réseau d'hébergement.
    for (const u of [
      'https://evil.example.com/logo.png',
      'http://169.254.169.254/latest/meta-data/', // métadonnées d'instance
      'http://localhost:3000/api/internal/secrets',
      'file:///etc/passwd',
      `http://abcdefgh.supabase.co/x.png`, // même hôte, mais PAS en https
      'pas une url',
      '',
      null,
      undefined,
    ]) {
      expect(sourceLogoAutorisee(u, STOCKAGE), `« ${String(u)} » accepté à tort`).toBe(false)
    }
  })

  it('sans stockage configuré, rien n’est autorisé', () => {
    expect(sourceLogoAutorisee(`${STOCKAGE}/x.png`, undefined)).toBe(false)
  })
})

describe('un logo ne se rogne pas', () => {
  it('un logo LARGE rentre entier dans le carré, avec des marges', async () => {
    // LE DÉFAUT QU'ON EMPÊCHE : en `cover`, une enseigne « BOULANGERIE
    // CENTRALE » perdrait les deux tiers de son nom. Mesuré sur les pixels,
    // pas supposé : les colonnes de bord doivent être TRANSPARENTES.
    const icone = await logoEnIcone(await logoVert(600, 150), 64)
    const { data, info } = await sharp(icone).raw().toBuffer({ resolveWithObject: true })
    expect(info.width).toBe(64)
    expect(info.height).toBe(64)

    const alphaEn = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]

    // LES POINTS DE MESURE SONT LE TEST. Mon premier jet sondait y=1 et y=62,
    // qui tombent dans la MARGE de 6 % — vides quel que soit le recadrage. Le
    // test passait donc même en `cover`, c'est-à-dire même en rognant : une
    // mesure qui ne distingue pas les deux cas ne mesure rien.
    //
    // Ici : marge = 4 px, la zone d'image va de y=4 à y=59 (56 px). Un logo
    // 600×150 en `contain` y occupe une bande de 14 px centrée — de y=25 à
    // y=39. On sonde donc À L'INTÉRIEUR de la zone d'image mais HORS de la
    // bande : transparent si le logo est entier, opaque s'il a été rogné.
    expect(alphaEn(32, 8), 'rogné : le haut est rempli alors que le logo est large').toBe(0)
    expect(alphaEn(32, 55), 'rogné : le bas est rempli alors que le logo est large').toBe(0)
    // Et la bande centrale porte bien le logo.
    expect(alphaEn(32, 32), 'le centre devrait porter le logo').toBeGreaterThan(200)
  })

  it('un logo CARRÉ remplit le carré, moins la marge', async () => {
    const icone = await logoEnIcone(await logoVert(512, 512), 64)
    const { data, info } = await sharp(icone).raw().toBuffer({ resolveWithObject: true })
    const alphaEn = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]
    expect(alphaEn(32, 32)).toBeGreaterThan(200)
    // La marge de 6 % existe : le tout premier pixel reste vide.
    expect(alphaEn(0, 0), 'aucune marge — le logo touchera les bords').toBe(0)
  })

  it('la transparence SURVIT — sinon tout logo détouré finit en carré blanc', async () => {
    const transparent = await sharp({
      create: { width: 300, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).png().toBuffer()
    const icone = await logoEnIcone(transparent, 48)
    expect((await sharp(icone).metadata()).hasAlpha).toBe(true)
  })
})

describe('l’ordre : le logo, puis le monogramme', () => {
  it('avec un logo, l’icône EST le logo', async () => {
    const icone = await iconeDuSite(await logoVert(400, 400), 'Chanorfie', '#1A7F4B', 64)
    const { dominant } = await sharp(icone).stats()
    // Le vert du logo, pas la couleur de marque du site.
    expect(dominant.g, `dominante inattendue : ${JSON.stringify(dominant)}`).toBeGreaterThan(dominant.r)
    expect(dominant.g).toBeGreaterThan(dominant.b)
  })

  it('sans logo, le monogramme prend le relais — une boutique naît sans logo', async () => {
    const icone = await iconeDuSite(null, 'Chanorfie', '#FA5D1E', 64)
    expect((await sharp(icone).metadata()).width).toBe(64)
  })

  it('un logo ILLISIBLE ne casse pas l’icône — elle retombe sur le monogramme', async () => {
    // FAIL-SAFE DÉLIBÉRÉ. Une boutique sans icône est un défaut visible dans
    // chaque onglet et chaque résultat de recherche ; un repli ne l'est pas.
    const icone = await iconeDuSite(Buffer.from('ceci n’est pas une image'), 'Chanorfie', '#FA5D1E', 64)
    expect((await sharp(icone).metadata()).width).toBe(64)
  })
})

describe('les quatre vitrines montrent l’enseigne par le MÊME composant', () => {
  const THEMES = join(process.cwd(), 'src', 'app', 'sites', '[slug]', 'themes')
  const lire = (f: string) =>
    readFileSync(join(THEMES, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/^[ \t]*\/\/.*$/gmu, '')

  const VITRINES = ['EditorialTheme.tsx', 'NoirTheme.tsx', 'VifTheme.tsx', 'AuroraTheme.tsx']

  it('chacune monte `EnseigneDuSite` et lui passe le logo', () => {
    // Quatre copies d'un même en-tête finissent par diverger : c'est
    // exactement ce qui vient d'arriver à la galerie, où une vitrine était
    // restée en arrière sans que personne le voie.
    for (const f of VITRINES) {
      const src = lire(f)
      expect(src.includes('<EnseigneDuSite'), `${f} : n’affiche pas l’enseigne partagée`).toBe(true)
      expect(src.includes('logo={site.logo_url}'), `${f} : monte l’enseigne SANS le logo`).toBe(true)
    }
  })

  it('AUCUNE vitrine n’échappe à la liste', () => {
    // Le vrai risque est le thème qu'on ajoutera demain à partir d'une copie.
    const vitrines = readdirSync(THEMES).filter((f) => /^[A-Z]\w+Theme\.tsx$/u.test(f))
    for (const f of vitrines) {
      expect(VITRINES.includes(f), `${f} est une vitrine non déclarée — ajoutez-la et montez-y l’enseigne`).toBe(true)
    }
    expect(vitrines.length, 'le balayage ne trouve plus de vitrine — instrument cassé').toBe(VITRINES.length)
  })

  it('l’enseigne garde le NOM en alternative textuelle', () => {
    // Un logo sans `alt` effacerait le nom de la boutique des résultats de
    // recherche : ce serait payer l'esthétique avec le référencement.
    const src = lire('EnseigneDuSite.tsx')
    expect(/alt=\{nom\}/u.test(src), 'le nom a disparu de l’alternative textuelle').toBe(true)
    expect(/objectFit: 'contain'/u.test(src), 'le logo serait rogné').toBe(true)
  })
})
