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
  /**
   * EP-139 — le champ EXISTAIT au schéma (« additive ; l'ordre du tableau
   * fait foi sinon ») mais MANQUAIT ICI : le type mentait. Il désigne le
   * CŒUR de l'application, donc ce qui doit être accessible sans connexion.
   * MESURÉ : il n'était consommé NULLE PART avant cette passe.
   */
  priorite?: number;
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
  /** EP-134 — capacité exigée : aucune, fixe, ou variante selon le commerce. */
  capacite: string | null | { selonCommerce: Record<string, string> };
  /** EP-134 — rôle et cardinalité de la surface, DANS la table (plus deux
   *  tables parallèles qui divergeaient en silence). */
  role: string; cardinalite: "instance" | "collection" | "singleton";
  preuve: string;
}>;

/** EP-135 — les deux classes d'un diagnostic. */
export const CLASSES_DIAGNOSTIC: readonly ["faute_de_production", "intention_manquante"];
/**
 * EP-135 — LA CLASSE VIT AVEC LE DIAGNOSTIC. `faute_de_production` : le brief
 * disait assez, la machine a mal travaillé — cela se re-tire.
 * `intention_manquante` : la machine ne pouvait pas savoir — cela se demande.
 * Un code absent de cette table ne peut pas être émis : `d()` le refuse.
 */
export const DIAGNOSTICS: Record<string, {
  classe: "faute_de_production" | "intention_manquante";
  pourquoi: string;
  /** Cas tranché par prudence vers le re-tirage, et dit comme tel. */
  discutable?: boolean;
}>;
/**
 * EP-139 — ACCÈS SANS CONNEXION (App Store Review Guidelines 5.1.1(iv)).
 * Un parcours est FERMÉ si l'identité est exigée avant que l'utilisateur ait
 * rien pu voir ; le CŒUR est le parcours de priorité la plus haute.
 */
export function parcoursFerme(modele: ModeleMetier, parcours: Parcours): boolean;
export function parcoursParPriorite(modele: ModeleMetier): Parcours[];
export function jugerAccesSansConnexion(modele: ModeleMetier): DiagnosticModele[];
export function diagnosticsDeClasse(
  classe: "faute_de_production" | "intention_manquante",
): string[];
export function contratDEtape(modele: ModeleMetier, parcours: Parcours, index: number):
  | { acteur: string; geste: string; conceptCible: string;
      preconditions: { concept: string; etat: string }[];
      transport: string | null; effet: string | null;
      resultatAttendu: string; portee: string }
  | undefined;
export const STOPWORDS_FR: Set<string>;
export function inventaireDe(brief: string): string[];
export function porteParUnGesteExerce(modele: ModeleMetier, terme: string): boolean;
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
export function prescriptionsNavigation(plan: PlanEcrans, destinationsMin?: number): {
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
  destinationsMin?: number,
): string;
export function consommateursDIdentite(): string[];
export function estConceptIdentite(modele: ModeleMetier, conceptId: string): boolean;
export function estSourceDIdentite(geste: string): boolean;
export function sourcesDIdentite(): string[];
export function gestesParcoursDeCollection(): string[];
export function conceptsRelies(modele: ModeleMetier, a: string, b: string): boolean;
export const NATURES_EXOGENES: string[];
export function consommationsParPortee(modele: ModeleMetier): {
  parcours: string;
  elu: string;
  parcouru: string;
  etapeElection: number;
  etapeConsommation: number;
}[];
export const PROPRIETES_SURFACE_NON_TRANSMISES: Record<string, string>;
export function decisionDeSurface(surface: Record<string, unknown>): string;

/** EP-173 — les écrans du plan partitionnés par parcours, affectation par
 *  priorité. Un écran multi-parcours n'apparaît que dans UN lot. */
export function lotsDEcrans(
  modele: ModeleMetier,
  plan: { ecrans: { ecranId: string; justification?: { parcours: string; etape: number }[] }[] },
): { parcours: string; ecrans: string[] }[];
