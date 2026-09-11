// Types du contrat modèle métier v1 (confrontation #9) — ombre du .mjs.
export interface AttributConcept {
  id: string;
  nature: "texte" | "nombre" | "media" | "date" | "intervalle" | "duree" | "booleen" | "reference";
  requis: boolean;
  cardinalite?: number;
  producteur?: string;
}
export interface EtatConcept {
  id: string;
  transitions?: { vers: string; geste: string }[];
}
export interface Concept {
  id: string;
  nom: string;
  donnees: boolean;
  identifiant?: string;
  attributs?: AttributConcept[];
  etats?: (string | EtatConcept)[];
}
export interface Etape {
  concept: string;
  geste: string;
  etat?: string;
  acteur?: string;
  preconditions?: { concept: string; etat: string }[];
}
export interface Parcours {
  id: string;
  besoin: string;
  acteur: string;
  etapes: Etape[];
}
export interface ModeleMetier {
  version: "modele-metier/1.0.0" | "modele-metier/1.1.0";
  commerce?: "digital" | "physique_ou_hors_app";
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
export const ROLE_PAR_GESTE: Record<string, string>;
export function porteeDe(modele: ModeleMetier, parcours: Parcours, index: number): string;
export interface SurfaceContrat {
  surfaceId: string;
  role: string;
  acteur: string;
  concept: string;
  cardinalite: "collection" | "instance" | "singleton";
  identite: string;
  videObligatoire?: boolean;
  etat?: string;
  portee: string;
  exclusions: string[];
  origine: { parcours: string; etape: number }[];
}
export function surfacesDe(modele: ModeleMetier): SurfaceContrat[];
export function repetitionsSuspectes(
  surfaces: readonly { concept: string; geste?: string; role?: string; etat?: string; portee: string }[],
): { cle: string; premiere: unknown; doublon: unknown }[];
export function migrerModele(brut: unknown): unknown;
export const TABLE_GESTES: Record<string, {
  bloc: string | null; declencheur: string | null; effet: string | null;
  transport: string | null; terminal: boolean;
    preuve: string;
}>;
export function contratDEtape(modele: ModeleMetier, parcours: Parcours, index: number):
  | { acteur: string; geste: string; conceptCible: string;
      preconditions: { concept: string; etat: string }[];
      transport: string | null; effet: string | null;
      resultatAttendu: string; portee: string }
  | undefined;
export const STOPWORDS_FR: Set<string>;
export function inventaireDe(brief: string): string[];
export function verifierCouvertureLexicale(
  inventaire: readonly string[],
  modele: ModeleMetier,
): DiagnosticModele[];
export interface PlanEcrans {
  ecrans: { ecranId: string; surfaces: string[]; justification: { parcours: string; etape: number }[] }[];
  chrome: string[];
  navigation: {
    destinations: string[];
    barre: boolean;
    arcs: { parcours: string; de?: string; vers?: string; geste: string; transport: string | null }[];
  };
  diagnostics: DiagnosticModele[];
}
export function capacitesDe(modele: ModeleMetier): {
  capacites: { capacite: string; profilConceptId?: string }[];
  diagnostics: DiagnosticModele[];
};
export function ecransDe(modele: ModeleMetier): PlanEcrans;
export function jugerPlanEcrans(plan: PlanEcrans, modele?: ModeleMetier): DiagnosticModele[];
export const GLOSSAIRE_NATURES_TEMPORELLES: Record<string, string>;
export function ecranAirDe(ecranId: string): string;
export function prescriptionsNavigation(plan: PlanEcrans): {
  entree: string; ecrans: string[]; destinations: string[]; barre: boolean;
};
export function verifierNavigationPrescrite(
  air: unknown,
  prescriptions: { entree: string; ecrans: string[]; destinations: string[]; barre: boolean },
): DiagnosticModele[];
export function obligationsPrescriptives(
  nomPasse: string,
  modele: ModeleMetier,
  plan: PlanEcrans,
): string;
export function consommateursDIdentite(): string[];
export function estConceptIdentite(modele: ModeleMetier, conceptId: string): boolean;
export function estSourceDIdentite(geste: string): boolean;
export function sourcesDIdentite(): string[];
