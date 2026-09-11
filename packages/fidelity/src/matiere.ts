// PREUVE DE MATIÈRE — un document qui VEND doit montrer sa marchandise.
//
// ÉCHEC MESURÉ (dougplace, 2026-09-10, 6,81 $) : une marketplace émise avec
// UNE SEULE entité — le profil — et 15 écrans creux autour. « Catalogue »
// listait des PROFILS D'UTILISATEURS en guise de produits, et chaque besoin
// de l'intention se déclarait « satisfait » en pointant ces blocs
// vivants-mais-faux : les validateurs voyaient des blocs rendus, ils ne
// jugeaient pas QUEL objet ils rendaient.
//
// Une règle de prompt ne suffit pas : le modèle a déjà ignoré des règles.
// Ce verrou est MÉCANIQUE et fail-closed : quoi que le modèle écrive, un
// document de commerce sans matière est REFUSÉ à la campagne.
//
// COUCHE : acceptation de GÉNÉRATION uniquement — jamais `validateAir`. Le
// corpus gelé v2 précède cette exigence ; le re-juger serait l'erreur
// d'étage déjà commise une fois (D-105) et défaite.
import type { ProjectAir } from "@deribfy/air-schema";

export interface DiagnosticMatiere {
  code: "CAMPAGNE_MATIERE_INSUFFISANTE";
  path: string;
  message: string;
}

/**
 * Un document dont `commerceClass` n'est pas "none" VEND quelque chose. Il
 * doit alors posséder au moins UNE entité de marchandise :
 *   · distincte du profil d'authentification (profileEntityId) ;
 *   · alimentée (un dataset à rowCount > 0) ;
 *   · AFFICHÉE (un bloc list ou detail_header la rend).
 * Sans elle, l'app promet un commerce et ne montre rien à vendre.
 */
export interface DiagnosticComposition {
  code:
    | "CAMPAGNE_SECTION_SANS_TITRE"
    | "CAMPAGNE_RECHERCHE_NON_STRUCTURELLE"
    | "CAMPAGNE_ETATS_REMOTE_MANQUANTS";
  path: string;
  message: string;
}

/**
 * TROIS PRINCIPES DE COMPOSITION — mécaniques, aveugles au domaine.
 * (Mission composition II, 2026-09-10. L'ancien verrou « accueil
 * fractionné » est retiré : le moteur rend désormais toute liste d'un écran
 * composé en APERÇU BORNÉ — le couloir est devenu IRREPRÉSENTABLE, un verrou
 * qui interdit l'impossible ne verrouille rien.)
 *
 * ① UNE SECTION SE NOMME — une liste qui cohabite avec d'autres blocs porte
 *   un `title` : une section sans rôle annoncé est un bloc posé là.
 * ② LA RECHERCHE S'OFFRE À L'ENTRÉE — si un écran EXÉCUTE une recherche
 *   (searchFieldId) et que la première destination principale est un AUTRE
 *   écran, celle-ci doit l'OFFRIR (search_entry). Marketplace, réservation,
 *   éducation : même principe partout où la recherche existe.
 * ③ LE DISTANT DÉCLARE SES ÉTATS — une liste branchée sur un dataset
 *   `remote` porte loadingTitle ET errorTitle : le réseau échoue, l'écran
 *   doit savoir le dire.
 */
export function principesDeComposition(air: ProjectAir): DiagnosticComposition[] {
  const out: DiagnosticComposition[] = [];
  const prop = (b: { props?: readonly { key: string; value: unknown }[] }, k: string) =>
    (b.props ?? []).find((p) => p.key === k)?.value;

  // ① sections nommées
  air.screens.forEach((s, i) => {
    if (s.blocks.length < 2) return;
    s.blocks.forEach((b, j) => {
      if (b.blockType === "list" && typeof prop(b, "title") !== "string") {
        out.push({
          code: "CAMPAGNE_SECTION_SANS_TITRE",
          path: `screens[${String(i)}].blocks[${String(j)}]`,
          message: `écran "${s.id}" : la liste "${b.id}" cohabite avec d'autres blocs sans titre de section`,
        });
      }
    });
  });

  // ② recherche structurelle
  const ecransRecherche = new Set(
    air.screens
      .filter((s) => s.blocks.some((b) => b.blockType === "list" && prop(b, "searchFieldId") !== undefined))
      .map((s) => s.id),
  );
  const premiere = air.navigation.primary?.destinations
    .slice()
    .sort((a, b) => a.order - b.order)[0];
  const routePremiere = air.navigation.routes.find((r) => r.id === premiere?.routeId);
  const accueil = air.screens.find((s) => s.id === routePremiere?.screenId);
  if (
    accueil !== undefined &&
    ecransRecherche.size > 0 &&
    !ecransRecherche.has(accueil.id) &&
    !accueil.blocks.some((b) => b.blockType === "search_entry")
  ) {
    out.push({
      code: "CAMPAGNE_RECHERCHE_NON_STRUCTURELLE",
      path: `screens[${air.screens.indexOf(accueil)}]`,
      message:
        `l'app exécute une recherche (${[...ecransRecherche].join(", ")}) mais l'accueil ` +
        `"${accueil.id}" ne l'OFFRE pas (aucun search_entry)`,
    });
  }

  // ③ états du distant
  const remotes = new Set(
    air.datasets.filter((d) => d.sourceKind === "remote").map((d) => d.entityId),
  );
  air.screens.forEach((s, i) => {
    s.blocks.forEach((b, j) => {
      if (
        b.blockType === "list" &&
        b.entityId !== undefined &&
        remotes.has(b.entityId) &&
        (prop(b, "loadingTitle") === undefined || prop(b, "errorTitle") === undefined)
      ) {
        out.push({
          code: "CAMPAGNE_ETATS_REMOTE_MANQUANTS",
          path: `screens[${String(i)}].blocks[${String(j)}]`,
          message: `liste "${b.id}" sur source distante sans loadingTitle/errorTitle`,
        });
      }
    });
  });
  return out;
}

export function preuveDeMatiere(air: ProjectAir): DiagnosticMatiere[] {
  if (air.compliance.commerceClass === "none") return [];
  const profils = new Set(
    air.integrations
      .filter((i) => i.capability === "auth")
      .flatMap((i) => (i.config ?? []))
      .filter((c) => c.key === "profileEntityId" && typeof c.value === "string")
      .map((c) => c.value as string),
  );
  const alimentees = new Set(
    air.datasets.filter((d) => d.rowCount > 0).map((d) => d.entityId),
  );
  const affichees = new Set(
    air.screens.flatMap((s) =>
      s.blocks
        .filter((b) => b.blockType === "list" || b.blockType === "detail_header")
        .flatMap((b) => (b.entityId === undefined ? [] : [b.entityId])),
    ),
  );
  const marchandises = air.entities.filter(
    (e) => !profils.has(e.id) && alimentees.has(e.id) && affichees.has(e.id),
  );
  if (marchandises.length > 0) return [];
  return [
    {
      code: "CAMPAGNE_MATIERE_INSUFFISANTE",
      path: "entities",
      message:
        `commerceClass "${air.compliance.commerceClass}" sans marchandise : aucune entité ` +
        "hors profil qui soit à la fois alimentée (dataset > 0) et affichée (list/detail_header). " +
        "Un document de commerce doit montrer ce qu'il vend.",
    },
  ];
}
