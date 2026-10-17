// EP-159 — LES CHAMPS QUI EXISTENT À LA SAISIE ET PAS EN BASE.
//
// LA QUESTION DE RACINE, MESURÉE : le contrat ne sait PAS les exprimer. Le
// bloc `form` ne porte que `fieldIds`, des références à des champs d'ENTITÉ ;
// tout ce qui s'affiche doit donc exister en base. Or une confirmation de
// mot de passe n'y existe pas et ne peut pas y exister — on ne stocke pas
// deux fois le même secret.
//
// C'EST UNE FAMILLE, PAS UN CAS, et l'extension porte sur la famille :
//  · CONFIRMATION — une seconde saisie qui doit ÉGALER un champ persisté ;
//  · ACCEPTATION  — un accord qui doit être donné et qu'on ne conserve pas
//                   sous cette forme (les conditions d'utilisation) ;
//  · VÉRIFICATION — une valeur comparée à un secret venu d'ailleurs (un code
//                   reçu par message).
// Les trois partagent la même structure : une saisie CONTRAINTE et NON
// PERSISTÉE. Nommer seulement la première aurait été traiter un cas.
//
// CE QU'AUCUNE SOURCE NE PRESCRIT — cherché, et la réponse est NON. WCAG 3.3.4
// n'exige pas la re-saisie : il offre TROIS options alternatives (réversibilité,
// détection d'erreur, revue avant envoi) et vise les engagements juridiques et
// financiers, pas les mots de passe. Ni Material ni Apple ne la prescrivent.
// La confirmation est donc une DÉCISION PRODUIT, étiquetée comme telle.
//
// ET LE MOTEUR N'ÉTAIT PAS DÉMUNI : la révélation du secret (1.5.0) est déjà
// là, et c'est précisément l'option 2 de WCAG — « l'utilisateur peut corriger
// son erreur ». La confirmation est un SECOND garde-fou, pas le premier.

/** Vocabulaire FERMÉ de la famille. Trois rôles, aucun quatrième sans décision. */
export const ROLES_SAISIE = ["confirmation", "acceptation", "verification"] as const;
export type RoleSaisie = (typeof ROLES_SAISIE)[number];

export interface ChampDeSaisie {
  readonly role: RoleSaisie;
  /** Le champ persisté visé — présent pour une confirmation, absent sinon. */
  readonly cible?: string;
  /** Masqué à la frappe : une confirmation de secret l'est aussi. */
  readonly secret: boolean;
}

/**
 * Les champs de saisie pure d'un formulaire, DÉRIVÉS de ses props.
 *
 * Tableaux PARALLÈLES, comme les filtres pilotés : le flat config n'admet que
 * des feuilles, et le contrat universel des props reste intouché. Une cible
 * vide signifie « ce rôle n'en vise aucun », ce qui est le cas de
 * l'acceptation.
 *
 * PURE ET TESTABLE SANS RENDU : le harnais React de ce dépôt ne charge pas
 * (react-native en Flow, L-133-A). La décision vit donc ici, prouvée en
 * entier, et la primitive n'a plus qu'à obéir — même patron qu'EP-132.
 */
export function champsDeSaisie(
  roles: readonly string[] | undefined,
  cibles: readonly string[] | undefined,
  champsSecrets: readonly string[] = [],
): readonly ChampDeSaisie[] {
  if (roles === undefined || roles.length === 0) return [];
  const out: ChampDeSaisie[] = [];
  roles.forEach((role, i) => {
    if (!(ROLES_SAISIE as readonly string[]).includes(role)) return;
    const cible = cibles?.[i] ?? "";
    out.push({
      role: role as RoleSaisie,
      ...(cible === "" ? {} : { cible }),
      // Une confirmation hérite du secret de ce qu'elle confirme : la
      // masquer ou non se DÉDUIT du champ visé, jamais d'une déclaration.
      secret: cible !== "" && champsSecrets.includes(cible),
    });
  });
  return out;
}

/**
 * Ce qu'une saisie pure exige avant écriture. La valeur n'est JAMAIS
 * transmise à la base : elle est vérifiée, puis oubliée.
 */
export function saisieAcceptable(
  champ: ChampDeSaisie,
  valeur: string,
  valeurCible: string,
): boolean {
  switch (champ.role) {
    case "confirmation":
      return valeur === valeurCible;
    case "acceptation":
      return valeur === "true";
    case "verification":
      // La comparaison se fait ailleurs (un secret externe) : ici, on exige
      // seulement qu'une valeur ait été saisie. Promettre plus serait mentir.
      return valeur.trim() !== "";
    default:
      return false;
  }
}
