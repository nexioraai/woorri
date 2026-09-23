import sharp from 'sharp'
import type { Sharp } from 'sharp'
import { redresser } from './traitement'

// ============================================================
// « PHOTO PRO » — CE QUE `sharp` SAIT FAIRE, ET RIEN DE PLUS.
//
// AUCUN MODÈLE, AUCUN SERVICE, AUCUN GPU. Tout ici est de l'arithmétique sur
// des histogrammes et des convolutions, exécutée par libvips sur le processeur.
// La contrainte « pas de fournisseur de modèle » n'est pas contournée : elle
// n'est même pas approchée.
//
// LE PROBLÈME RÉEL, ET IL N'EST PAS ESTHÉTIQUE. Une photo prise dans une
// boutique de N'Djamena est sous-exposée (contre-jour de la porte), tirée vers
// le jaune (tube fluorescent ou ampoule à incandescence) et molle (mise au point
// au jugé). L'article est là, mais il a l'air terne — et un article terne ne se
// vend pas. Les quatre corrections ci-dessous visent CES causes-là, pas un
// rendu « artistique ».
//
// CE QUI N'EST PAS ICI : la suppression de fond. Elle exige un modèle
// (U²-Net, ~176 Mo) qui ne tient pas dans une fonction serverless. Elle vit
// dans `fond.ts`, derrière une interface, et son déploiement est une décision
// d'hébergement — voir PROGRESS.md.
//
// L'ORIGINAL N'EST JAMAIS REMPLACÉ. Ces fonctions rendent de nouveaux tampons.
// Le marchand doit pouvoir revenir en arrière, toujours.
// ============================================================

export type Statistiques = {
  /** Luminosité moyenne, 0–255. */
  luminosite: number
  /** Écart-type de la luminance : bas = image plate, terne. */
  contraste: number
  /** Moyennes par canal, pour la balance des blancs. */
  canaux: { r: number; v: number; b: number }
}

/** Ce que l'image EST, avant de décider quoi corriger. */
export async function statistiques(entree: Buffer): Promise<Statistiques> {
  const s = await sharp(entree).stats()
  const [r, v, b] = s.channels
  if (!r || !v || !b) {
    return { luminosite: 128, contraste: 50, canaux: { r: 128, v: 128, b: 128 } }
  }
  return {
    luminosite: (r.mean + v.mean + b.mean) / 3,
    contraste: (r.stdev + v.stdev + b.stdev) / 3,
    canaux: { r: r.mean, v: v.mean, b: b.mean },
  }
}

/** Bornes de sécurité. Une correction est une SUGGESTION, pas une réécriture. */
const GAIN_MAX = 1.6
const GAIN_MIN = 0.75
const LUMINOSITE_CIBLE = 132

/**
 * Exposition et contraste.
 *
 * `linear(a, b)` applique `v → a·v + b`. Le gain est calculé pour amener la
 * luminosité moyenne vers la cible, puis BORNÉ : au-delà, une photo très
 * sombre deviendrait grise et bruitée plutôt que claire. Une correction
 * violente trahit l'article ; c'est pire que de ne rien faire.
 *
 * Le contraste n'est relevé QUE s'il est réellement bas : rehausser une photo
 * déjà contrastée écrase les noirs et brûle les blancs — et sur un vêtement
 * foncé, cela efface les plis, donc la matière.
 */
export function exposition(pipeline: Sharp, st: Statistiques): Sharp {
  const gain = Math.min(GAIN_MAX, Math.max(GAIN_MIN, LUMINOSITE_CIBLE / Math.max(st.luminosite, 1)))
  // `b` compense pour que les noirs ne se lèvent pas : un gain seul éclaircit
  // aussi le noir, et l'image paraît voilée.
  const decalage = (1 - gain) * 12
  let p = pipeline.linear(gain, decalage)
  if (st.contraste < 42) {
    // Étirement doux de l'histogramme, bornes conservatrices : `normalise()`
    // sans bornes sature les photos à fond uni — exactement le cas d'un
    // article posé sur une table claire.
    p = p.normalise({ lower: 2, upper: 98 })
  }
  return p
}

/**
 * Balance des blancs, méthode du monde gris.
 *
 * Hypothèse : sur une photo ordinaire, la moyenne des couleurs tend vers le
 * gris. L'écart entre canaux mesure donc la dominante de l'éclairage — le
 * jaune d'une ampoule, le vert d'un néon. On la compense.
 *
 * CETTE HYPOTHÈSE EST FAUSSE sur une image DOMINÉE par une seule couleur
 * (un tissu rouge plein cadre). Les gains sont donc bornés serré : mieux vaut
 * corriger à moitié une dominante réelle que délaver un article rouge.
 */
export function balanceDesBlancs(pipeline: Sharp, st: Statistiques): Sharp {
  const { r, v, b } = st.canaux
  const moyenne = (r + v + b) / 3
  if (moyenne < 1) return pipeline
  const borne = (x: number) => Math.min(1.25, Math.max(0.8, moyenne / Math.max(x, 1)))
  return pipeline.recomb([
    [borne(r), 0, 0],
    [0, borne(v), 0],
    [0, 0, borne(b)],
  ])
}

/**
 * Débruitage puis netteté — DANS CET ORDRE, et il n'est pas interchangeable.
 *
 * Accentuer avant de débruiter amplifie le bruit puis tente de l'effacer :
 * il reste des halos. Une photo prise en intérieur, capteur de téléphone à
 * haute sensibilité, en est pleine.
 *
 * `median(3)` efface le bruit ponctuel en préservant les arêtes, là où un flou
 * gaussien emporterait aussi les contours de l'article. La netteté reste
 * LÉGÈRE : au-delà, les bords prennent un liseré blanc qui signe la retouche.
 */
export function nettete(pipeline: Sharp, bruitee: boolean): Sharp {
  const p = bruitee ? pipeline.median(3) : pipeline
  return p.sharpen({ sigma: 0.8, m1: 0.6, m2: 2 })
}

export type Amelioration = {
  donnees: Buffer
  /** Ce qui a été fait, pour pouvoir le DIRE au marchand. */
  appliquees: string[]
  ms: number
}

/**
 * La chaîne complète d'embellissement.
 *
 * Elle rapporte CE QU'ELLE A FAIT. Sans cela, le marchand voit une image
 * différente sans savoir pourquoi, et ne peut ni faire confiance ni corriger
 * la prochaine prise.
 */
export async function ameliorer(entree: Buffer): Promise<Amelioration> {
  const debut = Date.now()
  const st = await statistiques(entree)
  const appliquees: string[] = []

  let p = redresser(entree)

  const gain = LUMINOSITE_CIBLE / Math.max(st.luminosite, 1)
  if (gain > 1.08) appliquees.push('éclaircie')
  else if (gain < 0.93) appliquees.push('assombrie')
  if (st.contraste < 42) appliquees.push('contraste relevé')
  p = exposition(p, st)

  const { r, v, b } = st.canaux
  const ecart = Math.max(r, v, b) - Math.min(r, v, b)
  if (ecart > 10) {
    appliquees.push('couleurs rééquilibrées')
    p = balanceDesBlancs(p, st)
  }

  // Le bruit se déduit du contraste local : une image très contrastée l'est
  // souvent parce qu'elle est bruitée, pas parce qu'elle est détaillée.
  const bruitee = st.contraste > 70
  if (bruitee) appliquees.push('bruit réduit')
  appliquees.push('netteté légère')
  p = nettete(p, bruitee)

  const donnees = await p.jpeg({ quality: 92, mozjpeg: true }).toBuffer()
  return { donnees, appliquees, ms: Date.now() - debut }
}

/**
 * Recadrage intelligent, avec des MARGES.
 *
 * `strategy: 'attention'` est la stratégie de libvips : elle cherche la zone de
 * plus forte saillance (contours, contraste, teintes de peau) et cadre dessus.
 * Aucun modèle n'est chargé — c'est un calcul d'énergie sur l'image.
 *
 * LA MARGE EST LE POINT, et c'est aussi ce qui distingue ce recadrage du
 * `object-cover` qu'on vient de retirer partout : on cadre sur l'article PUIS
 * on lui rend de l'air, au lieu de le coller aux bords. Un produit collé au
 * cadre paraît à l'étroit, et surtout il risque d'être coupé au moindre
 * changement de format d'affichage.
 *
 * RÉSERVE ASSUMÉE : `attention` se trompe sur un article posé sur un fond
 * chargé — elle peut cadrer sur le motif de la nappe. C'est pourquoi ce
 * recadrage est PROPOSÉ, jamais imposé : le marchand garde l'original.
 */
export async function recadrer(entree: Buffer, cote = 1200, margeRatio = 0.06): Promise<Buffer> {
  const interne = Math.round(cote * (1 - margeRatio * 2))
  const sujet = await redresser(entree)
    .resize(interne, interne, { fit: 'cover', position: sharp.strategy.attention })
    .toBuffer()

  const marge = Math.round((cote - interne) / 2)
  return sharp({
    create: {
      width: cote,
      height: cote,
      channels: 3,
      // Blanc : c'est le fond attendu d'une fiche produit, et celui sur lequel
      // les places de marché normalisent. Le fond de MARQUE est proposé
      // séparément, avec la suppression de fond.
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: sujet, top: marge, left: marge }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()
}
