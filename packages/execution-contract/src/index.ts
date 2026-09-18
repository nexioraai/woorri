// @deribfy/execution-contract — Contrat d'exécution (Étapes 0-1).
//
// Referme l'UNIQUE chemin fail-open du moteur. L'AIR décrit ce que l'app doit
// être (face DESCRIPTION, déjà construite) ; l'enveloppe décrit ce que le
// moteur sait faire (face CAPACITÉ) ; la faisabilité les réconcilie (face
// RÉCONCILIATION). Un effet non exécutable n'est plus ignoré : il est NOMMÉ,
// IMPUTÉ à un propriétaire, et SCELLÉ dans un rapport hashé.
export {
  EXECUTION_ENVELOPE_V1,
  EXECUTION_ENVELOPE_VERSION,
} from "./envelope.ts";
export type {
  DataOperation,
  EffectKind,
  ExecutionEnvelope,
  TriggerKind,
} from "./envelope.ts";
export {
  SCREEN_TRAITS,
  controls,
  dataBindings,
  detailScreens,
  formulairesSansAction,
  rawReferences,
  reachableScreens,
  screenTraits,
  navigationsDeLigne,
  collectionsSurFiche,
} from "./graph.ts";
export type {
  NavigationDeLigneFinding,
  CollectionSurFicheFinding,
  ControlFinding,
  DataBindingFinding,
  DetailScreenFinding,
  FormulaireSansActionFinding,
  RawReferenceFinding,
  ScreenTrait,
  ScreenTraitFinding,
} from "./graph.ts";
export { jugerVivacite, jugerAttestations } from "./vivacite.ts";
export {
  BARRE_INFERIEURE,
  BARRE_SUPERIEURE,
  DESTINATIONS_MAX,
  DESTINATIONS_MIN,
  EMPLACEMENT_PAR_BLOC,
  ROLES_DESTINATION_OBLIGATOIRES,
  jugerBarreInferieure,
  jugerExclusivite,
  jugerPlacement,
  jugerPositionRecherche,
  jugerEspaceCompte,
  GENRES_HORS_COMPTE,
  jugerDivulgationProeminente,
  LIBELLES_PRIMITIFS,
  ORDRE_BAS_DE_COMPTE,
  jugerBasDeCompte,
  jugerEntreeDeCompte,
  jugerLibellesPrimitifs,
  jugerRetourAtteignable,
  jugerPositionPrimitives,
  GENRE_RACINE_COMPTE,
  contexteDeDocument,
  jugerCompteSelonSession,
  jugerFicheDIdentite,
  jugerFicheUnique,
  jugerGenreRacineCompte,
  jugerPrimitivesDeNavigation,
  surfacesAttendues,
  SURFACES_DE_COMPTE,
} from "./presentation.ts";
export type { ContextePrimitives, GenreEcran, PlacementFinding } from "./presentation.ts";
export type { ArcPrescrit, OptionsVivacite, VivaciteFinding } from "./vivacite.ts";
export { areteExecutable } from "./graph.ts";
export type { AreteExecutable } from "./graph.ts";
export {
  FeasibilityRefusedError,
  analyzeFeasibility,
  assertFeasible,
} from "./feasibility.ts";
export type {
  FeasibilityGap,
  FeasibilityMetrics,
  FeasibilityMode,
  FeasibilityReport,
  FeasibilityVerdict,
  GapOwner,
} from "./feasibility.ts";
export { PARTAGE_BACKEND, PARTAGE_PAR_CAPACITE, obligationsDuProprietaire, partagesDe, rendrePublicationMd } from "./obligations-proprietaire.ts";
export type { FournisseurResolu, ObligationProprietaire, Partage } from "./obligations-proprietaire.ts";
