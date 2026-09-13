// EP-130 — LA LOI DU PLACEMENT : première pierre du pan PRÉSENTATION.
//
// EP-129 a établi que le moteur juge la PRÉSENCE et la VIVACITÉ, jamais la
// POSITION. Ce module ouvre la dimension manquante. Sa méthode diffère de
// tout le reste du moteur : les règles ne sont PAS dérivées d'un défaut
// mesuré, elles préexistent — ce sont les conventions documentées des
// plateformes. Chaque invariant ci-dessous cite la source qui le fonde.
//
// SOURCES VÉRIFIÉES (developer.android.com, doc officielle Material 3) :
//  [S1] Navigation bar — « navigation bars should be used for three to five
//       destinations of equal importance » ; barre positionnée EN BAS ; les
//       exemples documentés portent `icon` ET `label` par destination.
//       https://developer.android.com/develop/ui/compose/components/navigation-bar
//  [S2] Top app bars — « positioned across the top of the screen », hébergent
//       titre, icône de navigation (gauche) et actions (droite) ; la recherche
//       n'y figure PAS comme paramètre.
//       https://developer.android.com/develop/ui/compose/components/app-bars
//  [S3] Search bar — positionnée `Alignment.TopCenter`, pleine largeur,
//       persistante en haut de l'écran.
//       https://developer.android.com/develop/ui/compose/components/search-bar
//
// LIMITE DE LECTURE, DITE : les pages Apple HIG et m3.material.io sont rendues
// en JavaScript et n'ont pas pu être lues à la source. Les invariants ci-dessous
// s'appuient donc sur la documentation Material officielle d'Android, qui
// couvre les trois points de cette passe. Ce qu'aucune source ne fonde est
// étiqueté DÉCISION PRODUIT, jamais présenté comme une convention.
import type { ProjectAir } from "@deribfy/air-schema";

type Air = ProjectAir;

export interface PlacementFinding {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

/**
 * LA GÉOMÉTRIE DU CHROME — deux barres, des emplacements EXCLUSIFS.
 *
 * Avant cette passe, « chrome » était un seul espace sans position : deux
 * éléments y atterrissaient sans qu'aucune règle ne dise lequel occupe quoi.
 * La structure ci-dessous nomme les emplacements ; l'exclusivité est jugée.
 */
export const BARRE_SUPERIEURE = ["titre", "recherche", "actions"] as const;
export const BARRE_INFERIEURE = ["destinations"] as const;

/** Emplacement occupé par un type de bloc persistant. [S2][S3] */
export const EMPLACEMENT_PAR_BLOC: Readonly<Record<string, string>> = {
  search_entry: "recherche",
};

/**
 * EP-131 · ① QUI OCCUPE L'EMPLACEMENT « TITRE ».
 *
 * Deux chemins mènent au même emplacement, et c'est là que naît le désordre :
 *  · l'EN-TÊTE NATIF, rendu dès que l'écran ne le masque pas, qui reçoit le
 *    titre de l'écran — c'est la place que [S2] assigne au titre ;
 *  · un bloc d'en-tête DANS le document, qui porte son propre texte.
 *
 * Le discriminant est le TEXTE, pas la présence : un bloc qui porte une
 * phrase distincte est un contenu éditorial légitime, en zone contenu. Un
 * bloc qui REDIT le titre de l'écran occupe une seconde fois l'emplacement
 * déjà tenu par l'en-tête natif — la même donnée est affichée deux fois,
 * l'une sous l'autre.
 */
const texteDe = (valeur: unknown): string => {
  if (typeof valeur === "string") return valeur;
  if (Array.isArray(valeur)) {
    const premier: unknown = valeur[0];
    if (typeof premier === "object" && premier !== null && "text" in premier) {
      const t: unknown = (premier as { text: unknown }).text;
      return typeof t === "string" ? t : "";
    }
  }
  return "";
};

const memeTexte = (a: string, b: string): boolean =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase() && a.trim() !== "";

/** L'en-tête natif est rendu SAUF si l'écran le masque explicitement. */
export const enteteNativeRendue = (ecran: { showsScreenTitle?: boolean }): boolean =>
  ecran.showsScreenTitle !== false;

/**
 * DÉCISION PRODUIT (Youssouf), NON une convention de plateforme.
 *
 * Aucune source consultée n'impose un onglet « Compte » : [S1] prescrit
 * 3 à 5 destinations d'importance égale, sans en nommer aucune. L'exigence
 * « toute application porte un accueil et un espace compte » est un choix
 * de produit, assumé comme tel — il est étiqueté ici pour qu'une relecture
 * ne le prenne jamais pour une règle de plateforme.
 */
export const ROLES_DESTINATION_OBLIGATOIRES = ["accueil", "compte"] as const;

/** Bornes documentées de la barre inférieure. [S1] */
export const DESTINATIONS_MIN = 3;
export const DESTINATIONS_MAX = 5;

/**
 * ① EXCLUSIVITÉ DES EMPLACEMENTS — deux éléments persistants ne peuvent pas
 * occuper le même emplacement d'une barre.
 */
export function jugerExclusivite(air: Air): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  for (const ecran of air.screens) {
    const occupants = new Map<string, string[]>();
    for (const bloc of ecran.blocks) {
      const emplacement = EMPLACEMENT_PAR_BLOC[bloc.blockType];
      if (emplacement === undefined) continue;
      occupants.set(emplacement, [...(occupants.get(emplacement) ?? []), bloc.id]);
    }
    // EP-131 — l'emplacement « titre » : l'en-tête natif d'abord, puis tout
    // bloc qui redit le même texte.
    if (enteteNativeRendue(ecran)) {
      const titreEcran = texteDe(ecran.title);
      const redits = ecran.blocks.filter(
        (b) =>
          b.blockType === "header" &&
          memeTexte(
            texteDe(b.props?.find((p) => p.key === "title")?.value),
            titreEcran,
          ),
      );
      for (const bloc of redits) {
        occupants.set("titre", [...(occupants.get("titre") ?? ["en-tête natif"]), bloc.id]);
      }
    }
    for (const [emplacement, blocs] of occupants) {
      if (blocs.length > 1) {
        out.push({
          code:
            emplacement === "titre"
              ? "PRESENTATION_TITRE_REPETE"
              : "PRESENTATION_EMPLACEMENT_OCCUPE",
          path: `screens[${ecran.id}]`,
          message:
            emplacement === "titre"
              ? `le titre de l'écran est affiché DEUX fois : par l'en-tête natif, ` +
                `et redit à l'identique par ${blocs.slice(1).join(", ")}. ` +
                `Un bloc qui porte un texte DIFFÉRENT est un contenu légitime ; ` +
                `un bloc qui redit le titre occupe une place déjà tenue.`
              : `${String(blocs.length)} éléments persistants occupent l'emplacement ` +
                `« ${emplacement} » de la barre supérieure : ${blocs.join(", ")}. ` +
                `Un emplacement porte UN élément — deux s'empilent ou se recouvrent à l'écran.`,
        });
      }
    }
  }
  return out;
}

/**
 * ② LA RECHERCHE EST EN HAUT, ET NULLE PART AILLEURS. [S3]
 *
 * Le document ne porte pas de coordonnées : la position se lit dans la ZONE
 * que le plan de composition attribue au bloc. Un `search_entry` hors zone
 * chrome descend dans le flux défilant — il cesse d'être une barre de
 * recherche et devient un champ perdu au milieu du contenu.
 */
export function jugerPositionRecherche(
  air: Air,
  zoneDuBloc: (screenId: string, blockId: string) => string | undefined,
): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  for (const ecran of air.screens) {
    for (const bloc of ecran.blocks) {
      if (bloc.blockType !== "search_entry") continue;
      const zone = zoneDuBloc(ecran.id, bloc.id);
      if (zone !== "chrome") {
        out.push({
          code: "PRESENTATION_RECHERCHE_HORS_BARRE",
          path: `screens[${ecran.id}].blocks[${bloc.id}]`,
          message:
            `la recherche "${bloc.id}" est en zone « ${zone ?? "inconnue"} » : ` +
            `elle défilerait avec le contenu. Une barre de recherche est ` +
            `persistante, en HAUT de l'écran et pleine largeur [Material : ` +
            `search bar en TopCenter].`,
        });
      }
    }
  }
  return out;
}

/**
 * ③ LA BARRE INFÉRIEURE — bornes documentées [S1] et primitives produit.
 */
export function jugerBarreInferieure(air: Air): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  const destinations = air.navigation.primary?.destinations ?? [];
  if (destinations.length === 0) return out; // aucune barre : hors sujet ici.

  // [S1] — trois à cinq destinations d'importance égale.
  if (destinations.length < DESTINATIONS_MIN || destinations.length > DESTINATIONS_MAX) {
    out.push({
      code: "PRESENTATION_DESTINATIONS_HORS_BORNES",
      path: "navigation.primary",
      message:
        `${String(destinations.length)} destinations : la barre inférieure en ` +
        `porte de ${String(DESTINATIONS_MIN)} à ${String(DESTINATIONS_MAX)}, ` +
        `d'importance égale [Material : navigation bar].`,
    });
  }

  // [S1] — chaque destination porte un symbole ; sans icône, une barre
  // d'onglets n'est plus lisible d'un coup d'œil.
  for (const destination of destinations) {
    if (destination.icon === undefined) {
      out.push({
        code: "PRESENTATION_DESTINATION_SANS_ICONE",
        path: `navigation.primary.destinations[${destination.routeId}]`,
        message:
          `la destination "${destination.routeId}" n'a pas d'icône : une barre ` +
          `de navigation se lit par ses symboles [Material : icon + label].`,
      });
    }
  }

  return out;
}

/**
 * DÉCISION PRODUIT (étiquetée) — L'ESPACE COMPTE EXISTE VRAIMENT.
 *
 * PIÈGE ÉCARTÉ PAR LA MESURE : juger sur l'ICÔNE est faux. Un document
 * mesuré portait bien une destination d'icône « compte » — posée sur un
 * écran de saisie relevant d'un tout autre parcours. Une icône est un
 * symbole que le générateur choisit ; elle ne prouve aucune destination.
 * Le critère est STRUCTUREL : une
 * destination est l'espace compte si son écran porte le concept d'IDENTITÉ
 * du modèle (celui que touche `s_identifier`). Si le modèle n'en porte
 * aucun, l'espace compte ne peut pas exister — et c'est précisément le
 * défaut : aucune application mobile n'existe sans espace compte.
 *
 * Aucune convention de plateforme n'impose cet onglet : [S1] prescrit 3 à 5
 * destinations sans en nommer aucune. C'est un choix de produit, assumé.
 */
export interface ContextePrimitives {
  /** Écran d'entrée déclaré (l'accueil). */
  readonly entryScreenId: string;
  /** Écrans qui portent le concept d'identité du modèle — vide si aucun. */
  readonly ecransDIdentite: readonly string[];
}

export function jugerPrimitivesDeNavigation(
  air: Air,
  contexte: ContextePrimitives,
): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  const destinations = air.navigation.primary?.destinations ?? [];
  if (destinations.length === 0) return out;
  const ecranDeRoute = new Map(air.navigation.routes.map((r) => [r.id, r.screenId]));
  const ecransVises = destinations
    .map((d) => ecranDeRoute.get(d.routeId))
    .filter((e): e is string => e !== undefined);

  if (!ecransVises.includes(contexte.entryScreenId)) {
    out.push({
      code: "PRESENTATION_ACCUEIL_ABSENT",
      path: "navigation.primary",
      message:
        `aucune destination ne mène à l'écran d'entrée "${contexte.entryScreenId}" : ` +
        `une application mobile ramène toujours à son accueil. ` +
        `(DÉCISION PRODUIT — aucune convention ne le nomme.)`,
    });
  }

  const aEspaceCompte = ecransVises.some((e) => contexte.ecransDIdentite.includes(e));
  if (!aEspaceCompte) {
    out.push({
      code: "PRESENTATION_ESPACE_COMPTE_ABSENT",
      path: "navigation.primary",
      message:
        contexte.ecransDIdentite.length === 0
          ? `le modèle ne porte AUCUN concept d'identité : l'espace compte ne peut ` +
            `pas exister. Toute application mobile en porte un — l'identité doit ` +
            `être au modèle, pas déduite après coup. (DÉCISION PRODUIT.)`
          : `aucune destination ne mène à l'espace compte ` +
            `(écrans d'identité : ${contexte.ecransDIdentite.join(", ")}) — ` +
            `une icône « compte » posée ailleurs ne le remplace pas. (DÉCISION PRODUIT.)`,
    });
  }
  return out;
}

/**
 * EP-137 — CE QUE L'ESPACE COMPTE PORTE, ET POURQUOI.
 *
 * EP-130 a posé que l'accueil et le compte sont des primitives. Leur CONTENU
 * l'est aussi : ces surfaces existent dans toute application, quel que soit
 * le domaine — elles n'ont AUCUNE existence métier, ni concept, ni parcours,
 * ni geste. C'est pourquoi elles relèvent de la PRÉSENTATION et non du
 * modèle : les faire dépendre du modèle reproduirait l'accident d'EP-130,
 * où l'on jugeait ce que le modèle PORTE au lieu de ce qu'une application
 * DOIT porter.
 *
 * FONDEMENT, UN PAR UN — et la moitié n'est PAS une convention :
 *  [P1] confidentialité — App Store Review Guidelines 5.1.1(i) : « All apps
 *       must include a link to their privacy policy … within the app in an
 *       easily accessible manner ». OBLIGATION DE PLATEFORME.
 *  [P2] contact — Guideline 1.5 : « Make sure your app and its Support URL
 *       include an easy way to contact you ». OBLIGATION DE PLATEFORME, et
 *       elle porte bien sur l'app, pas seulement sur la fiche du magasin.
 *  [P3] suppression de compte — Guideline 5.1.1(v) : « If your app supports
 *       account creation, you must also offer account deletion within the
 *       app ». OBLIGATION DE PLATEFORME, CONDITIONNELLE.
 *  [D]  conditions d'utilisation, aide, réglages, création de compte —
 *       AUCUNE convention ne les impose. Les guidelines ne mentionnent aucun
 *       EULA obligatoire, et ne citent aide et réglages qu'en « where
 *       possible » (4.4). Ce sont des DÉCISIONS PRODUIT, étiquetées comme
 *       telles — jamais présentées comme des règles de plateforme.
 *
 * CE QUE LE MOTEUR NE PROMET PAS : le TEXTE. Il ne peut pas écrire une
 * politique de confidentialité, et ne prétend pas le faire. Il garantit que
 * la SURFACE existe et qu'elle est atteignable ; son contenu est un
 * engagement du propriétaire de l'application.
 */
export const SURFACES_DE_COMPTE = {
  privacy_policy: {
    fondement: "plateforme",
    source: "App Store Review Guidelines 5.1.1(i)",
    exigeIdentite: false,
  },
  contact: {
    fondement: "plateforme",
    source: "App Store Review Guidelines 1.5",
    exigeIdentite: false,
  },
  account_delete: {
    fondement: "plateforme",
    source: "App Store Review Guidelines 5.1.1(v)",
    exigeIdentite: true,
  },
  terms: { fondement: "produit", source: null, exigeIdentite: false },
  help: { fondement: "produit", source: null, exigeIdentite: false },
  settings: { fondement: "produit", source: null, exigeIdentite: false },
  account_create: { fondement: "produit", source: null, exigeIdentite: true },
} as const;

export type GenreEcran = keyof typeof SURFACES_DE_COMPTE;

/** Les genres attendus d'un document, DÉRIVÉS : jamais une liste écrite. */
export function surfacesAttendues(avecIdentite: boolean): GenreEcran[] {
  return (Object.keys(SURFACES_DE_COMPTE) as GenreEcran[]).filter(
    (genre) => avecIdentite || !SURFACES_DE_COMPTE[genre].exigeIdentite,
  );
}

/**
 * ④ ELLES N'AJOUTENT AUCUN ONGLET. Material prescrit trois à cinq
 * destinations d'importance égale [S1] ; six surfaces de plus en feraient
 * onze. Elles vivent DANS le compte — le juge refuse toute surface de compte
 * promue en destination, ce qui garantit que la borne d'EP-130 tient sans
 * qu'aucune règle ne soit assouplie.
 */
export function jugerEspaceCompte(
  air: Air,
  contexte: { readonly ecransDIdentite: readonly string[] },
): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  const avecIdentite = contexte.ecransDIdentite.length > 0;
  const parGenre = new Map<string, string[]>();
  for (const ecran of air.screens) {
    if (ecran.purpose === undefined) continue;
    parGenre.set(ecran.purpose, [...(parGenre.get(ecran.purpose) ?? []), ecran.id]);
  }

  for (const genre of surfacesAttendues(avecIdentite)) {
    if (parGenre.has(genre)) continue;
    const fiche = SURFACES_DE_COMPTE[genre];
    out.push({
      code: "PRESENTATION_SURFACE_COMPTE_ABSENTE",
      path: "screens",
      message:
        `aucun écran de genre « ${genre} » : cette surface existe dans toute ` +
        `application, indépendamment du domaine. ` +
        (fiche.source === null
          ? `(DÉCISION PRODUIT — aucune convention de plateforme ne l'impose.)`
          : `(OBLIGATION DE PLATEFORME — ${fiche.source}.)`),
    });
  }

  // Une surface de compte promue en destination mangerait une place de la
  // barre, que Material borne à cinq.
  const ecranDeRoute = new Map(air.navigation.routes.map((r) => [r.id, r.screenId]));
  const ecransEnBarre = new Set(
    (air.navigation.primary?.destinations ?? [])
      .map((d) => ecranDeRoute.get(d.routeId))
      .filter((e): e is string => e !== undefined),
  );
  for (const [genre, ecrans] of parGenre) {
    for (const id of ecrans) {
      if (!ecransEnBarre.has(id)) continue;
      out.push({
        code: "PRESENTATION_SURFACE_COMPTE_EN_BARRE",
        path: `navigation.primary`,
        message:
          `l'écran « ${genre} » (${id}) est une destination principale : ces ` +
          `surfaces vivent DANS le compte, pas dans la barre — une barre en ` +
          `porte de trois à cinq, et elles sont six.`,
      });
    }
  }

  // Quand un espace compte existe, ces surfaces s'y rattachent : sinon elles
  // sont dans le document sans que personne puisse les atteindre.
  if (avecIdentite) {
    const cibles = new Set(
      air.actions
        .filter((a) => a.effect.kind === "navigate")
        .map((a) => (a.effect as { screenId?: string }).screenId)
        .filter((x): x is string => x !== undefined),
    );
    for (const [genre, ecrans] of parGenre) {
      for (const id of ecrans) {
        if (cibles.has(id) || ecransEnBarre.has(id)) continue;
        out.push({
          code: "PRESENTATION_SURFACE_COMPTE_ORPHELINE",
          path: `screens[${id}]`,
          message:
            `l'écran « ${genre} » (${id}) existe mais aucune action n'y mène : ` +
            `une surface qu'on ne peut pas atteindre ne remplit aucune obligation.`,
        });
      }
    }
  }
  return out;
}

/** Les trois juges de placement, en un appel. */
export function jugerPlacement(
  air: Air,
  zoneDuBloc: (screenId: string, blockId: string) => string | undefined,
  contexte?: ContextePrimitives,
): readonly PlacementFinding[] {
  return [
    ...jugerExclusivite(air),
    ...jugerPositionRecherche(air, zoneDuBloc),
    ...jugerBarreInferieure(air),
    ...(contexte === undefined ? [] : jugerPrimitivesDeNavigation(air, contexte)),
  ];
}
