// EP-142 — CE QUE LE MOTEUR NE FERA JAMAIS, ET QU'IL DOIT DIRE.
//
// L'audit EP-138 a listé sept obligations de publication hors de portée du
// moteur : le texte des politiques, les formulaires de console, les comptes
// développeur. Elles ne sont pas des défauts — elles engagent le propriétaire
// de l'application. Mais les laisser tacites revient à les faire découvrir au
// moment du REFUS, et c'est le pire moment.
//
// Ce module les DÉRIVE du document : elles ne sont pas une liste fixe, elles
// dépendent de ce que l'application fait. Une application sans compte n'a pas
// à fournir de lien de suppression ; une application qui ne collecte rien n'a
// pas de matière à déclarer.
//
// EFFET DE BORD VOULU, et c'est la résolution d'une dette : `dataCollected`
// n'était que RESTITUÉ (EP-141). Il alimente désormais une sortie — le champ
// pèse sur quelque chose, il n'est plus « lu sans effet ».
import type { ProjectAir } from "@deribfy/air-schema";

export interface ObligationProprietaire {
  /** Ce que le propriétaire doit faire, en une phrase. */
  readonly quoi: string;
  /** Où : dans l'application, dans une console, hors ligne. */
  readonly ou: "console" | "contenu" | "compte_developpeur";
  /** La règle qui l'exige — jamais une opinion. */
  readonly source: string;
  /** La matière que le moteur a su préparer, s'il y en a une. */
  readonly matiere?: readonly string[];
}

/** Les catégories déclarées, rendues telles quelles : le moteur ne les
 *  traduit pas — les recopier est l'acte du propriétaire. */
const categoriesDe = (air: ProjectAir): readonly string[] => air.compliance.dataCollected;

export function obligationsDuProprietaire(air: ProjectAir): readonly ObligationProprietaire[] {
  const out: ObligationProprietaire[] = [];
  const aDesComptes = air.compliance.accountDeletionRequired;

  out.push({
    quoi:
      "Rédiger la politique de confidentialité et l'héberger : l'écran existe, " +
      "son contenu vous engage juridiquement et le moteur ne l'écrira pas.",
    ou: "contenu",
    source: "App Store Review Guidelines 5.1.1(i) · Google Play answer/9859455",
  });

  if (categoriesDe(air).length > 0) {
    out.push({
      quoi:
        "Remplir le formulaire Data safety dans Play Console. Le document " +
        "déclare déjà ce que l'application collecte : recopiez ces catégories.",
      ou: "console",
      source: "Google Play answer/10787469 — obligatoire pour toute application publiée",
      matiere: categoriesDe(air),
    });
  }

  if (aDesComptes) {
    out.push({
      quoi:
        "Publier une page web de demande de suppression de compte et en donner " +
        "l'adresse à Play Console. Google exige les DEUX chemins — celui dans " +
        "l'application est généré, celui du web est le vôtre.",
      ou: "console",
      source: "Google Play answer/13327111 — « and provide a web link resource »",
    });
    out.push({
      quoi:
        "Fournir un compte de démonstration et allumer le service qui le sert, " +
        "sans quoi la revue Apple ne pourra pas ouvrir l'application.",
      ou: "console",
      source: "App Store Review Guidelines 2.1(a)",
    });
  }

  out.push({
    quoi: "Répondre au questionnaire de classification de contenu.",
    ou: "console",
    source: "Google Play — Content Ratings",
  });
  out.push({
    quoi:
      "Renseigner les coordonnées du compte développeur et l'adresse de support " +
      "de la fiche — distinctes du moyen de contact DANS l'application, qui, lui, " +
      "est généré.",
    ou: "compte_developpeur",
    source: "Google Play — contact du compte · App Store Review Guidelines 1.5",
  });

  return out;
}
