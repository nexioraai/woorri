/**
 * GÉNÈRE `src/lib/apps/react-embarque.genere.json` — les sources de la famille
 * react que le bac à sable sert EN MÉMOIRE au lieu de les chercher sur le
 * disque de la fonction.
 *
 * ── POURQUOI, MESURÉ LE 2026-10-31.
 *
 * Deux tirs payés (0,45 $) sont morts sur « react non embarqué » : la fonction
 * Vercel de la génération n'avait pas `node_modules/react` sur son disque,
 * pendant que /p/[jeton] assemblait la même œuvre sur le sien. L'assemblage
 * dépendait du TRAÇAGE de chaque fonction — quatre incidents en douze jours
 * (avant/19-10, livraison/30-10, deux tirs/31-10) pour la même classe.
 *
 * ── LA RÈGLE : L'EMPAQUETEUR RÉSOUT, PERSONNE NE RECOPIE.
 *
 * Ce script LIT la version installée par le lockfile (`require.resolve`) et
 * émet un fichier JSON — une DONNÉE, invisible aux cliquets qui scannent le
 * code — que l'enrobage `react-embarque.ts` importe statiquement : c'est
 * l'empaqueteur du serveur qui l'embarque. Un cliquet (EP-294) régénère ce contenu à
 * chaque gate et rougit si le fichier commité dérive d'un octet — monter de
 * version react sans régénérer est donc IMPOSSIBLE à merger.
 *
 * Relancer :  node scripts/generer-react-embarque.mjs
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const racine = (p) => dirname(require.resolve(p + '/package.json'))

/** spécificateur importable → [paquet porteur, fichier CJS de production]. */
export const SOURCES = [
  ['react', 'react', 'cjs/react.production.js'],
  ['react/jsx-runtime', 'react', 'cjs/react-jsx-runtime.production.js'],
  ['react-dom', 'react-dom', 'cjs/react-dom.production.js'],
  ['react-dom/client', 'react-dom', 'cjs/react-dom-client.production.js'],
  ['scheduler', 'scheduler', 'cjs/scheduler.production.js'],
]

/** Construit le contenu du module généré — exporté pour que le cliquet EP-294
 *  compare l'octet près ce que le dépôt porte à ce que le lockfile installe. */
export function contenuGenere() {
  const versions = {}
  const modules = {}
  for (const [spec, paquet, rel] of SOURCES) {
    versions[paquet] = JSON.parse(readFileSync(join(racine(paquet), 'package.json'), 'utf8')).version
    modules[spec] = readFileSync(join(racine(paquet), rel), 'utf8')
  }
  return JSON.stringify({ versions, modules }, null, 1) + '\n'
}

// Exécution directe : écrire le fichier.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const cible = join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'lib', 'apps', 'react-embarque.genere.json')
  writeFileSync(cible, contenuGenere())
  console.log('écrit :', cible)
}
