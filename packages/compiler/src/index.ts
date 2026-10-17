// @deribfy/compiler — Compilateur déterministe v1 (Phase 4, D-026).
// 4.1 : release train v1 + résolveur AIR→lock. Étages d'émission : 4.2+.
export { RELEASE_TRAIN_V1 } from "./release-train.ts";
export type { ReleaseTrain } from "./release-train.ts";
export { LockResolutionError, normalizeAir, resolveLock } from "./resolve-lock.ts";
export type { LockDiagnostic } from "./resolve-lock.ts";
export { EmitError, emitProject, WRAPPER_BY_BLOCK_TYPE } from "./emit-project.ts";
export {
  planifierComposition,
  validerPlan,
  type CompositionPlan,
  type DiagnosticPlan,
  type EcranPlan,
  type RoleEcran,
} from "./plan-composition.ts";
export {
  emitAppJson,
  emitPermissionsManifest,
  previewIdentity,
} from "./emit-manifests.ts";
export type { EmitOptions, EmittedProject, SlotSource } from "./emit-project.ts";
export { compileProject } from "./compile-project.ts";
// Le SERVEUR que le document décrit (1.34.0) — voir `compile-backend.ts`.
export { compileBackend } from "./compile-backend.ts";
export { enveloppeSpring, type EnveloppeBackend } from "./emit-spring.ts";
export type { CompiledProject } from "./compile-project.ts";
export {
  ArtifactStoreError,
  LocalArtifactStore,
  storeCompiledProject,
} from "./artifact-store.ts";
export type { ArtifactStore, StoredProject } from "./artifact-store.ts";
export { EMBEDDED_TEMPLATE } from "./embedded-template.generated.ts";
export { buildDemoFixtures } from "./demo-fixtures.ts";
export {
  DERIVED_KEYS,
  applyThemeOverrides,
  emitThemeModule,
  hasThemeOverrides,
  isOverridableKey,
  policesRequises,
} from "./emit-theme.ts";
export type { ThemeOverrideProblem } from "./emit-theme.ts";
// ── LA CONFORMITÉ AUX MAGASINS, EXPORTÉE PARCE QU'ELLE DOIT AGIR.
//
// Ce module a d'abord été écrit comme une LISTE, et la mesure du 2026-10-16
// a été nette : personne ne l'importait. Un référentiel que rien ne lit ne
// distingue rien — il documente. `verifier` rend le constat par règle
// APPLICABLE À LA CIBLE, et c'est ce qui fait la différence entre « Deribfy
// sait » et « Deribfy a écrit qu'il savait ».
export { AUTORITES, REGLES, reglesPour, reglesOuvertes, verifier } from "./conformite-magasins.ts";
export type { Autorite, Cible, Constat, RegleConformite } from "./conformite-magasins.ts";
export type { DemoInstance } from "./demo-fixtures.ts";
export { EMBEDDED_SOURCES, buildEmbeddedAssets, rewriteEmbeddedSource } from "./embed-lib.ts";
export {
  EMBEDDED_ASSETS,
  EMBEDDED_ASSETS_FINGERPRINT,
} from "./embedded-assets.generated.ts";

export { compileWeb } from "./compile-web.ts";
