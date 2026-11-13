/**
 * LA CONFIGURATION DES ÉPREUVES DANS UN VRAI NAVIGATEUR (3c-2).
 *
 * Le juge d'expérience lance Chromium : ~30 s par œuvre, dix fois le plafond de
 * marge de la gate vitest. Ces épreuves portent `.navigateur.ts`, que la liste
 * `include` de la gate ne nomme pas (c'est une allowlist), et tournent dans
 * l'étape CI « juge navigateur », qui installe les navigateurs. Elles ne
 * touchent aucun réseau réel : le juge répond lui-même à toute requête.
 *
 *     npx vitest run -c vitest.navigateur.config.ts
 */
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['src/**/*.navigateur.ts'],
    passWithNoTests: false,
    environment: 'node',
    testTimeout: 300_000,
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './vitest.server-only-stub.ts'),
    },
  },
})
