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

/**
 * CE QUE LE MOTEUR D'ÉMISSION A BESOIN D'EMPORTER DANS UNE FONCTION.
 *
 * `benchmarks/air-emission/` vit HORS de `apps/web` : rien ne l'embarque.
 * Mesuré EN LIGNE, premier message du générateur :
 *   « Cannot find module /var/task/benchmarks/air-emission/passe0.mjs »
 *
 * Le dossier ENTIER, pas les fichiers choisis à la main : `passe0.mjs`
 * importe `modele-metier.mjs`, qui en importe d'autres, et `elicitation.mjs`
 * importe le second. Une liste écrite à la main se périmerait au premier
 * ajout, et le défaut ne se verrait qu'en production.
 *
 * ET LEURS PROPRES DÉPENDANCES, parce qu'un fichier TRACÉ est copié comme
 * une DONNÉE : le traceur ne lit pas ses `import`. Mesuré en ligne, second
 * message : « Cannot find package 'zod' imported from passe0.mjs ».
 *
 * `zod` et `acorn` n'ont elles-mêmes AUCUNE dépendance — c'est pour ça que
 * deux lignes suffisent ici, et c'est exactement ce qui m'a trompé sur le
 * SDK Anthropic, qui en avait six. Le test `tracage-cloture` vérifie
 * désormais cette clôture au lieu de me faire confiance.
 */
const MOTEUR_EMISSION = [
  '../../benchmarks/air-emission/**/*.mjs',
  '../../node_modules/zod/**',
  '../../node_modules/acorn/**',
]

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
  // ── `rolldown` EST NATIF : il ne s'empaquette pas.
  //
  // C'est un bundler écrit en Rust : il charge un binaire propre à la
  // plateforme (`@rolldown/binding-linux-x64-gnu` sur Vercel, `darwin-arm64`
  // ici). Empaqueté par Next, la résolution de ce binaire se perd et le
  // runtime rend « Cannot find native binding » — message trompeur, qui
  // accuse un bogue de npm alors que le fichier n'est simplement pas là.
  //
  // Mesuré en ligne au premier clic sur « Voir l'application ».
  serverExternalPackages: ['onnxruntime-web', 'rolldown'],

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
    // ── LA CHAÎNE D'ÉMISSION DOIT ENTRER DANS LA FONCTION.
    //
    // `benchmarks/air-emission/` vit HORS de `apps/web` : rien ne l'embarque.
    // Mesuré EN LIGNE, premier message du générateur :
    //   « Cannot find module /var/task/benchmarks/air-emission/passe0.mjs »
    //
    // C'est exactement le piège déjà rencontré avec le modèle de détourage —
    // vert en local, cassé une fois déployé — et je ne l'ai pas appliqué ici.
    // Le repli a tenu : l'écran a nommé la vraie cause au lieu de prétendre
    // avoir lu.
    //
    // Le dossier ENTIER, pas les fichiers choisis à la main : `passe0.mjs`
    // importe `modele-metier.mjs`, qui en importe d'autres. Une liste écrite
    // à la main se périmerait au premier ajout, et le défaut ne se verrait
    // qu'en production.
    //
    // ET LEURS PROPRES DÉPENDANCES, parce qu'un fichier TRACÉ est copié comme
    // une DONNÉE : le traceur ne lit pas ses `import`. Mesuré en ligne, second
    // message : « Cannot find package 'zod' imported from passe0.mjs ».
    //
    // Les trois paquets sont ceux que les modules d'émission importent
    // réellement — relevés dans leurs sources, pas supposés.
    // ── L'APERÇU A BESOIN DU BINAIRE NATIF DE `rolldown`.
    //
    // Le traceur ne suit pas le chargement dynamique d'un `.node`. On déclare
    // donc la liaison LINUX — celle que Vercel exécute — et elle seule : les
    // huit plateformes feraient plusieurs centaines de méga-octets, pour un
    // plafond de fonction à 250.
    //
    // Le glob est résolu AU BUILD, sur Linux, où cette liaison existe. En
    // local elle n'est pas installée, et c'est normal.
    //
    // ── ET CE N'EST PLUS LA SEULE ROUTE À EN AVOIR BESOIN.
    //
    // En branchant le dialogue, `apercu`, `produire` et la sonde se sont
    // mises à charger `elicitation.mjs`. Trois fonctions de plus auraient
    // démarré sans le dossier, et seraient mortes EN LIGNE — le défaut que
    // je venais de corriger, réintroduit par la correction elle-même.
    //
    // La liste est donc UNE, posée au-dessus, et les routes la partagent.
    // Quatre copies divergeraient à la cinquième route.
    // apercu-live (etage 4) : MEMES besoins que l'apercu synchrone — le
    // meme assembleur compile l'acquis d'une generation en cours.
    '/api/generateur/apercu-live': [
      ...MOTEUR_EMISSION,
      '../../node_modules/@rolldown/binding-linux-x64-gnu/**',
    ],
    '/api/generateur/apercu': [
      ...MOTEUR_EMISSION,
      // ── L'APERÇU A BESOIN, EN PLUS, DU BINAIRE NATIF DE `rolldown`.
      //
      // Le traceur ne suit pas le chargement dynamique d'un `.node`. On
      // déclare donc la liaison LINUX — celle que Vercel exécute — et elle
      // seule : les huit plateformes feraient plusieurs centaines de
      // méga-octets, pour un plafond de fonction à 250.
      //
      // Le glob est résolu AU BUILD, sur Linux, où cette liaison existe. En
      // local elle n'est pas installée, et c'est normal.
      '../../node_modules/@rolldown/binding-linux-x64-gnu/**',
    ],
    // ── LA ROUTE DE L'ÉCRITURE DIRECTE, ET C'EST LA QUATRIÈME FOIS.
    //
    // MESURÉ EN PRODUCTION, 2026-10-19, sur le tir du propriétaire :
    //   « Failed to load external module rolldown : Cannot find native
    //     binding »
    // Trois tours, 0,11 $, et le compilateur n'a jamais lu une ligne du code
    // produit. Les trois échecs ne disaient rien du modèle : ils disaient que
    // MON bac à sable n'était pas dans la fonction.
    //
    // Ce bloc raconte déjà trois fois la même histoire — passe0, le SDK
    // Anthropic, le cron. Celle-ci est la quatrième, et elle est pire : la
    // solution était ÉCRITE JUSTE AU-DESSUS, pour quatre routes, et j'ai
    // ajouté une cinquième route sans l'y inscrire.
    //
    // Cette route n'a PAS besoin de `MOTEUR_EMISSION` : elle ne touche pas
    // la chaîne AIR. Elle n'a besoin que de l'assembleur.
    '/api/generateur/direct': ['../../node_modules/@rolldown/binding-linux-x64-gnu/**'],
    '/api/generateur/comprendre': MOTEUR_EMISSION,
    // LIRE AVANT DE DEMANDER : cette route importe `elicitation.mjs`
    // pour FILTRER sa sortie contre la table. Sans le tracage, le
    // module manque en ligne et la lecture meurt avant d'avoir lu.
    // LE PRE-VOL CHARGE `elicitation.mjs` ET N'ETAIT PAS TRACE.
    //
    // MESURE EN PRODUCTION le 2026-10-19 : 500 sur /avant a CHAQUE
    // dialogue, pendant que le local repondait 200. C'est le defaut que
    // ce depot nomme « vert en local, mort en ligne », paye deux fois
    // deja : `racineDepot()` remonte a la racine du depot, qui n'existe
    // pas dans la fonction deployee.
    //
    // Tracer des FICHIERS ne change pas la SOURCE : EP-257 mesure que
    // cette route n'importe ni client, ni cle, ni moteur, et elle ne les
    // importe toujours pas. Elle ne peut toujours rien couter.
    '/api/generateur/avant': MOTEUR_EMISSION,
    '/api/generateur/lire-brief': MOTEUR_EMISSION,
    // ── LE DEPOT CHARGE LE MOTEUR, LUI AUSSI, DEPUIS LE 2026-10-11.
    //
    // Il ne GENERE rien — il ecrit une ligne et rend la main. Mais il
    // construit l'intention (`dialogue.ts` → `creerIntention`,
    // `texteDIntention`), et ce module vit dans `benchmarks/air-emission/`.
    // Sans cette entree, la fonction demarrerait EN LIGNE et mourrait sur
    // « Cannot find module » — le defaut exact que ce bloc raconte deux
    // fois deja, et que le cliquet `tracage-cloture` a rattrape ici.
    '/api/generateur/deposer': MOTEUR_EMISSION,
    '/api/generateur/produire': MOTEUR_EMISSION,
    '/api/generateur/sonde': [
      ...MOTEUR_EMISSION,
      '../../node_modules/@rolldown/binding-linux-x64-gnu/**',
    ],
    // ── LA ROUTE QUI FAIT TOUT LE TRAVAIL MANQUAIT A CETTE LISTE.
    //
    // MESURE EN PRODUCTION, 2026-10-14, sur la generation du proprietaire :
    //   « Cannot find module '/var/task/benchmarks/air-emission/moteur.mjs' »
    // Trois reprises, puis refus. Cout : zero de plus — l'echec precede tout
    // appel, mais la generation etait morte.
    //
    // CE QUI REND CE DEFAUT SI FACILE A MANQUER. Cette liste se declare ROUTE
    // PAR ROUTE. Six routes du generateur y sont ; la SEPTIEME — le cron, qui
    // passe chaque minute et porte TOUTE l'emission — n'y etait pas. Les six
    // presentes expliquent d'ailleurs ce qu'on observait : `deposer` est dans
    // la liste, donc la COMPREHENSION aboutissait, et le cron mourait juste
    // apres. Deux moities du meme parcours, une seule emballee.
    //
    // C'est la TROISIEME fois que ce bloc raconte la meme histoire — passe0,
    // puis le SDK Anthropic, maintenant le cron. A chaque fois : un module
    // charge en `webpackIgnore`, que le bundler ne voit pas, et qu'il faut
    // lui designer a la main.
    //
    // Les memes fichiers que les six autres : le cron appelle
    // `poursuivreEmissionDuSite`, qui charge `moteur.mjs`, lequel tire tout
    // `benchmarks/air-emission/`.
    '/api/cron/generations': MOTEUR_EMISSION,
    // ── LE LIEN PUBLIC, TROUVÉ PAR LE CLIQUET LE JOUR OÙ IL EST NÉ.
    //
    // Cette route sert l'application publiée à qui reçoit le lien. Elle
    // appelle `construireApercu`, donc `rolldown`, donc la liaison native —
    // et elle n'était PAS dans cette liste.
    //
    // Elle n'a jamais été exercée en ligne : la fonctionnalité « Publier »
    // date du 2026-10-18 et le propriétaire n'a encore aucune application
    // livrée à publier. Le défaut attendait donc le premier partage, c'est-
    // à-dire le pire moment — devant quelqu'un d'autre que lui.
    //
    // Je ne l'ai pas vue en relisant. Le contrôle EP-278 l'a vue à sa
    // première exécution, et c'est précisément pourquoi il existe : je
    // viens de prouver, deux fois en deux jours, que je ne suis pas un
    // mécanisme de complétude fiable.
    '/p/[jeton]': ['../../node_modules/@rolldown/binding-linux-x64-gnu/**'],
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
