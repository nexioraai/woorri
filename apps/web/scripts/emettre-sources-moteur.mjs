// ÉMET les sources du moteur de rendu (V4, bloc 2) dans un module TypeScript.
//
// Le moteur est du CODE DE L'APPLICATION GÉNÉRÉE : Deribfy le copie, comme
// texte, dans chaque œuvre. Le lire sur disque à l'exécution dépendrait du
// traçage des fichiers de la fonction — c'est ce mur qui a coûté deux tirs
// payés le 2026-10-31. Un module importé est empaqueté, par construction.
//
// Cliquet : contrat-v4-generation.test.ts rougit si ce module diverge des
// fichiers de `src/lib/apps/contrat/rendu/`. Après toute modification du
// moteur :   node scripts/emettre-sources-moteur.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const RENDU = join(ICI, '..', 'src', 'lib', 'apps', 'contrat', 'rendu')
export const FICHIERS_MOTEUR = ['moteur.tsx', 'donnees.ts', 'textes-systeme.ts', 'base.ts']

export function texteDuModule() {
  const entrees = FICHIERS_MOTEUR.map((f) => `  ${JSON.stringify(`rendu/${f}`)}: ${JSON.stringify(readFileSync(join(RENDU, f), 'utf8'))},`)
  return [
    '// ÉMIS par scripts/emettre-sources-moteur.mjs — NE PAS MODIFIER À LA MAIN.',
    '// Les sources du moteur de rendu, copiées comme texte dans chaque œuvre (V4, bloc 2).',
    'export const SOURCES_MOTEUR: Readonly<Record<string, string>> = {',
    ...entrees,
    '}',
    '',
  ].join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cible = join(ICI, '..', 'src', 'lib', 'apps', 'contrat', 'sources-moteur.ts')
  writeFileSync(cible, texteDuModule())
  process.stdout.write(`écrit : ${cible}\n`)
}
