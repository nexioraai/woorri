// EP-081 · ② — SECOND ADAPTATEUR FOURNISSEUR (OpenAI), CONSTRUCTION 0 $.
//
// LA PREUVE QUE CETTE CONSTRUCTION APPORTE : la frontière EP-049 suffit —
// ce module expose EXACTEMENT la même surface que adaptateur-anthropic.mjs
// (parité vérifiée par cliquet) et AUCUN fichier du moteur n'a été touché
// pour l'écrire. Si un second adaptateur avait exigé de modifier le moteur,
// la frontière était incomplète — cela se sait sans dépenser un centime.
//
// CE QUE CE MODULE NE PRÉTEND PAS : ses CONTRAINTES_GRAMMAIRE sont
// DÉCLARÉES, PAS MESURÉES (aucun tirage n'a eu lieu — la discipline
// déclaré≡mesuré≡épinglé de l'adaptateur anthropic exige un tirage, qui
// attend la clé du propriétaire). Le tirage jugera la PRODUCTIBILITÉ DU
// CONTRAT par un modèle indépendant — pas la qualité du modèle produit.
import { clampMinItems, stripKeys, makeLevels } from "./schema-levels.mjs";

export const CONFIG = {
  fournisseur: "openai",
  model: "gpt-5.2",
  cheminCle: ["apps", "web", ".env.local"],
  motifCle: /^OPENAI_API_KEY=("?)([^"\n]+)\1$/m,
  // Tarifs PARAMÈTRES (à confirmer au jour du tirage — consignés au GO).
  prixParMtok: { entree: 1.75, ecritureCache: 0, lectureCache: 0.175, sortie: 14 },
};

/** DÉCLARÉES, NON MESURÉES (tirage dû) : les sorties structurées OpenAI
 * exigent additionalProperties:false et required exhaustif ; minItems et
 * bornes numériques non garantis — même échelle de repli que le premier
 * adaptateur, mesure au premier tirage. */
export const CONTRAINTES_GRAMMAIRE = {
  minItemsMax: 1,
  bornesNumeriquesEntiers: false,
};

/** Grammaire canonique → dialecte, ÉCARTS DÉCLARÉS (même contrat de sortie
 * que le premier adaptateur : { grammaire, ecarts[] } trié). */
export function degraderGrammaire(canonique) {
  const grammaire = stripKeys(clampMinItems(canonique), [
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
  ]);
  const ecarts = [];
  const marcher = (a, b, chemin) => {
    if (a === null || typeof a !== "object") return;
    for (const k of Object.keys(a)) {
      const av = a[k];
      const bv = b?.[k];
      if (k === "minItems" && av !== bv) ecarts.push(`${chemin}.minItems ${av}→${bv}`);
      else if (["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"].includes(k) && bv === undefined)
        ecarts.push(`${chemin}.${k} ${av}→retiré`);
      else if (typeof av === "object") marcher(av, bv, `${chemin}.${k}`);
    }
  };
  marcher(canonique, grammaire, "$");
  return { grammaire, ecarts: ecarts.sort() };
}

/** L'échelle de dégradation — même déclaration que le premier adaptateur. */
export function degradationsPourEchelle(jsonSchema) {
  return makeLevels(jsonSchema);
}

/** Requête neutre {system, user, grammaire} → charge utile du dialecte. */
export function construireAppel(requete, reglages) {
  return {
    model: CONFIG.model,
    max_completion_tokens: reglages.max_tokens,
    messages: [
      { role: "system", content: requete.system },
      { role: "user", content: requete.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "sortie", strict: true, schema: requete.grammaire },
    },
  };
}

/** Réponse du dialecte → SIGNAL NEUTRE (personne d'autre ne lit finish_reason). */
export function lireReponse(reponse) {
  const choix = (reponse.choices ?? [])[0] ?? {};
  const usage = reponse.usage ?? {};
  return {
    texte: choix.message?.content ?? "",
    tronquee: choix.finish_reason === "length",
    refusee: choix.finish_reason === "content_filter" || choix.message?.refusal != null,
    usage: {
      entree: usage.prompt_tokens ?? 0,
      sortie: usage.completion_tokens ?? 0,
      ecritureCache: 0,
      lectureCache: usage.prompt_tokens_details?.cached_tokens ?? 0,
    },
  };
}

/** Coût réel d'un usage NEUTRE, aux tarifs de CE fournisseur. */
export function coutUsd(usageNeutre) {
  const p = CONFIG.prixParMtok;
  return (
    (usageNeutre.entree * p.entree +
      usageNeutre.ecritureCache * p.ecritureCache +
      usageNeutre.lectureCache * p.lectureCache +
      usageNeutre.sortie * p.sortie) / 1e6
  );
}

/** Refus de GRAMMAIRE (dégradable) — par STATUT structuré, jamais par texte. */
export function estErreurGrammaire(erreur) {
  return erreur?.status === 400;
}

/** SEUL point SDK. La FAÇADE est celle du contrat d'appel neutre :
 * client.messages.create(appel) — le dialecte (chat.completions) vit ici. */
export async function creerClient(lireFichier, options = {}) {
  const contenu = lireFichier(CONFIG.cheminCle);
  const m = contenu.match(CONFIG.motifCle);
  if (!m) throw new Error("ADAPTATEUR_CLE_INTROUVABLE");
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: m[2].trim(), ...options });
  return { messages: { create: (appel) => client.chat.completions.create(appel) } };
}

/** Usage BRUT du dialecte → usage NEUTRE (pour les comptabilités). */
export function lireUsage(usageBrut) {
  const u = usageBrut ?? {};
  return {
    entree: u.prompt_tokens ?? 0,
    sortie: u.completion_tokens ?? 0,
    ecritureCache: 0,
    lectureCache: u.prompt_tokens_details?.cached_tokens ?? 0,
  };
}

/** Charge utile campagne — même surface que le premier adaptateur. */
export function construireAppelCampagne(requete, reglages) {
  return construireAppel(requete, reglages);
}
