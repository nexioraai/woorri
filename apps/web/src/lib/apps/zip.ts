/**
 * UNE ARCHIVE ZIP, ÉCRITE À LA MAIN.
 *
 * Le moteur rend une application sous forme de soixante-quatre fichiers en
 * mémoire. Pour que le marchand la reçoive, il faut un seul fichier.
 *
 * ── POURQUOI PAS UNE BIBLIOTHÈQUE.
 *
 * `apps/web` n'en a aucune, et la règle du dépôt est de ne pas en ajouter sans
 * nécessité démontrée. Or `zlib.deflateRawSync` est dans Node, et le format
 * ZIP tient en trois structures : un en-tête par fichier, un répertoire
 * central, et une fin de répertoire. Ajouter une dépendance pour cela
 * reviendrait à faire porter à chaque déploiement le poids d'un paquet qu'on
 * n'utiliserait qu'ici.
 *
 * ── CE QUI EST VOLONTAIREMENT ABSENT.
 *
 * Pas de ZIP64 : au-delà de 4 Go ou 65 535 fichiers, cette fonction LÈVE au
 * lieu d'écrire une archive silencieusement tronquée. Une application émise en
 * fait soixante-quatre et quelques centaines de kilo-octets — on est à quatre
 * ordres de grandeur de la limite, et le jour où ce ne serait plus vrai, il
 * vaut mieux un refus net qu'un fichier que personne n'arrive à ouvrir.
 */
import { deflateRawSync } from 'node:zlib'

/** CRC-32, table calculée une fois. Le format l'exige par fichier. */
const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) c = TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const MAX_FICHIERS = 65_535
const MAX_OCTETS = 0xffffffff

/** Date figée : une archive doit être REPRODUCTIBLE. Deux générations du même
 *  contenu rendent le même octet — sinon on ne peut rien comparer. */
const DATE_MSDOS = 0x21_00 // 1 janvier 1980, minuit.
const HEURE_MSDOS = 0x00_00

export function zipper(fichiers: ReadonlyMap<string, string | Buffer>): Buffer {
  if (fichiers.size > MAX_FICHIERS) {
    throw new Error(`Archive refusée : ${String(fichiers.size)} fichiers, limite ${String(MAX_FICHIERS)}.`)
  }

  const locaux: Buffer[] = []
  const central: Buffer[] = []
  let decalage = 0

  for (const [nom, contenu] of fichiers) {
    const brut = Buffer.isBuffer(contenu) ? contenu : Buffer.from(contenu, 'utf8')
    const compresse = deflateRawSync(brut, { level: 9 })
    // Si la compression gonfle le fichier — cela arrive sur de très petits
    // contenus — on le range tel quel. Méthode 0 contre méthode 8.
    const gagne = compresse.length < brut.length
    const corps = gagne ? compresse : brut
    const methode = gagne ? 8 : 0
    // ── UN NOM DE FICHIER RESTE EN ASCII, ET ON LE REFUSE SINON.
    //
    // Le drapeau 0x0800 déclare l'UTF-8 et c'est conforme — mais MESURÉ :
    // l'`unzip` d'Info-ZIP livré avec macOS écorche quand même le nom et
    // s'arrête sur « Illegal byte sequence ». Le marchand recevrait une
    // archive que SA machine refuse d'ouvrir, sans que rien chez nous ne
    // l'annonce.
    //
    // Les applications émises n'ont que des chemins ASCII — `index.html`,
    // `src/App.tsx`. Cette garde ne peut donc pas mordre aujourd'hui. Elle
    // existe pour le jour où elle le pourrait : mieux vaut un refus net ici
    // qu'un fichier illisible à l'autre bout.
    if (!/^[\x20-\x7e]+$/.test(nom)) {
      throw new Error(
        `Archive refusée : « ${nom} » n'est pas en ASCII. Les lecteurs ZIP ` +
          'du système écorchent les noms accentués — le marchand ne pourrait pas ouvrir le fichier.',
      )
    }
    const nomBuf = Buffer.from(nom, 'utf8')
    const somme = crc32(brut)

    if (brut.length > MAX_OCTETS || corps.length > MAX_OCTETS || decalage > MAX_OCTETS) {
      throw new Error(`Archive refusée : « ${nom} » dépasse la limite du format ZIP sans ZIP64.`)
    }

    const entete = Buffer.alloc(30)
    entete.writeUInt32LE(0x04034b50, 0)
    entete.writeUInt16LE(20, 4) // version minimale
    entete.writeUInt16LE(0x0800, 6) // noms de fichiers en UTF-8
    entete.writeUInt16LE(methode, 8)
    entete.writeUInt16LE(HEURE_MSDOS, 10)
    entete.writeUInt16LE(DATE_MSDOS, 12)
    entete.writeUInt32LE(somme, 14)
    entete.writeUInt32LE(corps.length, 18)
    entete.writeUInt32LE(brut.length, 22)
    entete.writeUInt16LE(nomBuf.length, 26)
    entete.writeUInt16LE(0, 28)
    locaux.push(entete, nomBuf, corps)

    const fiche = Buffer.alloc(46)
    fiche.writeUInt32LE(0x02014b50, 0)
    fiche.writeUInt16LE(20, 4) // version d'écriture
    fiche.writeUInt16LE(20, 6) // version minimale de lecture
    fiche.writeUInt16LE(0x0800, 8)
    fiche.writeUInt16LE(methode, 10)
    fiche.writeUInt16LE(HEURE_MSDOS, 12)
    fiche.writeUInt16LE(DATE_MSDOS, 14)
    fiche.writeUInt32LE(somme, 16)
    fiche.writeUInt32LE(corps.length, 20)
    fiche.writeUInt32LE(brut.length, 24)
    fiche.writeUInt16LE(nomBuf.length, 28)
    fiche.writeUInt32LE(decalage, 42)
    central.push(fiche, nomBuf)

    decalage += entete.length + nomBuf.length + corps.length
  }

  const corpsCentral = Buffer.concat(central)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0)
  fin.writeUInt16LE(fichiers.size, 8)
  fin.writeUInt16LE(fichiers.size, 10)
  fin.writeUInt32LE(corpsCentral.length, 12)
  fin.writeUInt32LE(decalage, 16)

  return Buffer.concat([...locaux, corpsCentral, fin])
}
