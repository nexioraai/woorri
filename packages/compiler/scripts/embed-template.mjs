// CODEGEN (4.6, patron 3.1) : embarque les fichiers du GABARIT scellé
// (templateHash, D-027-R42) dans src/embedded-template.generated.ts — le
// chemin de compilation COMPLET (gabarit + émission) devient une fonction
// pure sans fs. Non-dérive : tests/embedded-template.test.ts recalcule
// depuis template/ et vérifie la cohérence avec le scellé du train.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── DEUX GABARITS, UN SEUL GÉNÉRATEUR (2026-10-05).
//
// La cible web a gagné son propre gabarit scellé — un `package-lock.json`,
// qui lui manquait. Écrire un second générateur presque identique aurait créé
// la divergence que ce dépôt vient de payer deux fois le même jour (les deux
// tables d'embarquement, puis les deux listes de documents des gates).
//
// Une table par répertoire, le même code.
const GABARITS = [
  { repertoire: "template", constante: "EMBEDDED_TEMPLATE", sortie: "embedded-template.generated.ts" },
  {
    repertoire: "template-web",
    constante: "EMBEDDED_TEMPLATE_WEB",
    sortie: "embedded-template-web.generated.ts",
    // La documentation du répertoire n'a rien à faire dans l'application
    // émise : elle s'adresse au mainteneur du générateur.
    ignorer: (f) => f.endsWith(".md"),
  },
];

const comptes = [];
for (const g of GABARITS) {
  const base = join(HERE, "..", g.repertoire);
  const files = readdirSync(base)
    .filter((f) => (g.ignorer === undefined ? true : !g.ignorer(f)))
    .sort();
  const lines = [
    "// GÉNÉRÉ PAR scripts/embed-template.mjs — NE PAS ÉDITER À LA MAIN.",
    `// Fichiers de ${g.repertoire}/ embarqués : le chemin de compilation complet`,
    "// est PUR (aucun fs). Non-dérive : embedded-template.test.ts recalcule",
    "// depuis le répertoire et refuse un écart.",
    `export const ${g.constante}: Readonly<Record<string, string>> = {`,
    ...files.map(
      (f) => `  ${JSON.stringify(f)}: ${JSON.stringify(readFileSync(join(base, f), "utf8"))},`,
    ),
    "};",
    "",
  ];
  writeFileSync(join(HERE, "..", "src", g.sortie), lines.join("\n"));
  comptes.push(`${g.repertoire} ${files.length}`);
}
console.log(`OK gabarits embarqués — ${comptes.join(" · ")}`);
