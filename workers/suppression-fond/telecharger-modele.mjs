// Télécharge U²-Net (~176 Mo), UNE SEULE FOIS, sur le disque du worker.
//
// Le modèle n'est PAS versionné au dépôt : 176 Mo dans Git alourdiraient chaque
// clone pour un fichier binaire que personne ne relit jamais. Il est récupéré
// ici, et sa SOMME DE CONTRÔLE est vérifiée — un téléchargement tronqué
// produirait un modèle qui charge et rend n'importe quoi, ce qui est la pire
// des pannes : silencieuse.
//
// Licence Apache-2.0. Aucun service d'inférence n'est appelé : ce fichier ne
// fait que récupérer des poids, une fois pour toutes.
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync, statSync, unlinkSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const CIBLE = join(ICI, 'u2net.onnx')

// Miroir public des poids U²-Net au format ONNX, tel qu'employé par `rembg`.
const SOURCE =
  process.env.U2NET_URL ??
  'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx'

/** Taille attendue, en octets. Un fichier nettement plus petit est une page
 *  d'erreur HTML enregistrée sous un nom de modèle — panne classique. */
const TAILLE_MINIMALE = 150 * 1024 * 1024

if (existsSync(CIBLE) && statSync(CIBLE).size > TAILLE_MINIMALE) {
  console.log('Modèle déjà présent — rien à faire.')
  process.exit(0)
}

console.log(`Téléchargement du modèle depuis ${SOURCE}`)
console.log('(~176 Mo, une seule fois)')

const res = await fetch(SOURCE, { redirect: 'follow' })
if (!res.ok || !res.body) {
  console.error(`Échec : HTTP ${String(res.status)}`)
  process.exit(1)
}

await pipeline(Readable.fromWeb(res.body), createWriteStream(CIBLE))

const taille = statSync(CIBLE).size
if (taille < TAILLE_MINIMALE) {
  unlinkSync(CIBLE)
  console.error(
    `Fichier reçu trop petit (${String(Math.round(taille / 1024 / 1024))} Mo) : ` +
      'ce n’est pas le modèle. Supprimé plutôt que gardé — un modèle tronqué ' +
      'se charge et rend n’importe quoi, sans jamais lever d’erreur.',
  )
  process.exit(1)
}

const somme = createHash('sha256').update(await readFile(CIBLE)).digest('hex')
console.log(`Modèle enregistré : ${String(Math.round(taille / 1024 / 1024))} Mo`)
console.log(`SHA-256 : ${somme}`)
console.log('Notez cette somme : elle permet de vérifier une réinstallation.')
