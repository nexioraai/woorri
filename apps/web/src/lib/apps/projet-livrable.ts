/**
 * LE PROJET QU'ON EMPORTE — pas un tas de fichiers, une application qui tourne.
 *
 * ── LA DEMANDE DU PROPRIÉTAIRE, 2026-10-30.
 *
 * « il faut que ça soit de bonnes applis web téléchargeables, sinon je veux
 * pas accepter. » Mesuré juste avant : le zip livrait les sources TSX et une
 * page compilée — honnête, mais pas un PROJET. Personne ne peut en repartir
 * pour développer : ni `package.json`, ni outillage, ni mode d'emploi.
 *
 * ── CE QUE LE ZIP CONTIENT DÉSORMAIS, ET POURQUOI CHAQUE PIÈCE.
 *
 *   index.html        la page AUTONOME, compilée — un double-clic et ça
 *                     s'ouvre, sans serveur, sans installation. C'est la
 *                     promesse la plus simple et elle passe en premier.
 *   src/…             les sources TSX, telles que le modèle les a écrites.
 *                     Leurs imports sont relatifs : le dossier se déplace
 *                     d'un bloc sans rien casser.
 *   dev.html          l'entrée du serveur de développement — elle monte
 *                     `/src/index.tsx` à chaud, modifications visibles
 *                     immédiatement.
 *   package.json      react épinglé à LA VERSION QUI A COMPILÉ (19.2.4,
 *                     celle du dépôt). Une version flottante ferait diverger
 *                     le projet téléchargé de la page compilée à côté.
 *   vite.config.ts    l'outillage standard de l'écosystème — rien d'exotique
 *                     à apprendre.
 *   tsconfig.json     le strict minimum pour que l'éditeur comprenne le TSX.
 *   README.md         en français : les DEUX façons d'utiliser le projet,
 *                     double-clic ou développement.
 */

/** Épinglées sur le dépôt : c'est CETTE version de react qui a compilé. */
const VERSIONS = Object.freeze({
  react: '19.2.4',
  vite: '^6.0.0',
  pluginReact: '^4.3.0',
  typescript: '^5',
})

const PACKAGE_JSON = `{
  "name": "application-deribfy",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite preview --open",
    "preview": "vite preview --open"
  },
  "dependencies": {
    "react": "${VERSIONS.react}",
    "react-dom": "${VERSIONS.react}"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "${VERSIONS.pluginReact}",
    "typescript": "${VERSIONS.typescript}",
    "vite": "${VERSIONS.vite}"
  }
}
`

const VITE_CONFIG = `import { copyFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// L'entrée de développement est dev.html : index.html est la page COMPILÉE,
// autonome, qu'on ouvre en double-clic — elle n'a pas besoin de Vite.
//
// MAIS LE BUILD DOIT PRODUIRE UN SITE SERVABLE À LA RACINE : mesuré le
// 2026-10-31, \`npm run build\` ne sortait que dist/dev.html, et
// \`npm start\` n'existait pas — les premières commandes qu'un acheteur
// tape. La page autonome est COPIÉE telle quelle en dist/index.html : déjà
// compilée, elle n'a rien à gagner à repasser par un bundler.
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'emporter-la-page-autonome',
      closeBundle() {
        copyFileSync('index.html', 'dist/index.html')
      },
    },
  ],
  server: { open: '/dev.html' },
  build: { rollupOptions: { input: 'dev.html' } },
})
`

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
`

const DEV_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Développement</title>
</head>
<body>
  <div id="racine"></div>
  <script type="module" src="/src/index.tsx"></script>
</body>
</html>
`

const README = `# Votre application web

Générée par Deribfy. Deux façons de l'utiliser :

## 1. L'ouvrir tout de suite (aucune installation)

Double-cliquez sur \`index.html\` : l'application s'ouvre dans votre
navigateur. Elle est complète et ne demande ni serveur ni connexion.

## 2. La développer (pour modifier le code)

Prérequis : Node.js (https://nodejs.org).

\`\`\`
npm install
npm run dev
\`\`\`

Le navigateur s'ouvre sur l'application en mode développement : chaque
modification d'un fichier de \`src/\` s'affiche immédiatement.

- \`src/\` contient tout le code de l'application.

## 3. La construire et la servir (pour la mettre en ligne)

\`\`\`
npm run build
npm start
\`\`\`

\`npm run build\` produit le site complet dans \`dist/\` — page d'accueil
comprise — et \`npm start\` le sert en local, tel qu'un hébergeur le
servirait. Déployer = envoyer \`dist/\` chez n'importe quel hébergeur
statique.
`

/**
 * Assemble le projet livrable : sources sous `src/`, outillage à la racine,
 * page autonome en `index.html`.
 */
export function projetLivrable(
  fichiers: Readonly<Record<string, string>>,
  pageAutonomeHtml: string,
): Map<string, string> {
  const zip = new Map<string, string>()
  zip.set('index.html', pageAutonomeHtml)
  zip.set('README.md', README)
  zip.set('package.json', PACKAGE_JSON)
  zip.set('vite.config.ts', VITE_CONFIG)
  zip.set('tsconfig.json', TSCONFIG)
  zip.set('dev.html', DEV_HTML)
  // LES SOURCES SOUS `src/`, d'un bloc : leurs imports sont relatifs entre
  // eux, le déplacement du dossier entier ne casse aucun chemin.
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    zip.set(`src/${chemin}`, contenu)
  }
  return zip
}
