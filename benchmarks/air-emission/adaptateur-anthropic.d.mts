// Types de l'adaptateur (EP-051) — ombre du .mjs.
export const CONFIG: {
  fournisseur: string;
  model: string;
  cheminCle: string[];
  motifCle: RegExp;
  prixParMtok: { entree: number; ecritureCache: number; lectureCache: number; sortie: number };
};
export const CONTRAINTES_GRAMMAIRE: {
  minItemsMax: number;
  bornesNumeriquesEntiers: boolean;
  /** EP-149 — sixième écart : le service refuse `maxItems` sur les tableaux. */
  maxItemsSupporte: boolean;
  /** EP-221 — septième écart : le service refuse une définition qui se cite
   *  elle-même (« Circular reference detected »), mesuré en production. */
  referencesCirculairesSupportees: boolean;
};
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

/**
 * L'enveloppe de flux. Publique depuis EP-225 : elle porte desormais
 * l'ECHEANCE de la tranche, et c'est elle qu'un cliquet doit pouvoir
 * interroger sans monter un moteur entier.
 *
 * `echeance` rend les millisecondes RESTANTES de la tranche, ou `null`
 * quand il n'y en a pas (campagne en terminal).
 */
export function envelopperEnFlux(
  brut: unknown,
  echeance?: (() => number | null) | null,
): { messages: { create: (args: unknown) => Promise<unknown> } };
