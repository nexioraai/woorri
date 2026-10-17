// ════════════════════════════════════════════════════════════════════
//  LE CATALOGUE DE THÈMES — UN VOCABULAIRE FERMÉ, COMME LES BLOCS.
// ════════════════════════════════════════════════════════════════════
//
// ── CE QUE LA MESURE A DIT, ET ELLE EST SÉVÈRE (2026-10-17).
//
// 22 documents, 21 noms de thème distincts, et l'identité visuelle tenait en
// DEUX jetons sur douze. Mesuré de bout en bout sur les DEUX cibles : entre
// `kaviva-spa` et `coach-fitness`, le module de thème émis diffère sur
// 4 lignes sur 71. `bg`, `surface`, `text`, `muted`, `border`, `badgeBg`,
// `space`, `radius`, `font` : IDENTIQUES pour tout le monde.
//
// Et la teinte qui bougeait était un HACHAGE DU NOM. Déterministe, oui ;
// jamais appropriée : `spa_elegant` recevait du magenta #FA1ED8,
// `fitness_energy` du cyan #1EEEFA, et `scene_nuit` — une salle de concert —
// de l'orange sur fond BLANC. Le mécanisme n'était pas cassé, il était
// ARBITRAIRE. C'est pire : il donne l'apparence d'un thème.
//
// ── POURQUOI UN CATALOGUE, ET POURQUOI FERMÉ.
//
// Ce dépôt a déjà la réponse, et elle s'appelle le registre de blocs : une
// ALLOWLIST FERMÉE, transmise au générateur, qui choisit DEDANS. Le moteur
// n'invente pas une palette (F3) et ne la déduit pas d'un nom (EP-201) — il
// la LIT dans un vocabulaire que des humains ont posé.
//
// Un nom hors catalogue garde l'ancien comportement : rotation de teinte. Ce
// n'est pas une faveur, c'est la compatibilité — les 22 documents existants
// continuent de compiler à l'identique tant qu'ils n'ont pas migré, et le
// cliquet COMPTE combien en sont encore là.
//
// ── CE QUE CHAQUE THÈME PORTE, ET CE QU'IL NE PORTE PAS.
//
// Il porte les SEPT jetons de palette qui dessinent un monde visuel : fond,
// surface, texte, texte secondaire, accent, bordure, fond de pastille. Plus
// les trois rayons — un spa n'a pas les coins d'une application de chantier.
//
// Il ne porte PAS :
//   · `primaryText` ni `onPrimary` — DÉRIVÉS, et le rester est ce qui garantit
//     le contraste de l'accent quel qu'il soit (garde-fou 3 d'`emit-theme`) ;
//   · `error`/`success`/`warn` par défaut — la SÉMANTIQUE ne doit pas dériver
//     avec la mode : le rouge d'une erreur reste le rouge d'une erreur. Un
//     thème peut les redéclarer quand son fond les rendrait illisibles, et le
//     cliquet de contraste l'y OBLIGE le cas échéant ;
//   · les espacements et les tailles de police — ils tiennent la cible
//     tactile (48) et la largeur de lisibilité (768), qui sont des exigences
//     de norme, pas de goût.
//
// ── LE GARDE-FOU, ET IL EST FAIL-CLOSED.
//
// Chaque palette est MESURÉE au chargement du module : toute paire
// texte/surface sous 4,5:1 fait LEVER. Une palette jolie et illisible ne peut
// pas entrer dans ce fichier — c'est la même discipline que la dérivation
// d'encre, appliquée aux jetons qu'elle ne couvre pas.
import { contrast, theme as BASE, WCAG_AA } from "@deribfy/design-tokens";

/**
 * LES COULEURS SÉMANTIQUES DE BASE — lues aux jetons, jamais recopiées.
 *
 * Un thème qui ne redéclare pas son rouge hérite de celui-ci, et c'est ce
 * qu'on doit MESURER : hériter d'une couleur illisible sur son propre fond est
 * exactement le défaut que l'Oracle a trouvé dans mes palettes.
 */
const BASE_SEMANTIQUE = {
  light: {
    error: BASE.color.light.error,
    success: BASE.color.light.success,
    warn: BASE.color.light.warn,
  },
  dark: {
    error: BASE.color.dark.error,
    success: BASE.color.dark.success,
    warn: BASE.color.dark.warn,
  },
} as const;

/** Les sept jetons qu'un thème du catalogue dessine. */
export interface PaletteCatalogue {
  readonly bg: string;
  readonly surface: string;
  readonly text: string;
  readonly muted: string;
  readonly primary: string;
  readonly border: string;
  readonly badgeBg: string;
  /** Redéclarés SEULEMENT si le fond du thème les rendrait illisibles. */
  readonly error?: string;
  readonly success?: string;
  readonly warn?: string;
}

export interface ThemeCatalogue {
  /** Ce que ce monde visuel sert — lu par un humain, jamais par le moteur. */
  readonly pourquoi: string;
  /**
   * LE RÔLE DE FAMILLE DE CARACTÈRES (tokens 1.6.0).
   *
   * Un rôle, pas un nom : aucun nom de police n'existe sur iOS ET Android à
   * la fois, et un nom absent retombe EN SILENCE sur la police système. La
   * couture de plateforme le résout en une famille réellement présente.
   *
   * `systeme` reste le choix par défaut, et il est bon : SF sur iOS, Roboto
   * sur Android, la pile système sur le web. Un thème ne prend `serif` que
   * quand la lecture longue ou la mise en scène le justifie — pas pour varier.
   */
  readonly famille: "systeme" | "serif" | "mono";
  readonly light: PaletteCatalogue;
  readonly dark: PaletteCatalogue;
  readonly radius: { readonly sm: number; readonly md: number; readonly lg: number };
}

/**
 * LE CATALOGUE. Huit mondes visuels, pas vingt-et-un.
 *
 * Vingt-et-une palettes dessinées à la main seraient vingt-et-une occasions de
 * divergence, et personne ne les tiendrait. Huit couvrent les mondes que le
 * corpus contient réellement — gestion, table, soir, effort, frais, commerce,
 * soin, étude — et un document choisit celui qui lui ressemble.
 */
export const CATALOGUE: Readonly<Record<string, ThemeCatalogue>> = {
  // ── GESTION : registres, chantiers, transit. L'acier et le papier.
  gestion_sobre: {
    // Registres et chiffres : la police systeme est la plus lisible a petite taille, et c est tout ce qu on lui demande.
    famille: "systeme",
    pourquoi: "Registres, chantiers, transport : lisible d'abord, jamais décoratif.",
    light: {
      bg: "#F4F6F8", surface: "#FFFFFF", text: "#14191F", muted: "#55606D",
      primary: "#15607F", border: "#D3DAE2", badgeBg: "#E8EDF2",
      warn: "#816600",
    },
    dark: {
      bg: "#0E1419", surface: "#18212A", text: "#EEF2F6", muted: "#9BA7B4",
      primary: "#4FB3D9", border: "#2A3542", badgeBg: "#1F2A34",
    },
    radius: { sm: 4, md: 6, lg: 10 },
  },

  // ── TABLE : restaurants, cuisine, traiteurs. La terre cuite et la crème.
  table_chaleureuse: {
    // Une carte de restaurant se lit comme un menu imprime, pas comme un tableur.
    famille: "serif",
    pourquoi: "Tables, cuisines, traiteurs : l'appétit avant l'inventaire.",
    light: {
      bg: "#FBF6F0", surface: "#FFFFFF", text: "#2A1C13", muted: "#6B5543",
      primary: "#B5431C", border: "#E7D9C9", badgeBg: "#F4E8DB",
      success: "#1E763B", warn: "#816600",
    },
    dark: {
      bg: "#1A120C", surface: "#261A12", text: "#F7EFE7", muted: "#B9A290",
      primary: "#F08050", border: "#3B2A1E", badgeBg: "#2E2017",
    },
    radius: { sm: 8, md: 14, lg: 22 },
  },

  // ── SOIR : scènes, billetteries, bars. Le velours et l'or.
  soir_velours: {
    // Une affiche de spectacle : le serif porte le nom de l artiste.
    famille: "serif",
    pourquoi: "Scènes, billetteries, soirées : l'écran s'éteint pour que l'affiche brille.",
    light: {
      bg: "#F6F3F8", surface: "#FFFFFF", text: "#1D1424", muted: "#5F5170",
      primary: "#6B2FA8", border: "#DED5E6", badgeBg: "#EDE6F3",
      success: "#1E763B", warn: "#7C6200",
    },
    dark: {
      bg: "#0D0813", surface: "#18101F", text: "#F3EEF8", muted: "#A79BB4",
      primary: "#C08BFF", border: "#2C1F39", badgeBg: "#1F1529",
    },
    radius: { sm: 6, md: 12, lg: 20 },
  },

  // ── EFFORT : sport, coaching, défi. Le graphite et le citron électrique.
  effort_vif: {
    // Le chiffre qui monte doit etre net ; un serif l alourdirait.
    famille: "systeme",
    pourquoi: "Sport, coaching, défis : le chiffre qui monte se voit de loin.",
    light: {
      bg: "#F2F4F3", surface: "#FFFFFF", text: "#111614", muted: "#4E5956",
      primary: "#126E4B", border: "#D2D9D6", badgeBg: "#E6ECE9",
      success: "#1E763B", warn: "#816600",
    },
    dark: {
      bg: "#0B0F0D", surface: "#141B18", text: "#EEF4F1", muted: "#96A5A0",
      primary: "#39D98A", border: "#223029", badgeBg: "#18231E",
    },
    radius: { sm: 4, md: 8, lg: 14 },
  },

  // ── FRAIS : marchés, primeurs, livraison. Le vert d'eau et l'os.
  frais_marche: {
    // Prix et quantites, lus vite, souvent en plein soleil.
    famille: "systeme",
    pourquoi: "Marchés, primeurs, livraison : la marchandise d'abord, propre et nette.",
    light: {
      bg: "#F5F8F4", surface: "#FFFFFF", text: "#16201A", muted: "#4F6157",
      primary: "#2C7A4B", border: "#D5E0D7", badgeBg: "#E7EFE8",
      warn: "#816600",
    },
    dark: {
      bg: "#0C120E", surface: "#161F19", text: "#EEF5F0", muted: "#99AB9F",
      primary: "#55C47E", border: "#243228", badgeBg: "#1A251D",
    },
    radius: { sm: 6, md: 10, lg: 16 },
  },

  // ── COMMERCE : boutiques, places de marché, immobilier. L'encre et le blanc.
  commerce_confiance: {
    // On paie ce qu on croit : la police systeme est celle que l appareil habille le mieux.
    famille: "systeme",
    pourquoi: "Boutiques, places de marché, agences : on paie ce qu'on croit.",
    light: {
      bg: "#F5F6FA", surface: "#FFFFFF", text: "#13161F", muted: "#525A6B",
      primary: "#2F49C4", border: "#D7DAE5", badgeBg: "#E9ECF4",
      warn: "#816600",
    },
    dark: {
      bg: "#0B0D14", surface: "#151823", text: "#EFF1F7", muted: "#9AA1B3",
      primary: "#8296FF", border: "#252A3A", badgeBg: "#1A1E2B",
    },
    radius: { sm: 6, md: 10, lg: 16 },
  },

  // ── SOIN : salons, spas, toilettage. Le sable et la rose fanée.
  soin_doux: {
    // Un salon annonce ses soins comme une carte, pas comme une liste de taches.
    famille: "serif",
    pourquoi: "Salons, spas, soins : la main qui se pose, pas la main qui clique.",
    light: {
      bg: "#FAF5F4", surface: "#FFFFFF", text: "#241A1B", muted: "#6B5455",
      primary: "#A33A5B", border: "#E9D9D9", badgeBg: "#F4E7E7",
      success: "#1E763B", warn: "#816600",
    },
    dark: {
      bg: "#150F10", surface: "#211819", text: "#F6EEEF", muted: "#B79FA1",
      primary: "#E88BA6", border: "#3C2B2D", badgeBg: "#271C1E",
    },
    radius: { sm: 10, md: 18, lg: 28 },
  },

  // ── ÉTUDE : cours, tutorat, bibliothèques. Le papier et l'encre de Chine.
  etude_calme: {
    // On y reste longtemps : le serif est la forme eprouvee de la lecture longue.
    famille: "serif",
    pourquoi: "Cours, tutorat, révisions : on y reste longtemps, l'oeil doit tenir.",
    light: {
      bg: "#F7F6F2", surface: "#FFFFFF", text: "#1B1A16", muted: "#5B5950",
      primary: "#1F5A8F", border: "#DFDCD3", badgeBg: "#EEEBE3",
      warn: "#816600",
    },
    dark: {
      bg: "#101010", surface: "#1A1A19", text: "#F2F1ED", muted: "#A3A199",
      primary: "#6FA8DC", border: "#2C2C29", badgeBg: "#1F1F1D",
    },
    radius: { sm: 4, md: 8, lg: 12 },
  },
};

export const THEMES_CATALOGUE: readonly string[] = Object.keys(CATALOGUE);
export const estThemeDuCatalogue = (nom: string): boolean => nom in CATALOGUE;

/**
 * CLIQUET AU CHARGEMENT — une palette illisible ne peut pas entrer ici.
 *
 * ── POURQUOI AU CHARGEMENT, ET PAS DANS UN TEST.
 *
 * Un test se lance quand on le lance. Ce module est importé par l'émetteur :
 * une palette qui tombe sous le seuil fait échouer la COMPILATION de toute
 * application, immédiatement, et personne ne peut l'ignorer.
 *
 * ── CE QUI EST MESURÉ, ET POURQUOI CES PAIRES-LÀ.
 *
 * Le texte se lit sur le fond ET sur la surface — c'est la leçon de D-067,
 * où `primaryText` passait sur `bg` et tombait à 4,16 sur `surface`. Le texte
 * secondaire aussi : c'est lui qui s'affaiblit en premier quand on « adoucit »
 * une palette. Et la pastille porte du texte : son fond compte.
 *
 * La BORDURE n'est pas du texte : 4,5:1 la rendrait noire et le dessin
 * s'effondrerait. On exige qu'elle se DISTINGUE de sa surface (1,2:1), ce qui
 * est la borne en dessous de laquelle elle cesse d'exister à l'œil.
 */
const verifierCatalogue = (): void => {
  const griefs: string[] = [];
  for (const [nom, t] of Object.entries(CATALOGUE)) {
    for (const schema of ["light", "dark"] as const) {
      const p = t[schema];
      // ── LES PAIRES SONT CELLES DE L'ORACLE, ET CE N'EST PAS UN CHOIX.
      //
      // Ma première liste en comptait SIX. L'Oracle en mesure DIX-HUIT, et il
      // a trouvé ce que j'avais laissé passer : `light:success/badgeBg = 4,45`
      // et `light:warn/badgeBg = 4,27` sur `table_chaleureuse`. Deux paires
      // sous le seuil, dans MES palettes, parce que j'avais changé `badgeBg`
      // en gardant les couleurs sémantiques de base.
      //
      // Mon propre commentaire disait qu'un thème « peut les redéclarer quand
      // son fond les rendrait illisibles, et le cliquet l'y OBLIGE le cas
      // échéant ». Il n'obligeait rien : il ne regardait pas ces paires.
      //
      // Elles sont désormais alignées sur celles de l'Oracle, et le contrôle ⑧
      // d'EP-263 lit la liste de l'Oracle À LA SOURCE pour refuser qu'elles
      // divergent — ce dépôt a vu six fois « une liste écrite deux fois ».
      //
      // `primaryText` et `onPrimary` n'y sont pas : ils sont DÉRIVÉS après le
      // catalogue, et la dérivation garantit déjà leur contraste.
      const semantique = (cle: "error" | "success" | "warn"): string =>
        p[cle] ?? BASE_SEMANTIQUE[schema][cle];
      const paires: readonly [string, string, string, number][] = [
        ["text/bg", p.text, p.bg, WCAG_AA],
        ["text/surface", p.text, p.surface, WCAG_AA],
        ["text/badgeBg", p.text, p.badgeBg, WCAG_AA],
        ["muted/bg", p.muted, p.bg, WCAG_AA],
        ["muted/surface", p.muted, p.surface, WCAG_AA],
        ["muted/badgeBg", p.muted, p.badgeBg, WCAG_AA],
        ["error/bg", semantique("error"), p.bg, WCAG_AA],
        ["error/surface", semantique("error"), p.surface, WCAG_AA],
        ["error/badgeBg", semantique("error"), p.badgeBg, WCAG_AA],
        ["success/bg", semantique("success"), p.bg, WCAG_AA],
        ["success/surface", semantique("success"), p.surface, WCAG_AA],
        ["success/badgeBg", semantique("success"), p.badgeBg, WCAG_AA],
        ["warn/bg", semantique("warn"), p.bg, WCAG_AA],
        ["warn/surface", semantique("warn"), p.surface, WCAG_AA],
        ["warn/badgeBg", semantique("warn"), p.badgeBg, WCAG_AA],
        ["border/surface", p.border, p.surface, 1.2],
      ];
      for (const [quoi, a, b, seuil] of paires) {
        const r = contrast(a, b);
        if (r < seuil) {
          griefs.push(
            `${nom}.${schema} — ${quoi} : ${r.toFixed(2)}:1 < ${String(seuil)}:1 (${a} sur ${b})`,
          );
        }
      }
    }
  }
  if (griefs.length > 0) {
    throw new Error(
      "CATALOGUE DE THÈMES — palette(s) illisible(s), compilation REFUSÉE :\n  " +
        griefs.join("\n  "),
    );
  }
};

verifierCatalogue();
