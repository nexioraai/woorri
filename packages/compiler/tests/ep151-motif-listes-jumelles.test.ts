// EP-151 · LE MOTIF, PAS SES INSTANCES.
//
// Six occurrences : prompt v3/v4 · J3 · sources dérivées · GESTES ·
// CARDINALITE_PAR_GESTE · l'échelle de dégradation. À chaque fois un cliquet
// a fermé LE CAS, et le motif est revenu ailleurs.
//
// CE CLIQUET-CI CHERCHE LA FORME, SANS CONNAÎTRE AUCUN DOMAINE : deux tables
// littérales exportées dont les clés coïncident exactement, sans qu'aucune ne
// soit dérivée de l'autre ni d'une source commune. C'est la signature de
// toutes les occurrences passées.
//
// SA LIMITE, DITE FRANCHEMENT : il ne détecte pas « deux structures portant la
// même information » — ce serait de l'équivalence sémantique, indécidable. Il
// détecte « deux tables indexées par le même ensemble de clés », qui est la
// forme qu'ont pris les six cas. Un septième qui prendrait une autre forme lui
// échapperait. Ce n'est pas une fermeture du motif, c'est un filet à la
// hauteur de ce qu'on a mesuré.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { listBlockIds } from "@deribfy/blocks/registry";
import { ZONE_PAR_BLOCK_TYPE } from "../src/plan-composition.ts";
import { WRAPPER_BY_BLOCK_TYPE } from "../src/emit-project.ts";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const R = join(import.meta.dirname, "..", "..", "..");

interface Table {
  readonly fichier: string;
  readonly nom: string;
  readonly clefs: readonly string[];
  readonly derivee: boolean;
}

/** Les tables littérales exportées, avec leurs clés de premier niveau. */
function tables(): Table[] {
  const out: Table[] = [];
  const visiter = (dir: string): void => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (["node_modules", "results", "corpus-v2", "styling", "attic", "tests"].includes(f)) continue;
      if (statSync(p).isDirectory()) { visiter(p); continue; }
      if (!/\.(ts|mjs)$/.test(f) || f.includes(".generated.") || f.includes("embedded-")) continue;
      const code = readFileSync(p, "utf8");
      for (const m of code.matchAll(/export const ([A-Z][A-Z0-9_]+)(?::[^=]+)? = \{([^}]*)\}/g)) {
        const corps = m[2] ?? "";
        const clefs = [...corps.matchAll(/^\s*"?([a-zA-Z_][a-zA-Z0-9_.]*)"?\s*:/gm)].map((x) => x[1] ?? "");
        if (clefs.length < 3) continue;
        out.push({ fichier: p.slice(R.length + 1), nom: m[1] ?? "", clefs: clefs.sort(), derivee: false });
      }
      // Une table DÉRIVÉE est construite, pas écrite : elle ne tombe pas dans
      // le motif, et c'est exactement la correction qu'on veut encourager.
      for (const m of code.matchAll(/export const ([A-Z][A-Z0-9_]+)(?::[^=]+)? = (?:Object\.(?:keys|fromEntries|entries)|[A-Z][A-Z0-9_]*\.map)/g)) {
        out.push({ fichier: p.slice(R.length + 1), nom: m[1] ?? "", clefs: [], derivee: true });
      }
    }
  };
  for (const d of ["packages", "benchmarks"]) visiter(join(R, d));
  return out;
}

/**
 * CE QUE LA MESURE A TROUVÉ, ET QUI EST ASSUMÉ.
 *
 * Trois tables partagent les clés du registre des capacités. Elles sont
 * LÉGITIMEMENT sœurs — chacune porte une information différente sur les mêmes
 * capacités — mais leurs CLÉS sont écrites à la main dans les trois. Chacune
 * a son cliquet de partition exhaustive, posé en EP-144, EP-145 et EP-147 :
 * le risque est donc couvert, table par table. Les inscrire ici est un aveu
 * plutôt qu'une exemption — la bonne forme serait de dériver leurs clés.
 */
const SOEURS_CONNUES: readonly string[] = [
  "PARTAGE_PAR_CAPACITE",
  "API_SENSIBLES_PAR_CAPACITE",
  "CHIFFREMENT_PROPRE_PAR_CAPACITE",
  // SEPTIÈME OCCURRENCE, TROUVÉE PAR CE CLIQUET ET PAR LUI SEUL — aucune des
  // dix passes ne l'avait vue. Deux tables indexées par les types de blocs,
  // dans deux fichiers distincts, clés écrites à la main des deux côtés.
  // Elles sont sœurs (l'une dit la zone, l'autre le composant) et n'avaient
  // AUCUN cliquet : le test ci-dessous leur en donne un.
  "WRAPPER_BY_BLOCK_TYPE",
  "ZONE_PAR_BLOCK_TYPE",
];

describe("EP-151 · le filet générique — deux tables aux mêmes clés", () => {
  const toutes = tables();

  it("il voit quelque chose : le dépôt porte des tables littérales exportées", () => {
    expect(toutes.filter((t) => !t.derivee).length).toBeGreaterThan(3);
  });

  it("aucune PAIRE de tables aux clés identiques n'échappe à un cliquet", () => {
    const parClefs = new Map<string, Table[]>();
    for (const t of toutes) {
      if (t.derivee || t.clefs.length === 0) continue;
      const signature = t.clefs.join("|");
      parClefs.set(signature, [...(parClefs.get(signature) ?? []), t]);
    }
    // DISCRIMINANT AFFINÉ PAR UN FAUX POSITIF : deux tables portant le MÊME
    // NOM dans des fichiers différents ne dupliquent pas une information —
    // elles implémentent une même INTERFACE (les `CONFIG` des trois
    // adaptateurs, par exemple). Ce que le motif décrit, c'est deux noms
    // DIFFÉRENTS portant la même indexation.
    const jumelles = [...parClefs.values()]
      .filter((g) => new Set(g.map((t) => t.nom)).size > 1)
      .map((g) => [...new Set(g.map((t) => t.nom))].sort());
    for (const groupe of jumelles) {
      const inconnues = groupe.filter((n) => !SOEURS_CONNUES.includes(n));
      expect(
        inconnues,
        `tables aux clés identiques et non dérivées : ${groupe.join(", ")} — ` +
          `septième occurrence du motif, ou sœurs à déclarer`,
      ).toEqual([]);
    }
  });

  it("les sœurs déclarées couvrent EXACTEMENT le registre — sinon l'exemption ment", () => {
    // Une exemption sans cliquet serait une porte. Celles des capacités ont
    // le leur depuis EP-144/145/147 ; celles des blocs le reçoivent ici.
    const blocs = [...(listBlockIds())].sort();
    for (const [nom, table] of [
      ["ZONE_PAR_BLOCK_TYPE", ZONE_PAR_BLOCK_TYPE],
      ["WRAPPER_BY_BLOCK_TYPE", WRAPPER_BY_BLOCK_TYPE],
    ] as const) {
      expect(Object.keys(table).sort(), `${nom} ne couvre pas le registre`).toEqual(blocs);
    }
  });

  it("les tables DÉRIVÉES sont reconnues comme telles — c'est la sortie du motif", () => {
    // `GESTES`, `ROLE_PAR_GESTE`, `CARDINALITE_PAR_GESTE` ont été converties
    // en dérivations : elles ne portent plus de clés écrites.
    const derivees = toutes.filter((t) => t.derivee).map((t) => t.nom);
    expect(derivees).toContain("GESTES");
    expect(derivees).toContain("ROLE_PAR_GESTE");
  });
});
