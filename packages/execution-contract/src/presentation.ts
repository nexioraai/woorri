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
import { partagesDe } from "./obligations-proprietaire.ts";
export { partagesDe };
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
// EP-190 — DEUX, ET C'EST LA RÈGLE DE PRODUIT QUI TRANCHE.
//
// Material recommande 3 à 5 destinations pour une navigation bar. TENU POUR
// 3 PENDANT TROIS PASSES, cette borne a produit la MÊME impasse à chaque
// run : le plan prescrit 2 destinations (« Accueil » et « Compte », que
// Youssouf exige dans TOUTE application), le juge en réclame 3, et le
// générateur en INVENTE une troisième — puis lui laisse
// `showsPrimaryNav: false`. D'où `AIR_NAV_DESTINATION_SANS_BARRE`, seul
// diagnostic bloquant de QUATRE runs consécutifs.
//
// EP-175 ① avait « résolu » le conflit en supprimant la barre sous 3 ;
// EP-182 ③ a retiré cette garde parce qu'« Accueil » et « Compte » sont dus ;
// EP-190 ① a fait du compte une destination — et le conflit est revenu dès
// qu'un domaine n'a que DEUX racines.
//
// LA VÉRITÉ QUE TROIS PASSES ONT CONTOURNÉE : une application dont le
// domaine ne porte que deux lieux N'A QUE DEUX ONGLETS. Exiger un troisième
// revient à demander au générateur d'inventer un lieu — et il l'a fait
// quatre fois. La borne descend à 2 : « Accueil » et « Compte » suffisent,
// et le MAXIMUM de 5 reste, lui, une vraie contrainte de lisibilité.
export const DESTINATIONS_MIN = 2;
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

/**
 * EP-191 — CE QUE LE MOTEUR EXIGE, IL LE VÉRIFIE.
 *
 * LEÇON D'EP-188 ①, PAYÉE UNE FOIS DÉJÀ : une règle transmise au générateur
 * et jamais vérifiée n'est pas une règle, c'est un vœu — le document déclarait
 * alors 3 entités pour 5 concepts et rien ne l'avait dit. Le genre
 * `account_home` serait exactement le même vœu : le compilateur le LIT pour
 * intituler « Compte », donc son absence rend le libellé muet, en silence,
 * comme l'option l'était avant lui.
 *
 * FAIL-CLOSED, et sur les DEUX faces : absent alors que le modèle porte une
 * identité, il manque ; posé sur un écran qui ne porte pas l'identité, il
 * ment. Un genre qui désigne le mauvais écran est pire qu'un genre absent —
 * il intitule « Compte » une surface qui n'en est pas une.
 */
export function jugerGenreRacineCompte(
  air: Air,
  contexte: { readonly ecransDIdentite: readonly string[] },
): readonly PlacementFinding[] {
  // Sans concept d'identité au modèle, il n'y a pas d'espace compte à nommer :
  // l'absence est alors le cas JUSTE, et l'exiger fabriquerait un écran.
  if (contexte.ecransDIdentite.length === 0) return [];
  // EP-192 — `?? []` PARCE QUE L'ÉMISSION EST SEGMENTÉE, ET CE DÉFAUT A COÛTÉ
  // UN RUN. Branché au segment `base`, ce juge lisait `air.screens` alors que
  // les écrans ne sont émis QUE deux segments plus loin : `undefined.filter`,
  // arrêt technique à 0,56 $. Mes tests ne l'ont pas vu parce qu'ils lui
  // passaient TOUS un document complet — la même faute qu'EP-191 réparait,
  // commise en le réparant : un test qui fournit ce que la chaîne ne fournit
  // pas ne mesure pas la chaîne.
  //
  // Le juge est DÉPLACÉ au segment qui porte les écrans ; ce `?? []` est la
  // seconde barrière, pour qu'aucun appelant futur ne puisse le faire tomber.
  const portent = (air.screens ?? []).filter((e) => e.purpose === GENRE_RACINE_COMPTE);
  if (portent.length === 0) {
    return [
      {
        code: "PRESENTATION_GENRE_RACINE_COMPTE_ABSENT",
        path: "screens[].purpose",
        message:
          `aucun écran ne porte le genre « ${GENRE_RACINE_COMPTE} » alors que le ` +
          `modèle porte une identité (écrans concernés : ` +
          `${contexte.ecransDIdentite.join(", ")}). Le compilateur lit CE genre ` +
          `pour intituler la destination « Compte » : sans lui le libellé reste ` +
          `celui qu'a écrit le générateur, et le défaut a déjà traversé quatre ` +
          `runs jusqu'à l'appareil. (DÉCISION PRODUIT — aucune convention ne le nomme.)`,
      },
    ];
  }
  const out: PlacementFinding[] = [];
  if (portent.length > 1) {
    out.push({
      code: "PRESENTATION_GENRE_RACINE_COMPTE_MULTIPLE",
      path: "screens[].purpose",
      message:
        `${portent.length} écrans portent « ${GENRE_RACINE_COMPTE} » ` +
        `(${portent.map((e) => e.id).join(", ")}) : l'espace compte est UN lieu, ` +
        `et deux racines en feraient deux libellés « Compte » dans la même barre.`,
    });
  }
  for (const e of portent) {
    if (!contexte.ecransDIdentite.includes(e.id)) {
      out.push({
        code: "PRESENTATION_GENRE_RACINE_COMPTE_DEPLACE",
        path: `screens[${e.id}].purpose`,
        message:
          `l'écran "${e.id}" porte « ${GENRE_RACINE_COMPTE} » sans porter ` +
          `l'identité du modèle (écrans d'identité : ` +
          `${contexte.ecransDIdentite.join(", ")}) : il serait intitulé ` +
          `« Compte » alors qu'il n'est pas le compte.`,
      });
    }
  }
  return out;
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
  // EP-147 ④ — LE RETRAIT DU CONSENTEMENT. Donner son accord sans pouvoir le
  // reprendre n'est pas un accord : « Apps must also provide the customer with
  // an easily accessible and understandable way to withdraw consent »
  // (App Store Review Guidelines 5.1.1(ii)). Celle-ci vit bien DANS le compte
  // — c'est un réglage durable, pas une demande ponctuelle.
  consent_withdraw: {
    fondement: "plateforme",
    source: "App Store Review Guidelines 5.1.1(ii)",
    exigeIdentite: false,
    exigePartage: true,
  },
} as const;

/**
 * EP-147 ① — CE QUE CETTE PASSE DÉFAIT, ET POURQUOI.
 *
 * EP-145 avait rangé le consentement au partage parmi les surfaces de
 * l'espace compte. EP-137 y range ces surfaces : dans le compte, jamais dans
 * la barre. **La lecture complète de la politique Google dit l'inverse pour
 * celle-ci** :
 *
 *   « an in-app disclosure … must be displayed in the normal usage of the app
 *   and NOT REQUIRE THE USER TO NAVIGATE INTO A MENU OR SETTINGS » ; le
 *   consentement exige « affirmative user action » ; et elle « cannot only be
 *   placed in a privacy policy or terms of service ».
 *   — Play, User Data (answer/10144311)
 *
 * La décision d'EP-145 reposait sur une lecture partielle — le hub Google, pas
 * ses pages. Une correction fondée sur la source prime, et les tests qui
 * assumaient l'ancienne place changent : c'est normal, pas un accident.
 *
 * Le genre `privacy_consent` demeure ; ce qui change est SA PLACE, jugée
 * désormais par `jugerDivulgationProeminente` et non plus par le juge de
 * l'espace compte.
 */
// EP-154 — `consent_withdraw` EN EST RETIRÉ. EP-147 l'avait mis dans les deux
// listes : exigé par `surfacesAttendues`, puis SAUTÉ par le juge de l'espace
// compte, donc jamais réclamé. Or EP-147 disait lui-même qu'il vit DANS le
// compte — reprendre son accord est un réglage durable. Seule la DIVULGATION
// doit se rencontrer hors d'un menu (Google, User Data).
export const GENRES_HORS_COMPTE = ["privacy_consent"] as const;

/**
 * EP-191 — LE GENRE DE LA RACINE, ET POURQUOI IL EST SEUL DE SON ESPÈCE.
 *
 * `SURFACES_DE_COMPTE` nomme ce qui VIT dans le compte, et sert à calculer
 * les écrans DUS à l'intérieur. La racine n'est pas due à l'intérieur
 * d'elle-même : l'y inscrire ferait réclamer un écran « compte » DANS le
 * compte. Elle est aussi la seule à avoir sa place dans `navigation.primary`,
 * là où les autres y sont justement INTERDITES.
 *
 * CE QU'ELLE RÉPARE. Le compte n'était nommé NULLE PART au document : il se
 * dérivait du modèle métier, hors de l'AIR, et se transmettait au compilateur
 * par une option. EP-190 ⑤ a mesuré que les NEUF appelants réels l'omettaient
 * — le libellé « Compte » n'a donc jamais été posé, quatre runs durant.
 * Un fait que le document ne porte pas est un fait que la chaîne perd.
 */
export const GENRE_RACINE_COMPTE = "account_home";

export type GenreEcran = keyof typeof SURFACES_DE_COMPTE;

/**
 * Les genres attendus d'un document, DÉRIVÉS : jamais une liste écrite.
 *
 * EP-145 — la condition n'est plus seulement l'identité : une surface peut
 * dépendre d'un PARTAGE. `avecPartage` par défaut à `false` pour que les
 * appels existants gardent exactement leur sens.
 */
export function surfacesAttendues(
  avecIdentite: boolean,
  avecPartage = false,
): GenreEcran[] {
  return (Object.keys(SURFACES_DE_COMPTE) as GenreEcran[]).filter((genre) => {
    const fiche: { exigeIdentite: boolean; exigePartage?: boolean } =
      SURFACES_DE_COMPTE[genre];
    if (fiche.exigePartage === true) return avecPartage;
    return avecIdentite || !fiche.exigeIdentite;
  });
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
  // EP-145 — le partage se DÉRIVE du document lui-même : le juge n'a rien à
  // recevoir de plus, et personne ne peut le lui cacher.
  const avecPartage = partagesDe(air).length > 0;
  const parGenre = new Map<string, string[]>();
  for (const ecran of air.screens) {
    if (ecran.purpose === undefined) continue;
    parGenre.set(ecran.purpose, [...(parGenre.get(ecran.purpose) ?? []), ecran.id]);
  }

  // EP-142 ① — LE FAIT ET LA SURFACE SONT LA MÊME CHOSE.
  // `compliance.accountDeletionRequired` portait l'obligation Apple 5.1.1(v)
  // sans rien produire, pendant que le genre `account_delete` l'exprimait de
  // son côté : deux expressions d'une seule exigence, qui s'ignoraient. Le
  // fait DÉCIDE désormais — et une incohérence entre les deux est refusée.
  const porteUneSuppression = air.screens.some((e) => e.purpose === "account_delete");
  if (avecIdentite && !air.compliance.accountDeletionRequired) {
    out.push({
      code: "PRESENTATION_SUPPRESSION_NON_DECLAREE",
      path: "compliance.accountDeletionRequired",
      message:
        `l'application a des comptes et ne déclare pas la suppression : ` +
        `« If your app supports account creation, you must also offer account ` +
        `deletion within the app » (OBLIGATION DE PLATEFORME — App Store Review ` +
        `Guidelines 5.1.1(v)).`,
    });
  }
  if (air.compliance.accountDeletionRequired && !porteUneSuppression) {
    out.push({
      code: "PRESENTATION_SUPPRESSION_DECLAREE_SANS_SURFACE",
      path: "screens",
      message:
        `le document déclare la suppression de compte obligatoire mais ne porte ` +
        `aucun écran de genre « account_delete » : un fait qui ne produit pas ` +
        `sa surface donne l'apparence de la conformité sans la produire.`,
    });
  }

  for (const genre of surfacesAttendues(avecIdentite, avecPartage)) {
    // EP-147 — la divulgation ne se range PAS ici : sa place est jugée
    // ailleurs, et l'exiger dans le compte serait exiger l'inverse de Google.
    if ((GENRES_HORS_COMPTE as readonly string[]).includes(genre)) continue;
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

/**
 * EP-141 ② — OÙ SE TIENNENT LES PRIMITIVES.
 *
 * EP-130 a posé qu'Accueil et Compte EXISTENT ; rien ne disait OÙ. Ils
 * occupent les EXTRÉMITÉS : l'accueil en PREMIÈRE position, le compte en
 * DERNIÈRE, les destinations du domaine entre les deux.
 *
 * PREMIER ET DERNIER, JAMAIS GAUCHE ET DROITE. En arabe ou en hébreu, la
 * barre s'inverse : une règle écrite en gauche-droite serait fausse le jour
 * où Deribfy générera une application dans ces langues. Le contrat porte
 * `order`, qui est un RANG — indépendant du sens de lecture.
 *
 * DÉCISION PRODUIT, étiquetée : aucune convention de plateforme ne fixe la
 * position de ces destinations. Material prescrit trois à cinq destinations
 * d'importance ÉGALE [S1] et n'en ordonne aucune. C'est un choix, assumé.
 *
 * CONTRAINT AVEC CE QUI EXISTE : le schéma porte déjà `order`, et
 * `AIR_NAV_ORDER_DUPLICATE` refuse déjà deux rangs identiques. Aucun champ
 * n'est ajouté — on lit les rangs déjà déclarés.
 *
 * ET SUR LES IDENTITÉS, PAS SUR LES ICÔNES : EP-130 a mesuré qu'une icône
 * « compte » peut être posée sur tout autre chose. On reconnaît donc
 * l'accueil à l'écran d'ENTRÉE et le compte à l'écran d'IDENTITÉ.
 */
export function jugerPositionPrimitives(
  air: Air,
  contexte: ContextePrimitives,
): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  const destinations = air.navigation.primary?.destinations ?? [];
  if (destinations.length === 0) return out;
  const ecranDeRoute = new Map(air.navigation.routes.map((r) => [r.id, r.screenId]));
  const rangs = destinations.map((d) => d.order);
  const premier = Math.min(...rangs);
  const dernier = Math.max(...rangs);

  for (const d of destinations) {
    const ecran = ecranDeRoute.get(d.routeId);
    if (ecran === undefined) continue;
    if (ecran === contexte.entryScreenId && d.order !== premier) {
      out.push({
        code: "PRESENTATION_ACCUEIL_HORS_PREMIERE_POSITION",
        path: `navigation.primary.destinations[${d.routeId}]`,
        message:
          `l'accueil est au rang ${String(d.order)} alors que la barre commence ` +
          `au rang ${String(premier)} : il occupe la PREMIÈRE position. ` +
          `(DÉCISION PRODUIT — aucune convention ne fixe cet ordre.)`,
      });
    }
    if (contexte.ecransDIdentite.includes(ecran) && d.order !== dernier) {
      out.push({
        code: "PRESENTATION_COMPTE_HORS_DERNIERE_POSITION",
        path: `navigation.primary.destinations[${d.routeId}]`,
        message:
          `l'espace compte est au rang ${String(d.order)} alors que la barre ` +
          `finit au rang ${String(dernier)} : il occupe la DERNIÈRE position. ` +
          `(DÉCISION PRODUIT — aucune convention ne fixe cet ordre.)`,
      });
    }
  }
  return out;
}

/**
 * EP-147 ① — LA DIVULGATION DOIT ÊTRE RENCONTRÉE, PAS CHERCHÉE.
 *
 * Elle est exigée dès qu'un partage existe, et sa place est contrainte : elle
 * doit être atteignable depuis l'usage normal — concrètement, depuis l'écran
 * d'ENTRÉE — et non seulement depuis un menu ou l'espace compte.
 */
export function jugerDivulgationProeminente(
  air: Air,
  contexte: { readonly avecPartage: boolean; readonly ecransDIdentite: readonly string[] },
): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  const ecran = air.screens.find((e) => e.purpose === "privacy_consent");
  if (!contexte.avecPartage) {
    if (ecran !== undefined) {
      out.push({
        code: "PRESENTATION_CONSENTEMENT_SANS_OBJET",
        path: `screens[${ecran.id}]`,
        message:
          `un écran de consentement au partage alors qu'aucune intégration ne ` +
          `partage de données : demander un accord pour rien.`,
      });
    }
    return out;
  }
  if (ecran === undefined) {
    out.push({
      code: "PRESENTATION_DIVULGATION_ABSENTE",
      path: "screens",
      message:
        `des données sont partagées avec des tiers et aucun écran ne le dit : ` +
        `« an in-app disclosure … must be displayed in the normal usage of the ` +
        `app » (OBLIGATION DE PLATEFORME — Google Play, User Data).`,
    });
    return out;
  }
  // Atteignable depuis l'ENTRÉE, directement : une divulgation qu'il faut
  // aller chercher dans un menu ne remplit pas l'exigence.
  const depuisEntree = air.actions.some(
    (a) =>
      a.effect.kind === "navigate" &&
      (a.effect as { screenId?: string }).screenId === ecran.id &&
      a.trigger.kind === "ui" &&
      air.screens
        .find((e) => e.id === air.navigation.entryScreenId)
        ?.blocks.some((b) => b.id === (a.trigger as { blockId?: string }).blockId) === true,
  );
  const depuisCompte = contexte.ecransDIdentite.length > 0;
  if (!depuisEntree) {
    out.push({
      code: "PRESENTATION_DIVULGATION_ENFOUIE",
      path: `screens[${ecran.id}]`,
      message:
        `la divulgation n'est atteignable que par ${depuisCompte ? "l'espace compte" : "un détour"} : ` +
        `elle « must NOT require the user to navigate into a menu or settings » ` +
        `(Google Play, User Data). Elle se rencontre dans l'usage normal, depuis ` +
        `l'écran d'entrée.`,
    });
  }
  return out;
}

/**
 * EP-157 ① — LE LIBELLÉ D'UNE PRIMITIVE EST IMPOSÉ.
 *
 * CONSTATÉ À L'APPAREIL : la barre portait « Accueil · Mon espace ·
 * Inscription ». Le générateur nomme librement, et il a appelé le compte
 * « Mon espace ». La primitive d'EP-130 était donc satisfaite par un écran
 * qui ne porte pas son nom — l'utilisateur ne trouve pas « Compte ».
 *
 * DÉCISION PRODUIT, étiquetée : aucune convention de plateforme n'impose ces
 * mots. Material prescrit des destinations d'importance égale et n'en nomme
 * aucune. C'est un choix, et il est ferme : deux mots, aucun synonyme, quel
 * que soit le domaine.
 *
 * LA LANGUE EST UNE AUTRE QUESTION — ces libellés sont français, et le jour
 * où le moteur générera en arabe ou en anglais il faudra une TABLE de
 * traduction des primitives, jamais une liberté du générateur. Consigné,
 * non traité ici.
 */
export const LIBELLES_PRIMITIFS: Readonly<Record<"accueil" | "compte", string>> = {
  accueil: "Accueil",
  compte: "Compte",
};

const texteLibelle = (label: unknown): string => {
  if (Array.isArray(label)) {
    const premier: unknown = label[0];
    if (typeof premier === "object" && premier !== null && "text" in premier) {
      const t: unknown = (premier as { text: unknown }).text;
      return typeof t === "string" ? t.trim() : "";
    }
  }
  return "";
};

export function jugerLibellesPrimitifs(
  air: Air,
  contexte: ContextePrimitives,
): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  const destinations = air.navigation.primary?.destinations ?? [];
  if (destinations.length === 0) return out;
  const ecranDeRoute = new Map(air.navigation.routes.map((r) => [r.id, r.screenId]));

  for (const d of destinations) {
    const ecran = ecranDeRoute.get(d.routeId);
    if (ecran === undefined) continue;
    const attendu =
      ecran === contexte.entryScreenId
        ? LIBELLES_PRIMITIFS.accueil
        : contexte.ecransDIdentite.includes(ecran)
          ? LIBELLES_PRIMITIFS.compte
          : undefined;
    if (attendu === undefined) continue;
    const porte = texteLibelle(d.label);
    if (porte !== attendu) {
      out.push({
        code: "PRESENTATION_LIBELLE_PRIMITIF_LIBRE",
        path: `navigation.primary.destinations[${d.routeId}]`,
        message:
          `la destination porte « ${porte} » là où la primitive impose ` +
          `« ${attendu} » : un utilisateur cherche ce mot-là, pas un synonyme. ` +
          `(DÉCISION PRODUIT — aucune convention ne nomme ces destinations.)`,
      });
    }
  }
  return out;
}

/**
 * EP-157 ③ — LE BAS DE L'ESPACE COMPTE A UN ORDRE.
 *
 * EP-137 a posé QUE ces surfaces existent ; rien ne disait OÙ ni dans quel
 * ordre. Référence donnée par le propriétaire, capture à l'appui (espace
 * compte d'une application de grande distribution) : aide, contact,
 * conditions, confidentialité, suppression — en liste simple, APRÈS le
 * contenu utile.
 *
 * DÉCISION PRODUIT, étiquetée : c'est une référence d'usage, pas une règle
 * de plateforme. Ce qu'elle apporte est un ordre STABLE — l'utilisateur qui
 * a trouvé « Nous contacter » une fois le retrouve au même endroit.
 */
export const ORDRE_BAS_DE_COMPTE: readonly GenreEcran[] = [
  "help",
  "contact",
  "terms",
  "privacy_policy",
  "account_delete",
];

/**
 * EP-188 ⑤ — L'ESPACE COMPTE D'UN ANONYME NE POSE PAS DE FORMULAIRE.
 *
 * DEMANDE DE YOUSSOUF DEPUIS EP-157, TRANSMISE EN EP-184 (règle 17ter) ET
 * NON SUIVIE : le run EP-186 a produit `header + form + spacer + form + …` —
 * DEUX formulaires posés d'emblée sur l'écran d'identification.
 *
 * LA RAISON N'EST PAS ESTHÉTIQUE : un champ de mot de passe offert à
 * quelqu'un qui n'a pas encore choisi entre SE CONNECTER et CRÉER UN COMPTE
 * lui demande de deviner ce qu'il est en train de faire. Deux boutons, et la
 * fiche s'ouvre APRÈS le choix.
 *
 * TRANSMIS PUIS JUGÉ, dans cet ordre — c'est la règle d'EP-184 : on ne refuse
 * pas ce qu'on n'a jamais demandé. La transmission a eu lieu, elle n'a pas
 * suffi ; le juge vient maintenant.
 *
 * PORTÉE STRICTE : SEULS les écrans d'identité, et SEULEMENT quand ils
 * portent un formulaire. Un écran de compte CONNECTÉ a le droit d'en porter —
 * modifier ses informations est un formulaire légitime. Le contexte ne dit
 * pas l'état de session : ce juge ne parle donc que de l'écran désigné comme
 * point d'entrée de l'identité.
 */
export function jugerEntreeDeCompte(
  air: Air,
  contexte: ContextePrimitives,
): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  for (const ecran of air.screens) {
    if (!contexte.ecransDIdentite.includes(ecran.id)) continue;
    const formulaires = ecran.blocks.filter((b) => b.blockType === "form");
    if (formulaires.length === 0) continue;
    out.push({
      code: "PRESENTATION_COMPTE_FORMULAIRE_DEMBLEE",
      path: `screens[${ecran.id}]`,
      message:
        `l'écran d'entrée du compte porte ${String(formulaires.length)} formulaire(s) ` +
        `posé(s) d'emblée. Un visiteur qui n'a pas encore choisi entre SE ` +
        `CONNECTER et CRÉER UN COMPTE ne sait pas ce qu'il remplit. Pose DEUX ` +
        `BOUTONS et rien d'autre ; chacun OUVRE sa fiche par une action ` +
        `\`navigate\`. Les surfaces obligatoires restent tout en bas.`,
    });
  }
  return out;
}

export function jugerBasDeCompte(
  air: Air,
  contexte: ContextePrimitives,
): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  const compte = air.screens.find((e) => contexte.ecransDIdentite.includes(e.id));
  if (compte === undefined) return out;

  // Les boutons du compte, dans l'ordre où ils sont posés, et ce qu'ils ouvrent.
  const cibleDuBouton = new Map<string, string>();
  for (const a of air.actions) {
    if (a.effect.kind !== "navigate" || a.trigger.kind !== "ui") continue;
    const cible = (a.effect as { screenId?: string }).screenId;
    const bloc = (a.trigger as { blockId?: string }).blockId;
    if (cible !== undefined && bloc !== undefined) cibleDuBouton.set(bloc, cible);
  }
  const genreDEcran = new Map(
    air.screens.filter((e) => e.purpose !== undefined).map((e) => [e.id, e.purpose as GenreEcran]),
  );

  const rangs: { genre: GenreEcran; index: number }[] = [];
  compte.blocks.forEach((b, index) => {
    const cible = cibleDuBouton.get(b.id);
    const genre = cible === undefined ? undefined : genreDEcran.get(cible);
    if (genre !== undefined && ORDRE_BAS_DE_COMPTE.includes(genre)) rangs.push({ genre, index });
  });
  if (rangs.length < 2) return out;

  const attendu = ORDRE_BAS_DE_COMPTE.filter((g) => rangs.some((r) => r.genre === g));
  const obtenu = rangs.map((r) => r.genre);
  if (obtenu.join("|") !== attendu.join("|")) {
    out.push({
      code: "PRESENTATION_BAS_DE_COMPTE_DESORDONNE",
      path: `screens[${compte.id}]`,
      message:
        `les renvois du bas de compte sont posés dans l'ordre ${obtenu.join(" → ")} ` +
        `alors que l'ordre est ${attendu.join(" → ")} : un utilisateur qui a trouvé ` +
        `un lien une fois le retrouve au même endroit. (DÉCISION PRODUIT.)`,
    });
  }

  // Ils viennent APRÈS le contenu utile : aucun bloc non-renvoi ne doit les suivre.
  const premier = rangs[0]!.index;
  const apres = compte.blocks.slice(premier).filter((b, i) => {
    if (i === 0) return false;
    const cible = cibleDuBouton.get(b.id);
    const genre = cible === undefined ? undefined : genreDEcran.get(cible);
    return genre === undefined || !ORDRE_BAS_DE_COMPTE.includes(genre);
  });
  if (apres.length > 0) {
    out.push({
      code: "PRESENTATION_BAS_DE_COMPTE_INTERROMPU",
      path: `screens[${compte.id}]`,
      message:
        `${String(apres.length)} bloc(s) suivent les renvois du bas de compte : ` +
        `ces renvois ferment l'écran, ils ne s'intercalent pas dans le contenu utile.`,
    });
  }
  return out;
}

/**
 * EP-158 ① — UN ÉCRAN EMPILÉ GARDE SON RETOUR.
 *
 * CONSTATÉ À L'APPAREIL : on entre dans un écran et l'on n'en sort plus
 * autrement qu'en changeant d'onglet. Aucun juge ne le voyait.
 *
 * QUI DÉCIDE, MESURÉ : ni l'AppShell, ni la pile native. La pile FOURNIT le
 * retour — c'est un mécanisme de plateforme, et O.3 a raison de n'attribuer
 * cette autorité à personne. Mais le DOCUMENT peut le SUPPRIMER :
 * `showsScreenTitle: false` masque l'en-tête native (`headerShown: false`),
 * et le retour part avec elle. Le défaut n'est donc pas une absence, c'est
 * une suppression.
 *
 * LE DISCRIMINANT EST STRUCTUREL, pas une préférence : une RACINE de
 * destination n'a pas de retour — il n'y a rien derrière elle, et la pile ne
 * lui en donne pas. Un écran ATTEINT PAR EMPILEMENT en a un, et masquer son
 * en-tête le lui retire.
 *
 * LE CAS SYMÉTRIQUE N'EXISTE PAS : aucune propriété ne permet d'AJOUTER un
 * retour à une racine. Le document ne peut que supprimer, jamais poser —
 * donc « une racine qui porte un retour » n'est pas exprimable, et c'est
 * dit plutôt que jugé pour rien.
 */
export function jugerRetourAtteignable(air: Air): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  const ecranDeRoute = new Map(air.navigation.routes.map((r) => [r.id, r.screenId]));
  const racines = new Set(
    (air.navigation.primary?.destinations ?? [])
      .map((d) => ecranDeRoute.get(d.routeId))
      .filter((e): e is string => e !== undefined),
  );
  racines.add(air.navigation.entryScreenId);

  const empiles = new Set(
    air.actions
      .filter((a) => a.effect.kind === "navigate")
      .map((a) => (a.effect as { screenId?: string }).screenId)
      .filter((e): e is string => e !== undefined),
  );

  for (const ecran of air.screens) {
    if (enteteNativeRendue(ecran)) continue;
    if (racines.has(ecran.id)) continue;
    if (!empiles.has(ecran.id)) continue;
    out.push({
      code: "PRESENTATION_ECRAN_SANS_RETOUR",
      path: `screens[${ecran.id}]`,
      message:
        `cet écran est atteint par empilement et masque son en-tête : le retour ` +
        `que la plateforme fournit disparaît avec elle, et l'écran devient un ` +
        `cul-de-sac. Seules les destinations de la barre peuvent masquer leur ` +
        `en-tête — il n'y a rien derrière elles.`,
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
    ...jugerRetourAtteignable(air),
    ...jugerPositionRecherche(air, zoneDuBloc),
    ...jugerBarreInferieure(air),
    ...jugerFicheUnique(air),
    // EP-195 — LE CONTEXTE SE DÉRIVE DU DOCUMENT QUAND NUL NE LE FOURNIT.
    //
    // TROISIÈME FOIS QUE LE MÊME MOTIF FRAPPE. Six juges se taisaient dès que
    // l'appelant omettait `contexte` — et la barrière de matérialisation
    // (EP-194 ②) l'omettait, faute de prescriptif. MESURÉ sur le document du
    // run EP-193 : `jugerEntreeDeCompte` rendait ZÉRO sans contexte, et nommait
    // exactement le défaut vu par Youssouf dès qu'on le lui donnait — deux
    // formulaires posés d'emblée sur l'écran d'entrée du compte.
    //
    // CE QUI REND LA DÉRIVATION POSSIBLE AUJOURD'HUI : EP-191. L'entrée vit
    // dans `navigation.entryScreenId` et le compte se nomme désormais par son
    // genre `account_home` — les deux AU DOCUMENT. Il n'y a plus rien à
    // transmettre, donc plus rien à oublier.
    ...(() => {
      const ctx = contexte ?? contexteDeDocument(air);
      return [
        ...jugerPrimitivesDeNavigation(air, ctx),
        ...jugerGenreRacineCompte(air, ctx),
        ...jugerPositionPrimitives(air, ctx),
        ...jugerLibellesPrimitifs(air, ctx),
        ...jugerBasDeCompte(air, ctx),
        ...jugerEntreeDeCompte(air, ctx),
      ];
    })(),
  ];
}

/**
 * EP-195 — CE QUE LE DOCUMENT DIT DE LUI-MÊME, SANS QU'ON LE LUI DEMANDE.
 *
 * Un contexte DÉRIVÉ vaut mieux qu'un contexte transmis : il ne peut pas être
 * oublié. Sans `account_home` au document, la liste est vide et les juges du
 * compte se taisent — ce qui est le cas JUSTE : une application sans espace
 * compte n'en gagne pas un de force.
 */
export function contexteDeDocument(air: Air): ContextePrimitives {
  return {
    entryScreenId: air.navigation.entryScreenId,
    ecransDIdentite: (air.screens ?? [])
      .filter((e) => e.purpose === GENRE_RACINE_COMPTE)
      .map((e) => e.id),
  };
}

/**
 * EP-195 — UNE FICHE, UN SEUL BUT.
 *
 * RÈGLE DE YOUSSOUF, ÉNONCÉE APRÈS INSPECTION DE L'APPAREIL : « quand on clique
 * sur se connecter, il faut juste afficher UNE SEULE fiche ». MESURÉ sur le
 * document du run : l'écran « Se connecter » portait DEUX formulaires — « J'ai
 * déjà un compte » ET « Créer un compte annonceur », l'un sous l'autre.
 *
 * POURQUOI CETTE RÈGLE PLUTÔT QUE CELLE DU CONTEXTE. `jugerEntreeDeCompte`
 * voyait déjà le défaut, mais seulement sur les écrans qu'un contexte lui
 * DÉSIGNAIT — et ce contexte manquait. Celle-ci ne dépend de RIEN : deux
 * formulaires sur un même écran demandent à l'utilisateur de deviner lequel
 * le concerne, quel que soit l'écran et quel que soit le domaine.
 *
 * Un formulaire par écran, et le choix se fait AVANT par un bouton.
 */
export function jugerFicheUnique(air: Air): readonly PlacementFinding[] {
  const out: PlacementFinding[] = [];
  for (const ecran of air.screens ?? []) {
    const formulaires = (ecran.blocks ?? []).filter((b) => b.blockType === "form");
    if (formulaires.length <= 1) continue;
    out.push({
      code: "PRESENTATION_FICHE_MULTIPLE",
      path: `screens[${ecran.id}]`,
      message:
        `l'écran "${ecran.id}" porte ${String(formulaires.length)} formulaires ` +
        `(${formulaires.map((b) => b.id).join(", ")}) : l'utilisateur doit deviner ` +
        `lequel le concerne. UNE FICHE, UN SEUL BUT — le choix se fait AVANT, ` +
        `par un bouton qui OUVRE la fiche voulue. (DÉCISION PRODUIT.)`,
    });
  }
  return out;
}
