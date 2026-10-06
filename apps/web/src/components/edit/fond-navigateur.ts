// ════════════════════════════════════════════════════════════════════
//  DÉTOURAGE DANS LE NAVIGATEUR DU MARCHAND — GRATUIT, ET DÉPLOYABLE.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI CE FICHIER N'EST PAS DANS `src/lib/`.
//
// Il y était, et un cliquet d'architecture l'a refusé — à juste titre :
// `src/lib/` est la couche MÉTIER, et elle doit rester consommable par un
// client qui n'est pas un navigateur (application native, service, tâche
// planifiée). Ce fichier emploie `document` et `createImageBitmap` : il
// appartient à la PRÉSENTATION, à côté de l'écran qui s'en sert.
//
// Le cliquet proposait aussi une dérogation. Elle aurait été fausse : la
// dépendance n'est pas « côté émetteur », elle est au cœur du traitement.
//
// ── CE QUE LA COMPARAISON A MONTRÉ, ET QU'AUCUN RÉGLAGE NE CORRIGE.
//
// Trois photos de la même boutique, mesurées le 2026-10-06. Deux passées par
// PhotoRoom avant envoi, une envoyée brute depuis un téléphone. L'écart ne
// tenait ni à l'exposition, ni à la netteté, ni au cadrage :
//
//   · les deux premières : l'article seul, sur un fond UNIFORME, centré ;
//   · la troisième : l'article sur un CARRELAGE ORANGE, avec les taches du
//     sol, et coupé en haut et en bas.
//
// On peut corriger l'exposition d'un carrelage. On ne peut pas le faire
// disparaître avec un histogramme. **Le seul écart, c'est le fond** — et le
// seul moyen de le supprimer est un modèle de segmentation.
//
// ── POURQUOI LE NAVIGATEUR, ET PAS LE SERVEUR.
//
// `fond.ts` dit vrai depuis le début : U²-Net complet fait 176 Mo et ne tient
// pas dans une fonction serverless. Le worker autonome existe
// (`workers/suppression-fond/`) et attend un hébergement — c'est-à-dire une
// dépense, et une décision du propriétaire.
//
// Il existe une troisième voie, et elle ne coûte RIEN : **u2netp**, la version
// portable du MÊME modèle, sous la MÊME licence Apache-2.0, en **4,4 Mo**.
// Elle tient dans un navigateur. Le téléphone du marchand fait le travail,
// une fois, pendant qu'il attend déjà son envoi.
//
// Pas de serveur à payer, pas de modèle à héberger, pas de coût par photo.
//
// ── CE QUE ÇA COÛTE AU MARCHAND, ET C'EST DIT.
//
// 4,4 Mo téléchargés UNE FOIS, puis mis en cache par le navigateur. Sur une
// connexion lente — et c'est le cas de nos marchands — c'est réel. D'où deux
// décisions :
//
//   · le modèle est servi depuis NOTRE origine (`/modeles/`), donc par le CDN
//     et avec un cache long. Le chercher sur GitHub à chaque envoi aurait
//     ajouté une dépendance tierce au moment le plus fragile ;
//   · il n'est chargé QU'AU PREMIER DÉTOURAGE, jamais à l'ouverture de la
//     page. Un marchand qui ne touche pas à ses photos ne paie rien.
//
// ── CE QU'IL REND, ET POURQUOI PAS DE TRANSPARENCE.
//
// Un JPEG sur fond BLANC, pas un PNG transparent. La chaîne d'envoi existante
// convertit en JPEG, et `sharp` aplatit alors la transparence sur du NOIR :
// l'article serait détouré puis posé sur un rectangle noir. Composer le blanc
// ICI laisse tout le reste de la chaîne intact — zéro risque sur ce qui marche
// déjà.

/** Taille d'entrée du réseau. Fixée par le modèle, pas par nous. */
const N = 320

let sessionPromesse: Promise<unknown> | null = null

/**
 * Charge le modèle, UNE SEULE FOIS par onglet.
 *
 * La promesse est mémorisée, pas le résultat : deux photos envoyées coup sur
 * coup ne doivent pas déclencher deux téléchargements de 4,4 Mo.
 */
async function session(): Promise<any> {
  if (sessionPromesse === null) {
    sessionPromesse = (async () => {
      const ort = await import('onnxruntime-web')
      // WASM : aucun GPU exigé. Les téléphones de nos marchands n'ont pas
      // tous WebGPU, et un repli silencieux vaut mieux qu'un échec élégant.
      return ort.InferenceSession.create('/modeles/u2netp.onnx', {
        executionProviders: ['wasm'],
      })
    })()
  }
  return sessionPromesse
}

/** Le fichier, décodé en pixels, à la taille du réseau. */
async function enTenseur(fichier: Blob): Promise<{
  donnees: Float32Array
  largeur: number
  hauteur: number
  original: ImageBitmap
}> {
  const original = await createImageBitmap(fichier)
  const toile = document.createElement('canvas')
  toile.width = N
  toile.height = N
  const ctx = toile.getContext('2d')
  if (ctx === null) throw new Error('canvas indisponible')
  ctx.drawImage(original, 0, 0, N, N)
  const { data } = ctx.getImageData(0, 0, N, N)

  // Normalisation attendue par U²-Net : canaux séparés (CHW), valeurs centrées.
  // Les constantes viennent du modèle, pas d'un réglage — les changer dégrade
  // le masque sans que rien ne le signale.
  const donnees = new Float32Array(3 * N * N)
  const MOY = [0.485, 0.456, 0.406]
  const ECART = [0.229, 0.224, 0.225]
  for (let i = 0; i < N * N; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      donnees[c * N * N + i] = (data[i * 4 + c]! / 255 - MOY[c]!) / ECART[c]!
    }
  }
  return { donnees, largeur: original.width, hauteur: original.height, original }
}

export interface ResultatDetourage {
  /** Le JPEG détouré, posé sur blanc. */
  readonly fichier: File
  readonly ms: number
}

/**
 * Détoure une photo et la pose sur du blanc.
 *
 * Rend `null` si quoi que ce soit échoue — modèle injoignable, navigateur trop
 * ancien, image illisible. **Un détourage raté ne doit JAMAIS empêcher un
 * envoi** : le marchand perdrait sa photo pour une amélioration.
 */
export async function detourerDansLeNavigateur(
  fichier: File,
): Promise<ResultatDetourage | null> {
  const debut = Date.now()
  try {
    const ort = await import('onnxruntime-web')
    const s = await session()
    const { donnees, largeur, hauteur, original } = await enTenseur(fichier)

    const sortie = await (s as any).run({
      [(s as any).inputNames[0]]: new ort.Tensor('float32', donnees, [1, 3, N, N]),
    })
    const brut = (sortie[(s as any).outputNames[0]].data as Float32Array)

    // Le réseau rend des valeurs non bornées : on les ramène dans [0,1] par
    // leur propre étendue. Normaliser sur [0,255] en dur produirait un masque
    // délavé sur les photos peu contrastées — exactement celles de nos
    // marchands.
    let min = Infinity
    let max = -Infinity
    for (const v of brut) {
      if (v < min) min = v
      if (v > max) max = v
    }
    const etendue = max - min || 1

    // Le masque est calculé en 320 px puis ÉTIRÉ à la taille réelle par le
    // canvas : un masque agrandi brutalement donne un contour en escalier,
    // et le lissage du canvas est précisément ce qu'il faut ici.
    const petit = document.createElement('canvas')
    petit.width = N
    petit.height = N
    const pctx = petit.getContext('2d')
    if (pctx === null) return null
    const img = pctx.createImageData(N, N)
    for (let i = 0; i < N * N; i += 1) {
      const a = Math.round(((brut[i]! - min) / etendue) * 255)
      img.data[i * 4] = 255
      img.data[i * 4 + 1] = 255
      img.data[i * 4 + 2] = 255
      img.data[i * 4 + 3] = a
    }
    pctx.putImageData(img, 0, 0)

    const toile = document.createElement('canvas')
    toile.width = largeur
    toile.height = hauteur
    const ctx = toile.getContext('2d')
    if (ctx === null) return null
    // ① le blanc d'abord : c'est lui qui remplace le carrelage.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, largeur, hauteur)
    // ② la photo, masquée. On dessine le masque, puis la photo en
    //    `source-in` : seul ce que le masque couvre est conservé.
    const calque = document.createElement('canvas')
    calque.width = largeur
    calque.height = hauteur
    const cctx = calque.getContext('2d')
    if (cctx === null) return null
    cctx.drawImage(petit, 0, 0, largeur, hauteur)
    cctx.globalCompositeOperation = 'source-in'
    cctx.drawImage(original, 0, 0, largeur, hauteur)
    ctx.drawImage(calque, 0, 0)

    const blob = await new Promise<Blob | null>((r) => {
      toile.toBlob(r, 'image/jpeg', 0.92)
    })
    if (blob === null) return null
    return {
      fichier: new File([blob], fichier.name.replace(/\.[^.]+$/, '') + '-detouree.jpg', {
        type: 'image/jpeg',
      }),
      ms: Date.now() - debut,
    }
  } catch {
    // Silencieux À DESSEIN : l'appelant retombe sur la photo d'origine, et le
    // marchand ne doit pas voir une erreur technique pour un bonus manqué.
    return null
  }
}
