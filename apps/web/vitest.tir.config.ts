/**
 * LA CONFIGURATION DES TIRS — séparée, et c'est une protection.
 *
 * ── POURQUOI UN DEUXIÈME FICHIER PLUTÔT QU'UNE LIGNE DANS LE PREMIER.
 *
 * Un tir APPELLE LE VRAI MODÈLE : il dépense. S'il vivait dans la liste
 * `include` de `vitest.config.ts`, la gate le rejouerait à CHAQUE tour —
 * trente fois par jour, sans que personne l'ait demandé.
 *
 * Et la liste `include` de vitest est une ALLOWLIST : un fichier qu'elle ne
 * nomme pas n'est jamais collecté, même s'il s'appelle `.test.ts`. C'est le
 * piège « vert qui ne mesure rien », déjà payé une fois. Ici on s'en sert
 * dans l'autre sens, délibérément : les tirs portent `.tir.ts`, que la liste
 * de la gate ne nomme pas, et seule cette configuration les ramasse.
 *
 * Un tir se lance donc À LA MAIN, et seulement avec un feu vert :
 *
 *     npx vitest run --config vitest.tir.config.ts
 */
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['src/**/*.tir.ts'],
    environment: 'node',
    // ── PAS le preparatif commun : il interdit le reseau, et il a bloque
    // mes deux premiers tirs AVANT qu'ils depensent. Bonne regle, mauvaise
    // place : un tir n'est pas un test, son intermittence est son objet.
    setupFiles: ['./vitest.tir.setup.ts'],
    // Un appel réel au modèle prend vingt secondes et peut en prendre plus
    // sur un cahier de dix pages. Le délai par défaut le tuerait à mi-course
    // et on paierait la sortie sans la lire.
    testTimeout: 300_000,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
