// ════════════════════════════════════════════════════════════════════
//  VÉRIFIER UNE APPLICATION — compiler, puis la MONTER écran par écran.
// ════════════════════════════════════════════════════════════════════
//
//   node scripts/verifier-une-app.mjs <document.air.json>
//   npm run verifier:une-app -- slices/tontine/tontine.air.json
//
// ── CE QUE CE SCRIPT RÉPOND, ET QUE RIEN NE RÉPONDAIT.
//
// « Est-ce que l'application que le moteur vient de produire S'AFFICHE ? »
//
// Les cinq juges lisent le document. Le LOT 2 a ajouté la compilation.
// Personne ne montait les écrans d'UNE génération : `gate:app-rendu` ne sait
// le faire que sur le corpus gelé de 29 applications, et son cliquet exige ce
// nombre EXACT — y glisser une génération l'aurait cassé.
//
// ── TROIS NIVEAUX, DANS L'ORDRE OÙ ILS COÛTENT.
//
//   ① le document est VALIDE          — `assertValidAir`, instantané
//   ② l'application se COMPILE        — `compileProject`, moins d'une seconde
//   ③ son code TYPECHECKE             — `tsc --noEmit` sur les fichiers émis
//   ④ les écrans se MONTENT           — react-test-renderer, quelques secondes
//
// Chaque niveau arrête le suivant : monter des écrans qu'on n'a pas pu
// compiler n'apprendrait rien, et le dire deux fois ferait croire à deux
// défauts.
//
// ── AUCUN APPEL PAYANT. Tout est pur : lecture d'un fichier, compilation
// déterministe, montage en mémoire. Ce script peut tourner mille fois.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const doc = process.argv[2];

if (doc === undefined) {
  console.error("usage : node scripts/verifier-une-app.mjs <document.air.json>");
  process.exit(2);
}

const chemin = resolve(doc);
console.log(`\n  document : ${chemin}\n`);

// ── ① LE DOCUMENT EST-IL VALIDE ?
const { migrateAirDocument, assertValidAir } = await import(
  join(REPO, "packages/air-schema/src/index.ts")
);
let air;
try {
  air = assertValidAir(migrateAirDocument(JSON.parse(readFileSync(chemin, "utf8"))));
  console.log("  ① document VALIDE");
} catch (e) {
  console.error("  ① document REFUSÉ");
  for (const d of e?.diagnostics ?? []) {
    console.error(`     ${d.code ?? "?"} @ ${d.path ?? "?"} — ${String(d.message ?? "").slice(0, 120)}`);
  }
  if ((e?.diagnostics ?? []).length === 0) console.error(`     ${String(e?.message ?? e)}`);
  process.exit(1);
}

// ── ② SE COMPILE-T-ELLE ?
const { compileProject } = await import(join(REPO, "packages/compiler/src/compile-project.ts"));
let fichiers;
try {
  fichiers = compileProject(air).files;
  console.log(`  ② compile — ${String(fichiers.size)} fichiers`);
} catch (e) {
  console.error(`  ② COMPILATION IMPOSSIBLE — ${String(e?.code ?? "")} ${String(e?.message ?? e)}`);
  process.exit(1);
}

// ── ③ LES ÉCRANS SE MONTENT-ILS ?
//
// On écrit dans un dossier NEUF à chaque fois : un reliquat d'une
// vérification précédente ferait monter des écrans qui n'existent plus, et le
// verdict porterait sur une application qui n'est pas celle qu'on tient.
const DEST = join(tmpdir(), "deribfy-une-app");
rmSync(DEST, { recursive: true, force: true });
for (const [nom, contenu] of fichiers) {
  const abs = join(DEST, nom);
  mkdirSync(dirname(abs), { recursive: true });
  // Les `.png` voyagent en base64 dans la carte — convention du dépôt.
  writeFileSync(abs, nom.endsWith(".png") ? Buffer.from(contenu, "base64") : contenu);
}

// ── LE `node_modules` DE RÉFÉRENCE, ET POURQUOI IL EST INDISPENSABLE.
//
// Le `tsconfig.json` émis étend `expo/tsconfig.base`. Depuis un dossier
// temporaire sans dépendances, il est introuvable — et l'outillage échoue
// sur un message qui ne parle ni du document ni de l'application.
//
// La gate de compilation résout ça en liant symboliquement les dépendances
// d'une tranche déjà installée. On fait pareil : on ne réinstalle rien, on
// emprunte. Si l'emprunt n'est pas possible, on le DIT — un échec dont on
// ignore la cause vaut moins qu'un refus net.
const DEPS = join(REPO, "slices/resto-riche/app/node_modules");
if (!existsSync(DEPS)) {
  console.error(
    `  ③ impossible : aucun \`node_modules\` de référence en ${DEPS}\n` +
      "     (lancer `npm ci` dans slices/resto-riche/app, ou dans une autre tranche)",
  );
  process.exit(2);
}
symlinkSync(DEPS, join(DEST, "node_modules"), "dir");

try {
  execFileSync("npx", ["tsc", "--noEmit"], { cwd: DEST, stdio: "pipe", timeout: 180_000 });
  console.log("  ③ le code émis TYPECHECKE");
} catch (e) {
  const sortie = String(e?.stdout ?? "") + String(e?.stderr ?? "");
  const erreurs = sortie.split("\n").filter((l) => l.includes("error TS"));
  console.error(`  ③ TYPECHECK REFUSÉ — ${String(erreurs.length)} erreur(s)`);
  // Si `tsc` n'a produit AUCUNE erreur TS, c'est qu'il n'a pas tourné : on
  // publie sa sortie brute plutôt qu'un échec indéchiffrable.
  for (const l of (erreurs.length > 0 ? erreurs : sortie.split("\n")).slice(0, 12)) {
    console.error(`     ${l}`);
  }
  process.exit(1);
}

try {
  execFileSync(
    "npx",
    [
      "vitest",
      "run",
      "--config",
      "docs/elite-protocol/evidence/observation/une-app.config.ts",
    ],
    { cwd: REPO, stdio: "inherit", env: { ...process.env, DERIBFY_APP: DEST } },
  );
  console.log("\n  ④ tous les écrans se MONTENT.\n");
} catch {
  console.error("\n  ④ des écrans ne se montent pas — détail ci-dessus.\n");
  process.exit(1);
}
