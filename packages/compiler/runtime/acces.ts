// ════════════════════════════════════════════════════════════════════
//  QUI PEUT OUVRIR QUOI — LE CALCUL, SANS REACT ET SANS ÉTAT.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT QUE CE MODULE FERME, ET IL EST DE CE JOUR.
//
// AIR 1.28.0 a ajouté `access` au contrat : des droits, des rôles, un rôle par
// défaut, et `requiredRightId` sur les écrans et les gestes. Le validateur
// refuse depuis un modèle d'accès incohérent — il a même attrapé, sur le
// document réel de SGD, l'écran d'entrée fermé au rôle par défaut.
//
// MESURE DU 2026-10-04, sur les fichiers ÉMIS : `requiredRightId` n'apparaît
// dans AUCUN d'eux. `access` non plus. Le document déclarait, le validateur
// refusait, et l'application générée n'appliquait RIEN : chaque écran restait
// ouvert à tout le monde.
//
// C'est la forme exacte du défaut traqué toute la journée — une vérité qui
// s'arrête au moteur et n'atteint jamais l'écran. Un modèle d'accès qui ne
// franchit pas l'émission est pire qu'absent : il se lit comme une protection.
//
// ── POURQUOI CE FICHIER EST PUR.
//
// Aucune importation de React, aucun état, aucune lecture de session. Le calcul
// « cette personne peut-elle ouvrir cet écran » est une fonction de deux
// données ; le rendre pur le rend vérifiable SEUL, sans monter une application.
// Le branchement sur la session vit ailleurs, et ne décide de rien.

/** Un rôle : ce qu'il ouvre, ou bien tout. */
export interface RoleAcces {
  readonly id: string;
  /** LISTE BLANCHE — vide par défaut. Un rôle n'ouvre que ce qu'on lui accorde. */
  readonly rightIds: readonly string[];
  /** Celui qui dirige. Absent vaut `false` : personne n'hérite de tout par accident. */
  readonly grantsAllRights?: boolean;
}

/** Le modèle d'accès d'une application, tel que le document le déclare. */
export interface AccesData {
  /** L'univers FERMÉ des droits. Un droit hors de cette liste n'existe pas. */
  readonly droits: readonly string[];
  readonly roles: readonly RoleAcces[];
  /** Ce qu'un compte reçoit quand rien ne lui a été accordé. */
  readonly defaultRoleId: string;
  /** Quel droit ouvre quel écran. Écran absent = ouvert à tous. */
  readonly parEcran: Readonly<Record<string, string>>;
  /** Quel droit autorise quel geste — un écran ouvert peut porter un geste réservé. */
  readonly parAction: Readonly<Record<string, string>>;
}

/**
 * Les droits d'un rôle. Un rôle inconnu n'ouvre RIEN.
 *
 * Le validateur interdit déjà un `defaultRoleId` inconnu, mais ce module peut
 * recevoir un rôle venu de la session — donc d'ailleurs. Rendre `[]` plutôt que
 * de lever : un rôle que l'application ne connaît pas est quelqu'un à qui on
 * n'a rien accordé, ce qui est la bonne réponse et la plus sûre.
 */
export function droitsDuRole(acces: AccesData, roleId: string): readonly string[] {
  const role = acces.roles.find((r) => r.id === roleId);
  if (role === undefined) return [];
  return role.grantsAllRights === true ? acces.droits : role.rightIds;
}

/**
 * CETTE PERSONNE PEUT-ELLE OUVRIR CET ÉCRAN ?
 *
 * `droits === undefined` ne veut PAS dire « aucun droit » : il veut dire « la
 * session ne sait pas le dire ». Les deux cas méritent la même réponse — non —
 * mais pour des raisons différentes, et la distinction compte pour le message.
 * Voir `raisonDuRefus`.
 *
 * FERMÉ PAR DÉFAUT, et c'est le seul réglage défendable : si l'application
 * ignore les droits de quelqu'un, l'ouvrir reviendrait à faire de l'ignorance
 * une autorisation.
 */
export function peutOuvrir(
  acces: AccesData,
  droits: readonly string[] | undefined,
  screenId: string,
): boolean {
  return detientLeDroit(droits, acces.parEcran[screenId]);
}

/**
 * LA RÈGLE ELLE-MÊME, en un seul endroit.
 *
 * Elle est écrite ici et NULLE PART AILLEURS. Le garde d'écran du runtime n'a
 * pas le modèle d'accès complet sous la main — il ne connaît que le droit que
 * SON écran exige — et il aurait donc été tentant de réécrire la comparaison
 * chez lui. Une duplication se paie à la première correction : le jour où la
 * règle change (un droit hérité, un droit révoqué), deux endroits divergent et
 * l'un des deux ouvre ce que l'autre ferme.
 *
 * · `exige === undefined` — écran ou geste sans droit déclaré : OUVERT à tous,
 *   comme dans toute version antérieure à 1.28.0. L'absence ne ferme jamais.
 * · `droits === undefined` — la session ne sait pas dire : FERMÉ. Faire de
 *   l'ignorance une autorisation serait le pire réglage possible.
 */
export function detientLeDroit(
  droits: readonly string[] | undefined,
  exige: string | undefined,
): boolean {
  if (exige === undefined) return true;
  if (droits === undefined) return false;
  return droits.includes(exige);
}

/** Même règle pour un geste. Trois droits peuvent vivre sur le MÊME écran. */
export function peutAgir(
  acces: AccesData,
  droits: readonly string[] | undefined,
  actionId: string,
): boolean {
  return detientLeDroit(droits, acces.parAction[actionId]);
}

/** Pourquoi c'est refusé — un code, jamais une phrase (le runtime reste sans texte). */
export type RaisonDuRefus = "session_muette" | "droit_absent" | "aucune";

export function raisonDuRefus(
  acces: AccesData,
  droits: readonly string[] | undefined,
  screenId: string,
): RaisonDuRefus {
  if (acces.parEcran[screenId] === undefined) return "aucune";
  // L'ORDRE COMPTE. Une session qui ne sait pas dire les droits est un défaut
  // d'INTÉGRATION — le fournisseur n'implémente pas `droits()` alors que le
  // document déclare `access`. Le confondre avec « cette personne n'a pas le
  // droit » enverrait chercher la cause dans les rôles, c'est-à-dire ailleurs.
  if (droits === undefined) return "session_muette";
  return peutOuvrir(acces, droits, screenId) ? "aucune" : "droit_absent";
}

/**
 * LE PREMIER ÉCRAN QUE SES DROITS LUI OUVRENT — le besoin, mot pour mot.
 *
 * ── LE DÉFAUT RÉEL QUI L'A EXIGÉ, dans un système en production.
 *
 * SGD ouvrait sur le tableau de bord. Un employé dont les droits n'étaient pas
 * encore accordés était mis dehors DÈS L'OUVERTURE — à la connexion, puis à
 * chaque lancement de l'application installée sur son téléphone. Le
 * propriétaire ne pouvait pas le rencontrer : il voit tout.
 *
 * Le validateur 1.28.0 REFUSE désormais un écran d'entrée hors de portée du
 * rôle par défaut (AIR_ACCESS_ENTRY_UNREACHABLE). Mais refuser n'est pas
 * conduire : une application réelle a des employés aux droits DIFFÉRENTS, et
 * aucun écran d'entrée unique ne leur convient à tous.
 *
 * ── AUCUNE MONTÉE DE CONTRAT, ET C'EST VOLONTAIRE.
 *
 * Tout est déjà dans le document : les destinations sont ORDONNÉES, chaque
 * écran déclare son droit, chaque rôle déclare ce qu'il ouvre. La destination
 * d'arrivée est donc une FONCTION du document, pas une donnée de plus. Ajouter
 * un champ pour la porter aurait figé une réponse là où il y a un calcul — et
 * un champ dérivable est un champ qui se désaccorde.
 *
 * `candidats` est consulté DANS L'ORDRE : les destinations principales d'abord
 * (c'est l'ordre que le document déclare, donc l'intention de l'auteur), puis
 * les autres routes. `secours` ferme le cas où rien n'est accessible : on rend
 * l'écran d'entrée déclaré, qui est — le validateur l'impose — ouvert au rôle
 * par défaut.
 */
export function premierEcranAccessible(
  acces: AccesData,
  candidats: readonly string[],
  droits: readonly string[] | undefined,
  secours: string,
): string {
  for (const screenId of candidats) {
    if (peutOuvrir(acces, droits, screenId)) return screenId;
  }
  return secours;
}
