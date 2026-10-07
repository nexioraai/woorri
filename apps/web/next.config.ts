import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// ===== M1-04 : hote Supabase du projet, jamais un joker =====
// `connect-src`/`img-src` portaient `https://*.supabase.co`. Ce joker autorise
// TOUT projet Supabase -- y compris un projet gratuit cree par un attaquant --
// et constituait donc le canal d'exfiltration laisse ouvert par une CSP par
// ailleurs stricte (form-action 'self', object-src 'none').
//
// La valeur n'est pas devinee : elle vient de l'environnement de build, avec
// pour repli l'hote deja declare en dur plus bas dans CE MEME FICHIER
// (images.remotePatterns). Le repli existe pour qu'un build sans variable
// n'emette JAMAIS `undefined` dans la CSP -- ce qui couperait Supabase en
// production. L'application exige de toute facon cette variable
// (`src/lib/supabase.ts:3`, assertion non-null).
const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL as string).host;
  } catch {
    return 'lefumezaxfsttigpmzhr.supabase.co';
  }
})();

// ===== Content Security Policy =====
// Limite quelles sources de scripts/styles/images/connexions sont autorisées
const csp = [
  "default-src 'self'",
  // Iframes externes autorisees : carte OpenStreetMap (section Contact) et
  // Stripe Elements (le champ carte est rendu dans une iframe Stripe).
  "frame-src 'self' https://www.openstreetmap.org https://js.stripe.com https://hooks.stripe.com",
  // Scripts : self + inline (Next.js hydration). 'unsafe-eval' uniquement en dev (Turbopack HMR)
  `script-src 'self' 'unsafe-inline' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ''}`,
  // Styles : self + inline (Tailwind utilise des styles inline)
  "style-src 'self' 'unsafe-inline'",
  // Images : self, data URIs (icons SVG inline), blob (preview uploads), Pexels, Supabase Storage
  `img-src 'self' data: blob: https://images.pexels.com https://${SUPABASE_HOST} https://cf.cjdropshipping.com https://oss-cf.cjdropshipping.com https://cc-west-usa.oss-us-west-1.aliyuncs.com https://files.cdn.printful.com https://static.cdn.printful.com`,
  // Fonts : self, data URIs
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  // Connexions fetch/XHR : self, Supabase (HTTP + websocket realtime). En dev, autoriser localhost pour HMR
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://api.stripe.com https://js.stripe.com https://tiles.openfreemap.org${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
  // Embedding : seulement notre propre origine (autorise futurs previews iframe internes)
  "frame-ancestors 'self'",
  // Empêche <base> de pointer ailleurs
  "base-uri 'self'",
  // Empêche les forms d'aller ailleurs
  "form-action 'self'",
  // Bloque Flash/Java/applets
  "object-src 'none'",
  // En prod, force HTTPS pour toutes les ressources
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

// ===== Tous les security headers =====
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Anti-clickjacking (cohérent avec frame-ancestors 'self')
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Empêche le browser de "deviner" un type MIME différent
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Force HTTPS pour 2 ans, inclut tous les sous-domaines, autorise le preload
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Limite ce qui est envoyé dans le header Referer aux sites tiers
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Désactive caméra, micro, géolocation, FLoC (Google's tracking)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig: NextConfig = {
  // ── LE MOTEUR ENTRE DANS LE SITE.
  //
  // `@deribfy/compiler` et `@deribfy/air-schema` sont des paquets de l'espace
  // de travail, publiés en TypeScript SOURCE — pas en JavaScript construit.
  // Sans cette ligne, Next les prendrait pour des dépendances publiées déjà
  // compilées et refuserait de lire leur source.
  //
  // Les deux sont PURS : aucun accès disque, aucun réseau. C'est ce qui les
  // rend embarquables dans une fonction serveur — vérifié avant de les
  // brancher, pas après.
  transpilePackages: ['@deribfy/compiler', '@deribfy/air-schema'],

  // ── `onnxruntime-web` NE DOIT PAS ÊTRE EMPAQUETÉ.
  //
  // MESURÉ EN PRODUCTION le 2026-10-06, premier passage réel du lot photo :
  // 37 photos, 37 erreurs, toutes identiques —
  //   « no available backend found. ERR: [wasm] Cannot find module
  //     /var/task/apps/web/.next/server/chunks/ort-wasm-simd-threaded.mjs »
  //
  // Le paquet charge son moteur WebAssembly par un import dynamique. Le
  // bundler l'a réécrit vers un chemin de chunk qui n'existe pas, et le
  // traçage n'y pouvait rien : il déposait bien les fichiers dans
  // `node_modules`, mais le code empaqueté ne les cherchait plus là.
  //
  // Déclaré externe, le paquet reste dans `node_modules` et résout ses
  // propres fichiers à l'exécution, comme il le fait en local.
  //
  // CE QUI A SAUVÉ LA MISE : chaque photo échoue isolément et le catalogue
  // n'est écrit qu'après succès. 37 erreurs, ZÉRO photo remplacée — vérifié
  // produit par produit après le passage.
  serverExternalPackages: ['onnxruntime-web'],

  // LE MODÈLE DE DÉTOURAGE DOIT ENTRER DANS LA FONCTION SERVEUR.
  //
  // `public/` part au CDN ; il n'est PAS dans le système de fichiers d'une
  // fonction. Sans cette entrée, `/api/cron/photos-pro` lirait le modèle en
  // local sans difficulté et échouerait UNE FOIS EN LIGNE — le pire des deux
  // cas, parce que la preuve locale serait verte.
  //
  // `onnxruntime-web` charge en plus ses binaires WebAssembly depuis son
  // propre dossier : même raison, même traitement.
  outputFileTracingIncludes: {
    '/api/cron/photos-pro': [
      './public/modeles/u2netp.onnx',
      '../../node_modules/onnxruntime-web/dist/*.wasm',
      '../../node_modules/onnxruntime-web/dist/*.mjs',
    ],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lefumezaxfsttigpmzhr.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'cf.cjdropshipping.com',
      },
      {
        protocol: 'https',
        hostname: 'oss-cf.cjdropshipping.com',
      },
      {
        protocol: 'https',
        hostname: 'cc-west-usa.oss-us-west-1.aliyuncs.com',
      },
      {
        protocol: 'https',
        hostname: 'files.cdn.printful.com',
      },
      {
        protocol: 'https',
        hostname: 'static.cdn.printful.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Appliquer les headers à toutes les routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
