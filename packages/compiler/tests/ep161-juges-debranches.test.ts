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
import ts from "typescript";
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
function emettrices_(prod: readonly Source[]): { p: string; nom: string }[] {
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
  jugerEntreeSansCollection:
    "L-182-A — juge JUSTE mais DÉBRANCHÉ PAR DÉCISION, pas par oubli : il " +
    "retrouve exactement les 7 modèles sur 39 dont l'écran d'ouverture ne " +
    "montre aucun contenu (mesure indépendante). Le brancher en fail-closed " +
    "refuserait ces 7 et ferait tomber 8 tests de base verte éprouvés depuis " +
    "EP-134. Le RÉGIME est un arbitrage de Youssouf, pas une évidence.",
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
  const liste = emettrices_(prod);

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
  // L-161-C FERMÉ (EP-164). Le chemin est celui-ci : un juge DÉBRANCHÉ se
  // voit ; un juge APPELÉ dont le résultat est JETÉ a l'air branché, et c'est
  // pire. Mon heuristique d'EP-161 rendait 43 cas, tous faux — une expression
  // régulière ne distingue pas un appel dont la valeur sert d'un appel dont
  // elle est perdue.
  //
  // CE N'ÉTAIT PAS UNE ANALYSE DE FLOT, ET C'EST CE QUI L'A DÉBLOQUÉ : un
  // appel nu est une forme SYNTAXIQUE exacte — un `ExpressionStatement` dont
  // l'expression est un `CallExpression`. TypeScript expose l'AST ; il n'y a
  // aucun analyseur à écrire, seulement un parseur à appeler.
  //
  // L'AUTRE MOITIÉ EST COUVERTE SANS RIEN ÉCRIRE : `tsc --noUnusedLocals`
  // rend TS6133 sur `const d = juge(1)` jamais lu (sondé en EP-162).
  const prod = sources(false);
  // Le détecteur cherche des NOMS ; `emettrices_` rend des { p, nom }.
  // Sans la sonde ci-dessous, ce Set d'OBJETS rendait `has(nom)` toujours
  // faux et le cliquet publiait « 0 appel nu » — une propreté imaginaire.
  const emettrices = new Set(emettrices_(prod).map((e) => e.nom));

  const appelsNus = (fichiers: readonly Source[]): string[] => {
    const out: string[] = [];
    for (const { p, code } of fichiers) {
      const sf = ts.createSourceFile(p, code, ts.ScriptTarget.Latest, true);
      const walk = (n: ts.Node): void => {
        if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression)) {
          const e = n.expression.expression;
          const nom = ts.isIdentifier(e)
            ? e.text
            : ts.isPropertyAccessExpression(e)
              ? e.name.text
              : null;
          if (nom !== null && emettrices.has(nom)) {
            out.push(`${p}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} ${nom}()`);
          }
        }
        ts.forEachChild(n, walk);
      };
      walk(sf);
      }
    return out;
  };

  it("LE DÉTECTEUR MORD — prouvé sur du code synthétique, sinon « 0 » ne vaut rien", () => {
    // Sans cette sonde, un détecteur cassé rendrait 0 et passerait pour une
    // preuve de propreté. C'est la leçon des 29 faux orphelins d'EP-161,
    // prise par l'autre bout.
    const nom = [...emettrices][0];
    expect(nom, "aucune émettrice — le détecteur n'a rien à chercher").toBeDefined();
    const perdu = appelsNus([{ p: "sonde.ts", code: `function f() { ${nom!}(x); }` }]);
    expect(perdu, "un appel NU doit être vu").toHaveLength(1);
    const garde = appelsNus([{ p: "sonde.ts", code: `function f() { const d = ${nom!}(x); return d; }` }]);
    expect(garde, "un résultat AFFECTÉ ne doit PAS être signalé").toEqual([]);
    const disperse = appelsNus([{ p: "sonde.ts", code: `const a = [...${nom!}(x)];` }]);
    expect(disperse, "un résultat DISPERSÉ ne doit PAS être signalé").toEqual([]);
  });

  it("AUCUN juge n'est appelé pour rien dans la production", () => {
    // MESURÉ à la fermeture : 266 fichiers de production, 52 émettrices,
    // ZÉRO appel nu. Le cliquet ne corrige donc rien aujourd'hui — il
    // empêche que la forme apparaisse demain, ce qui est son seul objet.
    expect(appelsNus(prod)).toEqual([]);
  });
});
