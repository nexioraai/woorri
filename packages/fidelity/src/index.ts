export { preuveDeMatiere, principesDeComposition, imagesDeVitrine,
  catalogueFourni, deviseCoherente, vitrineAlignee,
  nombresVraisemblables, rechercheVisuelleComplete, type DiagnosticImages, type DiagnosticRecherche, type DiagnosticMatiere, type DiagnosticComposition } from "./matiere.ts";
export {
  evaluatePromises,
  type PromiseCoverage,
  type PromiseReport,
  type PromiseState,
  type PromiseVerdict,
  type TargetKind,
} from "./promises.ts";
export {
  evaluateIntentCoverage,
  refuteUnexpressibleReason,
  capacitesMisesEnJeu,
  tracesManquantes,
  type IntentReport,
  type NeedState,
  type NeedVerdict,
  type RefutationMotif,
} from "./intent.ts";
