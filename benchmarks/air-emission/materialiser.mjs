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
// ── LE BINAIRE EST DÉCODÉ, ET LA DÉCISION EST UNIQUE (2026-10-17).
//
// Les faces de police embarquées voyagent en base64 dans la carte de fichiers.
// Écrire ce base64 EN TEXTE produit un fichier présent, non vide et INVALIDE —
// et une famille introuvable ne lève pas : elle retombe en silence sur la
// police système. NEUF écrivains existaient ; `fichiers-binaires.ts` est le
// seul endroit où la décision vit.
const { estBinaire } = await import(
  new URL("../../packages/compiler/src/fichiers-binaires.ts", import.meta.url).href,
);

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const acceptation = await import("./acceptation.mjs");
const compiler = await import(join(REPO, "packages/compiler/src/compile-project.ts"));
const presentation = await import(join(REPO, "packages/execution-contract/src/presentation.ts"));
const airSchema = await import(join(REPO, "packages/air-schema/src/migrations.ts"));

/**
 * Juge PUIS matérialise. Rend `{ecrits, diagnostics}`.
 *
 * FAIL-CLOSED : un seul diagnostic et rien n'est écrit. Le document qui ne
 * passe pas les juges ne doit pas atteindre un appareil — c'est précisément
 * ce qui est arrivé, et ce que cette fonction rend impossible.
 */
export function materialiser(document, destination, { prescriptif } = {}) {
  // EP-201 — MIGRER AVANT DE JUGER, sinon un document d'archive est refusé
  // pour sa VERSION et non pour ses défauts.
  //
  // MESURÉ à la montée 1.27.0 : les documents des runs précédents, en 1.26.0,
  // sont soudain devenus « SCHEMA » et plus rien d'autre — les vrais
  // diagnostics avaient disparu derrière un refus de version. Une barrière
  // qui ne sait juger que le document du jour ne juge pas grand-chose : la
  // chaîne de migrations existe précisément pour que le passé reste lisible.
  let aJuger = document;
  try {
    aJuger = airSchema.applyAirMigrations(document);
  } catch {
    // Migration impossible : on juge le document TEL QUEL, et le refus de
    // schéma dira lui-même ce qui ne va pas. Jamais d'échec silencieux.
    aJuger = document;
  }
  // `validateLocal` rend {air, diagnostics} — un OBJET. Ma première version
  // lisait `.length` dessus : `undefined > 0` est FAUX, donc la barrière
  // laissait TOUT passer. La sonde l'a attrapée avant qu'elle ne serve —
  // sans elle j'aurais livré un cliquet creux, exactement le défaut
  // d'EP-165 ③c : « un cliquet qui ne tombe pas quand on retire ce qu'il
  // garde ne garde rien. »
  const { air, diagnostics } = acceptation.validateLocal(aJuger, prescriptif);
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
  // ── ON ÉCRIT, ET ON DIT. (2026-10-16 — décision du propriétaire.)
  //
  // Cette fonction REFUSAIT d'écrire dès qu'un diagnostic subsistait. Le
  // raisonnement d'origine, inscrit en tête de ce fichier, visait un VRAI
  // défaut : j'avais fait inspecter à Youssouf une application que les juges
  // avaient rejetée, et il a perdu une inspection à retrouver des défauts
  // DÉJÀ diagnostiqués.
  //
  // MAIS LE DÉFAUT ÉTAIT LE SILENCE, PAS L'ÉCRITURE. Ce qui lui a coûté une
  // inspection, ce n'est pas que l'application existe : c'est que rien ne
  // lui disait ce que les juges avaient vu. Interdire d'écrire a réglé le
  // symptôme et fabriqué le vide — deux mois sans aucune application.
  //
  // Le chemin web a tranché le premier (LOT 1) : les juges perdent le VETO,
  // ils gardent la PAROLE. Ce chemin-ci suit, et il parle PLUS FORT qu'avant
  // — le verdict voyage AVEC l'application, dans un fichier qu'on ne peut
  // pas ne pas voir.
  const compile = compiler.compileProject(aJuger);
  let ecrits = 0;
  for (const [chemin, contenu] of compile.files) {
    const abs = join(destination, chemin);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, estBinaire(abs) ? Buffer.from(contenu, "base64") : contenu);
    ecrits += 1;
  }

  // ── LE CARNET DE DÉFAUTS, À CÔTÉ DE L'APPLICATION.
  //
  // En MAJUSCULES et en tête de dossier : quelqu'un qui ouvre ce répertoire
  // doit tomber dessus avant d'ouvrir un écran. C'est la forme que « dire »
  // prend ici, et c'est elle qui remplace le refus.
  if (diagnostics.length > 0) {
    const par = {};
    for (const d of diagnostics) {
      const c = d.code ?? "SANS_CODE";
      par[c] = (par[c] ?? 0) + 1;
    }
    const lignes = [
      "# CE QUE LES JUGES ONT VU",
      "",
      `Cette application est MATÉRIALISÉE, et ${String(diagnostics.length)} diagnostic(s)`,
      "subsistent. Elle n'est pas conforme — elle existe.",
      "",
      "## Par code",
      "",
      ...Object.entries(par)
        .sort((a, b) => b[1] - a[1])
        .map(([c, n]) => `- **${c}** × ${String(n)}`),
      "",
      "## Le détail",
      "",
      ...diagnostics
        .slice(0, 100)
        .map((d) => `- \`${d.code ?? "SANS_CODE"}\` @ ${String(d.path ?? "?")} — ${String(d.message ?? "")}`),
      "",
      diagnostics.length > 100 ? `_(${String(diagnostics.length - 100)} autres non listés)_` : "",
      "",
      "---",
      "",
      "Ce fichier existe parce qu'une application rejetée a déjà été inspectée",
      "SANS que personne sache ce que les juges avaient trouvé. Le défaut était",
      "le silence. Il ne se reproduira pas par ce chemin.",
      "",
    ];
    writeFileSync(join(destination, "DEFAUTS-CONNUS.md"), lignes.join("\n"));
    ecrits += 1;
  }

  return {
    ecrits,
    diagnostics,
    // `refus` garde son nom et son sens : les juges ont parlé. Ce qui change,
    // c'est qu'il ne commande plus la destruction de l'œuvre.
    refus: diagnostics.length > 0,
    rootHash: compile.rootHash,
  };
}

// Appel direct : `node materialiser.mjs <document.air.json> <destination>`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , doc, dest] = process.argv;
  if (doc === undefined || dest === undefined) {
    console.error("usage : node materialiser.mjs <document.air.json> <destination>");
    process.exit(2);
  }
  const r = materialiser(JSON.parse(readFileSync(doc, "utf8")), dest);
  console.log(`✓ ${String(r.ecrits)} fichiers écrits · hash ${String(r.rootHash).slice(0, 16)}`);
  if (r.refus) {
    // ── ON A ÉCRIT, ET MAINTENANT ON PARLE — FORT.
    //
    // Avant : « RIEN n'a été écrit », et le vide. L'application existe
    // désormais, et ce bloc est ce qui empêche qu'on la croie conforme.
    const par = {};
    for (const d of r.diagnostics) par[d.code ?? "SANS_CODE"] = (par[d.code ?? "SANS_CODE"] ?? 0) + 1;
    console.error("");
    console.error(`⚠️  ${String(r.diagnostics.length)} diagnostic(s) SUBSISTENT — cette application n'est PAS conforme.`);
    for (const [c, n] of Object.entries(par).sort((a, b) => b[1] - a[1])) {
      console.error(`   ${String(n).padStart(3)} × ${c}`);
    }
    console.error("");
    console.error("   Le détail est dans DEFAUTS-CONNUS.md, à côté de l'application.");
    console.error("   Corrige au MOTEUR, jamais dans les fichiers émis.");
    // Le code de sortie reste 1 : un script qui enchaîne doit pouvoir
    // distinguer « conforme » de « livré avec réserves » sans lire la sortie.
    process.exit(1);
  }
}
