// Types du module d'échelle de dégradation — le harnais est en JS, ses
// consommateurs (tests) sont en TS. Déclarer ici évite qu'un `any` implicite
// prive les tests de toute vérification.
export type NoeudSchema = unknown;
export interface NiveauSchema {
  readonly name: string;
  readonly schema: NoeudSchema;
}
export function stripKeys(node: NoeudSchema, keys: readonly string[]): NoeudSchema;
export function oneOfToAnyOf(node: NoeudSchema): NoeudSchema;
export function clampMinItems(node: NoeudSchema): NoeudSchema;
/** EP-151 — les contraintes du dialecte sont EXIGÉES : l'échelle ne devine
 *  plus ce qui est incompatible, elle le reçoit de qui le sait. */
export interface ContraintesDialecte {
  minItemsMax?: number;
  bornesNumeriquesEntiers?: boolean;
  maxItemsSupporte?: boolean;
  /** Septième écart (2026-10-14) : le service refuse une définition qui se
   *  cite elle-même — « Circular reference detected in schema definition ». */
  referencesCirculairesSupportees?: boolean;
}
export function incompatibilitesDe(
  contraintes: ContraintesDialecte,
): { clefs: string[]; clampMinItems: boolean; deroulerCycles: boolean };
/** Les définitions qui se citent elles-mêmes. Vide = rien à dérouler. */
export function definitionsCycliques(node: NoeudSchema): string[];
/** Remplace le renvoi par le corps, `profondeur` fois, puis coupe les
 *  branches récursives du dernier niveau. Lève si la récursion ne peut pas
 *  être close sans produire un schéma que rien ne satisfait. */
export function deroulerCycles(node: NoeudSchema, profondeur: number): NoeudSchema;
export function makeLevels(
  jsonSchema: NoeudSchema,
  contraintes: ContraintesDialecte,
): NiveauSchema[];
