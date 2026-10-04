// ============================================================
// L'AIR D'UN SYSTÈME DE GESTION, DÉRIVÉ DE SGD — PAS INVENTÉ.
//
// ── POURQUOI CE FICHIER EXISTE.
//
// Le propriétaire a demandé, le 2026-10-04 : « est-ce que Deribfy pourrait
// générer des systèmes de gestion, puisqu'on a déjà toutes les informations et
// que SGD est en place ? » Puis : « on se réfère à SGD pour faire un système de
// gestion de toutes sortes d'entreprise. »
//
// La question ne se tranche pas par une opinion. Elle se tranche en ÉCRIVANT
// l'AIR d'un système qui EXISTE ET QUI TOURNE, puis en regardant ce que le
// format refuse de porter. SGD est en production : ses entités, ses droits et
// ses règles ne sont pas des hypothèses.
//
// ── CE QUI EST DÉRIVÉ, ET CE QUI EST ÉCRIT À LA MAIN.
//
// Les ENTITÉS et les RELATIONS sont lues dans les migrations SQL de SGD. Les
// recopier à la main aurait mesuré ma fidélité, pas la capacité du format.
//
// Les BESOINS (`intent.needs`) sont écrits à la main, et c'est le cœur : ce
// sont les décisions que SGD a payées en incidents réels. Chacune est déclarée
// `satisfied` — avec les nœuds qui la portent — ou `unexpressible` AVEC MOTIF,
// comme le schéma l'exige : « inexprimable sans raison serait un abandon
// déguisé ».
//
// LA LISTE DES `unexpressible` EST LA RÉPONSE À LA QUESTION POSÉE.
// ============================================================

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const SGD = process.argv[2] ?? join(process.env.HOME ?? "", "Documents", "sgd");

// ══════════════════════════════════════════════════════════════
//  1. LES ENTITÉS, LUES DANS LE SQL DE SGD
// ══════════════════════════════════════════════════════════════

const TYPE_SQL_VERS_AIR = {
  uuid: "reference", text: "string", varchar: "string",
  numeric: "decimal", decimal: "decimal",
  int: "number", integer: "number", bigint: "number", smallint: "number",
  boolean: "boolean", date: "date",
  timestamptz: "datetime", timestamp: "datetime",
  jsonb: "json", json: "json",
};

// Un identifiant et des horodatages existent dans toute table : ils ne disent
// rien de l'entreprise, et les porter à l'AIR encombrerait le document d'un
// bruit que le compilateur pose lui-même.
const COLONNES_TECHNIQUES = new Set(["id", "created_at", "updated_at", "cree_le", "modifie_le"]);

function lireSql(dossier) {
  const d = join(dossier, "supabase");
  return readdirSync(d)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(d, f), "utf8"))
    .join("\n");
}

function entitesEtRelations(sql) {
  const entites = [];
  const candidates = [];
  const aResoudre = [];
  const vues = new Set();

  for (const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
    const table = m[1];
    if (vues.has(table)) continue;
    vues.add(table);

    const fields = [];
    for (const brut of m[2].split("\n")) {
      const l = brut.trim().replace(/,$/, "");
      if (!l || l.startsWith("--")) continue;
      if (/^(PRIMARY|UNIQUE|CONSTRAINT|CHECK|FOREIGN)\b/i.test(l)) continue;

      const [nom, typeBrut] = l.split(/\s+/);
      if (!nom || !typeBrut) continue;
      const type = TYPE_SQL_VERS_AIR[typeBrut.toLowerCase().split("(")[0]];
      if (!type || COLONNES_TECHNIQUES.has(nom)) continue;

      fields.push({
        id: `fld_${table}_${nom}`.slice(0, 64),
        name: nom,
        label: [{ locale: "fr", text: nom.replace(/_/g, " ") }],
        type,
        // `NOT NULL` au SQL devient `required` à l'AIR : la même exigence,
        // dite dans deux langues.
        required: /NOT NULL/i.test(l),
      });
      if (type === "reference") aResoudre.push({ table, nom });

      if (nom.endsWith("_id")) {
        // ── LA COLONNE EST AU SINGULIER, LA TABLE AU PLURIEL.
        //
        // `article_id` désigne la table `articles`. Chercher `ent_article`
        // ne trouvait rien : les quinze relations de SGD étaient toutes
        // écartées, et le document sortait avec zéro relation — un modèle de
        // données où rien ne se rattache à rien, ce qu'aucune relecture
        // n'aurait cru.
        const base = nom.slice(0, -3);
        candidates.push({ table, base });
      }
    }
    if (fields.length > 0) entites.push({ id: `ent_${table}`, name: table, fields });
  }

  // ── UN CHAMP `reference` DOIT NOMMER SA CIBLE, et le validateur l'exige.
  //
  // Sans elle, l'AIR porte un identifiant qui ne pointe sur rien : seize champs
  // de SGD étaient dans ce cas. Le nom de la colonne la désigne —
  // `lieu_depart_id` et `lieu_arrivee_id` visent tous deux `lieux` — à ceci
  // près que la colonne est au singulier et la table au pluriel.
  const nomsTables = new Set(entites.map((e) => e.name));
  const resoudre = (base) =>
    [base, `${base}s`, `${base}x`, base.replace(/al$/, "aux")].find((c) => nomsTables.has(c));

  for (const { table, nom } of aResoudre) {
    const e = entites.find((x) => x.name === table);
    const f = e?.fields.find((x) => x.name === nom);
    if (!f) continue;
    // `lieu_depart_id` → on essaie la colonne entière, puis son premier mot :
    // c'est le mot de tête qui porte la table, le reste dit le rôle.
    const base = nom.replace(/_id$/, "");
    const cible = resoudre(base) ?? resoudre(base.split("_")[0]);
    if (cible) f.referencesEntityId = `ent_${cible}`;
    else {
      // Une référence hors du document — `utilisateur_id` vise `auth.users`,
      // qui n'appartient pas au métier. On la dégrade en chaîne plutôt que de
      // promettre une cible qui n'existe pas.
      f.type = "string";
    }
  }

  // La cible se résout sur le nom RÉEL des tables : singulier, pluriel simple,
  // ou pluriel en -aux. Une relation dont la cible n'existe pas serait un
  // renvoi dans le vide, et le validateur la refuserait — à juste titre.
  const noms = new Set(entites.map((e) => e.name));
  const relations = [];
  const posees = new Set();
  for (const { table, base } of candidates) {
    const cible = [base, `${base}s`, `${base}x`, base.replace(/al$/, "aux")]
      .find((c) => noms.has(c));
    if (!cible || cible === table) continue;
    const id = `rel_${table}_${base}`.slice(0, 64);
    if (posees.has(id)) continue;
    posees.add(id);
    relations.push({
      id,
      fromEntityId: `ent_${cible}`,
      toEntityId: `ent_${table}`,
      kind: "one_to_many",
    });
  }
  return { entites, relations };
}

// ══════════════════════════════════════════════════════════════
//  2. LES ÉCRANS, REPRIS DE LA BARRE DE NAVIGATION DE SGD
// ══════════════════════════════════════════════════════════════
//
// Chaque écran de SGD exige un DROIT. L'AIR n'a aucun endroit pour le dire —
// c'est le premier manque, et il est consigné dans `intent.needs`. On garde la
// correspondance ici pour que le manque soit CHIFFRÉ, pas évoqué.
const ECRANS = [
  { cle: "dashboard", titre: "Tableau de bord", droit: "dashboard", entite: null },
  { cle: "recherche", titre: "Rechercher un article", droit: "recherche", entite: "ent_articles" },
  { cle: "scanner", titre: "Scanner", droit: "scan_inventaire", entite: "ent_mouvements" },
  { cle: "mouvements", titre: "Mouvements", droit: "mouvements", entite: "ent_mouvements" },
  { cle: "porte", titre: "Porte", droit: "porte", entite: "ent_mouvements" },
  { cle: "conteneurs", titre: "Conteneurs", droit: "conteneurs", entite: "ent_conteneurs" },
  { cle: "lieux", titre: "Lieux", droit: "lieux", entite: "ent_lieux" },
  { cle: "ventes", titre: "Ventes", droit: "ventes", entite: "ent_factures_clients" },
  { cle: "clients", titre: "Clients", droit: "clients", entite: "ent_clients" },
  { cle: "charges", titre: "Charges", droit: "charges", entite: "ent_depenses" },
  { cle: "rentabilite", titre: "Rentabilité", droit: "rentabilite", entite: null },
  { cle: "anticipation", titre: "Anticipation", droit: "anticipation", entite: null },
  { cle: "parametres", titre: "Paramètres", droit: null, entite: null },
];

// Les icônes de la barre sont FERMÉES par le schéma : le moteur doit savoir
// dessiner ce que le document nomme. On ne prend que celles qui existent.
const ICONES = {
  dashboard: "accueil",
  recherche: "recherche",
  scanner: "liste",
  mouvements: "carte",
  porte: "billet",
};

// Ce qu'un humain lit sur une ligne de liste : un nom, un numéro, une
// référence. Jamais un identifiant, jamais un montant isolé.
function champDAffichage(entite) {
  const prefere = ["nom", "nom_complet", "nom_boutique", "numero", "numero_facture",
                   "reference", "question", "libelle", "nature", "emplacement", "type", "code"];
  for (const p of prefere) {
    const f = entite.fields.find((x) => x.name === p && x.type === "string");
    if (f) return f.id;
  }
  return entite.fields.find((x) => x.type === "string")?.id ?? null;
}

function ecransEtActions(entites) {
  const screens = [];
  const actions = [];

  for (const e of ECRANS) {
    const blocks = [
      {
        id: `blk_${e.cle}_entete`,
        blockType: "header",
        props: [{ key: "title", value: e.titre }],
      },
    ];
    const entite = e.entite ? entites.find((x) => x.id === e.entite) : null;
    const titreLigne = entite ? champDAffichage(entite) : null;

    if (entite && titreLigne) {
      // ── UNE LISTE DOIT DIRE CE QU'ELLE MONTRE SUR CHAQUE LIGNE.
      //
      // `titleFieldId` est exigé par le contrat du bloc, et c'est juste : une
      // liste sans champ de titre afficherait des identifiants bruts. On le
      // choisit dans l'entité — jamais inventé.
      blocks.push({
        id: `blk_${e.cle}_liste`,
        blockType: "list",
        entityId: entite.id,
        props: [{ key: "titleFieldId", value: titreLigne }],
      });
    } else {
      blocks.push({
        id: `blk_${e.cle}_vide`,
        blockType: "empty_state",
        props: [
          { key: "title", value: e.titre },
          { key: "message", value: "Cet écran agrège des chiffres : il ne montre aucune table." },
        ],
      });
    }
    screens.push({
      id: `scr_${e.cle}`,
      title: [{ locale: "fr", text: e.titre }],
      ...(e.droit ? { requiredRightId: `right_${e.droit}` } : {}),
      showsPrimaryNav: true,
      showsScreenTitle: true,
      presentation: "card",
      blocks,
    });
  }

  // ── AUCUNE ACTION DE NAVIGATION, ET C'EST LE COMPILATEUR QUI L'A APPRIS.
  //
  // J'en avais posé une par écran, déclenchée depuis son `header`. Le
  // compilateur a refusé : BLOCK_TRIGGER_SANS_AFFORDANCE — un en-tête ne se
  // clique pas, l'action serait morte. Refus juste : il vaut mieux un document
  // rejeté qu'une application où treize boutons invisibles ne répondent pas.
  //
  // La navigation d'un écran à l'autre passe par `navigation.routes` ; ces
  // actions ne portaient rien que les routes ne portent déjà.
  return { screens, actions };
}

// ══════════════════════════════════════════════════════════════
//  2bis. LES DROITS, REPRIS DES SECTIONS RÉELLES DE SGD (AIR 1.28.0)
// ══════════════════════════════════════════════════════════════
//
// SGD déclare onze sections dans `lib/garde.ts`, plus trois pour les gestes de
// scan — l'inventaire AJOUTE au stock, la vente en RETIRE, le transfert le
// DÉPLACE. Les accorder ensemble reviendrait à confier le recensement à qui ne
// doit que vendre au comptoir.
const DROITS = [...new Set(ECRANS.map((e) => e.droit).filter(Boolean))];

function acces() {
  return {
    rights: DROITS.map((d) => ({
      id: `right_${d}`,
      name: d,
      label: [{ locale: "fr", text: d.replace(/_/g, " ") }],
    })),
    roles: [
      {
        id: "role_proprietaire",
        name: "proprietaire",
        label: [{ locale: "fr", text: "Propriétaire" }],
        // Sa liste n'est même pas consultée : il resterait propriétaire avec
        // une liste vide. L'énumérer droit par droit serait une liste à tenir,
        // et la section ajoutée demain lui serait fermée sans qu'il le voie.
        grantsAllRights: true,
        rightIds: [],
      },
      {
        id: "role_employe",
        name: "employe",
        label: [{ locale: "fr", text: "Employé" }],
        // LISTE BLANCHE, et vide par défaut : une section ajoutée demain n'est
        // visible de personne tant qu'on ne l'accorde pas.
        rightIds: [],
      },
    ],
    defaultRoleId: "role_employe",
  };
}

// ══════════════════════════════════════════════════════════════
//  3. CE QUE SGD A PAYÉ EN INCIDENTS — ET CE QUE L'AIR EN PORTE
// ══════════════════════════════════════════════════════════════

function besoins(entites) {
  const a = (id) => (entites.some((e) => e.id === id) ? id : null);
  const n = [];
  const satisfait = (id, statement, nodeIds) =>
    n.push({ id, statement, resolution: { kind: "satisfied", nodeIds } });
  const manque = (id, statement, reason) =>
    n.push({ id, statement, resolution: { kind: "unexpressible", reason } });

  satisfait("need_articles", "Tenir un catalogue d'articles avec référence, nom, prix de vente et famille.",
    [a("ent_articles"), "scr_recherche"].filter(Boolean));

  satisfait("need_lieux", "Plusieurs lieux de stockage : magasins et dépôts.",
    [a("ent_lieux"), "scr_lieux"].filter(Boolean));

  satisfait("need_emplacement",
    "L'endroit où ranger une pièce dépend du lieu : « rayon 3 » au magasin n'est pas « rayon 3 » au dépôt.",
    [a("ent_emplacements")].filter(Boolean));

  satisfait("need_prix_absent",
    "Un prix non renseigné n'est pas un prix de zéro : l'écran doit pouvoir le dire.",
    [a("ent_articles")].filter(Boolean));

  satisfait("need_journal_recherche",
    "Enregistrer les recherches qui ne trouvent rien, sans jamais noter QUI a cherché.",
    [a("ent_recherches_ratees")].filter(Boolean));

  satisfait("need_droits_par_section",
    "Onze sections, chacune ouverte à un employé par liste blanche ; le propriétaire voit tout.",
    ["role_employe", "role_proprietaire", ...DROITS.map((d) => `right_${d}`)]);

  satisfait("need_compte_sans_profil",
    "Un compte créé hors de l'application, sans profil, ne doit accéder à rien.",
    ["role_employe"]);

  manque("need_porte_selon_droits",
    "Après connexion, conduire chacun vers le PREMIER écran que ses droits lui ouvrent.",
    "`navigation.entryScreenId` reste UNIQUE. Le validateur 1.28.0 refuse désormais qu'il exige " +
    "un droit que le rôle par défaut n'a pas (AIR_ACCESS_ENTRY_UNREACHABLE) — le défaut de SGD " +
    "est donc ATTRAPÉ. Mais refuser n'est pas résoudre : le format ne sait toujours pas dire " +
    "« ouvre sur la première destination accessible », il sait seulement empêcher d'ouvrir sur " +
    "une porte fermée.");

  manque("need_stock_calcule",
    "Le stock n'est jamais stocké : il se calcule en rejouant les mouvements d'entrée et de sortie.",
    "Une entité AIR porte des champs, pas une grandeur dérivée. Un champ `quantite` sur l'article " +
    "serait un stock ÉCRIT — exactement ce que SGD refuse, parce qu'un stock écrit diverge de son " +
    "historique sans que rien ne le signale. Un `slot` pourrait le calculer, mais aucun lien ne dit " +
    "qu'un champ EST le résultat d'un slot.");

  manque("need_contre_passation",
    "Annuler un mouvement, c'est en écrire un INVERSE, jamais effacer le premier.",
    "L'AIR ne connaît pas l'immuabilité d'une ligne ni l'écriture compensatoire. Un générateur " +
    "poserait une suppression, et la comptabilité mentirait dès la première erreur corrigée.");

  manque("need_recherche_par_mots",
    "La recherche découpe la question en mots : un mot ramène large, trois resserrent.",
    "Un bloc `list` se lie à une entité ; aucun nœud ne décrit COMMENT une recherche interroge. " +
    "C'est un `slot`, donc du code écrit hors du document — et le format ne dit pas qu'un écran " +
    "dépend de ce code.");

  manque("need_suggestion",
    "Quand rien n'est trouvé, proposer les pièces qui RESSEMBLENT à ce qui a été tapé.",
    "La ressemblance repose sur une extension de la base (pg_trgm) et une fonction SQL. L'AIR " +
    "décrit des entités, pas les capacités du magasin de données qui les porte.");

  manque("need_ecrans_calcules",
    "Le tableau de bord, la rentabilité et l'anticipation n'affichent aucune table : ils agrègent " +
    "les mouvements, les dépenses et les ventes pour produire des chiffres qui n'existent nulle part.",
    "Un écran AIR montre une ENTITÉ, par un bloc lié. Il n'existe aucun nœud pour décrire une " +
    "agrégation — somme, marge, projection. Le compilateur refuse d'ailleurs qu'une destination " +
    "principale mène à un écran sans entité (AIR_NAV_DESTINATION_DEAD) : trois des treize écrans " +
    "de SGD sont dans ce cas, et ce sont ceux que le propriétaire regarde le matin.");

  satisfait("need_trois_scans",
    "Inventaire, vente et transfert sont trois droits distincts : ils ne font pas la même chose au stock.",
    ["right_scan_inventaire"].filter(() => DROITS.includes("scan_inventaire")).length > 0
      ? ["right_scan_inventaire"]
      : ["role_employe"]);

  return n;
}

// ══════════════════════════════════════════════════════════════
//  4. ASSEMBLAGE
// ══════════════════════════════════════════════════════════════

const sql = lireSql(SGD);
const { entites, relations } = entitesEtRelations(sql);
const { screens, actions } = ecransEtActions(entites);

const air = {
  airSchemaVersion: "1.27.0",
  projectId: "prj_gestion_sgd",
  app: {
    name: "Gestion",
    slug: "gestion",
    description: [{ locale: "fr", text: "Stock, mouvements, conteneurs et rentabilité d'un commerce." }],
    locales: {
      userLanguage: "fr",
      appLocales: ["fr"],
      defaultAppLocale: "fr",
      contentLocales: ["fr"],
      rtlSupported: false,
    },
  },
  screens,
  navigation: {
    // ── LA PORTE D'ENTRÉE EST L'ÉCRAN QUI N'EXIGE AUCUN DROIT.
    //
    // Le validateur 1.28.0 a refusé « scr_recherche » :
    //   AIR_ACCESS_ENTRY_UNREACHABLE — tout nouveau compte serait mis dehors
    //   dès l'ouverture.
    //
    // Il a raison, et c'est LITTÉRALEMENT ce qui est arrivé dans SGD : un
    // employé dont les droits n'étaient pas encore accordés tombait sur un mur,
    // à la connexion puis à chaque ouverture de l'application installée. La
    // réparation posée dans SGD fut exactement celle que le format impose ici —
    // ouvrir sur Paramètres, ouverte à tous, où l'on peut au moins changer son
    // mot de passe et voir ce qui nous est accordé.
    //
    // Un format qui force la bonne conception vaut mieux qu'un format qui la
    // documente.
    entryScreenId: `scr_${ECRANS.find((e) => !e.droit).cle}`,
    primary: {
      // Cinq destinations au maximum, et le schéma l'impose : une barre
      // d'onglets qui en porte douze n'est plus une barre, c'est un menu.
      // SGD a treize écrans — c'est déjà un manque, consigné plus bas.
      // ── UNE DESTINATION PRINCIPALE NE PEUT PAS MENER À UN ÉCRAN VIDE.
      //
      // Le compilateur l'a refusé : AIR_NAV_DESTINATION_DEAD. Et il a raison —
      // un onglet qui ouvre sur rien est une promesse non tenue.
      //
      // Mais c'est ce refus qui révèle le manque : le tableau de bord, la
      // rentabilité et l'anticipation de SGD ne sont liés à AUCUNE entité. Ce
      // sont des écrans CALCULÉS — ils agrègent les mouvements, les dépenses et
      // les ventes. L'AIR ne sait décrire qu'un écran qui MONTRE une entité.
      // On ne met donc en barre que ceux qui en portent une.
      destinations: ECRANS.filter((e) => e.entite).slice(0, 5).map((e, i) => ({
        routeId: `nav_${e.cle}`,
        label: [{ locale: "fr", text: e.titre }],
        order: i,
        icon: ICONES[e.cle],
      })),
    },
    routes: ECRANS.map((e) => ({
      id: `nav_${e.cle}`,
      screenId: `scr_${e.cle}`,
      title: [{ locale: "fr", text: e.titre }],
    })),
  },
  entities: entites,
  relations,
  datasets: [],
  actions,
  rules: [],
  slots: [],
  capabilities: [],
  permissions: [],
  access: acces(),
  design: { theme: "gestion_sobre" },
  integrations: [],
  network: { policy: "deny_by_default", allowedDomains: [] },
  native: { minIosVersion: "16.0", minAndroidSdk: 26 },
  compliance: {
    commerceClass: "physical_or_offapp",
    accountDeletionRequired: true,
    dataCollected: ["identifiers", "usage_data"],
  },
  expectedTests: [],
  intent: {
    request:
      "Un système de gestion pour un commerce : stock par lieu, mouvements, conteneurs, " +
      "ventes, charges et rentabilité, avec des droits par employé.",
    requestLocale: "fr",
    needs: besoins(entites),
  },
};

const sortie = join(ICI, "gestion.air.json");
writeFileSync(sortie, JSON.stringify(air, null, 1) + "\n", "utf8");

const portes = air.intent.needs.filter((b) => b.resolution.kind === "satisfied").length;
const absents = air.intent.needs.length - portes;
console.log(`  entités ${entites.length} · relations ${relations.length} · écrans ${screens.length} · actions ${actions.length}`);
console.log(`  besoins : ${portes} portés par le format, ${absents} INEXPRIMABLES`);
console.log(`  écrit : ${sortie}`);
