import { describe, expect, it, vi } from "vitest";
import { urlProtocoleDonnees, urlProtocoleSession, OPERATIONS_SESSION } from "../src/resolve-lock.ts";
import { creerPortHttp, urlDeLigne, type TransportEcriture } from "../runtime/ecriture-http.ts";
import { creerSessionHttp, type TransportSession } from "../runtime/session-http.ts";

// ════════════════════════════════════════════════════════════════════
//  LE SERVEUR DU PROPRIÉTAIRE, QUEL QUE SOIT SON LANGAGE.
//
// ── CE QUI MANQUAIT, MESURÉ LE 2026-10-05.
//
// Le moteur avait décidé un protocole NEUTRE pour la lecture (D-132) et JAMAIS
// pour l'écriture ni la session : l'application émise écrivait par
// `clientAuth.from(table).upsert(ligne)` et ouvrait sa session par
// `client.auth.signInWithPassword`. Les noms d'UN fournisseur.
//
// Un propriétaire qui exige un autre backend — demande réelle : Spring Boot —
// n'avait donc rien à implémenter, parce que rien n'était spécifié.
// ════════════════════════════════════════════════════════════════════

describe("l'URL d'une ligne — une seule dérivation, celle qui tourne", () => {
  // Le résolveur décide de la COLLECTION ; les lignes n'existent pas à la
  // compilation, donc leur URL se dérive au runtime. Une seconde fonction dans
  // le résolveur n'aurait eu pour appelant que ce test — le cliquet EP-161 l'a
  // refusée, et il avait raison : une autorité que personne ne consomme n'en
  // est pas une.
  it("la ligne est la collection PLUS son identifiant", () => {
    const collection = urlProtocoleDonnees("api.exemple.com", "ent_membres");
    expect(urlDeLigne(collection, "42")).toBe(`${collection}/42`);
  });

  it("un identifiant qui contient `/` ou `?` ne change PAS de ressource", () => {
    // Un `?` non échappé transformerait la fin de l'identifiant en query
    // string : la suppression viserait la COLLECTION, pas la ligne.
    const url = urlDeLigne("https://api.exemple.com/air/v1/entities/ent_x/rows", "7?all=true");
    expect(url).toBe("https://api.exemple.com/air/v1/entities/ent_x/rows/7%3Fall%3Dtrue");
    expect(url.includes("?")).toBe(false);
    expect(urlDeLigne("https://x/rows", "a/b")).toBe("https://x/rows/a%2Fb");
  });
});

describe("les cinq opérations de session", () => {
  it("l'ouverture et l'état sont la même ressource, deux méthodes", () => {
    expect(OPERATIONS_SESSION.ouvrir.chemin).toBe(OPERATIONS_SESSION.etat.chemin);
    expect(OPERATIONS_SESSION.fermer.chemin).toBe(OPERATIONS_SESSION.etat.chemin);
    expect(OPERATIONS_SESSION.ouvrir.methode).toBe("POST");
    expect(OPERATIONS_SESSION.etat.methode).toBe("GET");
    expect(OPERATIONS_SESSION.fermer.methode).toBe("DELETE");
  });

  it("une barre finale sur la base ne produit JAMAIS `//air`", () => {
    // `//air/v1/session` est une URL VALIDE et un chemin DIFFÉRENT : certains
    // serveurs la servent, d'autres rendent 404 — et le défaut ne se voit
    // qu'en production.
    expect(urlProtocoleSession("https://api.exemple.com/", "ouvrir")).toBe(
      "https://api.exemple.com/air/v1/session",
    );
    expect(urlProtocoleSession("https://api.exemple.com///", "etat")).toBe(
      "https://api.exemple.com/air/v1/session",
    );
  });
});

const cibles = [{ entityId: "ent_membres", url: "https://api.x.com/air/v1/entities/ent_membres/rows" }];

describe("le port d'écriture HTTP", () => {
  it("écrit par POST sur la COLLECTION, identifiant dans le corps", async () => {
    const appels: { url: string; methode: string; corps?: unknown }[] = [];
    const transport: TransportEcriture = (url, methode, corps) => {
      appels.push({ url, methode, corps });
      return Promise.resolve({ ok: true, status: 201 });
    };
    const port = creerPortHttp({ cibles, transport });
    const r = await port.ecrire("ent_membres", { id: "7", nom: "Awa" });
    expect(r.error).toBeNull();
    expect(appels).toEqual([
      {
        url: "https://api.x.com/air/v1/entities/ent_membres/rows",
        methode: "POST",
        corps: { id: "7", nom: "Awa" },
      },
    ]);
  });

  it("supprime par DELETE sur la LIGNE", async () => {
    const appels: string[] = [];
    const port = creerPortHttp({
      cibles,
      transport: (url, methode) => {
        appels.push(`${methode} ${url}`);
        return Promise.resolve({ ok: true, status: 204 });
      },
    });
    await port.supprimer("ent_membres", "7");
    expect(appels).toEqual(["DELETE https://api.x.com/air/v1/entities/ent_membres/rows/7"]);
  });

  it("REFUSE une entité dont aucune source distante n'est déclarée", async () => {
    // Une écriture vers une entité sans cible irait nulle part. Un échec
    // silencieux est pire qu'un refus : l'application rouvrirait sur une ligne
    // qui n'existe pas.
    const port = creerPortHttp({ cibles, transport: () => Promise.resolve({ ok: true, status: 200 }) });
    const r = await port.ecrire("ent_absente", { a: 1 });
    expect(r.error?.message).toBe("AIR_ECRITURE_CIBLE_INCONNUE:ent_absente");
  });

  it("UN 403 EST UN ÉCHEC — `fetch` ne lève pas", async () => {
    // Le défaut exact qu'un `try/catch` seul laisse passer : le serveur a
    // répondu « non », et l'absence d'exception ferait croire l'écriture faite.
    const port = creerPortHttp({ cibles, transport: () => Promise.resolve({ ok: false, status: 403 }) });
    const r = await port.ecrire("ent_membres", { a: 1 });
    expect(r.error?.message).toBe("AIR_ECRITURE_REFUSEE:403");
  });

  it("une coupure réseau se distingue d'un refus", async () => {
    const port = creerPortHttp({ cibles, transport: () => Promise.reject(new Error("offline")) });
    const r = await port.ecrire("ent_membres", { a: 1 });
    // Deux codes distincts : l'un s'envoie chercher dans le serveur, l'autre
    // dans la connexion.
    expect(r.error?.message).toBe("AIR_ECRITURE_TRANSPORT");
  });
});

const urls = {
  ouvrir: "https://api.x.com/air/v1/session",
  etat: "https://api.x.com/air/v1/session",
  fermer: "https://api.x.com/air/v1/session",
  creerCompte: "https://api.x.com/air/v1/accounts",
  reinitialiser: "https://api.x.com/air/v1/password-resets",
};

/** Un serveur simulé : la réponse de chaque (méthode, url). */
const serveur = (
  reponses: Record<string, { ok: boolean; status: number; corps: unknown }>,
): { transport: TransportSession; appels: string[] } => {
  const appels: string[] = [];
  return {
    appels,
    transport: (url, methode) => {
      appels.push(`${methode} ${url}`);
      return Promise.resolve(reponses[`${methode} ${url}`] ?? { ok: false, status: 404, corps: {} });
    },
  };
};

describe("la session HTTP", () => {
  it("ouvre, et reçoit LES DROITS AVEC l'identité", async () => {
    const s = serveur({
      "GET https://api.x.com/air/v1/session": { ok: true, status: 200, corps: {} },
      "POST https://api.x.com/air/v1/session": {
        ok: true,
        status: 200,
        corps: { userId: "u1", rights: ["right_bureau", "right_registre"] },
      },
    });
    const session = creerSessionHttp({ urls, transport: s.transport });
    expect(session.estAuthentifie()).toBe(false);
    expect(await session.ouvrir("a@b.c", "x")).toBe(true);
    expect(session.identifiant()).toBe("u1");
    // Les droits arrivent dans la MÊME réponse : sans cela il existerait un
    // instant « identité établie, droits inconnus », et l'accès étant fermé
    // par défaut, cet instant refuserait quelqu'un qui a le droit.
    expect(session.droits()).toEqual(["right_bureau", "right_registre"]);
  });

  it("demande l'état au démarrage — sinon on redemande le mot de passe", async () => {
    const s = serveur({
      "GET https://api.x.com/air/v1/session": { ok: true, status: 200, corps: { userId: "u9", rights: [] } },
    });
    const session = creerSessionHttp({ urls, transport: s.transport });
    await vi.waitFor(() => {
      expect(session.identifiant()).toBe("u9");
    });
    expect(s.appels).toContain("GET https://api.x.com/air/v1/session");
  });

  it("distingue le TROISIÈME état : compte créé, session non ouverte", async () => {
    const s = serveur({
      "GET https://api.x.com/air/v1/session": { ok: true, status: 200, corps: {} },
      "POST https://api.x.com/air/v1/accounts": {
        ok: true,
        status: 202,
        corps: { pendingConfirmation: true },
      },
    });
    const session = creerSessionHttp({ urls, transport: s.transport });
    // Sans ce troisième état, une inscription réussie retombe sur « anonyme » —
    // indiscernable d'un échec, et rien ne bouge à l'écran.
    expect(await session.creer("a@b.c", "x")).toBe(true);
    expect(session.enAttenteConfirmation()).toBe(true);
    expect(session.estAuthentifie()).toBe(false);
  });

  it("ferme MÊME si le serveur refuse — la personne a demandé à sortir", async () => {
    const s = serveur({
      "GET https://api.x.com/air/v1/session": { ok: true, status: 200, corps: { userId: "u1" } },
      "POST https://api.x.com/air/v1/session": { ok: true, status: 200, corps: { userId: "u1" } },
    });
    const session = creerSessionHttp({ urls, transport: s.transport });
    await session.ouvrir("a@b.c", "x");
    expect(session.estAuthentifie()).toBe(true);
    // `DELETE` n'est pas dans les réponses : le serveur rend 404.
    await session.fermer();
    expect(session.estAuthentifie()).toBe(false);
  });

  it("une coupure réseau NE DÉCONNECTE PAS", async () => {
    // Fermer la session sur une coupure déconnecterait quelqu'un dans un
    // ascenseur.
    let coupe = false;
    const session = creerSessionHttp({
      urls,
      transport: (url, methode) => {
        if (coupe) return Promise.reject(new Error("offline"));
        return Promise.resolve(
          methode === "POST"
            ? { ok: true, status: 200, corps: { userId: "u1", rights: ["r"] } }
            : { ok: true, status: 200, corps: {} },
        );
      },
    });
    await session.ouvrir("a@b.c", "x");
    coupe = true;
    expect(await session.reinitialiser("a@b.c")).toBe(false);
    expect(session.estAuthentifie()).toBe(true);
    expect(session.droits()).toEqual(["r"]);
  });

  it("une réponse MAL FORMÉE n'établit aucune identité", async () => {
    // Un serveur écrit par quelqu'un d'autre peut rendre `userId: null` ou
    // `rights: "admin"`. Les prendre tels quels ferait entrer `null` dans
    // l'identifiant — et `estAuthentifie()` rendrait `true` pour personne.
    const s = serveur({
      "GET https://api.x.com/air/v1/session": { ok: true, status: 200, corps: {} },
      "POST https://api.x.com/air/v1/session": {
        ok: true,
        status: 200,
        corps: { userId: null, rights: "right_bureau" },
      },
    });
    const session = creerSessionHttp({ urls, transport: s.transport });
    expect(await session.ouvrir("a@b.c", "x")).toBe(false);
    expect(session.estAuthentifie()).toBe(false);
    expect(session.identifiant()).toBeUndefined();
    expect(session.droits()).toEqual([]);
  });

  it("un abonné est prévenu de chaque changement, et se désabonne", async () => {
    const s = serveur({
      "GET https://api.x.com/air/v1/session": { ok: true, status: 200, corps: {} },
      "POST https://api.x.com/air/v1/session": { ok: true, status: 200, corps: { userId: "u1" } },
    });
    const session = creerSessionHttp({ urls, transport: s.transport });
    let vu = 0;
    const off = session.abonner(() => {
      vu += 1;
    });
    await session.ouvrir("a@b.c", "x");
    expect(vu).toBeGreaterThan(0);
    const apres = vu;
    off();
    await session.fermer();
    expect(vu).toBe(apres);
  });
});
