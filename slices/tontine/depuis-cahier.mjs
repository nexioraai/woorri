// ============================================================
// L'AIR D'UNE TONTINE DIGITALE, DÉRIVÉ D'UN CAHIER DES CHARGES RÉEL.
//
// ── POURQUOI CE FICHIER EXISTE.
//
// Le propriétaire a demandé, le 2026-10-05 : « un ami m'a demandé une
// application de tontine, voici son cahier des charges ; le but est de faire
// son appli, et de s'en servir de référence pour améliorer notre générateur
// comme SGD. »
//
// SGD a servi de première référence et a sorti neuf manques, dont trois ont été
// comblés (contrôle d'accès, écrans calculés, recherche par mots). Un SEUL
// système ne suffit pas à mesurer un format : il mesure un métier. Un deuxième
// cahier des charges, écrit par quelqu'un d'autre, pour un autre pays et un
// autre domaine, est ce qui distingue « le format porte SGD » de « le format
// porte des systèmes de gestion ».
//
// ── LA SOURCE, ET CE QU'ELLE A D'UTILE.
//
// « CAHIER DES CHARGES FONCTIONNEL & TECHNIQUE — Solution de Tontine Digitale,
// Spécifique Cameroun (PWA Mobile & Web), Version 1.2, 17 septembre 2026 ».
//
// Il porte un SCHÉMA POSTGRESQL COMPLET : cinq types énumérés et quatre tables,
// avec leurs clés étrangères. Les entités et les relations en sont DÉRIVÉES —
// les réécrire d'après la prose aurait mesuré ma lecture, pas le format.
//
// Le document n'est pas versionné ici : il appartient à un tiers.
//
// ── CE QUE CE DOCUMENT NE DÉCIDE PAS : LA CIBLE.
//
// Le cahier demande une PWA. Notre compilateur émet du React Native. L'AIR,
// lui, ne parle NI de web NI de natif : il décrit des entités, des écrans, des
// gestes et des droits. C'est précisément ce qui permet d'écrire ce document
// AVANT de trancher la cible — et de trancher ensuite avec des chiffres.
//
// ── CE QUE LA LISTE `intent.needs` VAUT.
//
// Chaque exigence du cahier y est déclarée `satisfied` — avec les nœuds qui la
// portent, et le validateur REFUSE un nœud qui n'existe pas
// (AIR_NEED_NODE_UNKNOWN) — ou `unexpressible` AVEC MOTIF. La liste des
// inexprimables est la réponse à la question posée : que manque-t-il au
// générateur pour porter CE métier ?
// ============================================================

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));

// ══════════════════════════════════════════════════════════════
//  1. LES ENTITÉS, DÉRIVÉES DU SCHÉMA SQL DU CAHIER
// ══════════════════════════════════════════════════════════════
//
// Les quatre tables du cahier, avec leurs colonnes. Les types SQL se
// transposent : DECIMAL → `decimal`, BOOLEAN → `boolean`, TIMESTAMP →
// `datetime`, les ENUM → `enum` avec leurs valeurs, les clés étrangères →
// `reference`. TEXT portant une URL de fichier → `asset` : une photo d'identité
// n'est pas une chaîne, et le dire change ce que l'écran en fait.

const TABLES = [
  {
    nom: "utilisateurs",
    colonnes: [
      ["nom_complet", "string", true],
      // Le cahier l'écrit UNIQUE mais OPTIONNEL : « optionnel si membre sans
      // téléphone ». C'est la clé de tout le mécanisme de mandat.
      ["telephone", "string", false],
      ["est_sans_telephone", "boolean", true],
      ["mandataire", "reference", false, "ent_utilisateurs"],
      ["photo_profil", "asset", false],
      ["piece_identite", "asset", false],
      ["est_president_verifie", "boolean", true],
      ["cree_le", "datetime", true],
    ],
  },
  {
    nom: "tontines",
    colonnes: [
      ["nom", "string", true],
      ["montant_cotisation", "decimal", true],
      ["frequence", "enum", true, null, ["HEBDOMADAIRE", "MENSUEL"]],
      ["cagnotte_interets_cumulee", "decimal", true],
      ["taux_penalite_jour", "decimal", true],
      // Une tontine s'ouvre, tourne, puis s'achève. Elle ne redevient jamais
      // « en attente » : le cycle ne se rejoue pas.
      ["statut", "enum", true, null, ["EN_ATTENTE", "ACTIVE", "TERMINEE"],
       [{ from: "EN_ATTENTE", to: "ACTIVE" }, { from: "ACTIVE", to: "TERMINEE" }]],
      ["president", "reference", true, "ent_utilisateurs"],
      ["cree_le", "datetime", true],
    ],
  },
  {
    nom: "membres_tontine",
    colonnes: [
      ["tontine", "reference", true, "ent_tontines"],
      ["utilisateur", "reference", true, "ent_utilisateurs"],
      ["role", "enum", true, null, ["PRESIDENT", "SECRETAIRE", "TRESORIER", "CENSEUR", "MEMBRE"]],
      ["ordre_passage", "number", false],
      ["cumul_amandes_disciplinaires", "decimal", true],
    ],
  },
  {
    nom: "transactions",
    // ── UN JOURNAL D'ARGENT NE SE RÉÉCRIT PAS (1.30.0).
    //
    // Cotisations, enchères, amendes, décaissements : modifier une ligne déjà
    // passée n'est pas une correction, c'est une réécriture de l'histoire. Le
    // validateur refuse désormais toute action qui modifierait ou effacerait
    // une de ces lignes — la seule correction reste d'en écrire une NOUVELLE
    // qui annule la première.
    appendOnly: true,
    colonnes: [
      ["tontine", "reference", true, "ent_tontines"],
      ["cotiseur", "reference", false, "ent_utilisateurs"],
      ["beneficiaire", "reference", false, "ent_utilisateurs"],
      // Qui a REMIS l'argent pour un autre. La colonne existe ; ce qu'elle
      // AUTORISE — agir au nom d'autrui — ne s'exprime pas (voir les besoins).
      ["mandataire", "reference", false, "ent_utilisateurs"],
      [
        "type_op",
        "enum",
        true,
        null,
        ["COTISATION", "ENCHERE", "AMENDE_DISCIPLINAIRE", "DISTRIBUTION_INTERETS", "PAYOUT_POT"],
      ],
      ["montant_base", "decimal", true],
      ["montant_enchere", "decimal", true],
      ["frais_reseau_mobile", "decimal", true],
      ["montant_penalite", "decimal", true],
      ["part_penalite_createur", "decimal", true],
      ["part_penalite_tontine", "decimal", true],
      ["commission_plateforme", "decimal", true],
      ["total_paye", "decimal", true],
      ["operateur", "enum", false, null, ["ORANGE_CMR", "MTN_CMR", "CASH"]],
      ["reference_externe", "string", false],
      ["code_otp_payout", "string", false],
      // ── CE QUI SUCCÈDE À QUOI. Le cahier §4 décrit un chemin, pas un choix :
      // la transaction attend, se bloque au séquestre, puis réussit ou échoue.
      // Sans ces passages, rien n'empêchait de repasser un décaissement réussi
      // en attente — le mot « séquestre » écrit dans une colonne ne séquestre
      // rien.
      [
        "statut",
        "enum",
        true,
        null,
        ["EN_ATTENTE", "SEQUESTRE_BLOQUE", "PAYOUT_SUCCES", "ECHEC"],
        [
          { from: "EN_ATTENTE", to: "SEQUESTRE_BLOQUE" },
          { from: "EN_ATTENTE", to: "ECHEC" },
          { from: "SEQUESTRE_BLOQUE", to: "PAYOUT_SUCCES" },
          { from: "SEQUESTRE_BLOQUE", to: "ECHEC" },
        ],
      ],
      ["date_transaction", "datetime", true],
    ],
  },
];

function entites() {
  return TABLES.map((t) => ({
    id: `ent_${t.nom}`,
    name: t.nom,
    ...(t.appendOnly === true ? { appendOnly: true } : {}),
    fields: t.colonnes.map(([nom, type, requis, cible, valeurs, passages]) => ({
      id: `fld_${t.nom}_${nom}`,
      name: nom,
      label: [{ locale: "fr", text: nom.replace(/_/g, " ") }],
      type,
      required: requis,
      ...(type === "reference" ? { referencesEntityId: cible } : {}),
      ...(type === "enum" ? { enumValues: valeurs } : {}),
      ...(passages ? { transitions: passages } : {}),
    })),
  }));
}

// ── LES CLÉS ÉTRANGÈRES DU CAHIER, DÉCLARÉES DEPUIS LE CÔTÉ « UN ».
//
// Le format ne connaît que `one_to_one`, `one_to_many` et `many_to_many` : il
// n'y a PAS de `many_to_one`. Une relation se déclare donc toujours depuis
// l'entité qui en porte plusieurs. Ce n'est pas une limite — c'est une forme
// normale qui évite de déclarer deux fois le même lien dans les deux sens.
//
// `rel_mandat` est la seule à boucler sur elle-même : un mandataire porte
// plusieurs mandants, et c'est tout ce que les DONNÉES savent dire. Ce que le
// mandat AUTORISE ne s'exprime pas (voir `need_mandat_agir_pour`).
const RELATIONS = [
  ["rel_tontine_president", "ent_utilisateurs", "ent_tontines", "one_to_many"],
  ["rel_membre_tontine", "ent_tontines", "ent_membres_tontine", "one_to_many"],
  ["rel_membre_utilisateur", "ent_utilisateurs", "ent_membres_tontine", "one_to_many"],
  ["rel_transaction_tontine", "ent_tontines", "ent_transactions", "one_to_many"],
  ["rel_transaction_cotiseur", "ent_utilisateurs", "ent_transactions", "one_to_many"],
  ["rel_mandat", "ent_utilisateurs", "ent_utilisateurs", "one_to_many"],
];

// ══════════════════════════════════════════════════════════════
//  2. LE BUREAU TRADITIONNEL, EN DROITS ET EN RÔLES
// ══════════════════════════════════════════════════════════════
//
// Le cahier §2 décrit une « matrice d'accès stricte (RBAC) » qui « reproduit et
// sécurise la hiérarchie traditionnelle ». C'est exactement ce qu'AIR 1.28.0
// sait porter — et c'est le hasard qui veut que ce lot ait été fini la veille.
//
// UN DROIT PAR RESPONSABILITÉ, pas un droit par écran : le cahier décrit des
// charges (« garant de la discipline », « contrôleur financier »), et un droit
// qui suivrait les écrans se désaccorderait au premier écran ajouté.

const DROITS = [
  ["right_bureau", "Créer une tontine et en orchestrer les séances"],
  ["right_registre", "Tenir le registre, les procès-verbaux et les présences"],
  ["right_tresorerie", "Superviser le séquestre et certifier les écritures"],
  ["right_discipline", "Appliquer le règlement intérieur et les amendes"],
  ["right_encaisser_cash", "Saisir une cotisation en espèces pour un autre membre"],
];

function acces() {
  return {
    rights: DROITS.map(([id, quoi]) => ({
      id,
      name: id.replace(/^right_/, ""),
      label: [{ locale: "fr", text: quoi }],
    })),
    roles: [
      {
        id: "role_president",
        name: "president",
        label: [{ locale: "fr", text: "Président" }],
        // « Garant suprême (…) détient le pouvoir d'exécution financière
        // finale ». Le cahier en fait un super-administrateur : on le dit avec
        // `grantsAllRights` plutôt qu'en recopiant la liste, qui se
        // désaccorderait au premier droit ajouté.
        rightIds: [],
        grantsAllRights: true,
      },
      {
        id: "role_secretaire",
        name: "secretaire",
        label: [{ locale: "fr", text: "Secrétaire" }],
        rightIds: ["right_registre"],
      },
      {
        id: "role_tresorier",
        name: "tresorier",
        label: [{ locale: "fr", text: "Trésorier" }],
        rightIds: ["right_tresorerie", "right_encaisser_cash"],
      },
      {
        id: "role_censeur",
        name: "censeur",
        label: [{ locale: "fr", text: "Censeur" }],
        rightIds: ["right_discipline"],
      },
      {
        // LISTE BLANCHE VIDE, et c'est le cahier qui le dit : le membre
        // « cotise, participe aux enchères, consulte son tableau de bord ».
        // Aucune charge du bureau.
        id: "role_membre",
        name: "membre",
        label: [{ locale: "fr", text: "Membre" }],
        rightIds: [],
      },
    ],
    defaultRoleId: "role_membre",
    // ── LE MANDAT, DÉCLARÉ (AIR 1.29.0).
    //
    // Le cahier §3 : « tout membre ne possédant pas de smartphone est rattaché
    // à un membre parrain certifié. Le membre remet la somme en espèces ; le
    // mandataire saisit la transaction et crédite le séquestre. Lors du tour de
    // gain, le décaissement est versé au mandataire, qui remet la somme contre
    // signature d'un reçu de décharge. »
    //
    // UN SEUL DROIT DÉLÉGABLE, et c'est délibéré. Le cahier décrit le mandat
    // pour l'ARGENT REMIS EN ESPÈCES, rien d'autre. Déléguer la discipline ou
    // le registre serait inventer une procuration que personne n'a signée.
    delegation: {
      subjectEntityId: "ent_utilisateurs",
      holderFieldId: "fld_utilisateurs_mandataire",
      delegatableRightIds: ["right_encaisser_cash"],
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  3. LES ÉCRANS
// ══════════════════════════════════════════════════════════════
//
// Dérivés des responsabilités du cahier, pas des tables. Un écran par table
// aurait produit une interface d'administration de base de données, ce qu'aucun
// membre de tontine ne sait utiliser.
//
// L'ÉCRAN D'ENTRÉE N'EXIGE AUCUN DROIT — le validateur le refuserait
// (AIR_ACCESS_ENTRY_UNREACHABLE), et il a raison : un membre sans charge du
// bureau est le cas NORMAL, pas l'exception.

const ECRANS = [
  { cle: "mon_tableau", titre: "Mon tableau de bord", droit: null, entite: "ent_transactions", icone: "accueil" },
  { cle: "tontines", titre: "Mes tontines", droit: null, entite: "ent_tontines", icone: "liste" },
  { cle: "membres", titre: "Membres et ordre de passage", droit: null, entite: "ent_membres_tontine", icone: "carte" },
  { cle: "transactions", titre: "Mouvements du séquestre", droit: "right_tresorerie", entite: "ent_transactions", icone: "billet" },
  { cle: "annuaire", titre: "Annuaire des membres", droit: "right_registre", entite: "ent_utilisateurs",
    image: "fld_utilisateurs_photo_profil" },
  // ── ÉCRAN AJOUTÉ PAR LE VALIDATEUR, ET IL AVAIT RAISON CONTRE MOI.
  //
  // `AIR_IMAGE_ORPHELINE` a refusé le document : la pièce d'identité était
  // collectée et montrée NULLE PART. J'ai d'abord cru le diagnostic trop
  // strict — un document KYC n'a rien à faire dans un annuaire, où il
  // exposerait les papiers de chacun.
  //
  // Mais le cahier §2 EXIGE la « vérification KYC obligatoire (CNI/Passeport +
  // Selfie) » par le Président. Il manquait donc l'écran où cette vérification
  // a lieu — pas une tolérance au validateur. La pièce s'affiche ici, et ICI
  // SEULEMENT, derrière le droit du bureau.
  { cle: "verification", titre: "Vérification d'identité", droit: "right_bureau",
    entite: "ent_utilisateurs", detail: true, image: "fld_utilisateurs_piece_identite" },
  { cle: "discipline", titre: "Amendes disciplinaires", droit: "right_discipline", entite: "ent_membres_tontine" },
  { cle: "encaissement", titre: "Encaisser en espèces", droit: "right_encaisser_cash", entite: "ent_transactions" },
  { cle: "seance", titre: "Séance et enchères", droit: "right_bureau", entite: "ent_transactions" },
  { cle: "parametres", titre: "Paramètres", droit: null, entite: null },
];

// Ce qu'un humain lit sur une ligne : un nom, un montant nommé, une date.
// Jamais un identifiant.
function champDAffichage(entite) {
  const prefere = ["nom", "nom_complet", "type_op", "role", "statut"];
  for (const p of prefere) {
    const f = entite.fields.find((x) => x.name === p);
    if (f) return f.id;
  }
  return entite.fields.find((f) => f.type === "string")?.id ?? entite.fields[0].id;
}

function ecrans(ents) {
  return ECRANS.map((e) => {
    const entite = e.entite ? ents.find((x) => x.id === e.entite) : null;
    const blocks = [
      { id: `blk_${e.cle}_entete`, blockType: "header", props: [{ key: "title", value: e.titre }] },
    ];
    if (entite && e.detail) {
      // Une FICHE, pas une liste : on vérifie une identité à la fois.
      blocks.push({
        id: `blk_${e.cle}_fiche`,
        blockType: "detail_header",
        entityId: entite.id,
        props: [
          { key: "titleFieldId", value: champDAffichage(entite) },
          { key: "imageFieldId", value: e.image },
        ],
      });
    } else if (entite) {
      blocks.push({
        id: `blk_${e.cle}_liste`,
        blockType: "list",
        entityId: entite.id,
        props: [
          { key: "titleFieldId", value: champDAffichage(entite) },
          ...(e.image ? [{ key: "imageFieldId", value: e.image }] : []),
        ],
      });
    } else {
      blocks.push({
        id: `blk_${e.cle}_vide`,
        blockType: "empty_state",
        props: [
          { key: "title", value: e.titre },
          { key: "message", value: "Aucun réglage n'est encore porté par ce document." },
        ],
      });
    }
    return {
      id: `scr_${e.cle}`,
      title: [{ locale: "fr", text: e.titre }],
      ...(e.droit ? { requiredRightId: e.droit } : {}),
      showsPrimaryNav: true,
      showsScreenTitle: true,
      presentation: "card",
      blocks,
    };
  });
}

// ══════════════════════════════════════════════════════════════
//  4. CE QUE LE CAHIER DEMANDE — PORTÉ OU NON
// ══════════════════════════════════════════════════════════════

function besoins() {
  const n = [];
  const porte = (id, statement, nodeIds) =>
    n.push({ id, statement, resolution: { kind: "satisfied", nodeIds } });
  const manque = (id, statement, reason) =>
    n.push({ id, statement, resolution: { kind: "unexpressible", reason } });

  // ── CE QUE LE FORMAT PORTE ─────────────────────────────────

  porte("need_bureau",
    "Reproduire le bureau traditionnel — Président, Secrétaire, Trésorier, Censeur, Membre — par une matrice d'accès stricte.",
    ["role_president", "role_secretaire", "role_tresorier", "role_censeur", "role_membre",
     ...DROITS.map(([id]) => id)]);

  porte("need_membre_sans_telephone",
    "Un membre peut n'avoir ni smartphone ni compte Mobile Money, et reste rattaché à un mandataire.",
    ["ent_utilisateurs", "fld_utilisateurs_est_sans_telephone", "fld_utilisateurs_mandataire", "rel_mandat"]);

  porte("need_registre",
    "Tenir le registre des membres d'une tontine, leur rôle, leur ordre de passage et leur cumul d'amendes.",
    ["ent_membres_tontine", "scr_membres", "scr_annuaire"]);

  porte("need_tontines",
    "Une tontine porte son montant de cotisation, sa fréquence, son taux de pénalité et son statut.",
    ["ent_tontines", "fld_tontines_montant_cotisation", "fld_tontines_frequence", "fld_tontines_statut"]);

  porte("need_journal_transactions",
    "Chaque mouvement est horodaté, typé, et garde la trace de son opérateur et de sa référence externe.",
    ["ent_transactions", "fld_transactions_type_op", "fld_transactions_operateur",
     "fld_transactions_reference_externe", "scr_transactions"]);

  porte("need_kyc",
    "Vérification d'identité obligatoire : pièce d'identité et selfie, contrôlés par le bureau.",
    ["fld_utilisateurs_piece_identite", "fld_utilisateurs_photo_profil",
     "fld_utilisateurs_est_president_verifie", "scr_verification", "right_bureau"]);

  porte("need_tableau_membre",
    "Un membre consulte sa position et son historique financier sans aucune charge du bureau.",
    ["scr_mon_tableau", "role_membre"]);

  // ── CE QUE LE FORMAT NE SAIT PAS DIRE ──────────────────────

  // ── RECLASSÉ : le manque que CE cahier a révélé, et que SGD ne pouvait pas
  // montrer — un employé y agit toujours en son propre nom. AIR 1.29.0 porte
  // désormais `access.delegation`.
  //
  // CE QUI RESTE HORS DU FORMAT, et il faut le dire : le REÇU DE DÉCHARGE.
  // Le cahier exige un reçu signé portant les deux noms. Le format autorise
  // maintenant l'acte ; il ne fabrique aucun document — voir `need_export_pdf`.
  porte("need_mandat_agir_pour",
    "Le mandataire AGIT AU NOM d'un autre : il cotise pour lui et encaisse son pot.",
    ["right_encaisser_cash", "ent_utilisateurs", "fld_utilisateurs_mandataire",
     "fld_utilisateurs_est_sans_telephone", "rel_mandat", "scr_encaissement"])

  // ── MOTIF RESSERRÉ (1.30.0), et c'est une demi-victoire qu'il faut dire
  // comme telle. `transitions` exprime désormais que l'état NE REVIENT PAS en
  // arrière : un décaissement réussi ne redevient pas « en attente ». Ce qui
  // reste hors du format est l'autre moitié, et c'est la plus importante.
  manque("need_sequestre",
    "Les fonds collectés sont bloqués sur un compte séquestre jusqu'à l'échéance du tour.",
    "L'ORDRE des états est maintenant déclaré (`transitions`) : le séquestre ne se dé-bloque " +
    "plus vers un état antérieur. Mais l'ÉCHÉANCE ne l'est pas. « Jusqu'à l'échéance du tour » " +
    "suppose une HORLOGE qui fasse passer l'état toute seule, et une horloge vit sur le serveur. " +
    "Le format dit ce qui est PERMIS, jamais ce qui arrive de soi-même — prétendre le contraire " +
    "ferait croire qu'une application déverrouille des fonds sans que personne n'agisse.")

  manque("need_encheres",
    "Le pot est attribué par enchère : le membre qui propose la plus forte prime l'emporte.",
    "Une enchère est une CONCURRENCE entre plusieurs membres sur un même objet, avec un gagnant et une " +
    "clôture. Le format décrit des écrans, des listes et des gestes individuels ; il n'a aucun nœud pour " +
    "un mécanisme où le geste d'un membre invalide celui d'un autre.");

  manque("need_penalites",
    "Les pénalités de retard valent 2 % par jour et se répartissent 70 % au groupe, 30 % à la plateforme.",
    "Calcul sur une DURÉE, puis partage. Le format ne porte ni l'un ni l'autre : `rules.kind = " +
    "\"validation\"` sait refuser une saisie, jamais produire un montant. C'est la même famille que le " +
    "stock calculé de SGD, resté inexprimable.");

  manque("need_cagnotte",
    "Les primes d'enchères s'accumulent pendant tout le cycle, puis se répartissent à parts égales en fin de cycle.",
    "Deux manques en un : l'ACCUMULATION (un champ qui est la somme d'autres lignes) et l'ÉVÉNEMENT DE " +
    "FIN DE CYCLE. Le déclencheur `lifecycle` connaît l'ouverture d'un écran, pas l'achèvement d'un " +
    "cycle métier.");

  manque("need_mobile_money",
    "Collecte et décaissement par les API Orange Money Cameroun et MTN Mobile Money.",
    "Le registre des capacités porte `payments.psp` (Stripe) et `payments.offapp_transfer`, qui dit " +
    "explicitement « aucun opérateur intégré, aucun appel réseau ». Aucun opérateur d'argent mobile " +
    "africain n'y figure, alors que c'est l'infrastructure de paiement du marché visé.");

  manque("need_otp_payout",
    "Un décaissement n'est exécuté qu'après saisie d'un code à 6 chiffres reçu par WhatsApp ou SMS.",
    "Une validation en DEUX TEMPS, avec un secret envoyé par un canal tiers. Le format décrit un geste " +
    "et son effet ; il n'a pas de nœud pour un geste SUSPENDU à une confirmation hors application.");

  manque("need_tour_courant",
    "À chaque séance, un membre et un seul encaisse le pot, selon l'ordre de passage.",
    "`ordre_passage` est un nombre sur une ligne. Rien ne dit QUEL tour est en cours, ni que le tour " +
    "avance quand le pot est versé. L'état d'avancement d'un cycle n'a pas de place au format.");

  manque("need_categorie_financiere",
    "Déclarer aux magasins que l'application traite des données financières.",
    "`compliance.dataCollected` est une énumération FERMÉE de sept catégories, et aucune ne couvre " +
    "l'argent : contact_info, identifiers, usage_data, location, user_content, purchases, diagnostics. " +
    "Or Apple ET Google portent une catégorie « Financial Info » dans leurs étiquettes de " +
    "confidentialité. Déclarer `purchases` serait inexact — dans une tontine, personne n'achète rien : " +
    "les membres se prêtent de l'argent. Une déclaration fausse à un magasin est pire qu'une " +
    "déclaration incomplète.");

  manque("need_export_pdf",
    "Le Secrétaire exporte les procès-verbaux et les rapports en PDF d'un seul clic.",
    "Aucune capacité du registre ne produit de document. `share` partage ce qui existe déjà ; rien ne " +
    "fabrique un PDF à partir des données.");

  return n;
}

// ══════════════════════════════════════════════════════════════
//  5. LE DOCUMENT
// ══════════════════════════════════════════════════════════════

const ents = entites();
const screens = ecrans(ents);

// Cinq destinations au plus, et chacune doit mener à un écran FONCTIONNEL : le
// compilateur refuse une destination qui ouvre sur du vide
// (AIR_NAV_DESTINATION_DEAD). On ne met donc en barre que les écrans liés à une
// entité, dans l'ordre où un membre les rencontre.
const enBarre = ECRANS.filter((e) => e.entite && e.icone).slice(0, 5);

const air = {
  airSchemaVersion: "1.30.0",
  projectId: "prj_tontine_cameroun",
  app: {
    name: "Tontine",
    slug: "tontine",
    description: [
      { locale: "fr", text: "Tontine digitale : cotisations, enchères, séquestre et bureau traditionnel." },
    ],
    locales: {
      userLanguage: "fr",
      appLocales: ["fr"],
      defaultAppLocale: "fr",
      contentLocales: ["fr"],
      rtlSupported: false,
    },
  },
  navigation: {
    entryScreenId: "scr_mon_tableau",
    primary: {
      destinations: enBarre.map((e, i) => ({
        routeId: `nav_${e.cle}`,
        label: [{ locale: "fr", text: e.titre }],
        order: i,
        icon: e.icone,
      })),
    },
    routes: ECRANS.map((e) => ({
      id: `nav_${e.cle}`,
      screenId: `scr_${e.cle}`,
      title: [{ locale: "fr", text: e.titre }],
    })),
  },
  entities: ents,
  relations: RELATIONS.map(([id, de, vers, kind]) => ({
    id,
    fromEntityId: de,
    toEntityId: vers,
    kind,
  })),
  datasets: [],
  screens,
  actions: [],
  rules: [],
  slots: [],
  capabilities: [],
  permissions: [],
  access: acces(),
  design: { theme: "tontine_sobre" },
  integrations: [],
  // Le cahier annonce des API Mobile Money nationales. Tant qu'aucune capacité
  // ne les porte, le document ne déclare AUCUN domaine : annoncer un accès
  // réseau qui n'existe pas serait une permission inventée.
  network: { policy: "deny_by_default", allowedDomains: [] },
  native: { minIosVersion: "16.0", minAndroidSdk: 26 },
  compliance: {
    // Une tontine n'est pas une vente de bien numérique : les fonds circulent
    // entre membres par un opérateur tiers.
    commerceClass: "physical_or_offapp",
    accountDeletionRequired: true,
    // ⚠️ `financial_info` N'EXISTE PAS dans l'énumération du format, alors que
    // les catalogues de confidentialité d'Apple ET de Google portent cette
    // catégorie. Une tontine déplace de l'argent entre ses membres ; le
    // déclarer « purchases » serait INEXACT — personne n'achète rien. On
    // déclare donc ce qui est vrai, et le manque est consigné dans les besoins
    // (`need_categorie_financiere`) plutôt que masqué par un à-peu-près.
    dataCollected: ["identifiers", "usage_data"],
  },
  expectedTests: [],
  intent: {
    request:
      "Une tontine digitale pour le Cameroun : bureau traditionnel à cinq rôles, cotisations et " +
      "décaissements par Mobile Money, compte séquestre, attribution du pot aux enchères, pénalités " +
      "de retard et redistribution des intérêts en fin de cycle.",
    requestLocale: "fr",
    needs: besoins(),
  },
};

const sortie = join(ICI, "tontine.air.json");
writeFileSync(sortie, JSON.stringify(air, null, 1), "utf8");

const portes = air.intent.needs.filter((b) => b.resolution.kind === "satisfied");
const absents = air.intent.needs.filter((b) => b.resolution.kind === "unexpressible");
console.log(
  `  entités ${air.entities.length} · relations ${air.relations.length} · ` +
    `écrans ${air.screens.length} · droits ${air.access.rights.length} · rôles ${air.access.roles.length}`,
);
console.log(`  besoins : ${portes.length} portés par le format, ${absents.length} INEXPRIMABLES`);
console.log(`  écrit : ${sortie}`);
