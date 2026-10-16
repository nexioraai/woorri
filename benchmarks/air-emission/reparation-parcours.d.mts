// EP-242 — types de la réparation déterministe des parcours.
//
// ── CE QUE CE FICHIER NE REDÉCLARE PAS, ET POURQUOI.
//
// Ni le modèle métier, ni le diagnostic, ni le plan d'écrans : ils
// appartiennent à `modele-metier.d.mts`. Les redéclarer créerait deux vérités
// qui divergeraient au premier champ ajouté. On les emprunte.
//
// Les signatures des outils sont celles des fonctions RÉELLES — vérifiées le
// 2026-10-16 : `consommateursDIdentite` ne prend AUCUN argument (elle rend la
// liste fermée des gestes consommateurs), et non un modèle plus un concept.
import type { ModeleMetier, PlanEcrans, SurfaceContrat } from "./modele-metier.d.mts";

/**
 * CE QUE LA RÉPARATION LIT D'UN DIAGNOSTIC — et rien de plus.
 *
 * `DiagnosticModele` exige `message`. Or la réparation n'en lit JAMAIS : elle
 * lit `code` pour savoir quelle règle parle, et `path` parce que le juge y
 * nomme l'endroit exact (`parcours[ID].etapes[N]`). Exiger `message`
 * obligerait chaque appelant à en fabriquer un — c'est-à-dire à inventer du
 * texte pour satisfaire un type. On décrit donc le contrat RÉEL, qui est plus
 * permissif, et les diagnostics riches y entrent sans conversion.
 */
export interface DiagnosticLu {
  code: string;
  path?: string;
  message?: string;
}

/** Ce que la réparation a fait, en clair — consigné par le moteur au tirage. */
export interface Reparation {
  /** Le code du juge que cette réparation vise. */
  code: string;
  /** La phrase lisible : ce qui a bougé, et où. */
  action: string;
}

/**
 * Les outils que l'appelant fournit.
 *
 * La réparation ne connaît AUCUN juge : elle reçoit `juger` et se laisse
 * guider par ce qu'il DIT. C'est ce qui l'empêche de réimplémenter une règle,
 * donc de la contredire — et c'est pour cela que `juger` est un paramètre et
 * non une importation.
 */
export interface OutilsReparation {
  ecransDe: (modele: ModeleMetier) => PlanEcrans;
  surfacesDe: (modele: ModeleMetier) => SurfaceContrat[];
  consommateursDIdentite: () => string[];
  juger: (modele: ModeleMetier) => readonly DiagnosticLu[];
}

/**
 * Tableaux MUTABLES, parce que c'est ce que l'implémentation rend.
 *
 * Les déclarer `readonly` ici obligerait chaque appelant à une conversion par
 * `unknown` — une conversion qui ne protège rien et qui masque les vraies
 * incompatibilités le jour où il y en aura une.
 */
export interface ResultatReparation {
  modele: ModeleMetier;
  reparations: Reparation[];
}

export function reparerIdentiteNonConsommee(
  modele: ModeleMetier,
  outils: OutilsReparation,
): ResultatReparation;
export function reparerTraverseeActeur(
  modele: ModeleMetier,
  outils: OutilsReparation,
): ResultatReparation;
export function reparerParcours(
  modele: ModeleMetier,
  outils: OutilsReparation,
): ResultatReparation;
