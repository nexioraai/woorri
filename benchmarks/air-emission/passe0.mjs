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
import { clampMinItems, stripKeys } from "./schema-levels.mjs";
import {
  GESTES,
  GESTES_TERMINAUX,
  GLOSSAIRE_NATURES_TEMPORELLES,
  NATURES_ATTRIBUT,
  RAISONS_NON_RETENUE,
  inventaireDe,
  modeleMetierSchema,
  strategieInitiale,
  validerModele,
} from "./modele-metier.mjs";

/** Grammaire DÉRIVÉE du contrat — jamais réécrite à côté. Le seul
 * traitement est `clampMinItems` (transformation RATIFIÉE de l'échelle,
 * leçon EP-021 : l'API refuse minItems > 1 ; le contrat porte des min(2)). */
export function grammaireP0() {
  // EP-033-ter (mesuré au premier lancement, 400 AVANT facturation) : l'API
  // refuse minimum/maximum sur les entiers — retirés par l'outil RATIFIÉ de
  // l'échelle (stripKeys). Chaque contrainte retirée est ÉNUMÉRÉE par le
  // cliquet V-A et REFERMÉE par P1 (le contrat complet juge la sortie).
  return stripKeys(
    clampMinItems(z.toJSONSchema(modeleMetierSchema, { target: "draft-2020-12" })),
    ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"],
  );
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
  "· états métier structurés (etats: [{id, transitions: [{vers, geste}]}] — une transition est causée par un geste qui ÉCRIT, jamais par une lecture)",
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
export function jugerSortieP0(texteBrut, brief) {
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
    observation = {
      tailleInventaire: inventaire.length,
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
