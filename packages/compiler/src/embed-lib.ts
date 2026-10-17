// EMBARQUEMENT DES COPIES (4.3, D-026 Option C / D-007) — bibliothèque
// PURE : décrit le jeu EXACT de fichiers copiés dans chaque projet généré
// (blocs, primitives, tokens, runtime du compilateur) et les réécritures
// d'imports (spécificateurs de paquets → chemins relatifs de la copie).
// Consommée par scripts/embed-assets.mjs (génération du module embarqué)
// ET par le test de non-dérive (recalcul depuis les vraies sources) — le
// chemin de compilation, lui, n'ouvre jamais un fichier : il lit le module
// généré `embedded-assets.generated.ts`.
export interface EmbeddedSourceSpec {
  /** Chemin de la source dans le dépôt, relatif à `packages/`. */
  source: string;
  /** Chemin de la copie dans le projet généré. */
  target: string;
  /** Réécritures d'imports : spécificateur exact → remplacement exact. */
  rewrites: Readonly<Record<string, string>>;
}

/**
 * LES FACES DE POLICE EMBARQUÉES — le seul contenu BINAIRE de cette table.
 *
 * ── POURQUOI UN FICHIER DE POLICE VOYAGE AVEC CHAQUE APPLICATION.
 *
 * Mesuré le 2026-10-17 : `fontFamily` du natif prend UN nom, pas une pile, et
 * aucun nom de police n'existe sur iOS ET Android à la fois. Un nom absent ne
 * lève pas — il retombe EN SILENCE sur la police système. Brancher par
 * plateforme a été refusé par le cliquet `Platform.OS` du code émis, et à
 * raison. Un `.ttf` embarqué porte le MÊME nom partout : aucun branchement, et
 * l'identité est garantie au lieu d'être espérée.
 *
 * ── TROIS FACES, PARCE QUE LE NATIF NE SYNTHÉTISE PAS.
 *
 * Android ne fabrique pas un gras à partir d'un régulier : demander
 * `fontWeight: "700"` sur une famille qui n'a qu'une face Regular rend du
 * Regular. Chaque graisse est donc une FACE portant son propre nom de
 * famille, et le style la désigne NOMMÉMENT.
 *
 * ── LE CONTENU EST EN BASE64, et c'est pourquoi `fichiers-binaires.ts` existe.
 *
 * Quatre écrivains décidaient séparément quelles extensions décoder. En
 * ajoutant la deuxième, j'aurais programmé le sixième épisode de « une liste
 * écrite deux fois diverge » — avec, au bout, une police corrompue qui retombe
 * en silence sur la police système.
 */
const FACES = ["Regular", "SemiBold", "Bold"] as const;

/**
 * LES FACES POUR LE NATIF — en TrueType, parce que React Native ne lit rien
 * d'autre.
 *
 * Le natif ne paie AUCUN réseau : le fichier est dans le paquet. Son poids
 * compte pour la taille de l'application, pas pour le temps de premier rendu.
 */
const POLICES_NATIF: readonly EmbeddedSourceSpec[] = FACES.map((poids) => ({
  source: `design-tokens/polices/DeribfySerif-${poids}.ttf`,
  target: `public/polices/DeribfySerif-${poids}.ttf`,
  rewrites: {},
}));

/**
 * LES FACES POUR LE WEB — en WOFF2, et la mesure a DÉCIDÉ ce format.
 *
 * ── LE CLIQUET QUI A FAILLI REFUSER CE LOT, ET IL AVAIT DE BONNES RAISONS.
 *
 * `ep218-web-regardable` interdisait tout `@font-face`, au motif qu'« un
 * cahier réel exige < 150 KB pour réseaux 3G ». J'ai mesuré ce qui VOYAGE
 * réellement, gzip compris, sur une application construite :
 *
 *   · JS                 304 811 o → 88 390 o gzip
 *   · index.html           6 492 o →  2 669 o gzip
 *   · 3 faces TrueType   128 296 o → 73 723 o gzip
 *   · 3 faces WOFF2       57 620 o (déjà compressé, gzip ne gagne rien)
 *
 * Soit 91 Ko expédiés aujourd'hui. Avec les TrueType : 164 Ko — AU-DESSUS du
 * cahier. Avec les WOFF2 : 147 Ko — DESSOUS. Le format n'est pas une
 * préférence, c'est ce qui garde la promesse faite au client.
 *
 * ── ET AUCUNE APPLICATION NE PAIE POUR UNE POLICE QU'ELLE N'EMPLOIE PAS.
 *
 * Onze des vingt-deux documents portent un thème en police système. Les faces
 * ne sont émises que si le thème le demande — voir `famillesRequises` dans les
 * émetteurs. Pour ces onze, le coût est ZÉRO octet.
 */
const POLICES_WEB: readonly EmbeddedSourceSpec[] = FACES.map((poids) => ({
  source: `design-tokens/polices/DeribfySerif-${poids}.woff2`,
  target: `public/polices/DeribfySerif-${poids}.woff2`,
  rewrites: {},
}));

/**
 * CE QUE LE WEB RETIRE de la table commune.
 *
 * Mécanisme AJOUTÉ le 2026-10-17, et il manquait vraiment : la table web était
 * « la commune, plus ce qu'elle remplace ». Les faces ne se REMPLACENT pas —
 * elles changent de FORMAT, donc de nom de fichier. Sans retrait, chaque
 * application web aurait embarqué les deux jeux : 185 Ko dont 128 jamais lus.
 */
const RETIRES_WEB: readonly string[] = POLICES_NATIF.map((p) => p.target);

export const EMBEDDED_SOURCES: readonly EmbeddedSourceSpec[] = [
  ...POLICES_NATIF,
  {
    source: "design-tokens/src/theme.generated.ts",
    target: "lib/tokens/theme.generated.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/tokens-index.ts",
    target: "lib/tokens/index.ts",
    rewrites: {},
  },
  // ── LA RACINE QUI ENREGISTRE LES FACES (2026-10-17).
  //
  // Sans elle, les trois `.ttf` voyageraient avec l'application et personne ne
  // les lirait : une famille inconnue ne lève pas, elle retombe sur la police
  // système. C'est le maillon qui a manqué quatre fois dans ce dépôt.
  {
    source: "compiler/runtime/polices.tsx",
    target: "lib/runtime/polices.tsx",
    rewrites: {},
  },
  {
    source: "primitives/src/index.ts",
    target: "lib/primitives/index.ts",
    rewrites: {},
  },
  {
    // LES HÔTES — la frontière de plateforme, côté natif. La cible web
    // remplace CETTE cible d'écriture, et c'est tout ce qui la distingue.
    source: "primitives/src/hotes.tsx",
    target: "lib/primitives/hotes.tsx",
    rewrites: {},
  },
  {
    // La COUTURE de la feuille de styles — un seul appel au moteur natif,
    // isolé pour que `styles.ts` reste UNIQUE pour les deux cibles.
    source: "primitives/src/feuille.ts",
    target: "lib/primitives/feuille.ts",
    rewrites: {},
  },
  {
    source: "primitives/src/contracts.ts",
    target: "lib/primitives/contracts.ts",
    rewrites: {},
  },
  {
    source: "primitives/src/styles.ts",
    target: "lib/primitives/styles.ts",
    rewrites: { "@deribfy/design-tokens": "../tokens" },
  },
  {
    source: "primitives/src/theme-bridge.tsx",
    target: "lib/primitives/theme-bridge.tsx",
    rewrites: {},
  },
  {
    // Étape ③ (EP-003) — LA source des rôles d'icônes, copiée à côté des
    // primitives : barre d'onglets et boutons lisent la MÊME table.
    source: "primitives/src/roles-icones.ts",
    target: "lib/primitives/roles-icones.ts",
    rewrites: {},
  },
  {
    // EP-132 — la DÉCISION de ce qui tient la place d'un média absent, à
    // côté de la primitive qui lui obéit. Sans cette ligne, l'app émise
    // importerait un module inexistant : le rendu ne se corrige pas sans
    // que le chemin d'embarquement le suive.
    source: "primitives/src/media-repli.ts",
    target: "lib/primitives/media-repli.ts",
    rewrites: {},
  },
  {
    source: "primitives/src/primitives.tsx",
    target: "lib/primitives/primitives.tsx",
    rewrites: {},
  },
  {
    // LA LISTE (2026-10-05) — sortie des blocs pour que ceux-ci n'importent
    // plus rien de react-native, et deviennent partageables avec une cible web.
    // Oubliée ici, elle a fait echouer 28 applications sur 28 : leur
    // `index.ts` exportait un fichier qu'elles n'avaient pas.
    source: "primitives/src/liste.tsx",
    target: "lib/primitives/liste.tsx",
    rewrites: {},
  },
  {
    source: "blocks/src/contracts.ts",
    target: "lib/blocks/contracts.ts",
    rewrites: {},
  },
  {
    source: "blocks/src/components.tsx",
    target: "lib/blocks/components.tsx",
    rewrites: { "@deribfy/primitives": "../primitives" },
  },
  {
    source: "compiler/runtime/champs-de-saisie.ts",
    target: "lib/runtime/champs-de-saisie.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/data-provider.tsx",
    target: "lib/runtime/data-provider.tsx",
    rewrites: {},
  },
  {
    source: "compiler/runtime/slot-provider.tsx",
    target: "lib/runtime/slot-provider.tsx",
    rewrites: {},
  },
  {
    // Phase 4 — la session : contrat, implémentation locale, et le
    // fournisseur de capabilities qui honore `auth`.
    source: "compiler/runtime/lecture-profil.ts",
    target: "lib/runtime/lecture-profil.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/ecriture-supabase.ts",
    target: "lib/runtime/ecriture-supabase.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/acces.ts",
    target: "lib/runtime/acces.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/session-contract.ts",
    target: "lib/runtime/session-contract.ts",
    rewrites: {},
  },
  // ── L'AGENT (2026-10-13) — TROIS FICHIERS, ET LE DEFAUT QU'ILS ONT CAUSE.
  //
  // Mesure : avoir ajoute l'import dans `air-runtime.tsx` SANS inscrire les
  // fichiers ici a fait tomber 31 applications sur 31 — « Cannot find
  // module ». Le runtime du moteur et le runtime COPIE dans l'application
  // sont deux choses : un module qui n'est pas dans cette liste n'existe pas
  // pour l'application emise, et le typecheck du moteur ne le dit pas,
  // puisque de son cote le fichier est bien la.
  {
    source: "compiler/runtime/agent-contract.ts",
    target: "lib/runtime/agent-contract.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/agent-http.ts",
    target: "lib/runtime/agent-http.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/agent-racine.tsx",
    target: "lib/runtime/agent-racine.tsx",
    rewrites: {},
  },
  {
    source: "compiler/runtime/session-provider.tsx",
    target: "lib/runtime/session-provider.tsx",
    rewrites: {},
  },
  {
    source: "compiler/runtime/session-locale.ts",
    target: "lib/runtime/session-locale.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/session-supabase.ts",
    target: "lib/runtime/session-supabase.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/capabilites-auth.ts",
    target: "lib/runtime/capabilites-auth.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/capability-provider.tsx",
    target: "lib/runtime/capability-provider.tsx",
    rewrites: {},
  },
  {
    source: "compiler/runtime/form-state.tsx",
    target: "lib/runtime/form-state.tsx",
    rewrites: {},
  },
  {
    // Règle UNIQUE de navigation : une destination principale est une racine.
    // Copiée avant `primary-nav` et `air-runtime`, ses deux seuls appelants.
    source: "compiler/runtime/racines-navigation.ts",
    target: "lib/runtime/racines-navigation.ts",
    rewrites: {},
  },
  {
    // OÙ VA LA NAVIGATION SELON LA LARGEUR — la règle et ses trois sources
    // (Material 3, Apple HIG, Nielsen Norman). Lue par `primary-nav`, qui
    // décide son DESSIN, et par `app-shell`, qui décide sa PLACE : elle doit
    // donc être copiée avant les deux.
    //
    // Module de DONNÉES et de décision pure — aucune plateforme, aucun React.
    // C'est ce qui lui permet d'être le même fichier pour les deux cibles.
    source: "compiler/runtime/disposition-navigation.ts",
    target: "lib/runtime/disposition-navigation.ts",
    rewrites: {},
  },
  {
    // LA COUTURE DE NAVIGATION (2026-10-05). `air-runtime.tsx`, 1 029 lignes,
    // n'importait de plateforme qu'une seule chose : `useNavigation`. Le
    // contrat est désormais PARTAGÉ et chaque cible le remplit — même remède
    // que pour `FlatList` dans les blocs.
    //
    // TROISIÈME FOIS que j'oublie d'embarquer un fichier neuf (`acces.ts`,
    // `liste.tsx`) : sans cette entrée, il n'existe que chez nous et les 28
    // applications cessent de compiler.
    source: "compiler/runtime/navigation-contrat.tsx",
    target: "lib/runtime/navigation-contrat.tsx",
    rewrites: {},
  },
  {
    source: "compiler/runtime/navigation-native.tsx",
    target: "lib/runtime/navigation-native.tsx",
    rewrites: {},
  },
  {
    // ÉTAPE ② — LE propriétaire du shell mobile : status bar + insets + zones.
    // Copié avant les écrans, ses seuls consommateurs.
    source: "compiler/runtime/app-shell.tsx",
    target: "lib/runtime/app-shell.tsx",
    rewrites: {
      "@deribfy/primitives": "../primitives",
      "@deribfy/primitives/theme-bridge": "../primitives/theme-bridge",
      // `size.measure` (jetons 1.4.0) : la largeur de lisibilite du contenu.
      // Meme reecriture que `styles.ts` — le projet genere lit les jetons
      // par `lib/tokens`, jamais par le nom du paquet du depot.
      "@deribfy/design-tokens": "../tokens",
    },
  },
  {
    source: "compiler/runtime/primary-nav.tsx",
    target: "lib/runtime/primary-nav.tsx",
    // `useStyles` vit dans le pont de thème, pas dans l'index des primitives :
    // la copie doit viser le MÊME module que celui embarqué, sinon l'app émise
    // ne compile pas — défaut attrapé par le `tsc` du projet témoin.
    rewrites: {
      "@deribfy/primitives": "../primitives",
      "@deribfy/primitives/theme-bridge": "../primitives/theme-bridge",
      "@deribfy/primitives/roles-icones": "../primitives/roles-icones",
    },
  },
  {
    // LE SERVEUR DU PROPRIÉTAIRE, EN HTTP NU (2026-10-05). Le moteur avait un
    // protocole neutre pour la LECTURE et jamais pour l'écriture ni la
    // session : l'application écrivait par le client Supabase, et un
    // propriétaire exigeant un autre backend n'avait rien à implémenter.
    source: "compiler/runtime/ecriture-http.ts",
    target: "lib/runtime/ecriture-http.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/session-http.ts",
    target: "lib/runtime/session-http.ts",
    rewrites: {},
  },
  {
    // La COUTURE de plateforme — barre d'état et zones sûres. L'`app-shell`
    // doit valoir pour les deux cibles : c'est lui qui pose les insets.
    source: "compiler/runtime/plateforme.tsx",
    target: "lib/runtime/plateforme.tsx",
    rewrites: {},
  },
  {
    source: "compiler/runtime/demo-provider.ts",
    target: "lib/runtime/demo-provider.ts",
    rewrites: {},
  },
  {
    // E3.1 (D-130) — magasin observable PUR : instantané par entité, états
    // réels, observation. Aucun réseau, aucune horloge, aucun « live ».
    source: "compiler/runtime/magasin-donnees.ts",
    target: "lib/runtime/magasin-donnees.ts",
    rewrites: {},
  },
  {
    // E3.3 (D-132) : adaptateur de source distante — générique, fail-closed.
    source: "compiler/runtime/source-reseau.ts",
    target: "lib/runtime/source-reseau.ts",
    rewrites: {},
  },
  {
    // E1/E2 (D-129) — pipeline PUR des lignes de liste, prouvé par tests
    // unitaires sans monter react-native.
    source: "compiler/runtime/list-pipeline.ts",
    target: "lib/runtime/list-pipeline.ts",
    rewrites: {},
  },
  {
    source: "compiler/runtime/air-runtime.tsx",
    target: "lib/runtime/air-runtime.tsx",
    rewrites: {},
  },
];

export class EmbedRewriteError extends Error {
  constructor(spec: EmbeddedSourceSpec, specifier: string, count: number) {
    super(
      `EMBED_REWRITE:${spec.source}:${specifier}: ${count} occurrence(s) — 1 exigée`,
    );
    this.name = "EmbedRewriteError";
  }
}

/**
 * Applique les réécritures d'imports d'un fichier copié. Chaque
 * spécificateur DOIT apparaître exactement une fois sous la forme
 * `from "<spécificateur>"` — toute dérive des sources gelées casse ici
 * (fail-closed), en plus des scellés du train.
 */
export function rewriteEmbeddedSource(
  spec: EmbeddedSourceSpec,
  content: string,
): string {
  let out = content;
  for (const [specifier, replacement] of Object.entries(spec.rewrites)) {
    const needle = `from "${specifier}"`;
    const count = out.split(needle).length - 1;
    if (count !== 1) throw new EmbedRewriteError(spec, specifier, count);
    out = out.replace(needle, `from "${replacement}"`);
  }
  return out;
}

/**
 * CE QUE LA CIBLE WEB REMPLACE — et rien de plus.
 *
 * Les 35 fichiers embarqués sont partagés ; seules les PRIMITIVES changent,
 * parce qu'elles sont la seule couche qui connaisse une plateforme. Le
 * remplacement se fait par CIBLE D'ÉCRITURE : `lib/primitives/primitives.tsx`
 * reçoit la version web, et tout le reste — blocs, runtime, jetons, données —
 * reste strictement identique.
 *
 * ÉCRIRE UNE SECONDE LISTE COMPLÈTE AURAIT ÉTÉ PLUS SIMPLE, et faux : les deux
 * auraient divergé au premier fichier ajouté, et la cible web se serait mise à
 * embarquer un runtime d'une autre époque sans que rien ne le dise.
 */
const SOURCES_WEB: readonly EmbeddedSourceSpec[] = [
  // Le web n'enregistre aucune police par du code : ses `@font-face` sont dans
  // la feuille émise. La racine y est donc l'identité — même patron que
  // `creerFeuille`.
  {
    source: "compiler/runtime/polices-web.tsx",
    target: "lib/runtime/polices.tsx",
    rewrites: {},
  },
  { source: "primitives-web/src/css.ts", target: "lib/primitives/css.ts", rewrites: {} },
  { source: "primitives-web/src/hotes.tsx", target: "lib/primitives/hotes.tsx", rewrites: {} },
  {
    source: "primitives-web/src/primitives.tsx",
    target: "lib/primitives/primitives.tsx",
    rewrites: {
      "@deribfy/primitives/contracts": "./contracts",
      "@deribfy/primitives/styles": "./styles",
      "@deribfy/primitives/theme-bridge": "./theme-bridge",
      "@deribfy/primitives/roles-icones": "./roles-icones",
      "@deribfy/primitives/media-repli": "./media-repli",
    },
  },
  { source: "primitives-web/src/liste.tsx", target: "lib/primitives/liste.tsx", rewrites: {} },
  {
    source: "primitives-web/src/feuille.ts",
    target: "lib/primitives/feuille.ts",
    // La couture web lit le type `Graisse` des contrats PARTAGÉS : le
    // spécificateur de paquet doit devenir le chemin de la copie, sinon
    // l application émise ne le résout pas.
    rewrites: { "@deribfy/primitives/contracts": "./contracts" },
  },
  {
    source: "compiler/runtime/navigation-web.tsx",
    target: "lib/runtime/navigation-web.tsx",
    rewrites: {},
  },
  {
    // La plateforme web remplace la MÊME cible que la native : `app-shell`
    // importe `./plateforme` et ne sait pas laquelle des deux il obtient.
    source: "compiler/runtime/plateforme-web.tsx",
    target: "lib/runtime/plateforme.tsx",
    rewrites: {},
  },
];

/** Construit la table complète des copies depuis un lecteur de sources. */
export function buildEmbeddedAssets(
  readSource: (repoRelativePath: string) => string,
): Record<string, string> {
  const assets: Record<string, string> = {};
  for (const spec of EMBEDDED_SOURCES) {
    assets[spec.target] = rewriteEmbeddedSource(spec, readSource(spec.source));
  }
  return assets;
}

/** La table de la cible WEB : la commune, puis ce que le web remplace. */
export function buildEmbeddedAssetsWeb(
  readSource: (repoRelativePath: string) => string,
): Record<string, string> {
  const tous = buildEmbeddedAssets(readSource);
  // Les faces TrueType du natif PARTENT avant que les WOFF2 n'arrivent : le web
  // ne doit embarquer qu'un seul jeu. On RECONSTRUIT la table sans elles plutôt
  // que d'en retirer des clés calculées — le lint du dépôt refuse `delete` sur
  // une propriété dynamique, et il a raison : reconstruire dit ce qu'on garde.
  const retires = new Set(RETIRES_WEB);
  const assets: Record<string, string> = Object.fromEntries(
    Object.entries(tous).filter(([cible]) => !retires.has(cible)),
  );
  for (const spec of [...SOURCES_WEB, ...POLICES_WEB]) {
    assets[spec.target] = rewriteEmbeddedSource(spec, readSource(spec.source));
  }
  return assets;
}
