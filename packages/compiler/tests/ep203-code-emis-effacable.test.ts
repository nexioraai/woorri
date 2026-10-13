/**
 * EP-203 · « ÇA COMPILE » NE VEUT PAS DIRE « ÇA DÉMARRE ».
 *
 * Mesure qui a commandé ce cliquet (2026-10-13) : en écrivant le connecteur
 * d'API, j'ai utilisé une PROPRIÉTÉ DE PARAMÈTRE DE CONSTRUCTEUR —
 * `constructor(public readonly nom: string)`. C'est du TypeScript correct.
 * `tsc --noEmit` l'accepte sans un mot. Et le serveur émis NE DÉMARRE PAS :
 * ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX.
 *
 * LA RAISON EST UN CHOIX DU PRODUIT, PAS UN ACCIDENT. Le serveur émis est
 * exécuté par un `node` nu : pas d'étape de construction, pas de compilateur
 * à installer, la source telle quelle. Or Node EFFACE les annotations, il ne
 * TRANSFORME pas le code. Une propriété de paramètre, un `enum`, un
 * `namespace` exigent qu'on FABRIQUE du code — Node refuse.
 *
 * Un typecheck vert ne peut donc PAS attester qu'une application démarre. Ce
 * cliquet mesure l'autre moitié, et il la mesure avec l'effaceur DE NODE
 * LUI-MÊME, pas avec une expression régulière qui croirait connaître la
 * grammaire de TypeScript.
 */
import { describe, expect, it } from "vitest";
import * as moduleDeNode from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBackend } from "../src/compile-backend.ts";
import type { ProjectAir } from "@deribfy/air-schema";

const ICI = dirname(fileURLToPath(import.meta.url));
const R = join(ICI, "..", "..", "..") + "/";

/**
 * LE CORPUS A DÉJÀ UNE SOURCE UNIQUE — ON NE S'EN FABRIQUE PAS UNE SECONDE.
 *
 * Mon premier jet balayait `slices/` et trouvait SEPT documents là où les
 * gates en mesurent trente-et-un. `corpus-documents.mjs` existe précisément
 * parce que deux listes ont divergé une fois, et que ça a coûté quatre
 * heures : une cible qui mesure un document que l'autre ignore reste verte
 * des deux côtés. Ce test lit donc la MÊME liste que les gates.
 */
const documents = async (): Promise<readonly { nom: string; air: ProjectAir }[]> => {
  const { documentsDuCorpus } = (await import(
    R + "docs/elite-protocol/evidence/corpus-documents.mjs"
  )) as { documentsDuCorpus: (r: string) => readonly [string, string, unknown?][] };
  const vus: { nom: string; air: ProjectAir }[] = [];
  for (const [nom, chemin] of documentsDuCorpus(R)) {
    // Une variante porte le même document qu'une entrée déjà lue : on mesure
    // le texte émis, donc la lire deux fois ne mesurerait rien de plus.
    if (vus.some((v) => v.nom === nom)) continue;
    vus.push({ nom, air: JSON.parse(readFileSync(chemin, "utf8")) as ProjectAir });
  }
  return vus;
};

/**
 * L'EFFACEUR EST EXPÉRIMENTAL — DONC ON VÉRIFIE QU'IL EST LÀ.
 *
 * `stripTypeScriptTypes` existe à l'exécution sur ce Node (mesuré), mais les
 * types livrés avec `@types/node` ne la déclarent pas encore : `tsc` la
 * refuse. Le cast nomme ce qu'on sait d'elle, et RIEN de plus.
 *
 * Le piège qu'on ferme juste en dessous : une API expérimentale peut
 * disparaître. Si elle disparaissait, un cliquet naïf prendrait `undefined`,
 * n'effacerait rien, ne lèverait rien — et resterait VERT en ne mesurant
 * plus rien. Un test qui ne mesure plus rien doit tomber.
 */
const effaceur = (
  moduleDeNode as unknown as {
    stripTypeScriptTypes?: (src: string, options?: unknown) => string;
  }
).stripTypeScriptTypes;

/** Ce que l'effaceur de Node dit d'une source : rien, ou son refus. */
const refusDeNode = (source: string): string | null => {
  if (typeof effaceur !== "function") {
    throw new Error(
      "node:module n'expose plus stripTypeScriptTypes — ce cliquet ne mesure " +
        "plus rien et doit être refait avant d'être rendu vert.",
    );
  }
  try {
    effaceur(source);
    return null;
  } catch (e) {
    return e instanceof Error ? `${e.name}: ${e.message.split("\n")[0] ?? ""}` : String(e);
  }
};

describe("EP-203 ① · l’effaceur de Node accepte TOUT le TypeScript émis", () => {
  it("le corpus entier, fichier par fichier", async () => {
    const docs = await documents();
    // Si le corpus devenait introuvable, ce test passerait en ne mesurant
    // rien. Il faut donc qu'il échoue dans ce cas-là.
    expect(docs.length).toBeGreaterThan(20);
    const refus: string[] = [];
    let mesures = 0;
    for (const { nom, air } of docs) {
      const { files } = compileBackend({
        ...air,
        backend: { kind: "genere", stack: "fastify" },
      });
      for (const [chemin, contenu] of files) {
        if (!chemin.endsWith(".ts") || chemin.endsWith(".d.ts")) continue;
        mesures += 1;
        const r = refusDeNode(contenu);
        if (r !== null) refus.push(`${nom} · ${chemin} — ${r}`);
      }
    }
    expect(mesures).toBeGreaterThan(100);
    expect(refus).toEqual([]);
  });
});

describe("EP-203 ② · le cliquet sait refuser — sinon il ne prouve rien", () => {
  it("l’effaceur de Node est PRÉSENT — une API expérimentale peut disparaître", () => {
    expect(typeof effaceur).toBe("function");
  });

  it("il REFUSE une propriété de paramètre, celle qui m’a piégé", () => {
    expect(refusDeNode("class A extends Error { constructor(public n: string) { super(n); } }")).toMatch(
      /ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX|SyntaxError/u,
    );
  });

  it("il REFUSE `enum` et `namespace`, pour la même raison", () => {
    expect(refusDeNode("enum E { A }")).not.toBeNull();
    expect(refusDeNode("namespace N { export const x = 1; }")).not.toBeNull();
  });

  it("il ACCEPTE les annotations et les interfaces — on n’interdit pas les types", () => {
    expect(refusDeNode("interface I { a: string }\nconst x: I = { a: \"b\" };\nexport default x;")).toBeNull();
  });
});

describe("EP-203 ③ · le connecteur d’API, en particulier", () => {
  it("un connecteur déclaré est effaçable", async () => {
    const premier = (await documents())[0];
    expect(premier).toBeDefined();
    const base = (premier as { air: ProjectAir }).air;
    const { files } = compileBackend({
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
              name: "Envoyer",
              method: "POST",
              path: "/v2/messages",
              sends: ["texte"],
              returns: [{ key: "identifiant", type: "string" }],
            },
          ],
        },
      ],
    });
    const connecteur = files.get("src/connecteur/api_sms.ts");
    const routes = files.get("src/api/connecteur.ts");
    expect(connecteur).toBeDefined();
    expect(routes).toBeDefined();
    expect(refusDeNode(connecteur ?? "")).toBeNull();
    expect(refusDeNode(routes ?? "")).toBeNull();
  });
});
