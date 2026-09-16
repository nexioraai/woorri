// EP-187 — les intentions portent DEUX textes : la demande (métier, lue par
// P0) et les préférences de présentation (lues par l'émission seule).
export interface Intention {
  readonly slug: string;
  /** Classe de commerce ATTENDUE — omise quand P0 doit la lire seul (EP-044). */
  readonly commerce?: string;
  /** Le brief : ce que l'application FAIT. Va à P0. */
  readonly text: string;
  /** Ce que le propriétaire veut VOIR. Ne va JAMAIS à P0 (EP-187). */
  readonly preferences?: string;
}
export const INTENTIONS: readonly Intention[];
