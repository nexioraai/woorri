// EP-161 ① — UN JUGE QUI NE TOURNE PAS N'EST PAS UN JUGE.
//
// EP-160 a trouvé `verifierCouvertureLexicale` : écrit, classé, testé, et
// jamais appelé dans la chaîne de production. Le cliquet d'EP-135 ne pouvait
// pas le voir — il vérifie qu'un code est ÉMIS dans la source, pas que la
// fonction qui l'émet est APPELÉE.
//
// Ce cliquet-ci cherche la forme générale, sans connaître aucun juge : toute
// fonction exportée qui produit des diagnostics doit avoir un appelant hors
// tests. Il en a trouvé DEUX autres du premier coup.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const R = join(import.meta.dirname, "..", "..", "..");

interface Source { readonly p: string; readonly code: string }

function sources(test: boolean): Source[] {
  const out: Source[] = [];
  const visiter = (dir: string): void => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (["node_modules", "results", "corpus-v2", "styling", "attic", "dist"].includes(f)) continue;
      if (statSync(p).isDirectory()) { visiter(p); continue; }
      if (!/\.(ts|tsx|mjs)$/.test(f) || f.includes(".generated.") || f.includes("embedded-")) continue;
      const estTest = p.includes("/tests/") || f.includes(".test.");
      if (estTest !== test) continue;
      out.push({ p: p.slice(R.length + 1), code: readFileSync(p, "utf8") });
    }
  };
  for (const d of ["packages", "benchmarks"]) visiter(join(R, d));
  return out;
}

/** Une fonction ÉMETTRICE : exportée, et son corps produit un code de diagnostic. */
function emettrices(prod: readonly Source[]): { p: string; nom: string }[] {
  const out: { p: string; nom: string }[] = [];
  for (const { p, code } of prod) {
    for (const m of code.matchAll(/export function (\w+)\s*\(/g)) {
      const suite = code.slice(m.index, m.index + 4000);
      if (/\bd\(\s*"[A-Z][A-Z_]+"|code:\s*"[A-Z][A-Z_]+"/.test(suite)) {
        out.push({ p, nom: m[1] ?? "" });
      }
    }
  }
  return out;
}

/**
 * DÉBRANCHÉS CONNUS — chacun avec sa dette. Cette liste doit MAIGRIR.
 *
 * L'inscrire ici n'est pas l'excuser : c'est empêcher qu'un quatrième entre
 * sans qu'on le sache, et rendre visible ce que le dépôt promet sans le tenir.
 */
const DEBRANCHES_CONNUS: Readonly<Record<string, string>> = {
  // EP-162 — LA LISTE A MAIGRI DE TROIS. Elle a tenu sa promesse : les
  // dettes L-160-A, L-161-A et L-161-B sont payées, leurs juges branchés,
  // et les retirer d'ici n'est pas un geste d'écriture — le test
  // « chaque débranché déclaré l'est ENCORE » refusait de passer tant
  // qu'ils y figuraient avec un appelant de production.
  //
  // DEUX SIGNALÉS QUE JE N'AI PAS CONFIRMÉS COMME JUGES, et je le dis plutôt
  // que de gonfler le compte : le détecteur les voit parce que leur corps
  // contient un code en majuscules, ce qui ne fait pas d'eux des juges.
  contratDEtape:
    "SIGNALÉ, NON CONFIRMÉ — rend un contrat d'étape et non des diagnostics ; " +
    "le détecteur le voit sur une chaîne en majuscules. À élucider.",
  nativeFootprintOf:
    "SIGNALÉ, NON CONFIRMÉ — ré-exporté par l'index du paquet, définition non " +
    "trouvée dans ses sources. À élucider avant de conclure quoi que ce soit.",
};

describe("EP-161 ① · aucun juge ne se débranche en silence", () => {
  const prod = sources(false);
  const tests = sources(true);
  const liste = emettrices(prod);

  it("le détecteur voit des émettrices — sinon il ne prouve rien", () => {
    expect(liste.length).toBeGreaterThan(20);
  });

  it("chaque émettrice a un appelant de PRODUCTION, ou figure aux débranchés connus", () => {
    const orphelines: string[] = [];
    for (const { p, nom } of liste) {
      // Un appel peut être qualifié (`module.juge()`) ou dispersé (`...juge()`) :
      // un motif trop strict produisait 29 faux orphelins, mesuré avant publication.
      const motif = new RegExp(`\\b${nom}\\s*\\(`);
      const ailleurs = prod.some((s) => s.p !== p && motif.test(s.code));
      const chezLui = motif.test(
        (prod.find((s) => s.p === p)?.code ?? "").replace(
          new RegExp(`export function ${nom}\\s*\\(`),
          "",
        ),
      );
      if (!ailleurs && !chezLui) orphelines.push(nom);
    }
    const inattendues = orphelines.filter((n) => DEBRANCHES_CONNUS[n] === undefined);
    expect(inattendues, "juges débranchés non déclarés").toEqual([]);
  });

  it("chaque débranché déclaré l'est ENCORE — une liste qui vieillit ment", () => {
    for (const [nom, dette] of Object.entries(DEBRANCHES_CONNUS)) {
      expect(dette.length, nom).toBeGreaterThan(60);
      const motif = new RegExp(`\\b${nom}\\s*\\(`);
      const appelants = prod.filter((s) => motif.test(s.code) && !s.code.includes(`export function ${nom}`));
      expect(appelants.map((s) => s.p), `${nom} a été rebranché : retirer la dette`).toEqual([]);
    }
  });

  it("ils sont pourtant TESTÉS — c'est ce qui les rendait invisibles", () => {
    // Un juge testé a l'air vivant : la batterie est verte, le code est
    // couvert, et rien ne dit qu'il ne sert à personne.
    for (const nom of Object.keys(DEBRANCHES_CONNUS)) {
      const motif = new RegExp(`\\b${nom}\\s*\\(`);
      expect(tests.some((s) => motif.test(s.code)), `${nom} n'est même pas testé`).toBe(true);
    }
  });
});

describe("EP-161 ① · LE CHEMIN PIRE (règle d'EP-132) — appelé mais ignoré", () => {
  it("PLACE TENUE, RIEN DE FERMÉ — ce test ne mesure aucun juge et n'en couvre aucun", () => {
    // Un juge débranché se voit ; un juge dont le résultat est JETÉ a l'air
    // branché, et c'est pire. J'ai écrit un détecteur : il a rendu 43 cas,
    // tous faux — il ne sait pas distinguer un appel dont la valeur sert
    // (affectée, dispersée, retournée, passée en argument, chaînée) d'un
    // appel dont elle est perdue. Publier 43 faux positifs aurait été
    // inutile ; les cacher aurait été malhonnête.
    //
    // EP-162 · L-161-C — HORS DE CETTE PASSE, PAS HORS DE PORTÉE, et mesuré
    // plutôt que supposé. TypeScript 5.9.3 est déjà installé ; sonde tsc
    // `--strict --noUnusedLocals` sur deux formes :
    //   const d = juge(1);   → TS6133 « 'd' is declared but its value is
    //                          never read » — VU.
    //   juge(1);             → AUCUNE erreur — NON VU.
    // Une moitié du chemin est donc déjà couverte par un outil du dépôt. La
    // seconde n'est même pas une analyse de FLOT : l'appel nu est une forme
    // SYNTAXIQUE exacte — un `ExpressionStatement` dont l'expression est un
    // `CallExpression` vers une émettrice — lisible sur l'AST que TypeScript
    // expose. Il n'y a donc aucun analyseur à réécrire ; il y a un parseur à
    // appeler. C'est ce qui distingue « pas fait » de « impossible ».
    //
    // CE TEST NE FERME RIEN ET NE DOIT PAS ÊTRE LU COMME UNE COUVERTURE : il
    // ne charge aucun juge, n'en appelle aucun, et ne mesure aucune source.
    // Il tient la place de [L-161-C] pour que le chemin ne disparaisse pas
    // de la batterie verte.
    expect(
      "L-161-C OUVERT : le chemin « appelé mais ignoré » n'est ni mesuré ni fermé",
    ).toBeTruthy();
  });
});
