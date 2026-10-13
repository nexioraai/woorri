/**
 * EP-210 · LA PARITÉ DES DEUX PILES — MESURÉE, PAS AFFIRMÉE.
 *
 * Mesure du 2026-10-13 : la pile `fastify` savait lire un appelant, appeler
 * une API déclarée et tenir la porte de l'agent. La pile `spring_boot` ne
 * savait RIEN de tout cela — zéro lecture de jeton, zéro connecteur, zéro
 * agent. Conséquence : côté Java, TOUTE règle de visibilité désignant
 * l'appelant rendait 403 pour toujours. Honnête, et indisponible.
 *
 * Et ce n'était pas théorique : `tontine`, l'application du propriétaire,
 * déclare `spring_boot`.
 *
 * ── POURQUOI CE FICHIER EXISTE PLUTÔT QU'UN COMMENTAIRE.
 *
 * « Les deux piles font la même chose » est une phrase. Ces preuves comparent
 * les deux textes émis, refus par refus, adresse par adresse. Le jour où un
 * refus est ajouté d'un seul côté, c'est ici que ça tombe — et pas chez une
 * personne dont le document avait choisi l'autre pile.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBackend } from "../src/compile-backend.ts";
import { OPERATIONS_AGENT } from "../src/resolve-lock.ts";
import type { ProjectAir } from "@deribfy/air-schema";

const ICI = dirname(fileURLToPath(import.meta.url));
const DOC = join(ICI, "..", "..", "..", "slices", "tontine", "tontine.air.json");

const API = {
  id: "api_service",
  name: "Service",
  domain: "api.exemple-service.com",
  auth: {
    kind: "header_secret" as const,
    headerName: "X-Api-Key",
    secretEnvName: "SERVICE_KEY",
  },
  operations: [
    {
      id: "apiop_envoyer",
      name: "Envoyer",
      method: "POST" as const,
      path: "/v1/envois",
      sends: ["destinataire", "texte"],
      returns: [
        { key: "reference", type: "string" as const },
        { key: "livre", type: "boolean" as const },
        { key: "cout", type: "number" as const },
      ],
    },
    {
      id: "apiop_etat",
      name: "Lire un état",
      method: "GET" as const,
      path: "/v1/envois/{reference}",
      sends: ["reference"],
      returns: [{ key: "etat", type: "string" as const }],
    },
    {
      id: "apiop_interpreter",
      name: "Interpréter",
      method: "POST" as const,
      path: "/v1/comprendre",
      sends: ["mots", "catalogue"],
      returns: [
        { key: "operation", type: "string" as const },
        { key: "valeurs", type: "string" as const },
      ],
    },
  ],
};

/**
 * LE DOCUMENT, LU UNE FOIS ET TYPE UNE FOIS.
 *
 * L'assertion vit DANS l'etalement — c'est le motif deja employe ailleurs
 * dans ce paquet. Deux regles de lint se contredisent sinon : sans assertion
 * l'affectation est « unsafe any », avec elle elle est « unnecessary ».
 */
const lu = (): ProjectAir => ({ ...(JSON.parse(readFileSync(DOC, "utf8")) as ProjectAir) });

/** Le premier droit du document REEL — pas un droit invente. */
const DROIT = ((): string => {
  const air = lu();
  const d = air.access?.rights[0]?.id;
  if (d === undefined) {
    throw new Error(
      "le document de preuve ne declare aucun droit : la garde de droit ne " +
        "serait pas mesuree, et ce test passerait en ne prouvant rien.",
    );
  }
  return d;
})();

const AGENT = {
  allowedOperations: ["apiop_envoyer", "apiop_etat"],
  // UN DROIT EXIGE, et c'est deliberе : sans lui, aucune des deux piles
  // n'emet sa garde, et la parite serait affirmee sur du vide.
  requiredRightId: DROIT,
  confirmBeforeAct: true,
  brain: {
    operationId: "apiop_interpreter",
    wordsInput: "mots",
    catalogueInput: "catalogue",
    choiceOutput: "operation",
    inputsOutput: "valeurs",
  },
};

const document = (pile: "fastify" | "spring_boot"): ProjectAir => {
  const base = lu();
  return {
    ...base,
    backend: { kind: "genere", stack: pile },
    network: {
      ...base.network,
      allowedDomains: [...base.network.allowedDomains, "api.exemple-service.com"],
    },
    apis: [API],
    agent: AGENT,
  };
};

/** Tout le texte émis d'une pile, en un bloc : on compare des contenus. */
const tout = (pile: "fastify" | "spring_boot"): string =>
  [...compileBackend(document(pile)).files.values()].join("\n");

const fichiers = (pile: "fastify" | "spring_boot"): string[] => [
  ...compileBackend(document(pile)).files.keys(),
];

describe("EP-210 ① · les deux piles émettent les trois pièces", () => {
  it("Java émet un lecteur d'identité, un connecteur et une porte d'agent", () => {
    const f = fichiers("spring_boot");
    expect(f.some((x) => x.endsWith("/Appelant.java"))).toBe(true);
    expect(f.some((x) => x.endsWith("/connecteur/Service.java"))).toBe(true);
    expect(f.some((x) => x.endsWith("/api/ConnecteurApi.java"))).toBe(true);
    expect(f.some((x) => x.endsWith("/api/AgentApi.java"))).toBe(true);
  });

  it("le nom du FICHIER est le nom de la CLASSE — sinon Java refuse", () => {
    // Deux fonctions de nommage existaient : celle d'`emit-spring` ne retire
    // pas le préfixe `api_`, celle du connecteur si. Si l'une nommait le
    // fichier et l'autre la classe, rien ne compilerait.
    const f = compileBackend(document("spring_boot")).files;
    for (const [chemin, contenu] of f) {
      if (!chemin.endsWith(".java")) continue;
      const nom = chemin.slice(chemin.lastIndexOf("/") + 1, -".java".length);
      // Un type Java n'est pas forcement une `class` : les depots emis sont
      // des `interface`. Ce qui compte est que le TYPE PUBLIC porte le nom du
      // fichier, quelle que soit sa sorte.
      expect(contenu, chemin).toMatch(
        new RegExp(`(class|interface|record|enum)\\s+${nom}\\b`, "u"),
      );
    }
  });

  it("un document SANS api n'émet ni connecteur ni agent, dans les DEUX piles", () => {
    const base = lu();
    for (const pile of ["fastify", "spring_boot"] as const) {
      const f = [...compileBackend({
        ...base,
        backend: { kind: "genere", stack: pile },
      }).files.keys()];
      expect(f.some((x) => x.includes("connecteur")), pile).toBe(false);
      expect(f.some((x) => /AgentApi|api\/agent\.ts/u.test(x)), pile).toBe(false);
    }
  });

  it("MAIS l'appelant est émis dans les deux cas — les filtres en dépendent", () => {
    // Les trente-sept filtres de visibilité n'ont rien à voir avec l'agent :
    // les priver du lecteur d'identité les laisserait rendre 403 pour
    // toujours.
    const base = lu();
    const f = [...compileBackend({
      ...base,
      backend: { kind: "genere", stack: "spring_boot" },
    }).files.keys()];
    expect(f.some((x) => x.endsWith("/Appelant.java"))).toBe(true);
  });
});

describe("EP-210 ② · LES MÊMES CODES DE REFUS, DES DEUX CÔTÉS", () => {
  const CODES = [
    "AIR_APPELANT_REQUIS",
    "AIR_API_ENTREE_MANQUANTE",
    "AIR_API_ENTREE_EN_TROP",
    "AIR_API_SECRET_ABSENT",
    "AIR_API_TROP_LENTE",
    "AIR_API_A_REFUSE",
    "AIR_API_REPONSE_INATTENDUE",
    "AIR_AGENT_DROIT_REQUIS",
    "AIR_AGENT_OPERATION_NON_AUTORISEE",
    "AIR_AGENT_CONFIRMATION_REQUISE",
    "AIR_AGENT_CONFIRMATION_INVALIDE",
    "AIR_AGENT_CONFIRMATION_EXPIREE",
    "AIR_AGENT_CHOIX_HORS_POUVOIRS",
    "AIR_AGENT_VALEURS_ILLISIBLES",
    "AIR_AGENT_MOTS_MANQUANTS",
  ];

  it("chaque code existe dans les DEUX piles", () => {
    const node = tout("fastify");
    const java = tout("spring_boot");
    const manquants: string[] = [];
    for (const code of CODES) {
      if (!node.includes(code)) manquants.push(`fastify:${code}`);
      if (!java.includes(code)) manquants.push(`spring_boot:${code}`);
    }
    expect(manquants).toEqual([]);
  });
});

describe("EP-210 ③ · LES MÊMES ADRESSES, SINON UNE APPLICATION NE JOINT RIEN", () => {
  it("les trois adresses de l'agent sont écrites par les deux piles", () => {
    // L'application émise appelle UNE adresse, quelle que soit la pile du
    // serveur. Deux piles qui n'écrivent pas la même adresse donneraient une
    // application qui marche sur l'une et 404 sur l'autre.
    const node = tout("fastify");
    const java = tout("spring_boot");
    for (const op of Object.values(OPERATIONS_AGENT)) {
      expect(node, `fastify ${op.chemin}`).toContain(op.chemin);
      // Java découpe l'adresse en @RequestMapping + @PostMapping : on vérifie
      // le SUFFIXE, qui est la partie que la pile écrit elle-même.
      const suffixe = op.chemin.replace("/air/v1/agent", "");
      expect(java, `spring_boot ${op.chemin}`).toContain(
        suffixe === "" ? '@RequestMapping("/air/v1/agent")' : `"${suffixe}"`,
      );
    }
  });

  it("les adresses du connecteur portent l'API ET l'opération, des deux côtés", () => {
    for (const pile of ["fastify", "spring_boot"] as const) {
      const s = tout(pile);
      expect(s, pile).toContain("/apis/api_service/apiop_envoyer");
      expect(s, pile).toContain("/apis/api_service/apiop_etat");
    }
  });

  it("l'opération du CERVEAU n'a pas de route d'agent — réfléchir n'est pas agir", () => {
    for (const pile of ["fastify", "spring_boot"] as const) {
      const s = tout(pile);
      // Elle a sa route de connecteur (c'est une opération déclarée), mais
      // JAMAIS de branche dans la porte de l'agent.
      expect(s, pile).toContain("/apis/api_service/apiop_interpreter");
      expect(s.includes('case "apiop_interpreter"'), pile).toBe(false);
    }
  });
});

describe("EP-210 ④ · LES MÊMES GARDES, ET AUCUN SECRET DANS LE TEXTE", () => {
  it("aucune pile n'écrit la VALEUR d'un secret — seulement son NOM", () => {
    for (const pile of ["fastify", "spring_boot"] as const) {
      const s = tout(pile);
      expect(s, pile).toContain("SERVICE_KEY");
      expect(s.includes("cle-du-tiers"), pile).toBe(false);
    }
  });

  it("aucune pile ne lit `user_metadata` — on ne s'accorde pas ses droits", () => {
    // `user_metadata` est modifiable par la personne elle-même : des droits
    // qu'on s'accorde soi-même ne sont pas des droits.
    // ON INTERDIT LA LECTURE, PAS LA MENTION. Mon premier jet refusait la
    // CHAINE : il tombait sur les commentaires qui expliquent precisement que
    // `user_metadata` n'est jamais lu. C'est la meme erreur que la sonde F3,
    // qui ne distingue pas un commentaire d'un texte emis — le depot l'a deja
    // payee deux fois.
    for (const pile of ["fastify", "spring_boot"] as const) {
      const s = tout(pile);
      expect(s, pile).toContain("app_metadata");
      const lectures = [
        '["user_metadata"]',
        '.user_metadata',
        'path("user_metadata")',
        'get("user_metadata")',
      ].filter((motif) => s.includes(motif));
      expect(lectures, pile).toEqual([]);
    }
  });

  it("les deux piles refusent de SUIVRE une redirection", () => {
    // Une redirection pourrait emmener l'en-tête du secret vers un autre hôte
    // que celui déclaré.
    expect(tout("fastify")).toContain('redirect: "error"');
    expect(tout("spring_boot")).toContain("Redirect.NEVER");
  });

  it("les deux piles imposent un DÉLAI de dix secondes", () => {
    expect(tout("fastify")).toContain("const DELAI_MS = 10000;");
    expect(tout("spring_boot")).toContain("DELAI_MS = 10000L");
  });

  it("aucune pile ne REJOUE un appel échoué", () => {
    // Rejouer un POST qui débite débiterait deux fois.
    for (const pile of ["fastify", "spring_boot"] as const) {
      expect(/retry|réessay|tentative/iu.exec(tout(pile)), pile).toBeNull();
    }
  });

  it("les deux piles comparent les signatures à TEMPS CONSTANT", () => {
    // Comparer caractère par caractère laisse mesurer combien sont bons, et
    // avec assez d'essais la signature se devine.
    expect(tout("fastify")).toContain("timingSafeEqual");
    expect(tout("spring_boot")).toContain("MessageDigest.isEqual");
  });

  it("les deux piles IMPOSENT l'algorithme et EXIGENT une échéance", () => {
    for (const pile of ["fastify", "spring_boot"] as const) {
      const s = tout(pile);
      expect(s, `${pile} alg`).toContain("HS256");
      expect(s, `${pile} exp`).toContain("exp");
    }
  });

  it("LA CHARGE SIGNÉE a le même séparateur dans les deux piles", () => {
    // Deux piles qui ne construisent pas la même charge ne signeraient pas la
    // même chose : un comportement identique sur le même document exige une
    // forme canonique identique, séparateur compris.
    for (const pile of ["fastify", "spring_boot"] as const) {
      expect(tout(pile), pile).toContain("u0000");
    }
  });
});

describe("EP-210 ⑤ · LE FILTRE DES SORTIES, DANS LES TROIS TYPES", () => {
  it("chaque clé déclarée est vérifiée dans son TYPE, des deux côtés", () => {
    // Un type qui ne correspond pas est refusé, jamais converti en douce :
    // convertir ferait entrer une valeur fausse sans qu'on sache d'où elle
    // vient.
    const java = tout("spring_boot");
    expect(java).toContain('isTextual()');
    expect(java).toContain('isBoolean()');
    expect(java).toContain('isNumber()');
    const node = tout("fastify");
    expect(node).toContain('typeof v !== "string"');
    expect(node).toContain('typeof v !== "boolean"');
    expect(node).toContain("Number.isFinite(v)");
  });

  it("une clé que l'API ajouterait n'est nommée NULLE PART", () => {
    // Le filtre est positif : seules les clés déclarées sont lues. Une clé
    // non déclarée ne peut pas traverser parce qu'aucun code ne la lit.
    for (const pile of ["fastify", "spring_boot"] as const) {
      expect(tout(pile).includes("telephone_du_destinataire"), pile).toBe(false);
    }
  });
});
