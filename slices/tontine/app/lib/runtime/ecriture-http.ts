// RUNTIME COPIÉ — ÉCRIRE SUR LE SERVEUR DU PROPRIÉTAIRE, EN HTTP NU.
//
// ── POURQUOI CE FICHIER EXISTE.
//
// `ecriture-supabase.ts` ne connaît NI Supabase NI PostgREST : il reçoit deux
// fonctions (`ecrire`, `supprimer`) et c'est tout — son nom est le seul
// vestige. Ce qui manquait, c'était une implémentation de ces deux fonctions
// pour un serveur quelconque.
//
// Mesuré le 2026-10-05 sur une demande réelle : le propriétaire exige un
// backend Spring Boot. L'application émise écrivait par
// `clientAuth.from(table).upsert(ligne)` — un appel au client d'UN
// fournisseur. Rien n'était spécifié pour un autre serveur, donc rien n'était
// implémentable : l'application restait sur ses fixtures.
//
// ── CE QU'IL NE DÉCIDE PAS.
//
// Aucune URL n'est construite à partir d'un nom de table. L'URL de collection
// vient du LOCK (doctrine D-132 : « l'adaptateur ne décide pas des endpoints,
// il les applique »), et la ligne est cette collection plus son identifiant —
// la seule dérivation que la compilation ne peut pas faire, puisque les lignes
// n'existent pas encore. Un cliquet vérifie que cette dérivation coïncide avec
// `urlProtocoleLigne` du résolveur.
//
// F3 : aucun texte naturel — les diagnostics sont des codes.
import type { PortEcriture, ReponseEcriture } from "./ecriture-supabase";

/**
 * Le transport injecté : une URL, une méthode, un corps — rien d'autre.
 *
 * Volontairement plus pauvre que `fetch` : pas d'en-têtes, pas de mode, pas de
 * signal. Tout ce que l'appelant veut ajouter — un jeton, un cookie — il
 * l'ajoute dans SA fonction. Décrire ici la forme complète de `fetch`
 * reviendrait à imposer au port des choix qui appartiennent au serveur.
 */
export type TransportEcriture = (
  url: string,
  methode: "POST" | "DELETE",
  corps?: unknown,
) => Promise<{ readonly ok: boolean; readonly status: number }>;

/** L'URL de collection d'une entité, telle que le LOCK l'a résolue. */
export interface CibleEcriture {
  readonly entityId: string;
  readonly url: string;
}

/**
 * LA DÉRIVATION DE L'URL DE LIGNE — une seule, et elle est ici.
 *
 * `encodeURIComponent` n'est pas une précaution de style : un identifiant qui
 * contiendrait `/` ou `?` changerait la ressource visée. Un `?` transforme la
 * fin de l'identifiant en query string, et la suppression partirait sur une
 * AUTRE ligne — ou sur la collection entière, selon le serveur.
 */
export const urlDeLigne = (urlCollection: string, id: string): string =>
  `${urlCollection}/${encodeURIComponent(id)}`;

/**
 * Un port d'écriture qui parle le protocole du moteur.
 *
 * ── POURQUOI IL REÇOIT LES CIBLES, ET NON UN DOMAINE.
 *
 * `PortEcriture` est appelé avec un nom de TABLE. Reconstruire une URL à
 * partir de ce nom exigerait de connaître la convention — or elle appartient
 * au lock. Le port reçoit donc la table des cibles déjà résolues, et REFUSE
 * une table qu'il n'y trouve pas : une écriture vers une entité dont aucune
 * source distante n'est déclarée irait nulle part, et un échec silencieux est
 * pire qu'un refus.
 */
export function creerPortHttp(options: {
  readonly cibles: readonly CibleEcriture[];
  readonly transport: TransportEcriture;
}): PortEcriture {
  const { cibles, transport } = options;
  const parEntite = new Map(cibles.map((c) => [c.entityId, c.url]));

  const refus = (code: string): ReponseEcriture => ({ error: { message: code } });

  const appeler = async (
    table: string,
    methode: "POST" | "DELETE",
    construire: (url: string) => { url: string; corps?: unknown },
  ): Promise<ReponseEcriture> => {
    const collection = parEntite.get(table);
    if (collection === undefined) return refus(`AIR_ECRITURE_CIBLE_INCONNUE:${table}`);
    const { url, corps } = construire(collection);
    try {
      const r = await transport(url, methode, corps);
      // LE STATUT FAIT FOI, pas l'absence d'exception. Un serveur qui rend 403
      // ou 409 a répondu : `fetch` ne lève pas, et traiter ce cas comme un
      // succès ferait croire l'écriture passée — l'application rouvrirait sur
      // une ligne qui n'existe pas.
      return r.ok ? { error: null } : refus(`AIR_ECRITURE_REFUSEE:${String(r.status)}`);
    } catch {
      // Le réseau a échoué AVANT toute réponse. Distinct d'un refus : l'un
      // s'envoie chercher dans le serveur, l'autre dans la connexion.
      return refus("AIR_ECRITURE_TRANSPORT");
    }
  };

  return {
    ecrire: (table, ligne) =>
      appeler(table, "POST", (url) => ({
        url,
        // `POST` sur la COLLECTION, avec l'identifiant DANS le corps quand il
        // existe : le serveur décide de l'identifiant d'une création, et
        // remplace la ligne quand on le lui donne. Un `PUT` sur la ligne
        // supposerait que le client connaisse son URL avant qu'elle existe.
        corps: ligne,
      })),
    supprimer: (table, id) => appeler(table, "DELETE", (url) => ({ url: urlDeLigne(url, id) })),
  };
}

/**
 * LE TRANSPORT QUI PORTE L'IDENTITE (2026-10-13).
 *
 * MESURE QUI A COMMANDE CETTE FABRIQUE. Un document qui declare
 * `backend: genere` recoit un serveur Node emis dont les routes de lecture
 * FILTRENT par appelant — trente-sept filtres de visibilite, poses parce
 * qu'une collection servie sans filtre exposait les commandes de tout le
 * monde. Ces routes lisent l'identite dans un en-tete
 * `Authorization: Bearer`. Le transport ci-dessous, lui, n'envoyait RIEN :
 * ni jeton, ni meme le cookie. L'application ne pouvait donc jamais etre
 * reconnue par son propre serveur.
 *
 * POURQUOI UNE FABRIQUE, ET PAS UNE MODIFICATION DU TRANSPORT EXISTANT.
 * `TransportEcriture` est volontairement plus pauvre que `fetch` : le
 * commentaire du type le dit, un jeton s'ajoute dans LA FONCTION DE
 * L'APPELANT. Changer `transportEcritureHttp` aurait impose un choix
 * d'identite a tous les documents, y compris ceux qui n'en ont pas besoin.
 * L'ancien transport reste exactement ce qu'il etait.
 *
 * LE JETON EST LU A CHAQUE APPEL, jamais capture une fois : il est
 * rafraichi par le service qui l'a delivre, et un jeton capture au montage
 * serait expire au bout d'une heure.
 */
export const creerTransportEcritureHttp =
  (jeton: () => string | undefined): TransportEcriture =>
  async (url, methode, corps) => {
    const porteur = jeton();
    const r = await fetch(url, {
      method: methode,
      // Le cookie est envoye AUSSI : un serveur qui s'identifie ainsi reste
      // servi, et les deux voies ne se genent pas.
      credentials: "include",
      headers: {
        ...(porteur === undefined ? {} : { authorization: `Bearer ${porteur}` }),
        ...(corps === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
    });
    return { ok: r.ok, status: r.status };
  };

/** Le transport réel : `fetch`, et rien de plus. */
export const transportEcritureHttp: TransportEcriture = async (url, methode, corps) => {
  const r = await fetch(url, {
    method: methode,
    ...(corps === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(corps) }),
  });
  return { ok: r.ok, status: r.status };
};
