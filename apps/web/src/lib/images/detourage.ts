import sharp from 'sharp'

// ════════════════════════════════════════════════════════════════════
//  DÉTOURAGE CÔTÉ SERVEUR — LA CONTRAINTE QUI BLOQUAIT TOUT A SAUTÉ.
// ════════════════════════════════════════════════════════════════════
//
// ── CE QUE `fond.ts` DISAIT, ET POURQUOI CE N'EST PLUS VRAI.
//
// « U²-Net fait 176 Mo et ne tiendra pas sur Vercel ; cette capacité exige un
// processus séparé, donc une décision d'hébergement. » C'était exact pour le
// modèle COMPLET et pour `onnxruntime-node`, qui embarque des binaires natifs.
//
// Deux faits mesurés le 2026-10-06 ont levé les deux obstacles :
//
//   · `u2netp` — la version portable du MÊME modèle, MÊME licence
//     Apache-2.0 — fait **4,4 Mo** au lieu de 176 ;
//   · `onnxruntime-web` tourne SOUS NODE. Aucun binaire natif, du WebAssembly.
//     Chargement 276 ms, inférence 685 ms sur une photo de 2160×3840.
//
// Conséquence : le même code détoure dans le navigateur du marchand ET sur le
// serveur. Et c'est ce second chemin qui permet de rattraper TOUTES les
// boutiques déjà en ligne, sans demander un geste à qui que ce soit.
//
// ── CE MODULE NE TOUCHE À RIEN DU NAVIGATEUR.
//
// Ni `document`, ni `canvas`, ni `window`. Il reste dans la couche métier, et
// le cliquet de portabilité le vérifie.

/** Taille d'entrée du réseau. Fixée par le modèle, pas par nous. */
const N = 320

/** Au-dessus de ce seuil, un pixel appartient au sujet. */
const SEUIL = 128

let sessionPromesse: Promise<unknown> | null = null

/**
 * Charge le modèle UNE FOIS par instance.
 *
 * La promesse est mémorisée, pas le résultat : un lot qui traite cent photos
 * ne doit pas relire le fichier cent fois. Une fonction serverless repart à
 * froid entre deux invocations — c'est 276 ms payés une fois par lot, pas par
 * photo.
 */
async function session(modele: Modele): Promise<unknown> {
  sessionPromesse ??= (async () => {
    const ort = await import('onnxruntime-web')
    return ort.InferenceSession.create(modele as never)
  })()
  return sessionPromesse
}

/**
 * D'où vient le modèle.
 *
 * UN CHEMIN N'EST PAS UNE GARANTIE. `public/` part au CDN et n'est pas, par
 * défaut, dans le système de fichiers d'une fonction serveur : un lot calé sur
 * un chemin marche en local et casse UNE FOIS EN LIGNE — le pire des deux,
 * parce que la preuve locale est verte. Accepter aussi des OCTETS permet à
 * l'appelant d'aller les chercher là où il est sûr de les trouver.
 */
export type Modele = string | Uint8Array

export interface Detourage {
  /** Le sujet seul, PNG avec transparence. */
  readonly sujet: Buffer
  /** Part de l'image occupée par le sujet, 0–1. */
  readonly part: number
  /** La boîte qui le contient, en pixels de l'image redressée. */
  readonly boite: { left: number; top: number; width: number; height: number }
  /**
   * CONTRASTE MOYEN DE PART ET D'AUTRE DU CONTOUR, 0–255.
   *
   * C'est le juge de la découpe. Un détourage honnête sépare un objet de son
   * fond : la luminosité saute au passage du contour. Un masque qui COUPE AU
   * MILIEU d'un objet continu ne saute pas — dedans et dehors se ressemblent.
   *
   * Mesuré sur quatre photos réelles : 42, 55 et 72 pour les découpes justes,
   * **20** pour celle qui avait pris le cadran d'une montre en laissant le
   * bracelet dehors. La séparation est franche.
   */
  readonly contraste: number
  /** Luminosité médiane du FOND — tout ce que le masque ne retient pas. */
  readonly fondMediane: number
  /** Étendue entre déciles du fond. Un fond PLAT la laisse proche de zéro. */
  readonly fondEtendue: number
}

/**
 * Isole le sujet d'une photo.
 *
 * Rend `null` quand le modèle ne trouve rien — et c'est un verdict, pas une
 * panne : une photo sans sujet saillant ne doit pas être détourée au hasard.
 */
export async function detourer(entree: Buffer, modele: Modele): Promise<Detourage | null> {
  const ort = await import('onnxruntime-web')
  const s = (await session(modele)) as {
    inputNames: string[]
    outputNames: string[]
    run: (e: Record<string, unknown>) => Promise<Record<string, { data: Float32Array }>>
  }

  // TAILLE APRÈS REDRESSEMENT, jamais celle des métadonnées : pour une photo
  // prise en portrait (EXIF 6), `metadata()` annonce les dimensions STOCKÉES.
  // La leçon est déjà écrite dans `produireVariantes` — elle se repaie ici.
  const base = await sharp(entree).rotate().jpeg({ quality: 95 }).toBuffer()
  const meta = await sharp(base).metadata()
  const largeur = meta.width ?? 0
  const hauteur = meta.height ?? 0
  if (largeur === 0 || hauteur === 0) return null

  const { data } = await sharp(base)
    .removeAlpha()
    .resize(N, N, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Normalisation attendue par U²-Net. Les constantes viennent du modèle :
  // les changer dégrade le masque sans que rien ne le signale.
  const tenseur = new Float32Array(3 * N * N)
  const MOY = [0.485, 0.456, 0.406]
  const ECART = [0.229, 0.224, 0.225]
  for (let i = 0; i < N * N; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      tenseur[c * N * N + i] = (data[i * 3 + c]! / 255 - MOY[c]!) / ECART[c]!
    }
  }

  const sortie = await s.run({
    [s.inputNames[0]!]: new ort.Tensor('float32', tenseur, [1, 3, N, N]),
  })
  const brut = sortie[s.outputNames[0]!]!.data

  // Le réseau rend des valeurs non bornées : on les ramène dans [0,1] par leur
  // propre étendue. Normaliser en dur délaverait le masque sur les photos peu
  // contrastées — exactement celles prises en boutique.
  let min = Infinity
  let max = -Infinity
  for (const v of brut) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const etendue = max - min || 1

  // ── LA BOÎTE SE LIT DANS LE MASQUE, PAS DANS LES PIXELS.
  //
  // `trim()` sur un PNG à bords adoucis garde le halo : l'article ressortait
  // minuscule au milieu d'un cadre vide. Le masque, lui, dit exactement où il
  // est — mesuré sur une photo réelle avant d'être écrit ici.
  const rgba = Buffer.alloc(N * N * 4)
  let x0 = N
  let y0 = N
  let x1 = -1
  let y1 = -1
  let couverts = 0
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const i = y * N + x
      const a = Math.round(((brut[i]! - min) / etendue) * 255)
      rgba[i * 4] = 255
      rgba[i * 4 + 1] = 255
      rgba[i * 4 + 2] = 255
      rgba[i * 4 + 3] = a
      if (a > SEUIL) {
        couverts += 1
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return null

  const fx = largeur / N
  const fy = hauteur / N
  const boite = {
    left: Math.max(0, Math.floor(x0 * fx)),
    top: Math.max(0, Math.floor(y0 * fy)),
    width: Math.min(largeur, Math.ceil((x1 - x0 + 1) * fx)),
    height: Math.min(hauteur, Math.ceil((y1 - y0 + 1) * fy)),
  }

  const masque = await sharp(rgba, { raw: { width: N, height: N, channels: 4 } })
    .resize(largeur, hauteur, { fit: 'fill' })
    .blur(0.6)
    .png()
    .toBuffer()

  // DEUX PASSES, et c'est obligatoire : `sharp` applique `extract` AVANT
  // `composite` dans son ordre interne. En une seule chaîne, l'image était
  // rognée d'abord, puis on tentait d'y poser un masque pleine taille.
  const masquee = await sharp(base)
    .ensureAlpha()
    .composite([{ input: masque, blend: 'dest-in' }])
    .png()
    .toBuffer()
  const sujet = await sharp(masquee).extract(boite).png().toBuffer()

  // ── LE CONTRASTE AU CONTOUR, calculé sur la vignette de travail.
  //
  // On ne parcourt que les pixels de BORD — ceux qui sont dans le sujet et
  // ont un voisin dehors. C'est là, et nulle part ailleurs, que se lit la
  // qualité d'une découpe.
  const lum = (i: number): number =>
    (data[i * 3]! + data[i * 3 + 1]! + data[i * 3 + 2]!) / 3
  let somme = 0
  let bords = 0
  for (let y = 1; y < N - 1; y += 1) {
    for (let x = 1; x < N - 1; x += 1) {
      const i = y * N + x
      if (rgba[i * 4 + 3]! <= SEUIL) continue
      for (const v of [i - 1, i + 1, i - N, i + N]) {
        if (rgba[v * 4 + 3]! > SEUIL) continue
        somme += Math.abs(lum(i) - lum(v))
        bords += 1
      }
    }
  }

  // ── LE FOND RÉEL EST LE COMPLÉMENT DU MASQUE, PAS LE BORD DE L'IMAGE.
  //
  // Première version : on regardait les quatre bords. Mesuré sur une photo
  // réelle — un carton sur carrelage orange — ils étaient BLANCS à 255 avec
  // zéro écart, et la photo était classée « déjà propre ». Le blanc venait du
  // cadre carré posé par NOTRE PROPRE traitement précédent.
  //
  // Un critère qui lit les traces de son propre passage ne mesure plus rien.
  // Le fond, c'est tout ce que le masque ne retient pas.
  // On ne retient que les pixels FRANCHEMENT fond : tout leur voisinage 5×5
  // est hors du sujet. Les pixels collés au contour sont ceux que le masque se
  // trompe le plus souvent, et c'est là que la mesure se salit.
  //
  // Mesuré : moyenne ± écart-type donnait 203±36 sur une photo de studio au
  // fond blanc uni — quelques pixels de sujet versés dans le fond suffisaient
  // à faire mentir l'écart-type. On lit donc une MÉDIANE et une ÉTENDUE entre
  // déciles, que des pixels aberrants ne déplacent pas.
  const fond: number[] = []
  for (let y = 2; y < N - 2; y += 1) {
    for (let x = 2; x < N - 2; x += 1) {
      const i = y * N + x
      if (rgba[i * 4 + 3]! > SEUIL) continue
      let pur = true
      for (let dy = -2; dy <= 2 && pur; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          if (rgba[((y + dy) * N + x + dx) * 4 + 3]! > SEUIL) {
            pur = false
            break
          }
        }
      }
      if (pur) fond.push(lum(i))
    }
  }
  fond.sort((p, q) => p - q)
  const au = (q: number): number => fond[Math.min(fond.length - 1, Math.floor(fond.length * q))] ?? 0
  const fondMediane = fond.length === 0 ? 0 : au(0.5)
  const fondEtendue = fond.length === 0 ? 255 : au(0.9) - au(0.1)

  return {
    sujet,
    part: couverts / (N * N),
    boite,
    contraste: bords === 0 ? 0 : somme / bords,
    fondMediane,
    fondEtendue,
  }
}

/**
 * CE TRAITEMENT VA-T-IL AMÉLIORER CETTE PHOTO, OU L'ABÎMER ?
 *
 * ── POURQUOI CETTE QUESTION EXISTE.
 *
 * Mesuré sur trois photos réelles d'une boutique : deux réussites franches, et
 * UN ÉCHEC. La troisième n'était pas une photo de téléphone mais une CAPTURE
 * D'ÉCRAN de site. Le modèle a pris le cadran d'une montre pour le sujet et le
 * cadrage a perdu le bracelet — l'image est ressortie DÉGRADÉE.
 *
 * Un traitement appliqué à toutes les boutiques SANS cette garde abîmerait des
 * fiches qui allaient bien, à grande échelle, sans que personne ne le voie.
 *
 * ── LES TROIS REFUS, ET CE QU'ILS PROTÈGENT.
 */
export function verdict(d: Detourage | null): { traiter: boolean; motif: string } {
  if (d === null) {
    return { traiter: false, motif: 'aucun sujet détecté — rien à isoler' }
  }
  // ① Le modèle a pris presque toute l'image : il n'a rien isolé, il a tout
  //    gardé. Détourer ne changerait rien et le recadrage zoomerait au hasard.
  if (d.part > 0.82) {
    return { traiter: false, motif: `sujet sur ${(d.part * 100).toFixed(0)} % de l'image — rien à retirer` }
  }
  // ② Le sujet est minuscule : le modèle s'est probablement accroché à un
  //    détail. C'est le cas de la capture d'écran, et le recadrage l'aurait
  //    agrandi jusqu'à l'illisible.
  if (d.part < 0.04) {
    return { traiter: false, motif: `sujet sur ${(d.part * 100).toFixed(1)} % seulement — détection douteuse` }
  }
  // ③ Le fond est PARFAITEMENT PLAT : la photo sort déjà d'un studio ou d'un
  //    détourage fait ailleurs. Rien à y gagner, autant l'épargner.
  //
  //    ⚠️ CETTE GARDE EST ÉTROITE À DESSEIN, et il faut dire pourquoi.
  //    Première version : « fond clair et régulier ». Elle refusait une photo
  //    posée sur du carrelage orange, parce qu'elle lisait le cadre blanc posé
  //    par NOTRE PROPRE passage précédent. Et surtout, elle répondait à la
  //    mauvaise question : retraiter une photo propre ne la dégrade PAS — le
  //    vrai danger est de la traiter DEUX FOIS et de rogner ses marges à
  //    chaque passage. Ça ne se corrige pas en devinant une statistique :
  //    ça se corrige par REGISTRE, et c'est le lot qui en tient un.
  //
  //    Il ne reste donc ici que le cas indiscutable — un fond sans aucune
  //    variation. Mesuré : 0 sur une photo déjà détourée, 58 à 200 sur les
  //    photos à traiter.
  if (d.fondEtendue < 10 && d.fondMediane > 150) {
    return {
      traiter: false,
      motif: `fond parfaitement plat (étendue ${d.fondEtendue.toFixed(0)}) — déjà détourée`,
    }
  }
  // ④ LA DÉCOUPE NE SÉPARE RIEN, et c'est la garde qui attrape le cas de la
  //    montre. Un détourage honnête fait sauter la luminosité au contour ;
  //    un masque qui coupe au milieu d'un objet continu ne la fait pas sauter.
  //
  //    Seuil posé à 30 d'après quatre photos réelles : 42, 55 et 72 pour les
  //    découpes justes, 20 pour celle qui avait pris le cadran d'une montre en
  //    laissant le bracelet dehors.
  //
  //    ⚠️ QUATRE PHOTOS NE FONT PAS UNE CALIBRATION. Le lot tourne à blanc
  //    d'abord : c'est le corpus réel qui dira si ce seuil est le bon, et il
  //    se déplacera si les chiffres le demandent.
  if (d.contraste < 30) {
    return {
      traiter: false,
      motif: `contour peu contrasté (${d.contraste.toFixed(0)}) — la découpe ne sépare rien`,
    }
  }
  return { traiter: true, motif: `sujet sur ${(d.part * 100).toFixed(0)} % de l'image` }
}
