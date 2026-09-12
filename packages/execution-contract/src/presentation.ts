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
    for (const [emplacement, blocs] of occupants) {
      if (blocs.length > 1) {
        out.push({
          code: "PRESENTATION_EMPLACEMENT_OCCUPE",
          path: `screens[${ecran.id}]`,
          message:
            `${String(blocs.length)} éléments persistants occupent l'emplacement ` +
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
