// PASSE 0 — INTÉGRATION MINIMALE (arbitrage post-R3, 2026-09-11). 0 $.
//
// CE MODULE CONSTRUIT L'INSTRUMENT DU DRY-RUN ; IL N'EXÉCUTE RIEN :
// aucun SDK, aucun réseau — le futur lanceur (GO budgétaire dédié)
// assemblera requête + appel + jugement. Point d'invocation UNIQUE :
// `construireRequeteP0` (l'énoncé) et `jugerSortieP0` (le verdict,
// fail-closed). Rien n'est branché sur un chemin automatique — emit-v3
// n'importe pas ce module (vérifié par test).
//
// LE PROMPT EST ÉCRIT À PARTIR DU CONTRAT SEUL : chaque liste est
// INTERPOLÉE depuis modele-metier (une source) ; l'exemple est ABSTRAIT
// (noms neutres), dans AUCUN domaine des 7 ni du hold-out ; la fixture
// kaviva-modele.json N'A PAS été consultée pour le rédiger — elle est la
// RÉPONSE ATTENDUE du dry-run, pas une pièce de l'énoncé.
import { z } from "zod";
import {
  GESTES,
  NATURES_EXOGENES,
  GESTES_TERMINAUX,
  consommateursDIdentite,
  sourcesDIdentite,
  gestesParcoursDeCollection,
  TABLE_GESTES,
  GLOSSAIRE_NATURES_TEMPORELLES,
  NATURES_ATTRIBUT,
  RAISONS_NON_RETENUE,
  inventaireDe,
  verifierCouvertureLexicale,
  modeleMetierSchema,
  strategieInitiale,
  validerModele,
} from "./modele-metier.mjs";

/** Grammaire DÉRIVÉE du contrat — CANONIQUE, sans aucun traitement :
 * les dégradations de dialecte appartiennent à l'ADAPTATEUR (EP-051). */
export function grammaireP0() {
  // EP-051 — la grammaire est CANONIQUE : le contrat, rien que le contrat
  // (min(2), bornes numériques : PRÉSENTS — preuve qu'aucun dialecte n'a
  // fui ici). Les dégradations fournisseur vivent dans l'ADAPTATEUR, qui
  // les DÉCLARE (degraderGrammaire) ; chaque écart reste refermé par P1.
  return z.toJSONSchema(modeleMetierSchema, { target: "draft-2020-12" });
}

export const PROMPT_P0 = [
  "Tu es P0 : l'UNIQUE lecteur du texte libre d'une demande d'application.",
  "Tu produis UN objet JSON conforme au contrat modele-metier/1.1.0 — rien d'autre.",
  "",
  "DÉCISIONS QUI T'APPARTIENNENT (les FAITS du métier, jamais leur mise en forme) :",
  "acteurs · concepts (donnees, identifiant, attributs — natures fermées : " + NATURES_ATTRIBUT.join(", ") + ")",
  "· relations (possede|reference) · parcours ordonnés par importance (acteur, besoin, étapes)",
  "· étapes (concept × geste — gestes FERMÉS : " + GESTES.join(", ") + " ; etat et preconditions si utiles)",
  "GLOSSAIRE TEMPOREL (D6 O-1 — ces trois mots ne sont pas interchangeables) : " +
    Object.entries(GLOSSAIRE_NATURES_TEMPORELLES).map(([k, v]) => k + " = " + v).join(" · ") + ".",
  "· états métier structurés (etats: [{id, transitions: [{vers, geste}]}]) — une transition d'état est causée par un geste MUTANT ; gestes mutants (dérivés de la table) : " +
    GESTES.filter((g) => TABLE_GESTES[g].effet === "mutation").join(", ") +
    " ; les autres gestes LISENT et ne transitent jamais un état.",
  "· `etat` sur une ÉTAPE = FILTRE CONSOMMÉ (gestes de lecture uniquement) ; l'état-CIBLE d'une écriture se déclare dans les transitions du concept, JAMAIS sur l'étape.",
  "· CHAQUE IDENTITÉ CONSOMMÉE NAÎT DANS SON PARCOURS : une étape " +
    GESTES.filter((g) => TABLE_GESTES[g].transport === "itemId").join("/") +
    " sur un concept exige, EN AMONT DU MÊME PARCOURS, une étape du MÊME concept parmi " +
    sourcesDIdentite().join(", ") +
    " (les gestes " + GESTES.filter((g) => !sourcesDIdentite().includes(g)).join("/") +
    " sont traversés sans rompre la chaîne). Un parcours qui consomme une identité venue d'ailleurs est REFUSÉ.",
  "· CHAQUE BOUT D'UNE RELATION EST UN CONCEPT DÉCLARÉ : relations[].de et relations[].vers ne portent QUE des ids présents dans concepts[] — une relation vers un concept absent est REFUSÉE (déclare le concept, ou retire la relation).",
  "· payer = un paiement QUI A LIEU DANS L'APPLICATION — c'est le seul des gestes d'écriture (" +
    GESTES.filter((g) => TABLE_GESTES[g].effet === "mutation").join("/") +
    ") qui déclenche une capacité de paiement. Un paiement à la réception, sur place ou hors application N'EST PAS un geste payer : le parcours s'écrit SANS payer et le modèle ne porte PAS de champ commerce.",
  "· TRANSITION EXOGÈNE : quand un état change SANS acte de l'utilisateur (le système, le temps, un événement du monde), la transition se déclare {vers, exogene: " +
    NATURES_EXOGENES.join("|") +
    "} — JAMAIS un geste que personne n'accomplit. L'état atteint doit rester VISIBLE : une étape de lecture le consomme (etat), sinon le modèle est refusé.",
  "· AUCUN TABLEAU EXIGÉ NE RESTE VIDE — chacun porte AU MOINS un élément : " +
    cheminsMinItems().join(" · ") +
    ". Un tableau vide à l'un de ces chemins est REFUSÉ (mesuré : un fournisseur sans grammaire imposée a rendu noeuds vide — EP-085).",
  "· CHAQUE TRANSITION DÉCLARÉE EST EXERCÉE : une transition {vers, geste} d'un concept exige, dans un parcours, une étape de CE geste (" +
    GESTES.filter((g) => TABLE_GESTES[g].effet === "mutation").join("/") +
    ") sur CE concept — une machine à états plus riche que les parcours est REFUSÉE.",
  "· ÉLIRE X POUR PARCOURIR Y RELIÉ À X : une élection (choisir X) est aussi consommée par une étape " +
    gestesParcoursDeCollection().join("/") +
    " sur un concept Y ≠ X, À CONDITION qu'une relation entre X et Y soit DÉCLARÉE dans relations — déclare le lien, sinon l'élection est refusée.",
  "· TOUTE ÉLECTION DOIT ÊTRE CONSOMMÉE : une étape choisir sur un concept X EXIGE, EN AVAL DU MÊME PARCOURS, l'une de ces trois suites — " +
    "(a) " + consommateursDIdentite().join("/") + " du MÊME concept X ; (b) saisir un concept dont la portée est l'instance de X ; " +
    "(c) " + gestesParcoursDeCollection().join("/") + " d'un concept Y relié à X par une relation DÉCLARÉE. " +
    "Une élection que rien ne consomme est REFUSÉE : n'écris choisir que si le parcours en fait quelque chose ensuite.",
  "· commerce (\"digital\" | \"physique_ou_hors_app\") — REQUIS si un parcours contient payer, interdit sinon",
  "· couverture (voir ci-dessous).",
  "",
  "DÉCISIONS INTERDITES — elles appartiennent aux dérivations mécaniques, toute clé hors contrat est REFUSÉE :",
  "écrans, nombre d'écrans, mise en page, maille, zones, défilement, navigation, thème, composants, composition visuelle.",
  "",
  "COUVERTURE OBLIGATOIRE — ta redevabilité lexicale :",
  "chaque terme significatif du brief est SOIT couvert (couverts: [{terme, noeuds: [ids du modèle qui le portent]}]),",
  "SOIT écarté avec une raison FERMÉE (nonRetenus: [{terme, raison}]) parmi : " + RAISONS_NON_RETENUE.join(", ") + ".",
  "« ambigu » ne classe pas : il BLOQUE le modèle entier — résous l'ambiguïté en modélisant, ou laisse-la pour refus explicite.",
  "NE DÉVERSE PAS le brief dans nonRetenus : chaque objet que l'application doit servir devient concept, acteur ou parcours.",
  "",
  // EP-184 — DEUX RÈGLES DE PRODUIT, TRANSMISES AVANT D'ÊTRE JUGÉES.
  //
  // ARBITRAGE DE YOUSSOUF, et sa raison vaut pour la suite : refuser en
  // fail-closed ce qu'on n'a JAMAIS DEMANDÉ, c'est faire porter au générateur
  // une règle qu'il ignore. Douze occurrences du motif l'ont montré. On
  // transmet d'abord ; si cela persiste APRÈS transmission, alors c'est un
  // fait sur le modèle, et on jugera.
  //
  // MESURÉ AVANT D'ÉCRIRE : 15 modèles sur 39 font publier sans compte,
  // 7 sur 39 ouvrent sur un écran qui ne montre aucun contenu. Les deux juges
  // existent (`jugerPublicationSansCompte`, `jugerEntreeSansCollection`),
  // sont éprouvés, et RESTENT débranchés tant que la transmission n'a pas été
  // mesurée.
  "",
  "DEUX RÈGLES DE PRODUIT — elles valent pour TOUT domaine, sans exception :",
  "① QUI PUBLIE DOIT POUVOIR S'IDENTIFIER. Si un acteur produit du contenu que",
  "  d'autres consultent, quel qu'en soit l'objet,",
  "  alors le modèle porte un concept d'IDENTITÉ (la personne qui publie) et son",
  "  parcours passe par le geste `" + "s_identifier" + "`. Sans cela tu décris une application",
  "  où l'on publie sans compte : l'action n'a nulle part où vivre, et un visiteur",
  "  voit une action qu'il ne peut pas accomplir.",
  "② L'OUVERTURE MONTRE DU CONTENU. Le parcours le plus important commence par",
  "  PRÉSENTER la collection principale du domaine, quelle qu'elle soit,",
  "  avec un geste qui la LISTE. Un champ de recherche et un formulaire de critères",
  "  ne montrent RIEN tant que l'utilisateur n'a pas tapé : ils se posent AU-DESSUS",
  "  d'une liste, jamais à sa place. La première impression est ce que l'on voit,",
  "  pas ce que l'on doit remplir.",
  "",
  "RÈGLES DE FORME (refusées mécaniquement sinon) :",
  "ids ^[a-z][a-z0-9_]*$ · un concept donnees=true est traversé par au moins une étape ·",
  "chaque parcours a ≥ 2 étapes et se TERMINE par un geste observable (" + GESTES_TERMINAUX.join(", ") + ") ·",
  "chaque acteur agit dans ≥ 1 parcours · un état cible d'une transition est DISTINGUÉ par une étape (etat).",
  "",
  "EXEMPLE ABSTRAIT (structure seulement — AUCUN domaine) :",
  '{"version":"modele-metier/1.1.0","couverture":{"couverts":[{"terme":"objets","noeuds":["cpt_objet"]}],"nonRetenus":[]},',
  '"acteurs":[{"id":"act_utilisateur","nom":"Utilisateur"}],',
  '"concepts":[{"id":"cpt_objet","nom":"Objet","donnees":true,"attributs":[{"id":"att_objet_nom","nature":"texte","requis":true}]}],',
  '"relations":[],"parcours":[{"id":"par_principal","besoin":"voir les objets","acteur":"act_utilisateur",',
  '"etapes":[{"concept":"cpt_objet","geste":"decouvrir"},{"concept":"cpt_objet","geste":"consulter"}]}]}',
  "",
  "SORTIE : uniquement le JSON du modèle, sans texte autour.",
].join("\n");

/** LE point d'invocation (énoncé) — non branché, consommé par le seul
 * lanceur de dry-run sous GO budgétaire. */
/** EP-086 — les chemins à minItems ≥ 1, DÉRIVÉS de la grammaire canonique
 * (jamais recopiés) : la ligne v10 les interpole, le cliquet les recalcule.
 * Lisibles : properties/items effacés, forme humaine `a.b[].c`. */
export function cheminsMinItems() {
  const chemins = [];
  const marcher = (n, chemin) => {
    if (n === null || typeof n !== "object") return;
    for (const [k, v] of Object.entries(n)) {
      if (k === "minItems" && typeof v === "number" && v >= 1) chemins.push(chemin || "racine");
      if (typeof v === "object") {
        const suite = k === "properties" || k === "items" || k === "$defs" ? chemin + (k === "items" ? "[]" : "") : chemin + (chemin ? "." : "") + k;
        marcher(v, k === "properties" || k === "items" || k === "$defs" ? suite : suite);
      }
    }
  };
  marcher(grammaireP0(), "");
  return [...new Set(chemins)].sort();
}

export function construireRequeteP0(brief) {
  return {
    system: PROMPT_P0,
    user: "DEMANDE DU CLIENT :\n" + brief,
    grammaire: grammaireP0(),
  };
}

/**
 * AMENDEMENT 2.1 (EP-030, ratifié) — PRÉSENCE STRUCTURELLE, PAS NOMINALE :
 * trois concepts DISTINCTS isomorphes à la fixture manuelle —
 * (i) une prestation porteuse d'attributs descriptifs (≥ 2) ;
 * (ii) une ressource temporelle bornée (attribut nature « intervalle » requis) ;
 * (iii) un engagement reliant l'acteur et la ressource, porteur d'états,
 *       créé en application (stratégie initiale « vide »).
 * LES NOMS NE COMPTENT PAS.
 */
export function critereDryRunKaviva(modele) {
  const prestations = modele.concepts.filter(
    (c) => c.donnees && (c.attributs ?? []).length >= 2,
  );
  const ressources = modele.concepts.filter((c) =>
    (c.attributs ?? []).some((a) => a.nature === "intervalle" && a.requis === true),
  );
  const engagements = modele.concepts.filter(
    (c) =>
      (c.etats ?? []).length > 0 &&
      strategieInitiale(modele, c.id) === "vide" &&
      prestations.some((p2) => p2.id !== c.id && modele.relations.some(
        (r) => r.de === c.id && r.vers === p2.id,
      )) &&
      ressources.some((r2) => r2.id !== c.id && modele.relations.some(
        (r) => r.de === c.id && r.vers === r2.id,
      )),
  );
  const trouves = {
    prestation: prestations.map((c) => c.id),
    ressourceTemporelle: ressources.map((c) => c.id),
    engagement: engagements.map((c) => c.id),
  };
  const distincts =
    engagements.length > 0 &&
    prestations.some((p2) => !engagements.includes(p2)) &&
    ressources.some((r2) => !engagements.includes(r2));
  return { pass: distincts, trouves };
}

/**
 * LE point d'invocation (verdict) — FAIL-CLOSED : une sortie sans
 * couverture conforme est REFUSÉE, jamais complétée par défaut. Porte
 * aussi l'OBSERVATION 2.3 (enregistrée, non jugée) : part de l'inventaire
 * versée dans nonRetenus, distribution des raisons.
 */
export function jugerSortieP0(texteBrut, brief, meta) {
  // §2 (décision arbitre) — une TRONCATURE n'est pas un JSON malformé :
  // confondre les deux fait passer un défaut d'INSTRUMENT pour un défaut
  // de modèle. Le signal est NEUTRE (meta.tronquee) : c'est l'ADAPTATEUR
  // qui mappe le dialecte du fournisseur (stop_reason, finish_reason…) —
  // ce module n'en connaît aucun (§1, indépendance fournisseur).
  if (meta?.tronquee === true) {
    return {
      ok: false,
      diagnostics: [{ code: "P0_SORTIE_TRONQUEE", path: "", message: "sortie coupée par une borne d'instrument — le tirage a mesuré le plafond, pas P0" }],
    };
  }
  let brut;
  try {
    brut = JSON.parse(texteBrut);
  } catch {
    return { ok: false, diagnostics: [{ code: "P0_SORTIE_NON_JSON", path: "", message: "sortie non parsable" }] };
  }
  const diagnostics = validerModele(brut);
  const ok = diagnostics.length === 0;
  let observation;
  if (brut !== null && typeof brut === "object" && brut.couverture !== undefined) {
    const inventaire = inventaireDe(brief);
    const normalise = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const nonRetenusTexte = (brut.couverture.nonRetenus ?? [])
      .map((x) => normalise(String(x.terme ?? "")))
      .join(" ");
    const couvertsTexte = (brut.couverture.couverts ?? [])
      .map((x) => normalise(String(x.terme ?? "")))
      .join(" ");
    const dansNonRetenus = inventaire.filter(
      (t) => nonRetenusTexte.includes(t) && !couvertsTexte.includes(t),
    );
    const distributionRaisons = {};
    for (const x of brut.couverture.nonRetenus ?? []) {
      distributionRaisons[x.raison] = (distributionRaisons[x.raison] ?? 0) + 1;
    }
    // EP-162 ② — LE JUGE DE COUVERTURE LEXICALE EST BRANCHÉ ICI.
    //
    // ICI ET NULLE PART AILLEURS : il exige le BRIEF, que `validerModele`
    // n'a pas. C'est exactement pourquoi il était resté débranché depuis
    // R2/C1 — sa signature ne rentrait pas dans le seul juge appelé.
    //
    // RÉGIME OBSERVANT, ET C'EST UN ARBITRAGE, PAS UN OUBLI.
    // `MODELE_TERME_NON_JUSTIFIE` est classé `faute_de_production` : en
    // fail-closed il déclencherait un re-tirage. MESURÉ sur 34 archives :
    // 156 diagnostics subsistent après la règle des gestes, dominés par des
    // mots-outils que `STOPWORDS_FR` ne connaît pas — « directement » 17
    // fois, « quand », « veux », « petit ». Refuser un tirage là-dessus
    // serait refuser un adverbe. La lacune est DANS L'INVENTAIRE, pas dans
    // ce juge : `STOPWORDS_FR` est une liste écrite à la main. L'allonger
    // de sept mots ici serait la onzième occurrence du motif — donc non.
    // Le passage en fail-closed est dû quand l'inventaire cesse d'être une
    // liste manuelle (L-162-A).
    const couvertureLexicale = verifierCouvertureLexicale(inventaire, brut);
    observation = {
      tailleInventaire: inventaire.length,
      termesNonJustifies: couvertureLexicale.map((x) => x.path),
      partInventaireEnNonRetenus:
        inventaire.length === 0 ? 0 : dansNonRetenus.length / inventaire.length,
      distributionRaisons,
    };
  }
  return {
    ok,
    ...(ok ? { modele: brut } : {}),
    diagnostics,
    ...(observation === undefined ? {} : { observation }),
    ...(ok ? { critereKaviva: critereDryRunKaviva(brut) } : {}),
  };
}
