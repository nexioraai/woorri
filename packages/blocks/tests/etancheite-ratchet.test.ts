import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// CLIQUETS D'ÉTANCHÉITÉ (D-021/D-023, patron 3.2 mécanisé) :
//   1. contracts.ts n'importe QUE des types de react ;
//   2. components.tsx ne compose QUE des primitives — seul import
//      react-native : AUCUN (depuis 2026-10-05) ; AUCUN StyleSheet,
//      AUCUN style en dur (tout le visuel vient des primitives/tokens).
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const stripComments = (s: string): string =>
  s.split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");
const read = (f: string): string =>
  stripComments(readFileSync(join(SRC, f), "utf8"));
const importsOf = (source: string): string[] =>
  [...source.matchAll(/^import\s[^;]*?from\s+"([^"]+)";?$/gms)].map((m) => m[1] ?? "");

describe("étanchéité des blocs", () => {
  it("CLIQUET — contracts.ts n'importe que des types de react", () => {
    const source = read("contracts.ts");
    expect(importsOf(source)).toEqual(["react"]);
    expect(source).toMatch(/import type \{/);
    expect(source).not.toMatch(/^import \{/m);
  });

  it("CLIQUET RENFORCÉ — components.tsx n'importe RIEN de react-native", () => {
    // ── LE CLIQUET S'EST RESSERRÉ LE 2026-10-05, ET C'EST UN GAIN.
    //
    // Il tolérait `FlatList`, « seul composant react-native autorisé ici ».
    // Mesuré en préparant la CIBLE WEB : cette unique importation était tout ce
    // qui empêchait ces 505 lignes d'être PARTAGÉES entre le natif et le web.
    //
    // `FlatList` vit désormais derrière la primitive `Liste` — là où les
    // détails de plateforme doivent être, puisque les primitives sont, elles,
    // remplaçables par cible. Les blocs sont redevenus ce que D-023 décrit :
    // des composites de primitives, exclusivement.
    //
    // Ce test interdit donc le retour en arrière : une seule importation de
    // react-native ici, et cinq cents lignes redeviennent à réécrire.
    const source = read("components.tsx");
    expect(importsOf(source).sort()).toEqual(["./contracts.ts", "@deribfy/primitives"]);
    expect(source).not.toContain('from "react-native"');
  });

  it("CLIQUET F3 — aucune chaîne LINGUISTIQUE codée en dur dans les composants", () => {
    // Stratégie : viser la CLASSE du défaut, pas une liste de mots d'une
    // langue. Un libellé humain porte presque toujours une signature
    // détectable dans un littéral : espace, diacritique latin (À-ɏ) ou
    // points de suspension. Les jetons techniques (kinds, testID, chemins)
    // n'en portent jamais. Résidu ASSUMÉ : un mot ASCII isolé (« OK »)
    // passerait — couvert par la revue de code et le harnais 3.4.
    // Extraction des LITTÉRAUX réels : chaînes simples, et parties
    // STATIQUES des gabarits (le code des interpolations ${…} est exclu —
    // il contient légitimement des espaces).
    const source = read("components.tsx");
    const literals: string[] = [];
    for (const m of source.matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)) {
      literals.push(m[1] ?? m[2] ?? "");
    }
    for (const m of source.matchAll(/`([^`]*)`/g)) {
      literals.push(...(m[1] ?? "").split(/\$\{[^}]*\}/g));
    }
    const linguistique = /[ \u00C0-\u024F\u2026]/;
    expect(literals.filter((l) => linguistique.test(l))).toEqual([]);
  });

  it("CLIQUET — aucun style dans les blocs (StyleSheet, style=, tokens directs)", () => {
    const source = read("components.tsx");
    expect(source).not.toMatch(/StyleSheet/);
    expect(source).not.toMatch(/style=/);
    expect(source).not.toMatch(/@deribfy\/design-tokens/);
  });
});
