// ============================================================
// LES IDENTIFIANTS NON RESOLUS D'UN MODULE — analyse de portee, cout nul.
//
// ── POURQUOI CE FICHIER PLUTOT QU'UNE SECONDE COPIE.
//
// `dependances-coeur.verif.mjs` portait cet algorithme. Il fallait le meme
// pour `orchestration.mjs`, et le recopier aurait fait exactement ce que ce
// depot a deja constate quatre fois : « une liste ecrite deux fois diverge ».
// Ici c'est pire qu'une liste — c'est un JUGE. Deux juges qui divergent, ce
// sont deux verdicts, et on croit le plus indulgent.
//
// ── CE QU'IL ATTRAPE, ET CE QUE J'AVAIS MANQUE SANS LUI.
//
// A l'extraction de l'orchestration, l'analyse avait bien liste `repairScope`
// parmi les candidats. J'ai ensuite TRIE A LA MAIN ceux que j'allais
// verifier, et je l'ai laisse de cote. La fabrique en recevait onze au lieu
// de douze — et comme il ne sert que dans la reparation, le defaut n'est
// apparu qu'apres 1 669 secondes et neuf passes PAYEES.
//
// Le tri humain est le defaut. Cette fonction ne trie pas.
// ============================================================
import { readFileSync } from "node:fs";
import * as acorn from "acorn";

/** Les globaux du langage et de la plateforme : jamais des dependances. */
export const GLOBAUX = new Set([
  "Object", "Array", "JSON", "String", "Number", "Boolean", "Math", "Date",
  "Promise", "Error", "Map", "Set", "RegExp", "console", "process", "undefined",
  "Symbol", "parseInt", "parseFloat", "isNaN", "structuredClone", "Buffer",
  "setTimeout", "Infinity", "NaN", "globalThis",
]);

/**
 * Les noms LUS par le module et LIES nulle part en son sein.
 *
 * Un nom lie par un parametre, une declaration, un motif de destructuration
 * ou une clause `catch` est resolu — y compris les parametres de la fabrique,
 * ce qui est precisement le point : une dependance recue EST liee.
 */
export function identifiantsNonResolus(chemin) {
  const ast = acorn.parse(readFileSync(chemin, "utf8"), {
    ecmaVersion: "latest",
    sourceType: "module",
    allowAwaitOutsideFunction: true,
  });

  const declares = new Set();
  const utilises = new Set();

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
    if (n.type === "ImportDeclaration") n.specifiers.forEach((s) => lier(s.local));
    if (n.type === "ClassDeclaration" && n.id) declares.add(n.id.name);
    if (n.type === "Identifier" && parent) {
      // Ni une cle d'objet, ni un nom de propriete : ceux-la ne se resolvent pas.
      const cle = parent.type === "Property" && parent.key === n && !parent.computed;
      const membre = parent.type === "MemberExpression" && parent.property === n && !parent.computed;
      if (!cle && !membre) utilises.add(n.name);
    }
    for (const k of Object.keys(n)) {
      if (k !== "type" && k !== "start" && k !== "end") parcourir(n[k], n);
    }
  };
  parcourir(ast, null);

  return {
    manquants: [...utilises].filter((n) => !declares.has(n) && !GLOBAUX.has(n)).sort(),
    lies: declares.size,
  };
}
