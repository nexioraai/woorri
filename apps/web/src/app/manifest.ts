import type { MetadataRoute } from 'next'

// Manifeste d'application web. Il sert à deux choses distinctes, et la seconde
// est celle qui manquait : l'icône « ajouter à l'écran d'accueil » sur mobile,
// et le jeu d'icônes que Google Search consulte pour la vignette d'un résultat.
// Sans lui, le moteur se rabat sur le favicon 16 px — ou, faute de favicon, sur
// rien du tout.
//
// Les icônes sont DÉRIVÉES par `scripts/generer-icones.mjs` : aucune n'est
// écrite à la main, elles viennent toutes de la même source.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Deribfy',
    short_name: 'Deribfy',
    description:
      'Créez votre boutique en ligne ou votre site professionnel en 60 secondes, ' +
      'sans compétence technique. Paiement mobile, WhatsApp et domaine inclus.',
    start_url: '/',
    display: 'standalone',
    // Palette officielle (CLAUDE.md) — le fond doit être celui de l'écran de
    // démarrage, sinon un flash blanc apparaît au lancement.
    background_color: '#0A050E',
    theme_color: '#FA5D1E',
    lang: 'fr',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-48.png', sizes: '48x48', type: 'image/png' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      // `purpose: 'maskable'` : Android découpe l'icône selon la forme du
      // lanceur. Sans cette déclaration, il ajoute un cadre blanc autour.
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
