// ============================================================
// PREUVE — LE CŒUR N'A AUCUNE DÉPENDANCE NON DÉCLARÉE.
//
// ── POURQUOI CE CONTRÔLE EXISTE.
//
// L'extraction a déplacé 619 lignes qui lisaient SEIZE choses construites par
// le script. Je les ai cherchées À L'ŒIL, et j'ai payé un lancement par
// oubli : `etatDepense`, puis `CONTRAT_CIBLE`, puis quatre autres. Chaque
// lancement s'arrêtait AVANT le moindre appel — le garde budgétaire a tenu —
// mais c'était trois allers-retours pour un travail qu'une machine fait d'un
// coup.
//
// Ce contrôle analyse le module avec un vrai parseur, lie les portées, et
// nomme tout identifiant qui n'est ni déclaré dedans, ni reçu en paramètre,
// ni un global du langage. Il coûte zéro et il ne se fatigue pas.
// ============================================================
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";

const HERE = dirname(fileURLToPath(import.meta.url));
const ast = acorn.parse(readFileSync(join(HERE, "emission-coeur.mjs"), "utf8"), {
  ecmaVersion: "latest",
  sourceType: "module",
});

const declares = new Set();
const utilises = new Set();

/** Tout ce qu'un motif de liaison introduit comme nom. */
const lier = (n) => {
  if (!n) return;
  if (n.type === "Identifier") declares.add(n.name);
  if (n.type === "ObjectPattern") n.properties.forEach((p) => lier(p.value ?? p.argument));
  if (n.type === "ArrayPattern") n.elements.forEach(lier);
  if (n.type === "AssignmentPattern") lier(n.left);
  if (n.type === "RestElement") lier(n.argument);
};

const parcourir = (n, parent) => {
  if (!n || typeof n !== "object") return;
  if (Array.isArray(n)) { n.forEach((x) => parcourir(x, parent)); return; }
  if (!n.type) return;
  if (n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression") {
    if (n.id) declares.add(n.id.name);
    n.params.forEach(lier);
  }
  if (n.type === "VariableDeclarator") lier(n.id);
  if (n.type === "CatchClause") lier(n.param);
  if (n.type === "Identifier" && parent) {
    // Ni une clé d'objet, ni un nom de propriété : ceux-là ne se résolvent pas.
    const cle = parent.type === "Property" && parent.key === n && !parent.computed;
    const membre = parent.type === "MemberExpression" && parent.property === n && !parent.computed;
    if (!cle && !membre) utilises.add(n.name);
  }
  for (const k of Object.keys(n)) {
    if (k !== "type" && k !== "start" && k !== "end") parcourir(n[k], n);
  }
};
parcourir(ast, null);

const GLOBAUX = new Set([
  "Object", "Array", "JSON", "String", "Number", "Boolean", "Math", "Date",
  "Promise", "Error", "Map", "Set", "RegExp", "console", "process", "undefined",
  "Symbol", "parseInt", "parseFloat", "isNaN", "structuredClone", "Buffer",
  "setTimeout", "Infinity", "NaN", "globalThis",
]);

const manquants = [...utilises].filter((n) => !declares.has(n) && !GLOBAUX.has(n)).sort();
if (manquants.length > 0) {
  console.error(
    `⛔ REFUS — ${manquants.length} identifiant(s) non résolu(s) dans le cœur : ${manquants.join(", ")}\n` +
      "Chacun fera échouer la construction de la fabrique AU LANCEMENT, donc avant\n" +
      "tout appel payant — mais après avoir coûté un aller-retour. Ajoutez-les aux\n" +
      "paramètres de `creerCoeurEmission`, ou rapatriez l'état s'il est interne.",
  );
  process.exit(1);
}
console.log(`dependances-coeur : aucune dependance non declaree (${String(declares.size)} noms lies).`);
