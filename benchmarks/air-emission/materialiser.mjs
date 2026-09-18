// EP-194 ② — ON NE MATÉRIALISE PAS UN DOCUMENT QUE LES JUGES ONT REFUSÉ.
//
// DÉFAUT DE MA PROPRE MAIN, ET IL A COÛTÉ UNE INSPECTION À YOUSSOUF.
// Le run EP-193 a rendu `valid=false` : `AIR_CIBLE_IDENTITE_PERDUE` ×3, entre
// autres. J'ai néanmoins appelé `compileProject` DIRECTEMENT, écrit les 91
// fichiers et lancé Expo. Youssouf a inspecté une application que le moteur
// avait REJETÉE, et les deux défauts qu'il y a trouvés étaient DÉJÀ
// diagnostiqués — le bouton de contact qui perd l'identité EST ce que les
// trois diagnostics disaient.
//
// LA RACINE N'EST PAS UN JUGE MANQUANT : LE JUGE EXISTAIT ET IL A PARLÉ.
// La racine est qu'AUCUNE fonction de matérialisation n'existait. J'ai écrit
// la mienne à la volée, dans un `node -e`, et rien ne m'a arrêté.
// `compileProject` fait exactement son travail — il compile — et il ne
// connaît AUCUN des cinq juges d'acceptation (mesuré : zéro référence à
// `nombresVraisemblables`, `navigationsDeLigne`, `principesDeComposition`,
// `jugerPlacement`, `preuveDeMatiere` dans tout `packages/compiler/src`).
//
// Une barrière qu'on peut contourner en écrivant trois lignes n'est pas une
// barrière. Celle-ci est le SEUL chemin vers `apps-generees/` : elle juge
// d'abord, et elle n'écrit rien si un diagnostic subsiste.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const acceptation = await import("./acceptation.mjs");
const compiler = await import(join(REPO, "packages/compiler/src/compile-project.ts"));
const presentation = await import(join(REPO, "packages/execution-contract/src/presentation.ts"));

/**
 * Juge PUIS matérialise. Rend `{ecrits, diagnostics}`.
 *
 * FAIL-CLOSED : un seul diagnostic et rien n'est écrit. Le document qui ne
 * passe pas les juges ne doit pas atteindre un appareil — c'est précisément
 * ce qui est arrivé, et ce que cette fonction rend impossible.
 */
export function materialiser(document, destination, { prescriptif } = {}) {
  // `validateLocal` rend {air, diagnostics} — un OBJET. Ma première version
  // lisait `.length` dessus : `undefined > 0` est FAUX, donc la barrière
  // laissait TOUT passer. La sonde l'a attrapée avant qu'elle ne serve —
  // sans elle j'aurais livré un cliquet creux, exactement le défaut
  // d'EP-165 ③c : « un cliquet qui ne tombe pas quand on retire ce qu'il
  // garde ne garde rien. »
  const { air, diagnostics } = acceptation.validateLocal(document, prescriptif);
  if (!Array.isArray(diagnostics)) {
    throw new TypeError("validateLocal n'a pas rendu de diagnostics — barrière non fiable, refus");
  }
  // EP-195 — ET LA PRÉSENTATION, QUE `validateLocal` NE JUGE PAS DU TOUT.
  //
  // MESURÉ : `validateLocal` ne porte ZÉRO appel à `presentation.*` — il juge
  // la MATIÈRE (fidelity) et le GRAPHE (executionGraph), jamais l'ÉCRAN. Or
  // c'est à l'écran que Youssouf a vu ses défauts : deux formulaires sur la
  // fiche de connexion, les boutons de session tous affichés ensemble, aucune
  // surface légale en bas du compte. Une barrière qui laisse passer ce que
  // l'utilisateur voit ne barre pas grand-chose.
  //
  // Le contexte n'est plus un obstacle : depuis EP-191 l'entrée et le compte
  // se nomment AU DOCUMENT, donc `contexteDeDocument` les dérive sans rien
  // recevoir — plus de « paramètre sans fournisseur ».
  const deLEcran =
    air === null || air === undefined
      ? []
      : presentation.jugerPlacement(air, () => "contenu", presentation.contexteDeDocument(air));
  diagnostics.push(...deLEcran);
  if (diagnostics.length > 0) {
    return { ecrits: 0, diagnostics, refus: true };
  }
  const compile = compiler.compileProject(document);
  let ecrits = 0;
  for (const [chemin, contenu] of compile.files) {
    const abs = join(destination, chemin);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, contenu);
    ecrits += 1;
  }
  return { ecrits, diagnostics: [], refus: false, rootHash: compile.rootHash };
}

// Appel direct : `node materialiser.mjs <document.air.json> <destination>`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , doc, dest] = process.argv;
  if (doc === undefined || dest === undefined) {
    console.error("usage : node materialiser.mjs <document.air.json> <destination>");
    process.exit(2);
  }
  const r = materialiser(JSON.parse(readFileSync(doc, "utf8")), dest);
  if (r.refus) {
    const par = {};
    for (const d of r.diagnostics) par[d.code ?? "SANS_CODE"] = (par[d.code ?? "SANS_CODE"] ?? 0) + 1;
    console.error(`⛔ REFUS — ${String(r.diagnostics.length)} diagnostic(s), RIEN n'a été écrit.`);
    for (const [c, n] of Object.entries(par).sort((a, b) => b[1] - a[1])) {
      console.error(`   ${String(n).padStart(3)} × ${c}`);
    }
    console.error("Un document refusé ne va pas sur un appareil — corrige au MOTEUR, jamais ici.");
    process.exit(1);
  }
  console.log(`✓ ${String(r.ecrits)} fichiers écrits · hash ${String(r.rootHash).slice(0, 16)}`);
}
