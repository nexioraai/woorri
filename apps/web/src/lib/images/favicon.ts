import sharp from 'sharp'

// ============================================================
// FAVICON D'UN SITE MARCHAND — DÉRIVÉ DE SA MARQUE, 100 % OPEN SOURCE.
//
// LE DÉFAUT, MESURÉ EN PRODUCTION LE 2026-09-23 :
//
//     chanorfie.com/favicon.ico   -> 200, 25 931 octets
//     alloufshop.com/favicon.ico  -> 200, 25 931 octets
//
// 25 931 octets, c'est EXACTEMENT le favicon de `create-next-app`. Les deux
// boutiques livrées servaient donc le triangle de Vercel — d'où l'icône
// générique dans les résultats Google. Cause : `proxy.ts` excluait
// `favicon.ico` de son filtre, la requête n'atteignait jamais le site marchand
// et tombait sur le fichier de la plateforme.
//
// ET CE SERAIT PIRE APRÈS COUP : la plateforme ayant maintenant SON logo, les
// boutiques auraient servi le « D » de Deribfy. Un marchand marqué à l'enseigne
// de son fournisseur, c'est un défaut plus grave que l'absence d'icône.
//
// AUCUN MODÈLE, AUCUN SERVICE.
//
// ── M2-240 : LE MONOGRAMME N'EST PLUS QU'UN REPLI.
//
// Ce commentaire disait, et c'était vrai : « la table `sites` ne porte pas de
// colonne `logo` ». C'était la raison du monogramme — et c'était aussi une
// LIMITE SUBIE, pas un choix. Le marchand a demandé deux fois de pouvoir
// mettre le sien. `sites.logo_url` existe désormais
// (`supabase/sql/sites_logo_url.sql`), et l'ordre est :
//
//   1. le logo déposé par le marchand, s'il y en a un ;
//   2. le monogramme dérivé de son nom et de sa couleur, sinon.
//
// Le monogramme reste INDISPENSABLE : une boutique naît sans logo, et elle
// doit avoir une icône dès sa première minute en ligne.
// ============================================================

/** Repli quand le marchand n'a pas choisi de couleur. Accent de la plateforme. */
const COULEUR_DEFAUT = '#FA5D1E'

/** Couleur hexadécimale acceptable. Une valeur est une ENTRÉE : jamais de confiance. */
const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * Initiale du marchand.
 *
 * Les diacritiques sont dépliés (`Ébène` → `E`) : à 16 pixels, un accent est un
 * pâté. Tout ce qui n'est pas une lettre ou un chiffre est écarté — une
 * boutique nommée « ★Shop » doit montrer le `S`, pas l'étoile.
 */
export function initialeDe(nom: string | null | undefined): string {
  const propre = (nom ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
  return (propre.charAt(0) || 'S').toUpperCase()
}

/** Couleur de marque validée, ou le repli. */
export function couleurDe(brut: string | null | undefined): string {
  const c = (brut ?? '').trim()
  return HEX.test(c) ? c : COULEUR_DEFAUT
}

/**
 * Le texte est-il lisible sur ce fond ?
 *
 * Luminance relative (WCAG). Sans ce calcul, une boutique à la couleur claire
 * (jaune, beige) obtenait une lettre blanche sur fond clair : invisible à 16
 * pixels, donc un carré de couleur sans information.
 */
export function encreSur(fond: string): string {
  const v = (i: number) => {
    const c = parseInt(fond.slice(1 + i * 2, 3 + i * 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * v(0) + 0.7152 * v(1) + 0.0722 * v(2)
  return luminance > 0.45 ? '#111111' : '#FFFFFF'
}

/**
 * Monogramme SVG : fond à la couleur de la marque, initiale au centre.
 *
 * Pensé pour 16 px AVANT 512 : fond plein, une seule forme, contraste maximal.
 * La police est celle du système (`sans-serif`) — une police embarquée ferait
 * entrer une dépendance et un octet de licence pour une seule lettre.
 */
export function monogrammeSvg(initiale: string, couleur: string): Buffer {
  const encre = encreSur(couleur)
  // L'initiale est échappée : elle vient du nom de boutique, donc de l'entrée
  // d'un marchand. Sans cela, un nom contenant `<` casserait le document SVG.
  const lettre = initiale
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
       <rect width="512" height="512" rx="96" fill="${couleur}"/>
       <text x="256" y="256" fill="${encre}" font-family="Helvetica,Arial,sans-serif"
             font-size="300" font-weight="700" text-anchor="middle"
             dominant-baseline="central">${lettre}</text>
     </svg>`,
  )
}

/** Rend le monogramme en PNG carré. */
export async function monogrammePng(
  nom: string | null | undefined,
  couleur: string | null | undefined,
  taille: number,
): Promise<Buffer> {
  const svg = monogrammeSvg(initialeDe(nom), couleurDe(couleur))
  return sharp(svg).resize(taille, taille).png({ compressionLevel: 9 }).toBuffer()
}

/**
 * Conteneur ICO écrit à la main.
 *
 * `sharp` ne produit pas d'ICO et aucune dépendance ne se justifie pour un
 * format dont l'en-tête tient en seize octets. Les PNG sont embarqués tels
 * quels — accepté par tous les navigateurs depuis Vista.
 */
export function construireIco(images: { taille: number; donnees: Buffer }[]): Buffer {
  const enTete = Buffer.alloc(6)
  enTete.writeUInt16LE(0, 0)
  enTete.writeUInt16LE(1, 2)
  enTete.writeUInt16LE(images.length, 4)

  let offset = 6 + images.length * 16
  const entrees = images.map(({ taille, donnees }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(taille >= 256 ? 0 : taille, 0)
    e.writeUInt8(taille >= 256 ? 0 : taille, 1)
    e.writeUInt8(0, 2)
    e.writeUInt8(0, 3)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(donnees.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += donnees.length
    return e
  })

  return Buffer.concat([enTete, ...entrees, ...images.map((i) => i.donnees)])
}

/**
 * L'URL du logo pointe-t-elle vers NOTRE dépôt de fichiers ?
 *
 * `logo_url` est une colonne TEXTE que le marchand écrit. Le serveur va
 * ensuite la CHERCHER pour fabriquer l'icône : sans ce filtre, n'importe quel
 * marchand ferait émettre à notre serveur une requête vers l'adresse de son
 * choix — y compris une adresse interne. C'est une SSRF, et elle serait
 * offerte par un champ de formulaire.
 *
 * On n'accepte donc que l'origine de notre propre stockage. Une URL absente
 * ou illisible n'est pas une erreur : c'est simplement « pas de logo ».
 */
export function sourceLogoAutorisee(
  url: string | null | undefined,
  origineStockage: string | null | undefined,
): boolean {
  if (!url || !origineStockage) return false
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    return u.origin === new URL(origineStockage).origin
  } catch {
    return false
  }
}

/**
 * Le logo du marchand, rendu en icône carrée.
 *
 * ── `contain`, JAMAIS `cover`. C'est la règle de tout ce lot : une image de
 * marque ne se rogne pas. Un logo large rentre dans le carré avec des marges ;
 * rogné, il perdrait la moitié du nom de la boutique.
 *
 * ── LA TRANSPARENCE SURVIT. Un logo est le plus souvent un PNG détouré. En
 * l'aplatissant sur du blanc, on donnerait un carré blanc dans les onglets
 * sombres. `sharp` garde le canal alpha, et le fond reste transparent.
 *
 * ── UNE MARGE DE 6 %. Collé aux bords, un logo paraît plus gros que les
 * icônes voisines dans une liste d'onglets, et son contour est rogné par les
 * navigateurs qui arrondissent. Six pour cent suffisent à le poser.
 */
export async function logoEnIcone(donnees: Buffer, taille: number): Promise<Buffer> {
  const marge = Math.max(1, Math.round(taille * 0.06))
  return sharp(donnees, { failOn: 'none' })
    .rotate()
    .resize(taille - marge * 2, taille - marge * 2, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: marge, bottom: marge, left: marge, right: marge,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/**
 * L'icône du site, à une taille donnée : son logo s'il en a un, son
 * monogramme sinon.
 *
 * FAIL-SAFE, ET C'EST DÉLIBÉRÉ. Si le logo est illisible — fichier corrompu,
 * format exotique, stockage momentanément muet — on retombe sur le
 * monogramme. Une boutique sans icône est un défaut visible dans chaque
 * onglet et chaque résultat de recherche ; une icône de repli ne l'est pas.
 */
export async function iconeDuSite(
  logo: Buffer | null,
  nom: string | null | undefined,
  couleur: string | null | undefined,
  taille: number,
): Promise<Buffer> {
  if (logo && logo.length > 0) {
    try {
      return await logoEnIcone(logo, taille)
    } catch {
      // On ne relaie PAS l'erreur : voir ci-dessus.
    }
  }
  return monogrammePng(nom, couleur, taille)
}

/**
 * Favicon ICO d'un marchand.
 *
 * ── POURQUOI CINQ TAILLES, ET POURQUOI CELLES-LÀ.
 *
 * 16 et 32 sont ce que demandent les onglets de navigateur. 48, 96 et 144
 * sont ce que demande GOOGLE : sa documentation exige un carré MULTIPLE de
 * 48 px, et il redimensionne ensuite lui-même.
 *
 * L'ICO plafonnait à 48 — la plus petite valeur acceptable. C'était conforme,
 * et c'était la source la plus pauvre qu'on pouvait lui donner : redescendre
 * de 48 à 16 depuis une image déjà petite abîme les détails d'un logo. Un
 * écran moderne, lui, affiche déjà des onglets en 32 réels.
 *
 * Le coût est négligeable — quelques kilo-octets, redessinés une fois par
 * tranche de cinq minutes de cache — et le gain porte là où le commerçant
 * regarde : la ligne de résultats Google.
 */
export async function faviconIcoDuSite(
  nom: string | null | undefined,
  couleur: string | null | undefined,
  logo: Buffer | null = null,
): Promise<Buffer> {
  const images = await Promise.all(
    [16, 32, 48, 96, 144].map(async (taille) => ({ taille, donnees: await iconeDuSite(logo, nom, couleur, taille) })),
  )
  return construireIco(images)
}

/**
 * Empreinte courte et STABLE du logo, destinée à l'URL des icônes.
 *
 * ── POURQUOI ELLE EXISTE.
 *
 * Sans elle, l'adresse de l'icône ne bouge jamais : le marchand remplace son
 * logo, et navigateurs, téléphones et moteurs continuent d'afficher l'ancien
 * tant que leur cache tient. Avec elle, l'URL change EXACTEMENT quand le logo
 * change — et jamais autrement, car les moteurs demandent une adresse d'icône
 * stable.
 *
 * ── ELLE NE SÉCURISE RIEN, et n'essaie pas de le faire. Un hachage de
 * trente-deux bits suffit à distinguer deux URL successives ; ce n'est pas une
 * empreinte cryptographique et elle ne doit jamais servir à en tenir lieu.
 *
 * ── UN SEUL EXEMPLAIRE. Les balises `<link rel="icon">` et le manifeste
 * doivent produire la MÊME valeur : deux copies de ce calcul finiraient par
 * diverger, et le téléphone installerait une icône pendant que l'onglet en
 * montrerait une autre.
 */
export function empreinteDuLogo(logoUrl: string | null | undefined): string {
  if (!logoUrl) return 'mono'
  let h = 0
  for (let i = 0; i < logoUrl.length; i += 1) {
    h = (h * 31 + logoUrl.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}
