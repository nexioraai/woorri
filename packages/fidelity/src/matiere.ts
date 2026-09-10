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
