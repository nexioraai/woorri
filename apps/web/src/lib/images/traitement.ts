import sharp from 'sharp'
import type { Sharp } from 'sharp'

// ============================================================
// CHAÎNE D'IMAGES DES MARCHANDS — 100 % `sharp` / libvips, aucun service.
//
// LE CONTEXTE, ET IL COMMANDE TOUTES LES DÉCISIONS ICI. Les marchands
// photographient au téléphone : orientation EXIF quelconque, 4 à 12 Mo par
// fichier, parfois du HEIC. Leurs visiteurs sont au Tchad, souvent en 3G. Une
// photo de 8 Mo servie telle quelle, c'est une page qui ne s'affiche pas — et
// une boutique qui ne vend pas.
//
// CE QUE FAIT CE MODULE, ET RIEN D'AUTRE :
//   · redresse l'image selon son EXIF, PUIS efface l'EXIF ;
//   · produit des variantes de largeur en AVIF, WebP et JPEG ;
//   · fabrique un aperçu flou minuscule pour le temps du chargement.
//
// CE QU'IL NE FAIT PAS : embellir. La correction d'exposition, le recadrage
// intelligent et la suppression de fond vivent dans `ameliorer.ts` — ce sont
// des DÉCISIONS sur l'image, révocables, et le marchand doit pouvoir les
// refuser. Ici, on ne fait que rendre servable ce qu'il a donné.
//
// L'ORIGINAL N'EST JAMAIS TOUCHÉ. Toutes les fonctions rendent de nouveaux
// tampons ; aucune n'écrit à la place de l'entrée.
// ============================================================

/** Largeurs servies. Choisies sur les écrans réels, pas sur une échelle ronde :
 *  400 = vignette de grille sur téléphone ; 800 = fiche produit sur téléphone ;
 *  1200 = fiche sur ordinateur ; 1600 = écran dense ou zoom. */
export const LARGEURS = [400, 800, 1200, 1600] as const

/** Formats émis, du plus efficace au plus compatible. L'ordre COMPTE : le
 *  navigateur prend le premier qu'il sait lire dans un `<picture>`. */
export const FORMATS = ['avif', 'webp', 'jpeg'] as const
export type Format = (typeof FORMATS)[number]

/** Types acceptés à l'entrée. HEIC parce que c'est le format par défaut des
 *  iPhone : le refuser reviendrait à refuser la moitié des marchands. */
export const TYPES_ACCEPTES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
] as const

/** Plafond d'envoi. Au-delà, c'est une photo non redimensionnée d'un appareil
 *  récent — on préfère le dire que de faire échouer un envoi de 40 Mo en 3G. */
export const TAILLE_MAX = 15 * 1024 * 1024

export type Variante = {
  format: Format
  largeur: number
  donnees: Buffer
  octets: number
}

export type ImageAnalysee = {
  largeur: number
  hauteur: number
  format: string
  octets: number
  /** L'image porte-t-elle des métadonnées de position ? */
  gps: boolean
  /** Orientation EXIF déclarée (1 = droite). */
  orientation: number
}

/**
 * Ce que l'image EST, avant toute transformation.
 *
 * Sert à deux choses : avertir le marchand (trop petite, mauvais cadrage) et
 * prouver, après coup, que le GPS a bien disparu.
 */
export async function analyser(entree: Buffer): Promise<ImageAnalysee> {
  const m = await sharp(entree).metadata()
  // `width`/`height` de `metadata()` sont les dimensions STOCKÉES, avant
  // rotation EXIF. Pour une photo prise en portrait, elles sont inversées —
  // d'où l'échange ici, sans quoi l'avertissement « trop petite » porterait
  // sur la mauvaise dimension.
  const pivote = typeof m.orientation === 'number' && m.orientation >= 5
  return {
    largeur: (pivote ? m.height : m.width) ?? 0,
    hauteur: (pivote ? m.width : m.height) ?? 0,
    format: m.format ?? 'inconnu',
    octets: entree.length,
    gps: m.exif !== undefined && /GPS/i.test(m.exif.toString('latin1')),
    orientation: m.orientation ?? 1,
  }
}

/**
 * Redresse et NETTOIE.
 *
 * `.rotate()` sans argument applique l'orientation EXIF puis la neutralise :
 * sans cela, une photo prise en portrait s'affiche couchée partout où l'EXIF
 * n'est pas honoré — ce qui inclut la plupart des traitements en aval.
 *
 * `sharp` n'emporte AUCUNE métadonnée par défaut : les coordonnées GPS du
 * domicile du marchand, l'identifiant de l'appareil et l'horodatage
 * disparaissent, et c'est exactement ce qu'il faut. Ne jamais ajouter
 * `.withMetadata()` sur ce chemin — ce serait les réintroduire.
 */
export function redresser(entree: Buffer): Sharp {
  return sharp(entree, { failOn: 'none' }).rotate()
}

/** Encode une largeur dans un format, sans JAMAIS agrandir. */
async function encoder(base: Sharp, format: Format, largeur: number): Promise<Buffer> {
  // `withoutEnlargement` : agrandir une petite photo ne crée aucune
  // information, il crée du flou et du poids. Une image de 600 px servie en
  // 1600 est pire que la même servie en 600.
  const redim = base.clone().resize({ width: largeur, withoutEnlargement: true })
  // ── `effort: 2`, ET C'EST MESURÉ, PAS CHOISI AU HASARD.
  //
  // Coût d'encodage AVIF d'une photo réelle en 1200 px, sur cette machine :
  //
  //     effort :     0      1      2      3      4
  //     temps  :   59ms  124ms  183ms  393ms  1555ms
  //     poids  :  103ko   84ko   80ko   78ko    72ko
  //
  // Le genou de la courbe est à 2. Passer à 4 économise 8 ko et coûte HUIT
  // FOIS le temps serveur — trois largeurs par photo, et l'envoi dépasse la
  // minute. Ma première valeur était 4 : les tests l'ont fait tomber en
  // dépassement, et c'est ainsi que cette mesure a été faite.
  if (format === 'avif') return redim.avif({ quality: 55, effort: 2 }).toBuffer()
  if (format === 'webp') return redim.webp({ quality: 78 }).toBuffer()
  return redim.jpeg({ quality: 82, mozjpeg: true, progressive: true }).toBuffer()
}

/**
 * Toutes les variantes servables d'une image.
 *
 * Les largeurs supérieures à l'original sont ÉCARTÉES, pas produites en
 * double : les émettre remplirait le stockage de copies identiques et ferait
 * choisir au navigateur un fichier plus lourd pour la même image.
 */
export async function produireVariantes(entree: Buffer): Promise<Variante[]> {
  const base = redresser(entree)
  // LARGEUR APRÈS REDRESSEMENT, jamais celle des métadonnées. `metadata()` sur
  // un pipeline rend les dimensions STOCKÉES : pour une photo prise en
  // portrait (EXIF 6), elle annonce 1600 de large alors que l'image redressée
  // en fait 1200. On produisait donc une variante « 1600 » qui, bornée par
  // `withoutEnlargement`, était l'exacte copie de la 1200 — du stockage
  // dépensé pour un fichier que le navigateur choisirait à tort.
  const { largeur: largeurReelle } = await analyser(entree)

  // UNIQUEMENT les largeurs que l'original peut réellement remplir.
  //
  // La première version gardait aussi « la première largeur au-dessus », pour
  // ne pas perdre les 100 px d'une photo de 900. MESURÉ sur une capture de
  // 1206 px : elle produisait une variante « 1600 » que `withoutEnlargement`
  // ramenait à 1206 — un quasi-doublon de la 1200, stocké et servi en pure
  // perte. Servir 800 au lieu de 900 ne se voit pas ; payer deux fois le même
  // fichier, si.
  //
  // La plus petite largeur est toujours gardée : une photo minuscule doit
  // quand même avoir une variante, sinon elle n'est plus servable du tout.
  const utiles = LARGEURS.filter((l, i) => i === 0 || l <= largeurReelle)
  const sorties: Variante[] = []
  for (const format of FORMATS) {
    for (const largeur of utiles) {
      const donnees = await encoder(base, format, largeur)
      sorties.push({ format, largeur, donnees, octets: donnees.length })
    }
  }
  return sorties
}

/**
 * Aperçu flou en data-URI, à afficher pendant le chargement.
 *
 * Quelques centaines d'octets, donc présent AVEC le HTML : le visiteur voit
 * les couleurs du produit immédiatement au lieu d'un rectangle gris. Sur une
 * connexion lente, c'est la différence entre « la page charge » et « la page
 * est cassée ».
 */
export async function apercuFlou(entree: Buffer): Promise<string> {
  const donnees = await redresser(entree)
    .resize({ width: 16, withoutEnlargement: true })
    .blur(1.2)
    .webp({ quality: 40 })
    .toBuffer()
  return `data:image/webp;base64,${donnees.toString('base64')}`
}

export type Avertissement = { code: string; message: string }

/**
 * Ce qui cloche dans la photo — SANS JAMAIS BLOQUER.
 *
 * Décision assumée : on avertit, on n'interdit pas. Un marchand qui n'a que
 * cette photo-là doit pouvoir la publier ; lui refuser son seul visuel le
 * laisserait sans boutique. Le conseil sert à ce qu'il refasse la prochaine
 * mieux, pas à l'arrêter.
 */
export function avertissements(image: ImageAnalysee): Avertissement[] {
  const out: Avertissement[] = []
  const cote = Math.min(image.largeur, image.hauteur)

  if (cote > 0 && cote < 600) {
    out.push({
      code: 'trop_petite',
      message:
        `Photo de ${String(image.largeur)}×${String(image.hauteur)} px : elle sera floue sur un grand écran. ` +
        'Vise au moins 1200 px de côté.',
    })
  } else if (cote > 0 && cote < 1200) {
    out.push({
      code: 'petite',
      message:
        `Photo de ${String(image.largeur)}×${String(image.hauteur)} px : correcte sur téléphone, juste sur ordinateur. ` +
        '1200 px de côté serait mieux.',
    })
  }

  // Panoramique : un produit dans une image très large est minuscule une fois
  // la vignette carrée appliquée — et comme on ne rogne JAMAIS, il reste
  // minuscule au lieu d'être coupé. L'avertissement est donc utile, pas cosmétique.
  const ratio = image.hauteur > 0 ? image.largeur / image.hauteur : 1
  if (ratio > 1.9 || ratio < 0.45) {
    out.push({
      code: 'cadrage',
      message:
        'Photo très allongée : le produit apparaîtra petit dans la grille. ' +
        'Un format carré ou vertical (4:5) le met bien plus en valeur.',
    })
  }

  if (image.octets > 8 * 1024 * 1024) {
    out.push({
      code: 'lourde',
      message: 'Photo très lourde : elle sera compressée automatiquement pour vos visiteurs.',
    })
  }

  return out
}

/** Seuil de flou. CALIBRÉ, pas estimé — voir la table dans `flou()`. */
export const SEUIL_FLOU = 150

/**
 * Netteté mesurée — variance du laplacien, calculée LOCALEMENT.
 *
 * Aucun modèle, aucun service : une convolution 3×3 sur une miniature en gris.
 * Plus la variance est basse, plus l'image est uniforme, donc floue.
 *
 * ── LE SEUIL EST MESURÉ. Ma première valeur (60) ne détectait RIEN : une image
 * délibérément floutée rendait 98, donc passait pour nette. Un détecteur qui ne
 * détecte pas est pire qu'absent — il rassure. Table relevée sur une capture
 * réelle, floutée par paliers :
 *
 *     flou appliqué :   0     1     3     5     8    12    20
 *     variance      : 2183  2074  1402   855   318    98    16
 *
 * 150 sépare « nettement flou » (≥ 10) de « un peu mou » (8 → 318, accepté).
 * VOLONTAIREMENT BAS : signaler une photo nette à tort est bien pire que
 * laisser passer une photo molle — au premier faux positif, le marchand cesse
 * de croire l'avertissement, et tous les suivants sont perdus.
 *
 * ── CE QU'IL NE SAIT PAS FAIRE, et il faut le dire : un produit blanc sur fond
 * blanc a peu de détail et donc une variance basse, sans être flou (aplat uni
 * mesuré : 0). C'est pourquoi ce signal AVERTIT et ne bloque JAMAIS.
 */
export async function flou(entree: Buffer): Promise<{ variance: number; floue: boolean }> {
  const taille = 256
  const { data, info } = await redresser(entree)
    .resize({ width: taille, height: taille, fit: 'inside' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width: w, height: h } = info
  let somme = 0
  let sommeCarres = 0
  let n = 0
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x
      // Noyau laplacien : 4·centre − les quatre voisins orthogonaux.
      const v =
        4 * data[i]! - data[i - 1]! - data[i + 1]! - data[i - w]! - data[i + w]!
      somme += v
      sommeCarres += v * v
      n += 1
    }
  }
  if (n === 0) return { variance: 0, floue: false }
  const moyenne = somme / n
  const variance = sommeCarres / n - moyenne * moyenne
  return { variance, floue: variance < SEUIL_FLOU }
}
