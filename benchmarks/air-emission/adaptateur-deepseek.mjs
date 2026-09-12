// EP-082 — TROISIÈME ADAPTATEUR FOURNISSEUR (DeepSeek), CONSTRUCTION 0 $.
//
// PARAMÉTRAGE OU TROISIÈME FICHIER ? — TRANCHÉ : troisième fichier. Le
// transport de DeepSeek est compatible OpenAI (même SDK, base URL), mais le
// DIALECTE diffère là où ça compte : la sortie structurée est `json_object`
// (le schéma N'EST PAS imposé au décodage — pas de json_schema strict), et
// l'usage porte des champs de cache propres (prompt_cache_hit/miss_tokens).
// Paramétrer adaptateur-openai n'aurait couvert que base URL/modèle/tarifs
// et fait mentir sa déclaration de grammaire. Chaque dialecte se déclare
// chez lui — c'est la frontière EP-049.
//
// DÉGRADATION MAJEURE, DÉCLARÉE (jamais mesurée par essais payants — le
// tirage la mesurera, GO budgétaire séparé) : le schéma canonique n'est PAS
// imposé par le décodeur — il est TRANSMIS EN TEXTE (renfort), et la
// conformité est REFERMÉE PAR P1 (jugerSortieP0 refuse toute sortie hors
// contrat). Écart compté à la veille EP-037.
export const CONFIG = {
  fournisseur: "deepseek",
  model: "deepseek-chat",
  baseURL: "https://api.deepseek.com",
  cheminCle: ["apps", "web", ".env.local"],
  motifCle: /^DEEPSEEK_API_KEY=("?)([^"\n]+)\1$/m,
  // Tarifs PARAMÈTRES (à confirmer au GO du tirage — consignés alors).
  prixParMtok: { entree: 0.27, ecritureCache: 0, lectureCache: 0.07, sortie: 1.1 },
};

/** DÉCLARÉES, PAS MESURÉES : aucune contrainte de schéma n'est imposée au
 * décodage — la contrainte est TOTALE (le mode json_schema n'existe pas
 * chez ce fournisseur, seul json_object garantit du JSON). */
export const CONTRAINTES_GRAMMAIRE = {
  schemaImpose: false,
  minItemsMax: null,
  bornesNumeriquesEntiers: null,
};

/** Grammaire canonique → dialecte : le schéma reste INTACT (rien n'est
 * clampé — rien n'est imposé) ; L'ÉCART DÉCLARÉ est le mode lui-même. */
export function degraderGrammaire(canonique) {
  return {
    grammaire: canonique,
    ecarts: ["$ json_schema→json_object : schéma NON imposé au décodage — transmis en texte, conformité refermée par P1"],
  };
}

/** Échelle de dégradation : UN seul niveau — il n'existe pas de refus de
 * grammaire à degrés quand aucune grammaire n'est imposée. */
export function degradationsPourEchelle(jsonSchema) {
  return [{ name: "json-object-texte", schema: jsonSchema }];
}

/** Requête neutre {system, user, grammaire} → charge utile du dialecte :
 * json_object + schéma en RENFORT TEXTUEL dans le system. */
export function construireAppel(requete, reglages) {
  return {
    model: CONFIG.model,
    max_tokens: reglages.max_tokens,
    messages: [
      {
        role: "system",
        content:
          requete.system +
          "\n\nRÉPONDS EN UN SEUL OBJET JSON, STRICTEMENT CONFORME À CE SCHÉMA (aucune clé en plus, aucune en moins) :\n" +
          JSON.stringify(requete.grammaire),
      },
      { role: "user", content: requete.user },
    ],
    response_format: { type: "json_object" },
  };
}

/** Réponse du dialecte → SIGNAL NEUTRE. */
export function lireReponse(reponse) {
  const choix = (reponse.choices ?? [])[0] ?? {};
  const usage = reponse.usage ?? {};
  return {
    texte: choix.message?.content ?? "",
    tronquee: choix.finish_reason === "length",
    refusee: choix.finish_reason === "content_filter",
    usage: {
      entree: usage.prompt_tokens ?? 0,
      sortie: usage.completion_tokens ?? 0,
      ecritureCache: 0,
      lectureCache: usage.prompt_cache_hit_tokens ?? 0,
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

/** Refus de GRAMMAIRE — par STATUT structuré, jamais par texte. (Sans schéma
 * imposé, un 400 signale un dialecte de requête, pas une grammaire.) */
export function estErreurGrammaire(erreur) {
  return erreur?.status === 400;
}

/** SEUL point SDK : le SDK OpenAI, pointé sur la base DeepSeek — façade
 * neutre client.messages.create(appel), comme les deux autres. */
export async function creerClient(lireFichier, options = {}) {
  const contenu = lireFichier(CONFIG.cheminCle);
  const m = contenu.match(CONFIG.motifCle);
  if (!m) throw new Error("ADAPTATEUR_CLE_INTROUVABLE");
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: m[2].trim(), baseURL: CONFIG.baseURL, ...options });
  return { messages: { create: (appel) => client.chat.completions.create(appel) } };
}

/** Usage BRUT du dialecte → usage NEUTRE. */
export function lireUsage(usageBrut) {
  const u = usageBrut ?? {};
  return {
    entree: u.prompt_tokens ?? 0,
    sortie: u.completion_tokens ?? 0,
    ecritureCache: 0,
    lectureCache: u.prompt_cache_hit_tokens ?? 0,
  };
}

/** Charge utile campagne — même surface que les deux autres. */
export function construireAppelCampagne(requete, reglages) {
  return construireAppel(requete, reglages);
}
