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
export function validateLocal(document: unknown): ResultatValidation;
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
export function jugerNavigationsDeBouton(air: Record<string, unknown> | null): DiagnosticAcceptation[];
