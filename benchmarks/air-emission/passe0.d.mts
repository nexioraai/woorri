// Types de l'instrument P0 (intégration minimale) — ombre du .mjs.
import type { DiagnosticModele, ModeleMetier } from "./modele-metier.mjs";
export const PROMPT_P0: string;
export function grammaireP0(): unknown;
export function construireRequeteP0(brief: string): {
  system: string;
  user: string;
  grammaire: unknown;
};
export function critereDryRunKaviva(modele: ModeleMetier): {
  pass: boolean;
  trouves: { prestation: string[]; ressourceTemporelle: string[]; engagement: string[] };
};
export function jugerSortieP0(
  texteBrut: string,
  brief: string,
  meta?: { tronquee?: boolean },
): {
  ok: boolean;
  modele?: ModeleMetier;
  diagnostics: DiagnosticModele[];
  observation?: {
    tailleInventaire: number;
    partInventaireEnNonRetenus: number;
    distributionRaisons: Record<string, number>;
  };
  critereKaviva?: { pass: boolean; trouves: Record<string, string[]> };
};
export function cheminsMinItems(): string[];
