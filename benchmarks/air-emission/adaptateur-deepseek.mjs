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
  model: "deepseek-v4-pro",
  baseURL: "https://api.deepseek.com",
  cheminCle: ["apps", "web", ".env.local"],
  motifCle: /^DEEPSEEK_API_KEY=("?)([^"\n]+)\1$/m,
  // Tarifs PARAMÈTRES (à confirmer au GO du tirage — consignés alors).
  prixParMtok: { entree: 0.66, ecritureCache: 0, lectureCache: 0.07, sortie: 1.98 },
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

/**
 * EP-165 ② — CAPACITÉ DE VISION DÉCLARÉE. Contrainte de TRANSPORT (EP-049).
 *
 * VÉRIFIÉ À LA DOCUMENTATION DU FOURNISSEUR le 2026-09-13, ET CELA CORRIGE
 * CE QUE J'AVAIS ÉCRIT EN EP-164. J'y déclarais `deepseek-chat` « modèle de
 * texte », ce qui laissait entendre que ce fournisseur ne voyait pas. IL
 * VOIT — mais sur un AUTRE modèle. La capacité de vision appartient donc au
 * MODÈLE, jamais au fournisseur : c'est la distinction que ma formulation
 * écrasait, et la raison pour laquelle elle est déclarée ici, à côté du
 * modèle qu'elle concerne.
 *
 * CONSÉQUENCE SUR L'INDÉPENDANCE : il y a DEUX lecteurs possibles, pas un.
 */
export const VISION = {
  supportee: true,
  // PAS `CONFIG.model` : la génération et la lecture n'emploient pas le même
  // modèle chez ce fournisseur. Les confondre serait envoyer une image à un
  // modèle qui ne la lit pas, et lire un refus comme un verdict.
  modele: "deepseek-flash",
  modeleDeGeneration: CONFIG.model,
  formats: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  independantDuGenerateur: true,
  formeAttestee: true,
};

/** Requête neutre {system, user, grammaire, images?} → charge utile du dialecte :
 * json_object + schéma en RENFORT TEXTUEL dans le system. */
export function construireAppel(requete, reglages) {
  const images = requete.images ?? [];
  return {
    // LE MODÈLE SUIT LA MODALITÉ : une requête qui porte une image part au
    // modèle qui sait la lire. Ce n'est pas un choix d'appelant — c'est une
    // contrainte de dialecte, et elle vit donc ici.
    model: images.length === 0 ? CONFIG.model : VISION.modele,
    // CONTRAINTE DE DIALECTE DÉCLARÉE (EP-089) : la sortie de deepseek-chat
    // est bornée à 8192 tokens — un max_tokens supérieur est un 400. Le
    // clamp est un écart d'adaptateur ; une sortie tronquée reste signalée
    // par le signal neutre (tronquee) et traitée fail-closed en aval.
    // CORRIGE 2026-10-19 : plafond reel mesure contre l'API = 393216.
    // 65536 retenu (≈3 min a 350 jetons/s) — la route est synchrone.
    max_tokens: Math.min(reglages.max_tokens, 65_536),
    messages: [
      {
        role: "system",
        content:
          requete.system +
          "\n\nRÉPONDS EN UN SEUL OBJET JSON, STRICTEMENT CONFORME À CE SCHÉMA (aucune clé en plus, aucune en moins) :\n" +
          JSON.stringify(requete.grammaire),
      },
      {
        role: "user",
        content:
          images.length === 0
            ? requete.user
            : [
                ...images.map((img) => ({
                  type: "image_url",
                  image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
                })),
                { type: "text", text: requete.user },
              ],
      },
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

/** SEUL point RÉSEAU — AMENDÉ AVANT TIRAGE (EP-084, patron EP-033-ter,
 * 0 token facturé) : l'API DeepSeek est du REST pur, `fetch` suffit —
 * introduire le paquet npm `openai` n'avait pas de nécessité démontrée
 * (CLAUDE.md). Façade neutre INCHANGÉE : client.messages.create(appel). */
export async function creerClient(lireFichier, options = {}) {
  const contenu = lireFichier(CONFIG.cheminCle);
  const m = contenu.match(CONFIG.motifCle);
  if (!m) throw new Error("ADAPTATEUR_CLE_INTROUVABLE");
  const cle = m[2].trim();
  const base = options.baseURL ?? CONFIG.baseURL;
  // ── L'ECHEANCE DE LA TRANCHE, HONOREE ICI AUSSI (2026-10-19).
  //
  // L'adaptateur anthropic l'a apprise le 2026-10-15, et son commentaire
  // decrit EXACTEMENT ce qu'on a mesure aujourd'hui : « le chien de garde
  // confie la ligne a un autre travailleur 15 minutes plus tard, qui refait
  // exactement la meme chose. Boucle sans fin. »
  //
  // MESURE, ligne bac4579f : 187 defauts, cout fige a 1,5082 $ pendant plus
  // d'une heure, battement a 607 s. Des tranches partaient, un appel long
  // debordait la duree de la fonction, l'hote tuait tout en plein vol — pas
  // d'exception, pas de `catch`, RIEN d'ecrit. La ligne redevenait saisissable
  // et recommencait. Budget de tranche 1 700 s, hote 1 800 s : 100 s de marge
  // pour un appel qui en demande ~180.
  //
  // Celui-ci est du REST pur : `fetch` prend un signal nativement, et c'est
  // plus simple que chez l'autre dialecte. La MARGE est la meme (20 s) et
  // pour la meme raison — l'assemblage et l'ecriture en base vivent APRES
  // l'appel ; rendre la main pile a l'echeance deplacerait le defaut.
  const signalDeTranche = () => {
    const restant = typeof options.echeance === "function" ? options.echeance() : null;
    if (restant === null || restant === undefined || !Number.isFinite(restant)) return undefined;
    const MARGE_MS = 20_000;
    return AbortSignal.timeout(Math.max(1_000, restant - MARGE_MS));
  };
  // ON N'INTERROGE PAS LE NOM DE L'ERREUR, ON INTERROGE NOTRE SIGNAL. Lire
  // un nom de classe ou un message anglais serait une devinette fragile —
  // c'est la lecon du 2026-10-15, ou un abandon a ete classe « fatal » et
  // la generation REFUSEE au lieu d'etre suspendue.
  const marquer = (e, signal) => {
    if (signal?.aborted !== true) return e;
    const marque = new Error("BUDGET_TEMPS — appel interrompu par l'echeance de la tranche");
    marque.budgetTemps = true;
    marque.cause = e;
    return marque;
  };
  return {
    messages: {
      create: async (appel) => {
        const signal = signalDeTranche();
        let rep;
        try {
          rep = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${cle}` },
            body: JSON.stringify(appel),
            signal,
          });
        } catch (e) {
          throw marquer(e, signal);
        }
        if (!rep.ok) {
          const corps = await rep.text();
          const erreur = new Error(`DEEPSEEK_${rep.status}: ${corps.slice(0, 300)}`);
          erreur.status = rep.status;
          throw erreur;
        }
        return rep.json();
      },
    },
  };
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

/**
 * PARITE DE SURFACE (EP-081 ②) — LE FLUX DE CE DIALECTE N'EST PAS ENCORE
 * PARLE. Capacite DECLAREE absente, jamais silencieuse : l'adaptateur
 * anthropic parle en flux depuis le 2026-10-09 (mur serveur ~10 min sur les
 * connexions non-streaming longues) ; celui-ci rendra la meme surface le
 * jour ou son dialecte d'evenements sera implemente ET prouve a l'octet —
 * pas avant. D'ici la : fail-closed qui se nomme.
 */
export async function assemblerDepuisFlux() {
  throw new Error("FLUX_NON_IMPLEMENTE_DEEPSEEK: le reassemblage de flux n'existe que pour anthropic");
}

export function envelopperEnFlux() {
  throw new Error("FLUX_NON_IMPLEMENTE_DEEPSEEK: l'enveloppe de flux n'existe que pour anthropic");
}
