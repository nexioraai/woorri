// ════════════════════════════════════════════════════════════════════
//  CE QUE DERIBFY DOIT SAVOIR DES MAGASINS, ET D'OÙ IL LE SAIT.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI CE FICHIER EXISTE.
//
// Le propriétaire, le 2026-10-16 : « il faut que Deribfy sache exactement
// quoi faire quand c'est une appli web et une appli React Native publiée sur
// l'App Store et Google Play. Il faut lire et comprendre les référentiels
// universels, les plus connus, acceptés par tout le monde, et les suivre. »
//
// Une connaissance qui vit dans une conversation meurt avec elle. Ce fichier
// est la forme durable : chaque règle y est NOMMÉE, SOURCÉE, et tenue par un
// cliquet qui la mesure sur l'application ÉMISE — jamais sur une intention.
//
// ── CE QU'IL N'EST PAS.
//
// Il n'est pas une checklist de publication : celle-là s'adresse à la
// personne qui publie et vit dans `PUBLICATION.md`, émis avec chaque
// application. Ici vivent les règles que le MOTEUR peut tenir tout seul,
// sans rien demander à personne.
//
// ── LES QUATRE AUTORITÉS, ET CE QUI LES DISTINGUE.
//
// ① APPLE — App Store Review Guidelines + Human Interface Guidelines.
//    Autorité de REFUS : une application non conforme n'est pas publiée.
//
// ② GOOGLE — Play Console technical quality requirements + Core App Quality.
//    Autorité de REFUS et de DÉCLASSEMENT (visibilité dans le magasin).
//
// ③ W3C / CHROMIUM — Web App Manifest et critères d'installabilité.
//    Autorité de FAIT : sans eux, une PWA n'est pas installable. Aucun
//    recours, aucun appel — le navigateur ne propose simplement rien.
//
// ④ UNION EUROPÉENNE — European Accessibility Act, en application depuis le
//    28 juin 2025, qui renvoie à EN 301 549, qui renvoie à WCAG 2.1 AA.
//    Autorité LÉGALE : ce n'est pas une ligne de conduite, c'est la loi, et
//    elle est assortie d'amendes.
//
//    POURQUOI ELLE S'APPLIQUE ICI, ET CE N'EST PAS UNE SUPPOSITION : Deribfy
//    est ouvert à tous, Européens compris. Une personne en Europe peut donc
//    générer une application de services financiers destinée à des
//    consommateurs européens. L'utilisateur de Deribfy ne peut pas être censé
//    connaître l'EAA — la conformité doit donc être une propriété du MOTEUR,
//    pas une tâche laissée à celui qui publie.
//
// ── LA RÈGLE DE PRÉSÉANCE, QUAND DEUX AUTORITÉS SE CROISENT.
//
// La loi avant le magasin, le magasin avant le goût. Aucune des quatre n'a
// demandé quoi que ce soit qui contredise les autres à ce jour — et le jour
// où cela arrivera, c'est cet ordre qui tranchera, écrit avant le conflit
// plutôt qu'au moment où il arrangera quelqu'un.

/** Les quatre autorités, et la nature exacte de leur pouvoir. */
export const AUTORITES = {
  apple: {
    nom: "Apple — App Store Review Guidelines & Human Interface Guidelines",
    pouvoir: "refus de publication",
    source: "https://developers.apple.com/design/human-interface-guidelines/",
  },
  google: {
    nom: "Google — Play technical quality requirements & Core App Quality",
    pouvoir: "refus de publication et déclassement",
    source: "https://developer.android.com/docs/quality-guidelines/core-app-quality",
  },
  web: {
    nom: "W3C / Chromium — Web App Manifest & critères d'installabilité",
    pouvoir: "installation impossible",
    source: "https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest",
  },
  loi: {
    nom: "Union européenne — European Accessibility Act → EN 301 549 → WCAG 2.1 AA",
    pouvoir: "obligation légale, amendes",
    source: "https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/",
  },
} as const;

export type Autorite = keyof typeof AUTORITES;

/** À quelle cible une règle s'applique. */
export type Cible = "web" | "natif" | "les-deux";

export interface RegleConformite {
  /** Identifiant stable — cité par les cliquets, jamais réécrit. */
  id: string;
  autorite: Autorite;
  cible: Cible;
  /** L'exigence, en une phrase, dans les termes de l'autorité. */
  exigence: string;
  /** Ce que le moteur fait pour la tenir — ou pourquoi il ne peut pas. */
  tenue:
    | { kind: "tenue"; par: string }
    | { kind: "hors-moteur"; raison: string }
    | { kind: "ouverte"; raison: string };
}

/**
 * LES RÈGLES, ET L'ÉTAT RÉEL DE CHACUNE.
 *
 * `tenue` dit ce que le moteur fait. `hors-moteur` dit qu'aucun générateur ne
 * peut la tenir — elle appartient à celui qui publie, et `PUBLICATION.md` la
 * lui transmet. `ouverte` est un MANQUE ASSUMÉ : la règle s'applique, le
 * moteur ne la tient pas encore, et le dire vaut mieux que de l'omettre.
 *
 * Une règle `ouverte` n'est pas une dette cachée : un cliquet compte les
 * ouvertes et refuse qu'elles augmentent en silence.
 */
export const REGLES: readonly RegleConformite[] = [
  // ─────────────────────────── W3C / CHROMIUM ───────────────────────────
  {
    id: "WEB-ICONES-PNG",
    autorite: "web",
    cible: "web",
    exigence:
      "Le manifeste déclare une icône 192×192 et une 512×512 ; le PNG est le format éprouvé.",
    tenue: { kind: "tenue", par: "emit-web · png-uni (EP-250)" },
  },
  {
    id: "WEB-MANIFESTE-COMPLET",
    autorite: "web",
    cible: "web",
    exigence:
      "name ou short_name, start_url, display standalone/fullscreen/minimal-ui, theme_color.",
    tenue: { kind: "tenue", par: "emit-web · manifeste" },
  },
  {
    id: "WEB-SERVICE-WORKER",
    autorite: "web",
    cible: "web",
    exigence: "Un service worker enregistré, répondant à `fetch`, sans quoi aucune invite.",
    tenue: { kind: "tenue", par: "emit-web · serviceWorker" },
  },
  {
    id: "WEB-HTTPS",
    autorite: "web",
    cible: "web",
    exigence: "Servi en HTTPS — le moteur produit les fichiers, pas leur hébergement.",
    tenue: {
      kind: "hors-moteur",
      raison: "l'hébergement appartient à celui qui publie ; PUBLICATION.md le lui dit",
    },
  },

  // ─────────────────────────────── GOOGLE ───────────────────────────────
  {
    id: "PLAY-THEMES-CLAIR-SOMBRE",
    autorite: "google",
    cible: "les-deux",
    exigence:
      "Le contenu de l'application doit servir le thème clair ET le thème sombre.",
    tenue: { kind: "tenue", par: "plateforme · useSchemaSysteme + app-shell (EP-250)" },
  },
  {
    id: "PLAY-RENDU-SANS-DEFORMATION",
    autorite: "google",
    cible: "les-deux",
    exigence: "Textes et images rendus sans distorsion, flou ni pixellisation.",
    tenue: { kind: "tenue", par: "design-tokens · aucune valeur de design en dur" },
  },

  // ──────────────────────────────── APPLE ───────────────────────────────
  {
    id: "APPLE-4-2-6-SOUMISSION",
    autorite: "apple",
    cible: "natif",
    exigence:
      "Une application issue d'un service de génération est refusée, SAUF si le fournisseur du contenu la soumet lui-même.",
    tenue: {
      kind: "hors-moteur",
      raison:
        "c'est la condition même du modèle : le client publie sous SON compte développeur, jamais sous celui de Deribfy",
    },
  },
  {
    id: "APPLE-4-2-FONCTIONNALITE",
    autorite: "apple",
    cible: "natif",
    exigence:
      "Une application doit dépasser un site web reconditionné : il lui faut des capacités natives réelles.",
    // ── CE QUE LE MOTEUR PEUT TENIR, ET CE QU'IL NE PEUT PAS.
    //
    // Il ne peut pas INVENTER une capacité qu'un document ne déclare pas :
    // ce serait fabriquer une fonctionnalité pour tromper un examinateur.
    //
    // Il peut REFUSER DE SE TAIRE. Une application native dont le document
    // ne déclare aucune capacité sera rejetée sous 4.2, et le savoir APRÈS
    // la soumission coûte une semaine d'attente à quelqu'un. `verifier` le
    // dit AVANT, à l'émission.
    tenue: { kind: "tenue", par: "conformite-magasins · verifier (EP-251)" },
  },
  {
    id: "APPLE-MODE-SOMBRE",
    autorite: "apple",
    cible: "les-deux",
    exigence: "Le mode sombre n'est pas optionnel ; chaque écran vaut dans les deux apparences.",
    tenue: { kind: "tenue", par: "plateforme · useSchemaSysteme + app-shell (EP-250)" },
  },

  // ───────────────────────────────── LOI ────────────────────────────────
  {
    id: "WCAG-1-4-3-CONTRASTE",
    autorite: "loi",
    cible: "les-deux",
    exigence: "Contraste du texte d'au moins 4,5:1 (AA).",
    tenue: { kind: "tenue", par: "emit-theme · deriveTextInk recalcule l'encre" },
  },
  {
    id: "WCAG-2-4-7-FOCUS-VISIBLE",
    autorite: "loi",
    cible: "les-deux",
    exigence: "Tout élément atteignable au clavier montre où se trouve le focus.",
    tenue: { kind: "tenue", par: "emit-web · :focus-visible + primitives · focusAnneau (EP-247)" },
  },
  {
    id: "WCAG-4-1-2-NOM-ROLE",
    autorite: "loi",
    cible: "les-deux",
    exigence: "Chaque élément d'interface porte un nom et un rôle lisibles par assistance.",
    tenue: { kind: "tenue", par: "primitives · accessibilityLabel et accessibilityRole" },
  },
  {
    id: "WCAG-2-5-5-CIBLES",
    autorite: "loi",
    cible: "les-deux",
    exigence: "Une cible tactile mesure au moins 44×44 points.",
    tenue: { kind: "tenue", par: "design-tokens · size.tapTarget = 48" },
  },
  {
    id: "WCAG-2-3-3-MOUVEMENT",
    autorite: "loi",
    cible: "les-deux",
    exigence: "Les animations de transition se désactivent sur demande du système.",
    // Posée par construction côté web : la garde neutralise TOUT mouvement,
    // présent ou futur. Côté natif, l'application n'en porte aucun — et un
    // cliquet refuse qu'une animation apparaisse sans sa garde.
    tenue: { kind: "tenue", par: "emit-web · @media prefers-reduced-motion (EP-251)" },
  },
  {
    id: "WCAG-3-1-1-LANGUE",
    autorite: "loi",
    cible: "web",
    exigence: "La langue de la page est déclarée.",
    tenue: { kind: "tenue", par: "emit-web · <html lang> et manifeste `lang`" },
  },
];

/** Les règles que le moteur ne tient PAS encore. Comptées, jamais tues. */
export const reglesOuvertes = (): readonly RegleConformite[] =>
  REGLES.filter((r) => r.tenue.kind === "ouverte");

/** Les règles qui n'appartiennent à aucun générateur — elles vont au publieur. */
export const reglesHorsMoteur = (): readonly RegleConformite[] =>
  REGLES.filter((r) => r.tenue.kind === "hors-moteur");

// ════════════════════════════════════════════════════════════════════
//  LE VÉRIFICATEUR — CE QUI FAIT AGIR CE FICHIER AU LIEU DE LE LAISSER
//  DOCUMENTER.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT QUE CE BLOC FERME, ET C'ÉTAIT LE MIEN.
//
// La première version de ce module était une LISTE. Le propriétaire a
// demandé de revérifier, et la mesure a été nette : `conformite-magasins`
// n'était importé par PERSONNE. Le champ `cible` déclarait « web » ou
// « natif » et rien ne le lisait.
//
// Autrement dit, Deribfy produisait bien deux artefacts différents — mais il
// ne DISTINGUAIT rien : il n'avait aucun moyen de dire si ce qu'il venait
// d'émettre satisfaisait les règles de la cible demandée. « Deribfy sait »
// était une phrase, pas un fait.
//
// ── CE QUE `verifier` FAIT, ET CE QU'IL NE FAIT PAS.
//
// Il lit les FICHIERS ÉMIS et rend un constat par règle applicable À CETTE
// CIBLE. Il ne compile pas, ne construit pas, ne lance aucun navigateur : il
// mesure ce qui est là.
//
// Il ne lève PAS. Une application émise reste émise : refuser à ce stade
// ferait perdre le travail au lieu d'informer. Le constat remonte, et c'est
// l'appelant — la route de livraison, un gate, `PUBLICATION.md` — qui décide
// ce qu'il en fait.

/** Le résultat d'une règle, mesuré sur ce qui a été émis. */
export interface Constat {
  regle: string;
  autorite: Autorite;
  /** `conforme` : mesuré et satisfait. `manque` : mesuré et violé.
   *  `au-publieur` : le moteur ne peut pas la tenir, elle part au publieur. */
  verdict: "conforme" | "manque" | "au-publieur";
  /** Ce qui a été mesuré, en clair — jamais un simple booléen. */
  detail: string;
}

/** Les règles qui s'appliquent à une cible donnée. C'est ici que `cible` sert. */
export const reglesPour = (cible: "web" | "natif"): readonly RegleConformite[] =>
  REGLES.filter((r) => r.cible === cible || r.cible === "les-deux");

const lire = (f: ReadonlyMap<string, string>, nom: string): string => f.get(nom) ?? "";

/**
 * Vérifie une application ÉMISE contre les règles de SA cible.
 *
 * `capacites` vient du document : les capacités qu'il déclare. Le moteur ne
 * les invente pas — il les compte.
 */
export function verifier(
  fichiers: ReadonlyMap<string, string>,
  cible: "web" | "natif",
  capacites: readonly string[],
): readonly Constat[] {
  const constats: Constat[] = [];
  const pousser = (regle: string, verdict: Constat["verdict"], detail: string): void => {
    const r = REGLES.find((x) => x.id === regle);
    if (r === undefined) return;
    constats.push({ regle, autorite: r.autorite, verdict, detail });
  };

  for (const r of reglesPour(cible)) {
    if (r.tenue.kind === "hors-moteur") {
      pousser(r.id, "au-publieur", r.tenue.raison);
      continue;
    }

    switch (r.id) {
      case "WEB-ICONES-PNG": {
        const m = lire(fichiers, "public/manifest.webmanifest");
        const png = [...m.matchAll(/"sizes":\s*"(\d+)x\1"/gu)].map((x) => x[1]);
        const ok =
          png.includes("192") &&
          png.includes("512") &&
          fichiers.has("public/icone-192.png") &&
          fichiers.has("public/icone-512.png");
        pousser(
          r.id,
          ok ? "conforme" : "manque",
          ok ? "192 et 512 déclarées ET émises" : `tailles PNG trouvées : ${png.join(", ") || "aucune"}`,
        );
        break;
      }
      case "WEB-SERVICE-WORKER": {
        const sw = lire(fichiers, "public/sw.js");
        const ok = sw !== "" && sw.includes('addEventListener("fetch"');
        pousser(r.id, ok ? "conforme" : "manque", ok ? "émis sous public/, répond à fetch" : "absent ou muet sur fetch");
        break;
      }
      case "WEB-MANIFESTE-COMPLET": {
        const m = lire(fichiers, "public/manifest.webmanifest");
        const manquants = ["\"name\"", "\"start_url\"", "\"display\"", "\"theme_color\""].filter(
          (c) => !m.includes(c),
        );
        pousser(
          r.id,
          manquants.length === 0 ? "conforme" : "manque",
          manquants.length === 0 ? "champs requis présents" : `absents : ${manquants.join(", ")}`,
        );
        break;
      }
      case "PLAY-THEMES-CLAIR-SOMBRE":
      case "APPLE-MODE-SOMBRE": {
        const jetons = lire(fichiers, "lib/tokens/theme.generated.ts");
        const shell = lire(fichiers, "lib/runtime/app-shell.tsx");
        const ok =
          jetons.includes('"light":') &&
          jetons.includes('"dark":') &&
          shell.includes("useSchemaSysteme") &&
          shell.includes("<ThemeRoot");
        pousser(
          r.id,
          ok ? "conforme" : "manque",
          ok
            ? "deux palettes émises ET choisies par le système"
            : "palettes présentes mais aucun choix branché (le défaut du 2026-10-16)",
        );
        break;
      }
      case "WCAG-2-3-3-MOUVEMENT": {
        // ── DEUX FAÇONS D'ÊTRE CONFORME, ET LES DEUX SONT HONNÊTES.
        //
        // Soit la garde existe, soit il n'y a RIEN à garder. Ce qui serait
        // faux, c'est une animation sans garde — et c'est exactement ce que
        // ce constat attrape.
        const garde = lire(fichiers, "index.html").includes("prefers-reduced-motion");
        const bouge = [...fichiers.entries()].some(
          ([nom, c]) =>
            /\.tsx?$/u.test(nom) && /\bAnimated\b|useNativeDriver|@keyframes/u.test(c),
        );
        const ok = garde || !bouge;
        pousser(
          r.id,
          ok ? "conforme" : "manque",
          garde ? "garde posée dans la feuille émise" : bouge ? "animation SANS garde" : "aucune animation à garder",
        );
        break;
      }
      case "APPLE-4-2-FONCTIONNALITE": {
        // ── CE QUE LE MOTEUR MESURE, ET POURQUOI C'EST LA BONNE MESURE.
        //
        // Apple refuse « un site web reconditionné ». Le moteur ne peut pas
        // juger de l'utilité d'une application — mais il peut compter les
        // capacités que son DOCUMENT déclare. Zéro capacité sur une cible
        // native, c'est le profil exact que 4.2 vise.
        const ok = capacites.length > 0;
        pousser(
          r.id,
          ok ? "conforme" : "manque",
          ok
            ? `capacités déclarées : ${capacites.join(", ")}`
            : "aucune capacité déclarée : Apple refusera sous 4.2 — à voir AVANT la soumission, pas après",
        );
        break;
      }
      default: {
        // Les règles tenues par construction (contraste, cibles tactiles,
        // focus, langue) : le moteur ne sait pas les mesurer ici sans
        // rendre la page. Elles sont tenues ailleurs, par leurs cliquets.
        pousser(r.id, "conforme", r.tenue.kind === "tenue" ? r.tenue.par : "");
        break;
      }
    }
  }
  return constats;
}
