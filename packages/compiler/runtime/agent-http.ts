// RUNTIME COPIÉ — LE PORT DE L'AGENT (2026-10-13).
//
// ── POURQUOI UN QUATRIEME MODULE RESEAU, ET PAS UN DE PLUS PAR CONFORT.
//
// Le cliquet zero-reseau interdit `fetch(` dans tout le runtime, sauf trois
// modules NOMMES : la lecture distante, l'ecriture, la session. Aucun des
// trois ne convient a l'agent, et il faut dire pourquoi plutot que de
// s'ajouter a la liste :
//
//   — `ecriture-http` rend `{ ok, status }` et JETTE le corps de la reponse.
//     L'agent a besoin du corps : c'est la proposition elle-meme.
//   — `session-http` parle les cinq URL de la session, pas celles de l'agent.
//   — `source-reseau` lit des COLLECTIONS, pas des actes.
//
// Ce module parle les trois adresses de l'agent, rend le corps, et porte
// l'identite. Le chemin de COMPILATION reste integralement zero-reseau : ce
// module ne s'execute que dans l'application emise, sur l'appareil.
//
// ── F3 : AUCUN TEXTE NATUREL ICI.
//
// Les echecs sont rendus par le CODE que le serveur a nomme — jamais par une
// phrase fabriquee ici. Le moteur n'a pas la langue de la personne ; c'est le
// document qui la porte.
import type { AgentCatalogue, AgentProposition, PortAgent, ReponseAgent } from "./agent-contract";

/** Les trois adresses, resolues par le protocole — ce module n'en batit aucune. */
export interface UrlsAgent {
  /** Ce que l'agent peut faire. */
  readonly catalogue: string;
  /** Des mots, une proposition. Absent si le document ne declare pas de cerveau. */
  readonly parler?: string;
  /** L'acte. */
  readonly agir: string;
}

/**
 * LA LECTURE DE LA REPONSE EST DEFENSIVE, et ce n'est pas de la mefiance.
 *
 * Le serveur est emis par le moteur, mais il tourne chez quelqu'un d'autre,
 * dans une version possiblement plus ancienne. Prendre ses valeurs telles
 * quelles ferait entrer `undefined` dans un identifiant d'operation, et
 * l'application proposerait d'agir sur rien.
 */
const lireCatalogue = (corps: unknown): AgentCatalogue | null => {
  if (typeof corps !== "object" || corps === null) return null;
  const o = corps as Record<string, unknown>;
  if (!Array.isArray(o["operations"])) return null;
  const operations = o["operations"].flatMap((brut) => {
    if (typeof brut !== "object" || brut === null) return [];
    const b = brut as Record<string, unknown>;
    const id = typeof b["id"] === "string" ? b["id"] : undefined;
    const nom = typeof b["nom"] === "string" ? b["nom"] : undefined;
    if (id === undefined || nom === undefined) return [];
    const attend = Array.isArray(b["attend"])
      ? b["attend"].filter((x): x is string => typeof x === "string")
      : [];
    return [{ id, nom, attend }];
  });
  return {
    operations,
    confirmationRequise: o["confirmationRequise"] === true,
    voix: o["voix"] === true,
  };
};

const lireProposition = (corps: unknown): AgentProposition | null => {
  if (typeof corps !== "object" || corps === null) return null;
  const o = corps as Record<string, unknown>;
  const operation = typeof o["operation"] === "string" ? o["operation"] : undefined;
  const nom = typeof o["nom"] === "string" ? o["nom"] : undefined;
  if (operation === undefined || nom === undefined) return null;
  const entrees =
    typeof o["entrees"] === "object" && o["entrees"] !== null && !Array.isArray(o["entrees"])
      ? (o["entrees"] as Record<string, unknown>)
      : {};
  const intention = typeof o["intention"] === "string" ? o["intention"] : undefined;
  return { operation, nom, entrees, ...(intention === undefined ? {} : { intention }) };
};

/** Le code que le serveur a nomme, ou un code de dernier recours. */
const codeDe = (corps: unknown, statut: number): string => {
  if (typeof corps === "object" && corps !== null) {
    const e = (corps as Record<string, unknown>)["error"];
    if (typeof e === "string" && e !== "") return e;
  }
  return `AIR_AGENT_HTTP_${String(statut)}`;
};

export function creerPortAgentHttp(options: {
  readonly urls: UrlsAgent;
  readonly jeton: () => string | undefined;
}): PortAgent {
  const { urls, jeton } = options;

  const appeler = async (
    url: string,
    methode: "GET" | "POST",
    corps?: unknown,
  ): Promise<{ ok: boolean; statut: number; corps: unknown }> => {
    // Le jeton est lu A CHAQUE APPEL : il est rafraichi par le service qui
    // l'a delivre, et un jeton capture au montage serait expire plus tard.
    const porteur = jeton();
    const r = await fetch(url, {
      method: methode,
      credentials: "include",
      headers: {
        accept: "application/json",
        ...(porteur === undefined ? {} : { authorization: `Bearer ${porteur}` }),
        ...(corps === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
    });
    let lu: unknown = null;
    try {
      lu = await r.json();
    } catch {
      lu = null;
    }
    return { ok: r.ok, statut: r.status, corps: lu };
  };

  return {
    catalogue: async (): Promise<ReponseAgent<AgentCatalogue>> => {
      const r = await appeler(urls.catalogue, "GET");
      if (!r.ok) return { ok: false, code: codeDe(r.corps, r.statut) };
      const lu = lireCatalogue(r.corps);
      return lu === null ? { ok: false, code: "AIR_AGENT_REPONSE_ILLISIBLE" } : { ok: true, valeur: lu };
    },

    parler: async (mots): Promise<ReponseAgent<AgentProposition>> => {
      // ── UN AGENT SANS CERVEAU NE SE FAIT PAS PASSER POUR UN AGENT MUET.
      //
      // Le document ne declare pas de cerveau ⇒ le serveur n'emet aucune
      // route pour parler. Appeler une adresse absente rendrait un 404, que
      // l'ecran afficherait comme une panne. Le refus est NOMME ici.
      if (urls.parler === undefined) {
        return { ok: false, code: "AIR_AGENT_SANS_CERVEAU" };
      }
      const r = await appeler(urls.parler, "POST", { mots });
      if (!r.ok) return { ok: false, code: codeDe(r.corps, r.statut) };
      const lu = lireProposition(r.corps);
      return lu === null ? { ok: false, code: "AIR_AGENT_REPONSE_ILLISIBLE" } : { ok: true, valeur: lu };
    },

    agir: async (operation, entrees, intention): Promise<ReponseAgent<Record<string, unknown>>> => {
      const r = await appeler(urls.agir, "POST", {
        operation,
        entrees,
        ...(intention === undefined ? {} : { intention }),
      });
      if (!r.ok) return { ok: false, code: codeDe(r.corps, r.statut) };
      return {
        ok: true,
        valeur:
          typeof r.corps === "object" && r.corps !== null ? (r.corps as Record<string, unknown>) : {},
      };
    },
  };
}
