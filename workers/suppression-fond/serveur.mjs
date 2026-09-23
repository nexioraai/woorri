// ============================================================
// WORKER DE DÉTOURAGE — U²-Net, exécuté ICI, sur le processeur.
//
// AUCUN APPEL SORTANT. Le modèle est un fichier sur le disque ; l'inférence
// tourne dans ce processus. Rien ne part chez un fournisseur de modèles, ni
// Anthropic, ni OpenAI, ni DeepSeek — la contrainte n'est pas contournée, elle
// n'est pas approchée.
//
// POURQUOI UN PROCESSUS QUI DURE : le modèle pèse ~176 Mo. Le charger coûte
// quelques secondes ; l'inférence en coûte une ou deux. Dans une fonction
// serverless, on paierait le chargement À CHAQUE PHOTO — plus cher que le
// travail utile. Ici il est chargé UNE FOIS, au démarrage, et réutilisé.
// ============================================================
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ort from 'onnxruntime-node'
import sharp from 'sharp'

const ICI = dirname(fileURLToPath(import.meta.url))
const MODELE = join(ICI, 'u2net.onnx')
const JETON = process.env.IMAGE_WORKER_TOKEN ?? ''
const PORT = Number(process.env.PORT ?? 8787)

/** Résolution d'entrée du modèle. Fixée par U²-Net, pas par nous. */
const N = 320

if (JETON === '') {
  console.error('IMAGE_WORKER_TOKEN manquant : ce worker refuserait tout le monde.')
  process.exit(2)
}
if (!existsSync(MODELE)) {
  console.error(`Modèle absent : ${MODELE}\nLancez d'abord : npm run modele`)
  process.exit(2)
}

console.log('Chargement du modèle…')
const debutChargement = Date.now()
const session = await ort.InferenceSession.create(MODELE)
console.log(`Modèle prêt en ${String(Date.now() - debutChargement)} ms — il reste en mémoire.`)

/** Normalisation attendue par U²-Net (moyennes/écarts d'ImageNet). */
const MOY = [0.485, 0.456, 0.406]
const ECART = [0.229, 0.224, 0.225]

async function masque(entree) {
  const { data } = await sharp(entree)
    .rotate()
    .resize(N, N, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Disposition NCHW : le modèle attend les canaux séparés, pas entrelacés.
  const tenseur = new Float32Array(3 * N * N)
  for (let i = 0; i < N * N; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      tenseur[c * N * N + i] = (data[i * 3 + c] / 255 - MOY[c]) / ECART[c]
    }
  }

  const sortie = await session.run({
    [session.inputNames[0]]: new ort.Tensor('float32', tenseur, [1, 3, N, N]),
  })
  const brut = sortie[session.outputNames[0]].data

  // U²-Net rend des valeurs non bornées : on les ramène en 0–255 par
  // min/max. Un seuil fixe couperait les contours doux (cheveux, tissus
  // fins) — exactement ce qu'un détourage doit préserver.
  let min = Infinity
  let max = -Infinity
  for (const v of brut) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const amplitude = max - min || 1
  const octets = Buffer.alloc(N * N)
  for (let i = 0; i < N * N; i += 1) {
    octets[i] = Math.round(((brut[i] - min) / amplitude) * 255)
  }
  return octets
}

async function detourer(entree, fond) {
  const m = await masque(entree)
  const base = sharp(entree).rotate()
  const { width, height } = await base.clone().metadata()

  // Le masque est ramené à la taille RÉELLE de la photo, avec un lissage :
  // un masque de 320 px agrandi brutalement donne un contour en escalier.
  const masqueRedim = await sharp(m, { raw: { width: N, height: N, channels: 1 } })
    .resize(width, height, { fit: 'fill' })
    .blur(0.6)
    .toBuffer()

  const sujet = await base
    .clone()
    .ensureAlpha()
    .composite([{ input: masqueRedim, raw: { width, height, channels: 1 }, blend: 'dest-in' }])
    .png()
    .toBuffer()

  // Fond PLEIN, jamais de transparence servie telle quelle : un PNG
  // transparent affiché sur un thème sombre donne un article qui flotte dans
  // le noir.
  const couleur = /^#[0-9a-fA-F]{6}$/.test(fond) ? fond : '#FFFFFF'
  return sharp({ create: { width, height, channels: 3, background: couleur } })
    .composite([{ input: sujet }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()
}

createServer((req, res) => {
  if (req.method !== 'POST' || !req.url?.startsWith('/detourer')) {
    res.writeHead(404).end('Not found')
    return
  }
  if (req.headers.authorization !== `Bearer ${JETON}`) {
    // Refus SEC : ce worker écrit des images pour des boutiques réelles.
    res.writeHead(401).end('Unauthorized')
    return
  }

  const morceaux = []
  let recu = 0
  req.on('data', (c) => {
    recu += c.length
    // Garde-fou de mémoire : sans elle, une requête géante suffit à faire
    // tomber le processus, et avec lui la capacité de TOUS les marchands.
    if (recu > 20 * 1024 * 1024) {
      res.writeHead(413).end('Too large')
      req.destroy()
      return
    }
    morceaux.push(c)
  })
  req.on('end', () => {
    void (async () => {
      const debut = Date.now()
      try {
        const sortie = await detourer(Buffer.concat(morceaux), req.headers['x-fond'] ?? '#FFFFFF')
        res.writeHead(200, { 'Content-Type': 'image/jpeg' }).end(sortie)
        console.log(`détourage ${String(Date.now() - debut)} ms`)
      } catch (e) {
        console.error('échec :', e instanceof Error ? e.message : e)
        res.writeHead(500).end('Echec')
      }
    })()
  })
}).listen(PORT, () => {
  console.log(`Worker de détourage à l'écoute sur :${String(PORT)}`)
})
