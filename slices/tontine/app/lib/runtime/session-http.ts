// RUNTIME COPIÉ — LA SESSION SUR LE SERVEUR DU PROPRIÉTAIRE, EN HTTP NU.
//
// ── POURQUOI CE FICHIER EXISTE.
//
// `session-supabase.ts` appelle `signInWithPassword`, `signUp`,
// `resetPasswordForEmail`, `signOut`, `onAuthStateChange`. Ce sont les noms
// d'UN fournisseur. Le contrat `SessionProvider`, lui, ne dit rien des
// endpoints : il décrit ce que l'application a besoin de SAVOIR, pas comment
// elle l'apprend. Un serveur tiers n'avait donc rien à implémenter.
//
// Les cinq opérations sont celles du protocole du moteur (`OPERATIONS_SESSION`
// dans `resolve-lock.ts`) :
//
//   POST   /air/v1/session          ouvrir — rend l'identité ET les droits
//   GET    /air/v1/session          l'état courant, au démarrage
//   DELETE /air/v1/session          fermer
//   POST   /air/v1/accounts         créer un compte
//   POST   /air/v1/password-resets  demander une réinitialisation
//
// ── LES DROITS VIENNENT AVEC L'IDENTITÉ, ET C'EST UNE DÉCISION.
//
// Les demander par un second appel ferait exister un instant où l'identité est
// établie et les droits inconnus. Le contrôle d'accès est FERMÉ PAR DÉFAUT
// (1.28.0) : cet instant afficherait un refus à quelqu'un qui a le droit — le
// défaut fondateur que le lot d'accès existe pour empêcher, mesuré dans un
// système en production.
//
// ── TROIS ÉTATS, PAS DEUX.
//
// « anonyme », « connecté », et EN ATTENTE DE CONFIRMATION — le serveur a
// accepté la création du compte et n'a ouvert aucune session. Sans ce
// troisième état, une inscription réussie retombe sur « anonyme », ce qui est
// indiscernable d'un échec : rien ne bouge à l'écran alors que tout a marché.
//
// F3 : aucun texte naturel — les diagnostics sont des codes.
import type { SessionProvider } from "./session-contract";

/** Ce que le serveur rend sur `POST` et `GET /air/v1/session`. */
export interface EtatSessionDistante {
  /** Absent ⇒ aucune identité établie. Jamais une chaîne vide. */
  readonly userId?: string;
  /** Les droits accordés. Absent ⇒ « ce serveur ne sait pas le dire ». */
  readonly rights?: readonly string[];
  /** Le compte existe et attend une confirmation hors application. */
  readonly pendingConfirmation?: boolean;
}

/**
 * Le transport injecté. Comme pour l'écriture : pas d'en-têtes, pas de mode.
 * Un jeton, un cookie, une signature — l'appelant les met dans SA fonction.
 */
export type TransportSession = (
  url: string,
  methode: "GET" | "POST" | "DELETE",
  corps?: unknown,
) => Promise<{ readonly ok: boolean; readonly status: number; readonly corps: unknown }>;

/** Les cinq URL, résolues par le lock — ce module n'en construit aucune. */
export interface UrlsSession {
  readonly ouvrir: string;
  readonly etat: string;
  readonly fermer: string;
  readonly creerCompte: string;
  readonly reinitialiser: string;
}

/** Les mêmes opérations que l'implémentation Supabase, au nom près. */
export interface SessionVerifieeHttp extends SessionProvider {
  enAttenteConfirmation(): boolean;
  /** Cette implémentation le fournit TOUJOURS — voir le commentaire du corps. */
  droits(): readonly string[];
  ouvrir(email: string, motDePasse: string): Promise<boolean>;
  creer(email: string, motDePasse: string): Promise<boolean>;
  fermer(): Promise<void>;
  reinitialiser(email: string): Promise<boolean>;
}

/**
 * LA LECTURE DE LA RÉPONSE EST DÉFENSIVE, et ce n'est pas de la méfiance.
 *
 * Un serveur écrit par quelqu'un d'autre peut rendre `userId: null`,
 * `rights: "admin"` au lieu d'un tableau, ou un corps vide avec un 200. Prendre
 * ces valeurs telles quelles ferait entrer `null` dans l'identifiant d'une
 * session — et `estAuthentifie()` rendrait `true` pour personne.
 */
const lireEtat = (corps: unknown): EtatSessionDistante => {
  if (typeof corps !== "object" || corps === null) return {};
  const o = corps as Record<string, unknown>;
  const userId = typeof o["userId"] === "string" && o["userId"] !== "" ? o["userId"] : undefined;
  const rights = Array.isArray(o["rights"])
    ? o["rights"].filter((x): x is string => typeof x === "string")
    : undefined;
  return {
    ...(userId === undefined ? {} : { userId }),
    ...(rights === undefined ? {} : { rights }),
    ...(o["pendingConfirmation"] === true ? { pendingConfirmation: true } : {}),
  };
};

export function creerSessionHttp(options: {
  readonly urls: UrlsSession;
  readonly transport: TransportSession;
}): SessionVerifieeHttp {
  const { urls, transport } = options;
  let etat: EtatSessionDistante = {};
  const ecouteurs = new Set<() => void>();

  const publier = (suivant: EtatSessionDistante): void => {
    etat = suivant;
    for (const e of ecouteurs) e();
  };

  const appeler = async (
    url: string,
    methode: "GET" | "POST" | "DELETE",
    corps?: unknown,
  ): Promise<{ ok: boolean; etat: EtatSessionDistante }> => {
    try {
      const r = await transport(url, methode, corps);
      return { ok: r.ok, etat: r.ok ? lireEtat(r.corps) : {} };
    } catch {
      // Le réseau a échoué : on ne TOUCHE PAS à l'état courant. Fermer la
      // session sur une coupure déconnecterait quelqu'un dans un ascenseur.
      return { ok: false, etat: etat };
    }
  };

  // ── L'ÉTAT AU DÉMARRAGE, DEMANDÉ UNE FOIS.
  //
  // Sans cet appel, l'application démarre « anonyme » à chaque ouverture et
  // redemande le mot de passe à quelqu'un dont la session est valide. Le
  // `void` est délibéré : rien ne doit attendre ce résultat — l'application
  // s'affiche anonyme puis se corrige, ce que l'abonnement propage.
  void appeler(urls.etat, "GET").then((r) => {
    if (r.ok) publier(r.etat);
  });

  return {
    estAuthentifie: () => etat.userId !== undefined,
    identifiant: () => etat.userId,
    enAttenteConfirmation: () => etat.pendingConfirmation === true,
    // ── CE FOURNISSEUR NE PEUT PAS DIRE « JE NE SAIS PAS », ET C'EST DIT.
    //
    // Le contrat distingue deux choses : `droits()` qui rend `[]` (« aucun
    // droit accordé ») et l'ABSENCE de la méthode (« cette session ne sait pas
    // le dire »). La distinction compte — l'une envoie chercher la cause dans
    // les rôles, l'autre dans l'intégration.
    //
    // Un fournisseur HTTP implémente la méthode : il ne peut donc exprimer que
    // la première. Si le serveur omet `rights`, on rend `[]` — FERMÉ PAR
    // DÉFAUT, parce qu'un refus est récupérable et qu'un accès accordé par
    // erreur ne l'est pas.
    //
    // Le coût est réel et assumé : un serveur qui oublie `rights` ressemble à
    // un serveur qui n'accorde rien. C'est pourquoi le contrat remis à
    // l'implémenteur (`CONTRAT-API.md` §4) exige `rights` DANS la réponse de
    // `POST /air/v1/session`, et explique pourquoi.
    droits: () => etat.rights ?? [],
    abonner: (ecouteur) => {
      ecouteurs.add(ecouteur);
      return () => ecouteurs.delete(ecouteur);
    },
    ouvrir: async (email, motDePasse) => {
      const r = await appeler(urls.ouvrir, "POST", { email, password: motDePasse });
      if (r.ok) publier(r.etat);
      return r.ok && r.etat.userId !== undefined;
    },
    creer: async (email, motDePasse) => {
      const r = await appeler(urls.creerCompte, "POST", { email, password: motDePasse });
      // Une création ACCEPTÉE n'ouvre pas forcément de session : le serveur
      // peut attendre un clic dans un e-mail. Les deux issues sont des
      // succès, et l'écran doit pouvoir les distinguer.
      if (r.ok) publier(r.etat);
      return r.ok;
    },
    fermer: async () => {
      await appeler(urls.fermer, "DELETE");
      // ON PUBLIE L'ÉTAT VIDE MÊME SI LE SERVEUR A REFUSÉ. Laisser la session
      // ouverte parce que la déconnexion a échoué est le pire des deux : la
      // personne a demandé à sortir, et l'écran la montre encore dedans.
      publier({});
    },
    reinitialiser: async (email) => {
      const r = await appeler(urls.reinitialiser, "POST", { email });
      // Rend l'ACCEPTATION de l'envoi, jamais l'existence du compte :
      // révéler qu'une adresse est inscrite est une fuite.
      return r.ok;
    },
  };
}

/** Le transport réel : `fetch`, avec les cookies de session s'il y en a. */
export const transportSessionHttp: TransportSession = async (url, methode, corps) => {
  const r = await fetch(url, {
    method: methode,
    // `credentials: "include"` : un serveur qui pose un cookie de session
    // attend qu'il revienne. Sans cela, `GET /session` répondrait toujours
    // « anonyme » et la session serait perdue à chaque ouverture — sans
    // qu'aucune erreur ne soit levée.
    credentials: "include",
    ...(corps === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(corps) }),
  });
  // Un corps vide est légitime (204 sur `DELETE`) : il ne doit pas faire
  // échouer la lecture, sinon une déconnexion réussie passerait pour un échec.
  const texte = await r.text();
  let json: unknown = {};
  try {
    json = texte === "" ? {} : JSON.parse(texte);
  } catch {
    json = {};
  }
  return { ok: r.ok, status: r.status, corps: json };
};
