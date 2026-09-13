// Ombre de types du module des JUGES D'ACCEPTATION (EP-073/EP-102).
export interface DiagnosticAcceptation {
  code: string;
  path: string;
  message: string;
}
export interface ResultatValidation {
  air: Record<string, unknown> | null;
  diagnostics: DiagnosticAcceptation[];
}
export function validateLocal(document: unknown, prescriptif?: unknown): ResultatValidation;
export function jugerAcceptation(
  air: Record<string, unknown> | null,
  prescriptif: unknown,
  intention: unknown,
): DiagnosticAcceptation[];
export function perimetreDeJugement(
  air: Record<string, unknown> | null,
  prescriptif: unknown,
): string[];
export function sontComparables(perimetreA: string[], perimetreB: string[]): boolean;
export function elargit(perimetreAvant: string[], perimetreApres: string[]): boolean;
export function consequencesDeReclassement(air: Record<string, unknown>, screenId: string): string;
export function jugerContenuDEcran(air: Record<string, unknown> | null, prescriptif: unknown): DiagnosticAcceptation[];
/** EP-167 — `prescriptif` OPTIONNEL : sans lui le juge reste intégralement
 *  strict (l'ignorance ne relâche rien) ; avec lui, il n'examine que les
 *  navigations qui suivent un arc PORTEUR du plan. */
export function jugerNavigationsDeBouton(air: Record<string, unknown> | null, prescriptif?: unknown): DiagnosticAcceptation[];

/** EP-169 ① — juges qui ne dépendent QUE de `navigation` : exécutables dès le
 *  segment `base`, avant tout écran. */
export function jugerBase(air: Record<string, unknown> | null, contexte?: { entryScreenId?: string; ecransDIdentite?: readonly string[] }): DiagnosticAcceptation[];
/** EP-169 ② — une capacité sous contrainte de commerce exige que le modèle
 *  exerce le geste `payer`. Sans `prescriptif`, le juge se tait. */
export function jugerCapacitesContreIntention(air: Record<string, unknown> | null, prescriptif?: unknown): DiagnosticAcceptation[];
