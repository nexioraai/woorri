// EP-136 — types de la projection interrogative et de l'addendum.
export interface DiagnosticModele {
  code: string;
  path: string;
  message: string;
}

export interface QuestionProjetee {
  /** Le diagnostic dont cette question est la forme interrogative. */
  code: string;
  /** Le fait du modèle qui attend la réponse. */
  destination: string;
  /** Texte compréhensible sans connaître le moteur. */
  texte: string;
}

export type Elicitation =
  | { statut: "aucune_question"; questions: readonly [] }
  | { statut: "questions"; questions: readonly QuestionProjetee[] }
  /** R-5 — sans interlocuteur, refus explicite, jamais supposition. */
  | { statut: "refus"; questions: readonly QuestionProjetee[]; raison: string };

export interface EntreeAddendum {
  readonly rang: number;
  readonly code: string;
  readonly destination: string;
  readonly question: string;
  readonly reponse: string;
}

export interface Intention {
  /** Scellé, immuable : le hold-out l'exige et l'empreinte en dépend. */
  readonly brief: string;
  readonly addendum: readonly EntreeAddendum[];
}

export const QUESTIONS: Record<string, {
  destination: string;
  demande: (diagnostic: DiagnosticModele) => string;
}>;

export function perimetreDElicitation(diagnostics: readonly DiagnosticModele[]): string[];
export function reponseSterile(avant: readonly string[], apres: readonly string[]): boolean;
export function elicitationDe(
  diagnostics: readonly DiagnosticModele[],
  options?: { interlocuteur?: boolean },
): Elicitation;
export function creerIntention(brief: string): Intention;
export function repondre(
  intention: Intention,
  reponse: { code: string; texte: string; reponse: string },
): Intention;
export function texteDIntention(intention: Intention): string;
export function inventaireDIntention(intention: Intention): string[];
