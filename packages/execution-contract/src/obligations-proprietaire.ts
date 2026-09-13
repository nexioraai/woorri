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
  /**
   * CE QU'IL FAUT EN FAIRE, et c'est ce qui range le fichier livré :
   *  · `fournir`  — un contenu que le propriétaire produit (un texte, une
   *                 adresse, des coordonnées) ;
   *  · `console`  — une action dans une console d'éditeur ;
   *  · `posseder` — un compte, un certificat : cela s'obtient, pas s'écrit.
   */
  readonly ou: "fournir" | "console" | "posseder";
  /** La règle qui l'exige — jamais une opinion. */
  readonly source: string;
  /** La matière que le moteur a su préparer, s'il y en a une. */
  readonly matiere?: readonly string[];
}

/**
 * EP-145 — AVEC QUI LES DONNÉES SONT PARTAGÉES, DÉRIVÉ DES INTÉGRATIONS.
 *
 * Apple 5.1.2(i) : « You must clearly disclose where personal data will be
 * shared with third parties, including with third-party AI, and obtain
 * explicit permission before doing so. » Le contrat savait dire CE QUI est
 * collecté (`compliance.dataCollected`) et pas AVEC QUI c'est partagé.
 *
 * LE FAIT SE DÉRIVE, IL NE SE DÉCLARE PAS — et c'est ce qui ferme la porte de
 * sortie : brancher un prestataire de paiement PARTAGE avec lui, que le
 * générateur le dise ou non. Le registre des fournisseurs est lui-même dérivé
 * du registre des capacités (mesuré) : la chaîne entière tient sans qu'aucune
 * valeur ne soit recopiée à la main.
 *
 * PARTITION EXHAUSTIVE SOUS CLIQUET (motif EP-135, appliqué en EP-144) :
 * chaque capacité du registre est classée — ce qu'elle transmet à son
 * fournisseur, ou rien. Une capacité NEUVE ne peut pas entrer sans qu'une
 * décision soit prise. `[]` signifie « reste sur l'appareil », et c'est une
 * réponse, pas un trou.
 */
export const PARTAGE_PAR_CAPACITE: Readonly<Record<string, readonly string[]>> = {
  // Mesure d'usage envoyée au fournisseur d'analytique.
  analytics: ["usage_data", "identifiers"],
  // L'identité de la personne est établie chez le fournisseur.
  auth: ["contact_info", "identifiers"],
  // Lecture locale de l'appareil photo : rien ne sort.
  barcode_scan: [],
  // Le gabarit biométrique ne quitte JAMAIS l'appareil (Secure Enclave).
  biometrics: [],
  calendar: [],
  camera: [],
  // Ouverture d'une URL : aucune donnée n'est transmise à un tiers.
  deep_links: [],
  external_contact: [],
  // Les coordonnées partent au fournisseur de cartes à chaque requête.
  geolocation: ["location"],
  maps: ["location"],
  // Le contenu téléversé est stocké chez l'hébergeur.
  media_upload: ["user_content"],
  // Stockage LOCAL : c'est sa définition même.
  offline_storage: [],
  "payments.iap": ["purchases", "identifiers"],
  "payments.psp": ["purchases", "contact_info", "identifiers"],
  // Le jeton d'appareil est enregistré chez le service de notification.
  push_notifications: ["identifiers"],
  // La feuille de partage est un geste de l'utilisateur, pas un envoi.
  share: [],
};

/**
 * REPLI PRUDENT, et c'est un choix assumé. MESURÉ sur les documents réels :
 * les classes de fournisseur déclarées (`rest_api`, `image_cdn`,
 * `psp_checkout`…) ne figurent PAS au registre — le schéma les laisse libres.
 * Quand la capacité n'est pas dite, on ne peut donc pas savoir ce que le tiers
 * reçoit.
 *
 * On suppose alors le partage le PLUS LARGE. L'inverse — supposer qu'aucune
 * donnée ne sort — ferait manquer une divulgation qu'Apple exige, et le coût
 * des deux erreurs n'est pas le même : sur-déclarer alourdit une politique,
 * sous-déclarer fait refuser l'application.
 */
export const PARTAGE_BACKEND: readonly string[] = [
  "contact_info",
  "identifiers",
  "user_content",
];

export interface Partage {
  /** La classe de fournisseur — jamais le nom commercial, que le lock résout. */
  readonly aupresDe: string;
  /** Ce qui lui parvient, dans le vocabulaire de `dataCollected`. */
  readonly recoit: readonly string[];
}

/** Les partages d'un document, DÉRIVÉS de ses intégrations. */
export function partagesDe(air: ProjectAir): readonly Partage[] {
  const out = new Map<string, Set<string>>();
  for (const integration of air.integrations) {
    const recoit =
      integration.capability === undefined
        ? PARTAGE_BACKEND
        : (PARTAGE_PAR_CAPACITE[integration.capability] ?? []);
    if (recoit.length === 0) continue;
    const deja = out.get(integration.providerClass) ?? new Set<string>();
    for (const r of recoit) deja.add(r);
    out.set(integration.providerClass, deja);
  }
  return [...out.entries()]
    .map(([aupresDe, recoit]) => ({ aupresDe, recoit: [...recoit].sort() }))
    .sort((a, b) => (a.aupresDe < b.aupresDe ? -1 : 1));
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
    ou: "fournir",
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
      ou: "fournir",
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

  const partages = partagesDe(air);
  if (partages.length > 0) {
    out.push({
      quoi:
        "Nommer, dans votre politique de confidentialité, les prestataires avec " +
        "qui les données sont partagées, et ce que chacun reçoit. L'application " +
        "demande le consentement ; le NOM des sociétés et leurs propres " +
        "politiques, vous seul les connaissez.",
      ou: "fournir",
      source:
        "App Store Review Guidelines 5.1.2(i) — « You must clearly disclose where " +
        "personal data will be shared with third parties »",
      matiere: partages.map((p) => `${p.aupresDe} : ${p.recoit.join(", ")}`),
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
    ou: "fournir",
    source: "Google Play — contact du compte · App Store Review Guidelines 1.5",
  });

  out.push({
    quoi:
      "Ouvrir les comptes d'éditeur (Apple Developer Program, Google Play " +
      "Console) et obtenir les certificats de signature. Sans eux, rien ne " +
      "peut être déposé.",
    ou: "posseder",
    source: "Apple Developer Program · Google Play Console — conditions d'inscription",
  });

  return out;
}

/** Les trois sections du fichier livré, dans l'ordre où on les traite. */
const SECTIONS: readonly { ou: ObligationProprietaire["ou"]; titre: string; intro: string }[] = [
  {
    ou: "fournir",
    titre: "Ce que vous devez fournir",
    intro:
      "Des contenus que vous seul pouvez écrire. L'application prévoit la place ; " +
      "le texte vous engage.",
  },
  {
    ou: "console",
    titre: "Ce que vous devez faire en console",
    intro:
      "Des formulaires à remplir chez Apple et Google. Personne ne peut les " +
      "remplir à votre place, mais tout ce qui pouvait être préparé l'est.",
  },
  {
    ou: "posseder",
    titre: "Ce que vous devez posséder",
    intro: "Des comptes et des certificats. Cela s'obtient auprès des plateformes.",
  },
];

/**
 * LE FICHIER LIVRÉ AVEC L'APPLICATION.
 *
 * ÉCRIT POUR QUELQU'UN QUI VEUT PUBLIER SON APPLICATION, pas pour qui veut
 * comprendre le moteur : aucun code de diagnostic, aucun terme interne. Un
 * cliquet le vérifie — c'est facile à oublier quand on écrit depuis l'intérieur.
 *
 * ET IL NE REMPLACE RIEN : il dit ce qu'il faut écrire, il ne l'écrit pas.
 * C'est la frontière posée en EP-137, et elle ne bouge pas.
 */
export function rendrePublicationMd(air: ProjectAir): string {
  const obligations = obligationsDuProprietaire(air);
  const lignes: string[] = [
    `# Publier « ${air.app.name} »`,
    "",
    "Votre application est générée et compilable. Avant de la déposer sur les",
    "magasins, il reste des choses que personne ne peut faire à votre place.",
    "Cette liste est établie d'après CETTE application : elle ne contient que",
    "ce qui la concerne réellement.",
    "",
  ];
  for (const section of SECTIONS) {
    const dedans = obligations.filter((o) => o.ou === section.ou);
    if (dedans.length === 0) continue;
    lignes.push(`## ${section.titre}`, "", section.intro, "");
    for (const o of dedans) {
      // Une LISTE DE TÂCHES, pas des titres : celui qui lit veut cocher, et
      // une phrase entière en titre de section se lit mal.
      lignes.push(`- [ ] **${o.quoi}**`, `      *Exigé par : ${o.source}.*`);
      if (o.matiere !== undefined && o.matiere.length > 0) {
        lignes.push("", "      Ce que votre application déclare collecter, à recopier :");
        for (const m of o.matiere) lignes.push(`      - \`${m}\``);
      }
      lignes.push("");
    }
  }
  lignes.push(
    "---",
    "",
    "Ce fichier est régénéré à chaque émission. Il décrit ce qu'il faut écrire ;",
    "il ne l'écrit pas — le texte d'une politique de confidentialité vous engage",
    "juridiquement, et aucun outil ne peut le signer à votre place.",
    "",
  );
  return lignes.join("\n");
}
