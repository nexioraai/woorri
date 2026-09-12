// Types de l'adaptateur (EP-051) — ombre du .mjs.
export const CONFIG: {
  fournisseur: string;
  model: string;
  cheminCle: string[];
  motifCle: RegExp;
  prixParMtok: { entree: number; ecritureCache: number; lectureCache: number; sortie: number };
};
export const CONTRAINTES_GRAMMAIRE: { minItemsMax: number; bornesNumeriquesEntiers: boolean };
export function degraderGrammaire(canonique: unknown): { grammaire: unknown; ecarts: string[] };
export function degradationsPourEchelle(jsonSchema: unknown): { name: string; schema: unknown }[];
export function construireAppel(
  requete: { system: string; user: string; grammaire: unknown },
  reglages: { max_tokens: number },
): unknown;
export function construireAppelCampagne(
  requete: { system: string; user: string; grammaire: unknown },
  reglages: { max_tokens: number },
): unknown;
export function lireReponse(reponse: unknown): {
  texte: string;
  tronquee: boolean;
  refusee: boolean;
  usage: { entree: number; sortie: number; ecritureCache: number; lectureCache: number };
};
export function lireUsage(usageBrut: unknown): {
  entree: number; sortie: number; ecritureCache: number; lectureCache: number;
};
export function coutUsd(usageNeutre: {
  entree: number; sortie: number; ecritureCache: number; lectureCache: number;
}): number;
export function estErreurGrammaire(erreur: unknown): boolean;
export function creerClient(
  lireFichier: (chemin: string[]) => string,
  options?: Record<string, unknown>,
): Promise<unknown>;
