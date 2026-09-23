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
// AUCUN MODÈLE, AUCUN SERVICE. La table `sites` ne porte pas de colonne `logo`
// — seulement `name` et `primary_color`. Le monogramme en est DÉRIVÉ : c'est
// la seule chose vraie qu'on puisse dessiner à partir de ce que le marchand a
// réellement fourni.
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

/** Favicon ICO d'un marchand : 16, 32, 48 — les trois tailles réellement demandées. */
export async function faviconIcoDuSite(
  nom: string | null | undefined,
  couleur: string | null | undefined,
): Promise<Buffer> {
  const images = await Promise.all(
    [16, 32, 48].map(async (taille) => ({ taille, donnees: await monogrammePng(nom, couleur, taille) })),
  )
  return construireIco(images)
}
