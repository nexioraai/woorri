// ADAPTATEUR ANTHROPIC — LA frontière fournisseur (EP-049/EP-051, 2026-09-11).
//
// TOUT ce qui connaît le dialecte vit ICI : SDK, format des messages,
// json_schema, dégradations de grammaire (clamps/strip), stop_reason,
// champs d'usage, tarification, nom du modèle, source de la clé, codes
// d'erreur. AU-DESSUS de cette frontière (contrat, grammaire canonique,
// juge, diagnostics), AUCUN dialecte — démontré par impossibilité :
// les modules contrat n'importent JAMAIS ce module (sens unique,
// adaptateur → contrat), et la grammaire canonique porte encore ses
// contraintes pleines (min(2) présent — preuve qu'aucun clamp n'a fui).
//
// LES DÉGRADATIONS SONT DÉCLARÉES, jamais inférées d'un message d'erreur :
// ce que CE fournisseur refuse est une CAPACITÉ DÉCLARÉE ci-dessous. Les
// écarts grammaire canonique → grammaire dégradée sont ÉNUMÉRÉS par
// `degraderGrammaire` et chacun reste refermé par P1 (veille EP-037,
// désormais PAR ADAPTATEUR).
import { clampMinItems, incompatibilitesDe, makeLevels, stripKeys } from "./schema-levels.mjs";

/** CONFIGURATION — le « quel LLM » est un paramètre, jamais une hypothèse. */
export const CONFIG = {
  fournisseur: "anthropic",
  model: "claude-opus-5",
  cheminCle: ["apps", "web", ".env.local"],
  motifCle: /^ANTHROPIC_API_KEY=("?)([^"\n]+)\1$/m,
  prixParMtok: { entree: 5, ecritureCache: 6.25, lectureCache: 0.5, sortie: 25 },
};

/** CAPACITÉS DÉCLARÉES du dialecte grammaire de CE fournisseur (mesurées :
 * EP-021, EP-033-ter). Aucune inférence par texte d'erreur. */
export const CONTRAINTES_GRAMMAIRE = {
  minItemsMax: 1,
  bornesNumeriquesEntiers: false,
  // EP-149 — SIXIÈME ÉCART, mesuré sur le run EP-148 et jusqu'ici NON DÉCLARÉ.
  // Le service refuse `maxItems` sur les tableaux : « output_config.format.
  // schema: For 'array' type, property 'maxItems' is … ». L'écart existait
  // dans les faits — deux niveaux de l'échelle le gardaient et se faisaient
  // refuser — sans être nommé nulle part. C'est une CONTRAINTE DE TRANSPORT :
  // elle appartient à l'adaptateur, jamais au contrat (le schéma AIR continue
  // de borner ses tableaux, et P1 continue de le vérifier).
  maxItemsSupporte: false,
};

/** Grammaire canonique → grammaire du dialecte, ÉCARTS DÉCLARÉS. */
export function degraderGrammaire(canonique) {
  // EP-151 — MÊME SOURCE que l'échelle : ce qui est incompatible est déclaré
  // une fois, dans `CONTRAINTES_GRAMMAIRE`, et les deux chemins en dérivent.
  const incompatibles = incompatibilitesDe(CONTRAINTES_GRAMMAIRE);
  const grammaire = stripKeys(
    incompatibles.clampMinItems ? clampMinItems(canonique) : canonique,
    incompatibles.clefs,
  );
  const ecarts = [];
  const marcher = (a, b, chemin) => {
    if (a === null || typeof a !== "object") return;
    for (const k of Object.keys(a)) {
      const av = a[k];
      const bv = b?.[k];
      if (k === "minItems" && av !== bv) ecarts.push(`${chemin}.minItems ${av}→${bv}`);
      else if (incompatibles.clefs.includes(k) && bv === undefined)
        ecarts.push(`${chemin}.${k} ${av}→retiré`);
      else if (typeof av === "object") marcher(av, bv, `${chemin}.${k}`);
    }
  };
  marcher(canonique, grammaire, "$");
  return { grammaire, ecarts: ecarts.sort() };
}

/** L'échelle de dégradation d'une grammaire de passe — DÉCLARÉE ici. */
export function degradationsPourEchelle(jsonSchema) {
  // EP-151 — l'échelle REÇOIT les contraintes du dialecte : elle ne les
  // redéclare pas. Une incompatibilité ajoutée ici est honorée dès le premier
  // niveau, sans qu'aucune autre liste ait à suivre.
  return makeLevels(jsonSchema, CONTRAINTES_GRAMMAIRE);
}

/**
 * EP-165 ② — CAPACITÉ DE VISION DÉCLARÉE, comme `CONTRAINTES_GRAMMAIRE`.
 *
 * C'EST UNE CONTRAINTE DE TRANSPORT, JAMAIS DU CONTRAT (frontière EP-049) :
 * le contrat neutre dit « il y a des images », l'adaptateur seul sait dans
 * quel dialecte les mettre. Aucun nom de fournisseur ne sort d'ici.
 *
 * VÉRIFIÉ À LA DOCUMENTATION DU FOURNISSEUR le 2026-09-13, jamais supposé.
 */
export const VISION = {
  supportee: true,
  // Le MÊME modèle que la génération : c'est justement pourquoi cet
  // adaptateur ne peut PAS être le second œil d'une campagne qu'il a
  // produite. L'indépendance est une règle d'emploi, pas de code.
  modele: CONFIG.model,
  formats: ["image/png", "image/jpeg", "image/gif", "image/webp"],
  octetsMaxBase64: 10 * 1024 * 1024,
  // Palier HAUTE RÉSOLUTION (Claude 4.7 et suivants) : grand côté 2576 px,
  // 4784 jetons visuels au plus. Le coût est ⌈l/28⌉ × ⌈h/28⌉ — PAS la
  // division par 750 que j'avais employée en EP-164, qui sous-estimait.
  grandCoteMax: 2576,
  jetonsVisuelsMax: 4784,
  cotePatch: 28,
};

/** Requête neutre {system, user, grammaire, images?} → charge utile du dialecte. */
export function construireAppel(requete, reglages) {
  const images = requete.images ?? [];
  // L'IMAGE AVANT LE TEXTE — recommandation explicite du fournisseur
  // (« Claude works best when images come before text »). Ce n'est pas un
  // détail d'écriture : c'est une consigne de qualité de lecture.
  const content =
    images.length === 0
      ? requete.user
      : [
          ...images.map((img) => ({
            type: "image",
            source: { type: "base64", media_type: img.mediaType, data: img.base64 },
          })),
          { type: "text", text: requete.user },
        ];
  return {
    model: CONFIG.model,
    max_tokens: reglages.max_tokens,
    system: requete.system,
    messages: [{ role: "user", content }],
    output_config: { format: { type: "json_schema", schema: requete.grammaire } },
  };
}

/** Réponse du dialecte → SIGNAL NEUTRE. Personne d'autre ne lit stop_reason. */
export function lireReponse(reponse) {
  const usage = reponse.usage ?? {};
  return {
    texte: (reponse.content ?? []).map((b) => (b.type === "text" ? b.text : "")).join(""),
    tronquee: reponse.stop_reason === "max_tokens",
    refusee: reponse.stop_reason === "refusal",
    usage: {
      entree: usage.input_tokens ?? 0,
      sortie: usage.output_tokens ?? 0,
      ecritureCache: usage.cache_creation_input_tokens ?? 0,
      lectureCache: usage.cache_read_input_tokens ?? 0,
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

/** Une erreur du dialecte est-elle un refus de GRAMMAIRE (dégradable) ? —
 * décision par STATUT structuré, JAMAIS par texte. */
export function estErreurGrammaire(erreur) {
  return erreur?.status === 400;
}

/** Le client du fournisseur — SEUL point qui touche le SDK (import
 * dynamique : construire les requêtes et juger ne chargent jamais le SDK). */
export async function creerClient(lireFichier, options = {}) {
  const contenu = lireFichier(CONFIG.cheminCle);
  const m = contenu.match(CONFIG.motifCle);
  if (!m) throw new Error("ADAPTATEUR_CLE_INTROUVABLE");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic({ apiKey: m[2].trim(), ...options });
}

/** Usage BRUT du dialecte → usage NEUTRE (pour les comptabilités). */
export function lireUsage(usageBrut) {
  const u = usageBrut ?? {};
  return {
    entree: u.input_tokens ?? 0,
    sortie: u.output_tokens ?? 0,
    ecritureCache: u.cache_creation_input_tokens ?? 0,
    lectureCache: u.cache_read_input_tokens ?? 0,
  };
}

/** Charge utile de la CAMPAGNE (cache du système : capacité de CE
 * fournisseur, déclarée ici — personne d'autre ne connaît cache_control). */
export function construireAppelCampagne(requete, reglages) {
  return {
    model: CONFIG.model,
    max_tokens: reglages.max_tokens,
    system: [{ type: "text", text: requete.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: requete.user }],
    output_config: { format: { type: "json_schema", schema: requete.grammaire } },
  };
}
