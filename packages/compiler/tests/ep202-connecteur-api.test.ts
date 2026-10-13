/**
 * EP-202 · LE CONNECTEUR D'API — LE CODE ÉMIS EST EXÉCUTÉ, PAS RELU.
 *
 * Mesure qui a commandé ce lot (2026-10-13) : AIR 1.36.0 rendait une API
 * extérieure déclarable, et le validateur savait la refuser. UN SEUL fichier
 * lisait `air.apis` — le validateur. ZÉRO code émettait un appel. Déclarable,
 * refusable, pas appelable.
 *
 * ── CE QUE CES PREUVES FONT, ET CE QU'ELLES NE FONT PAS.
 *
 * Le module émis est écrit sur le disque et EXÉCUTÉ par un `node` nu, qui
 * efface les types lui-même. Son `fetch` est remplacé par un témoin qui note
 * la requête et rend une réponse choisie : on observe donc EXACTEMENT ce qui
 * partirait vers le tiers — l'adresse, la méthode, les en-têtes, le corps —
 * et exactement ce que le connecteur accepte d'en rendre.
 *
 * CE QUI N'EST PAS PROUVÉ ICI, ET QUE JE DIS PLUTÔT QUE DE LE LAISSER
 * CROIRE : aucun vrai appel TLS vers un vrai tiers n'a lieu. Une sonde qui
 * sortirait sur le réseau ne mesurerait plus le code, elle mesurerait le
 * réseau — et le dépôt l'interdit déjà pour les autres sondes. Le chemin
 * TLS lui-même reste donc NON MESURÉ.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBackend } from "../src/compile-backend.ts";
import type { ProjectAir } from "@deribfy/air-schema";

const ICI = dirname(fileURLToPath(import.meta.url));
const DOC = join(ICI, "..", "..", "..", "slices", "tontine", "tontine.air.json");

/**
 * LE CORPUS EST GELÉ — ON INJECTE, ON N'ÉCRIT PAS DANS LE DOCUMENT.
 *
 * Aucun des 31 documents ne déclare d'API : ils ont été écrits avant 1.36.0.
 * Les modifier pour faire passer une preuve rendrait la preuve circulaire.
 * L'injection a lieu en mémoire, ici, et le fichier sur disque ne bouge pas.
 */
const avecApi = (): ProjectAir => {
  const base = JSON.parse(readFileSync(DOC, "utf8")) as ProjectAir;
  return {
    ...base,
    backend: { kind: "genere", stack: "fastify" },
    network: {
      ...base.network,
      allowedDomains: [...base.network.allowedDomains, "api.exemple-sms.com"],
    },
    apis: [
      {
        id: "api_sms",
        name: "Envoi de SMS",
        domain: "api.exemple-sms.com",
        auth: { kind: "header_secret", headerName: "X-Api-Key", secretEnvName: "SMS_API_KEY" },
        operations: [
          {
            id: "apiop_envoyer",
            name: "Envoyer un message",
            method: "POST",
            path: "/v2/messages",
            sends: ["destinataire", "texte"],
            returns: [
              { key: "identifiant", type: "string" },
              { key: "livre", type: "boolean" },
            ],
          },
          {
            id: "apiop_etat",
            name: "Lire l'état d'un message",
            method: "GET",
            path: "/v2/messages/{identifiant}",
            returns: [{ key: "etat", type: "string" }],
          },
        ],
      },
    ],
  };
};

const emis = (): Map<string, string> => new Map(compileBackend(avecApi()).files);

/**
 * EXÉCUTER LE MODULE ÉMIS, AVEC UN `fetch` TÉMOIN.
 *
 * Le pilote est écrit à côté du module, dans un dossier temporaire. Il
 * remplace `globalThis.fetch`, appelle l'opération demandée, et rend en JSON
 * ce qui est parti et ce qui est revenu. Tout échec est rendu par son NOM de
 * classe : c'est ce nom que les routes traduisent en statut HTTP.
 */
interface Tir {
  readonly ok: boolean;
  readonly erreur?: string;
  readonly resultat?: Record<string, unknown>;
  readonly vu?: {
    readonly url: string;
    readonly methode: string;
    readonly entetes: Record<string, string>;
    readonly corps: string | null;
  };
}

function tirer(
  operation: string,
  entrees: Record<string, unknown>,
  reponse: { statut?: number; corps?: unknown; lent?: boolean },
  env: Record<string, string> = { SMS_API_KEY: "secret-de-test-0123" },
): Tir {
  const dossier = mkdtempSync(join(tmpdir(), "deribfy-connecteur-"));
  try {
    writeFileSync(join(dossier, "sms.ts"), emis().get("src/connecteur/api_sms.ts") ?? "");
    writeFileSync(
      join(dossier, "pilote.mjs"),
      [
        "let vu = null;",
        `const plan = ${JSON.stringify(reponse)};`,
        "globalThis.fetch = async (url, init) => {",
        "  vu = {",
        "    url: String(url),",
        "    methode: init.method,",
        "    entetes: init.headers,",
        "    corps: init.body ?? null,",
        "  };",
        // Le témoin RESPECTE le signal d'abandon : c'est ainsi qu'on mesure le
        // délai sans attendre dix secondes dans la suite de tests.
        // ── POURQUOI LE TÉMOIN LÈVE L'ABANDON AU LIEU DE LE SUBIR.
        //
        // Un vrai abandon arriverait au bout de DELAI_MS, soit dix secondes :
        // le cliquet de marge des tests (×3 sur 5 000 ms) refuserait un test
        // aussi lent, et il aurait raison. Le témoin lève donc TOUT DE SUITE
        // l'erreur que Node lève à l'abandon — `TimeoutError` — et ce qu'on
        // mesure ici est la TRADUCTION qu'en fait le connecteur. Que le
        // minuteur parte bien à dix secondes est prouvé séparément, sur le
        // texte émis, et c'est dit comme tel.
        "  if (plan.lent) {",
        "    if (!(init.signal instanceof AbortSignal)) throw new Error('aucun signal');",
        "    const e = new Error('abandon'); e.name = 'TimeoutError'; throw e;",
        "  }",
        "  return {",
        "    ok: (plan.statut ?? 200) < 400,",
        "    status: plan.statut ?? 200,",
        "    json: async () => plan.corps,",
        "  };",
        "};",
        "const m = await import('./sms.ts');",
        `const op = m[${JSON.stringify(operation)}];`,
        "try {",
        `  const resultat = await op(${JSON.stringify(entrees)});`,
        "  console.log(JSON.stringify({ ok: true, resultat, vu }));",
        "} catch (e) {",
        "  console.log(JSON.stringify({ ok: false, erreur: e.name, vu }));",
        "}",
      ].join("\n"),
    );
    const sortie = execFileSync(process.execPath, [join(dossier, "pilote.mjs")], {
      encoding: "utf8",
      // Le délai du connecteur est de 10 s ; le témoin lent est abandonné par
      // le connecteur lui-même, donc ce plafond n'est qu'un garde-fou.
      timeout: 30_000,
      env: { ...process.env, ...env, NODE_OPTIONS: "" },
    });
    return JSON.parse(sortie.trim().split("\n").pop() ?? "{}") as Tir;
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

describe("EP-202 ① · une API déclarée devient appelable", () => {
  it("un document SANS `apis` n’émet aucun connecteur — rien n’a changé pour les 31", () => {
    const base = JSON.parse(readFileSync(DOC, "utf8")) as ProjectAir;
    const sans = compileBackend({ ...base, backend: { kind: "genere", stack: "fastify" } });
    const f = [...sans.files.keys()];
    expect(f.filter((x) => x.startsWith("src/connecteur/"))).toHaveLength(0);
    expect(f).not.toContain("src/api/connecteur.ts");
  });

  it("une API déclarée émet UN fichier par API, et ses routes", () => {
    const f = [...emis().keys()];
    expect(f).toContain("src/connecteur/api_sms.ts");
    expect(f).toContain("src/api/connecteur.ts");
  });

  it("une opération NON déclarée n’a pas de route — elle n’existe pas", () => {
    const routes = emis().get("src/api/connecteur.ts") ?? "";
    expect(routes).toContain('"/air/v1/apis/api_sms/apiop_envoyer"');
    expect(routes).toContain('"/air/v1/apis/api_sms/apiop_etat"');
    // Deux opérations déclarées, deux routes. Pas une de plus.
    expect([...routes.matchAll(/app\.post\(/gu)]).toHaveLength(2);
  });
});

describe("EP-202 ② · LE SECRET NE PART PAS DANS L’APPLICATION", () => {
  it("aucun fichier émis ne contient la VALEUR d’un secret — seulement son NOM", () => {
    const tout = [...emis().values()].join("\n");
    expect(tout).toContain("SMS_API_KEY");
    expect(tout).toContain("process.env[NOM_DU_SECRET]");
    // La preuve négative qui compte : la valeur n'est nulle part, parce que le
    // document ne la porte pas. Le moteur ne peut pas la divulguer.
    expect(tout).not.toContain("secret-de-test-0123");
  });

  it("le connecteur est un fichier de SERVEUR : il ne figure dans aucun écran", () => {
    for (const chemin of [...emis().keys()]) {
      if (chemin.startsWith("src/connecteur/")) {
        expect(chemin.startsWith("src/connecteur/")).toBe(true);
      }
    }
    // L'enveloppe du backend et celle de l'application sont deux enveloppes
    // distinctes : rien de ceci ne peut atterrir dans un paquet de téléphone.
    expect([...emis().keys()].some((c) => c.endsWith(".tsx"))).toBe(false);
  });

  it("À L’EXÉCUTION, le secret part dans l’en-tête déclaré — et nulle part ailleurs", () => {
    const t = tirer(
      "apiopEnvoyer",
      { destinataire: "+22399000000", texte: "bonjour" },
      { corps: { identifiant: "m-1", livre: true } },
    );
    expect(t.ok, t.erreur).toBe(true);
    expect(t.vu?.entetes["X-Api-Key"]).toBe("secret-de-test-0123");
    // Le secret n'est NI dans l'adresse, NI dans le corps.
    expect(t.vu?.url).not.toContain("secret-de-test");
    expect(t.vu?.corps ?? "").not.toContain("secret-de-test");
  });

  it("secret absent de l’environnement ⇒ REFUS NOMMÉ, pas un appel sans en-tête", () => {
    const t = tirer(
      "apiopEnvoyer",
      { destinataire: "+22399000000", texte: "bonjour" },
      { corps: { identifiant: "m-1", livre: true } },
      { SMS_API_KEY: "" },
    );
    expect(t.ok).toBe(false);
    expect(t.erreur).toBe("SecretAbsent");
    // Et surtout : RIEN n'est parti. Un appel sans clé aurait reçu un 401
    // incompréhensible, et aurait compté dans le quota du tiers.
    expect(t.vu).toBeNull();
  });
});

describe("EP-202 ③ · L’ADRESSE VIENT DE LA DÉCLARATION, JAMAIS DE LA REQUÊTE", () => {
  it("l’hôte est celui du document", () => {
    const t = tirer("apiopEnvoyer", { destinataire: "+1", texte: "x" }, { corps: { identifiant: "a", livre: false } });
    expect(t.vu?.url.startsWith("https://api.exemple-sms.com/v2/messages")).toBe(true);
  });

  it("une valeur de chemin ne peut pas DÉPLACER l’appel", () => {
    // Si le segment n'était pas échappé, `../../admin` changerait l'adresse
    // appelée, et `?x=1` y ajouterait une question. C'est la classe d'attaque
    // que l'échappement ferme.
    const t = tirer("apiopEtat", { identifiant: "../../admin?x=1" }, { corps: { etat: "lu" } });
    expect(t.ok, t.erreur).toBe(true);
    const url = t.vu?.url ?? "";
    expect(url).toContain("/v2/messages/");
    expect(url).not.toContain("/admin");
    expect(url).not.toContain("?x=1");
  });

  it("le secret ne suit pas une redirection — `redirect: \"error\"` est volontaire", () => {
    expect(emis().get("src/connecteur/api_sms.ts") ?? "").toContain('redirect: "error"');
  });
});

describe("EP-202 ④ · EXACTEMENT LES ENTRÉES DÉCLARÉES", () => {
  it("une entrée manquante est refusée AVANT l’appel", () => {
    const t = tirer("apiopEnvoyer", { destinataire: "+1" }, { corps: {} });
    expect(t.erreur).toBe("EntreeManquante");
    expect(t.vu).toBeNull();
  });

  it("une entrée EN TROP est refusée, pas ignorée", () => {
    // Ignorer en silence laisserait filer vers le tiers un champ que personne
    // n'a déclaré — et le manifeste de confidentialité, qui ne parle que des
    // champs déclarés, deviendrait FAUX.
    const t = tirer(
      "apiopEnvoyer",
      { destinataire: "+1", texte: "x", numero_de_carte: "4111111111111111" },
      { corps: {} },
    );
    expect(t.erreur).toBe("EntreeEnTrop");
    expect(t.vu).toBeNull();
  });

  it("un GET met ses entrées dans le chemin, pas un corps", () => {
    const t = tirer("apiopEtat", { identifiant: "m-42" }, { corps: { etat: "livre" } });
    expect(t.vu?.methode).toBe("GET");
    expect(t.vu?.corps).toBeNull();
    expect(t.vu?.url).toContain("/v2/messages/m-42");
  });
});

describe("EP-202 ⑤ · EXACTEMENT LES SORTIES DÉCLARÉES — LE CLIQUET DE CONFIDENTIALITÉ", () => {
  it("une clé que l’API ajoute NE TRAVERSE PAS", () => {
    const t = tirer(
      "apiopEnvoyer",
      { destinataire: "+1", texte: "x" },
      {
        corps: {
          identifiant: "m-1",
          livre: true,
          // Le tiers se met à rendre des données personnelles en plus. Le jour
          // où ça arrive, personne ne relit le code : le filtre doit tenir
          // tout seul.
          telephone_du_destinataire: "+22399000000",
          position: "12.65,-8.00",
        },
      },
    );
    expect(t.ok, t.erreur).toBe(true);
    expect(Object.keys(t.resultat ?? {}).sort()).toEqual(["identifiant", "livre"]);
  });

  it("une clé déclarée mais ABSENTE est un refus, pas un `undefined` silencieux", () => {
    const t = tirer("apiopEnvoyer", { destinataire: "+1", texte: "x" }, { corps: { identifiant: "m-1" } });
    expect(t.erreur).toBe("ReponseInattendue");
  });

  it("un type qui ne correspond pas est refusé — on ne convertit pas en douce", () => {
    // Beaucoup d'API rendent un booléen en texte. Convertir ferait entrer une
    // valeur fausse sans que personne ne sache d'où elle vient.
    const t = tirer(
      "apiopEnvoyer",
      { destinataire: "+1", texte: "x" },
      { corps: { identifiant: "m-1", livre: "oui" } },
    );
    expect(t.erreur).toBe("ReponseInattendue");
  });
});

describe("EP-202 ⑥ · UN TIERS EN PANNE NE FAIT PAS TOMBER L’APPLICATION", () => {
  it("un refus du tiers est rendu comme tel, et son CORPS ne traverse pas", () => {
    const t = tirer(
      "apiopEnvoyer",
      { destinataire: "+1", texte: "x" },
      { statut: 403, corps: { message: "clé révoquée", trace_interne: "pod-7/secret=abc" } },
    );
    expect(t.erreur).toBe("ApiARefuse");
    // Le texte du tiers peut contenir une trace interne, voire la clé
    // réfléchie. L'application apprend le GENRE de l'échec, pas le texte.
    expect(JSON.stringify(t)).not.toContain("trace_interne");
  });

  it("un abandon est TRADUIT en « trop lente », et un signal est bien passé", () => {
    // Mesuré à l'exécution : le connecteur passe un AbortSignal (le témoin
    // refuse de jouer sans), et il traduit `TimeoutError` en ApiTropLente,
    // que les routes rendent en 504.
    const t = tirer("apiopEnvoyer", { destinataire: "+1", texte: "x" }, { lent: true });
    expect(t.erreur).toBe("ApiTropLente");
  });

  it("LE MINUTEUR EXISTE ET VAUT DIX SECONDES — mesuré sur le texte, pas au chrono", () => {
    // Ce qu'un test rapide ne peut pas prouver, un test rapide doit le dire :
    // on ne vérifie pas ici qu'une attente de dix secondes se termine. On
    // vérifie que le délai est câblé et que sa valeur est celle annoncée.
    const source = emis().get("src/connecteur/api_sms.ts") ?? "";
    expect(source).toContain("signal: AbortSignal.timeout(DELAI_MS)");
    expect(source).toContain("const DELAI_MS = 10000;");
  });

  it("AUCUNE reprise automatique — rejouer un POST débiterait deux fois", () => {
    const source = emis().get("src/connecteur/api_sms.ts") ?? "";
    expect(source).not.toMatch(/retry|tentative|réessay/iu);
    expect(source).toContain("AUCUNE REPRISE");
  });
});

describe("EP-202 ⑦ · UN APPEL D’API COÛTE DE L’ARGENT : IL EXIGE UNE IDENTITÉ", () => {
  it("chaque route exige un appelant vérifiable", () => {
    const routes = emis().get("src/api/connecteur.ts") ?? "";
    // Deux routes, deux refus. Ouvrir ces adresses à l'anonyme laisserait
    // n'importe qui vider le quota — et la facture — de quelqu'un d'autre.
    expect([...routes.matchAll(/AIR_APPELANT_REQUIS/gu)]).toHaveLength(2);
    expect([...routes.matchAll(/appelantDe\(/gu)]).toHaveLength(2);
  });

  it("les entrées voyagent dans le CORPS, jamais dans l’adresse de notre serveur", () => {
    const routes = emis().get("src/api/connecteur.ts") ?? "";
    // Une adresse se retrouve dans les journaux du serveur, dans ceux de
    // l'hébergeur et dans l'historique des mandataires. Un numéro de
    // téléphone passé en query y resterait écrit.
    expect(routes).toContain("req.body");
    expect(routes).not.toMatch(/req\.query/u);
  });

  it("le serveur branche le connecteur, sinon les routes n’existeraient pas", () => {
    expect(emis().get("src/serveur.ts") ?? "").toContain("connecteurRoutes(app)");
  });
});
