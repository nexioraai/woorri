export {
  AIR_SCHEMA_VERSION,
  projectAirSchema,
  fieldTypeSchema,
  localeSchema,
  localizedTextSchema,
  flatConfigSchema,
  semverSchema,
  sha256Schema,
} from "./air.ts";
export type { ProjectAir, AirScreen, AirEntity, AirAction } from "./air.ts";

export { LOCK_SCHEMA_VERSION, projectLockSchema } from "./lock.ts";
export type { ProjectLock } from "./lock.ts";

export {
  DEPLOYMENT_STATE_SCHEMA_VERSION,
  deploymentStateSchema,
} from "./deployment-state.ts";
export type { DeploymentState } from "./deployment-state.ts";

export { canonicalJson, sha256Hex, hashCanonical } from "./canonical.ts";

export { renderAirToText } from "./render-text.ts";

export {
  validateAir,
  validateAirIntentRequirement,
  assertValidAir,
  AirSemanticError,
  // EP-219 : les propriétés de bloc qui mettent du texte sous les yeux de
  // quelqu'un. Exportées pour qu'un cliquet les compare au registre des
  // blocs — `air-schema` ne dépend pas de `blocks`, et une liste recopiée
  // sans gardien dérive. Celle-ci a dérivé trois fois en une journée.
  PORTEURS_DE_TEXTE_SINGULIERS,
  PORTEURS_DE_TEXTE_EN_LISTE,
} from "./validate.ts";
export type { AirDiagnostic } from "./validate.ts";

export { AIR_MIGRATIONS, AirMigrationError, applyAirMigrations,
  migrateAirDocument } from "./migrations.ts";
export type { AirMigration } from "./migrations.ts";

export {
  projectAirJsonSchema,
  projectLockJsonSchema,
  deploymentStateJsonSchema,
} from "./json-schema.ts";

export * from "./ids.ts";

// Les politiques d'acces se DERIVENT du contrat (2026-10-10) — une seule
// source, deux consommateurs : le juge (validate) et l'emetteur (compilateur).
export * from "./derive-rls.ts";
