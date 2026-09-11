// Types du contrat modèle métier v1 (confrontation #9) — ombre du .mjs.
export interface AttributConcept {
  id: string;
  nature: "texte" | "nombre" | "media" | "date" | "booleen" | "reference";
  requis: boolean;
  cardinalite?: number;
}
export interface Concept {
  id: string;
  nom: string;
  donnees: boolean;
  attributs?: AttributConcept[];
  etats?: string[];
}
export interface Etape {
  concept: string;
  geste: string;
  etat?: string;
}
export interface Parcours {
  id: string;
  besoin: string;
  acteur: string;
  etapes: Etape[];
}
export interface ModeleMetier {
  version: "modele-metier/1.0.0";
  couverture: {
    couverts: { terme: string; noeuds: string[] }[];
    nonRetenus: { terme: string; raison: string }[];
  };
  acteurs: { id: string; nom: string }[];
  concepts: Concept[];
  relations: { de: string; vers: string; nature: "possede" | "reference" }[];
  parcours: Parcours[];
}
export interface DiagnosticModele {
  code: string;
  path: string;
  message: string;
}
export const RAISONS_NON_RETENUE: string[];
export const NATURES_ATTRIBUT: string[];
export const GESTES: string[];
export const GESTES_TERMINAUX: string[];
export const modeleMetierSchema: unknown;
export function validerModele(brut: unknown): DiagnosticModele[];
export function estVisuel(concept: Concept): boolean;
export function accesDe(geste: string): "catalogue" | "lecture";
export function mailleDe(concept: Concept, geste: string): "grille" | "lignes";
export function strategieInitiale(modele: ModeleMetier, conceptId: string): "seed" | "vide";
export function producteurDe(modele: ModeleMetier, conceptId: string): string | undefined;
export function etatVideObligatoire(modele: ModeleMetier, conceptId: string): boolean;
