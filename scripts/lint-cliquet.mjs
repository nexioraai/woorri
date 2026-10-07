// ============================================================
// CLIQUET DE LINT — LA DETTE NE GROSSIT PLUS, ET LE LINT REDEVIENT LISIBLE.
//
// ── CE QUI SE PASSAIT, ET POURQUOI C'ÉTAIT PIRE QU'UNE DETTE.
//
// `npx eslint .` sur `apps/web` échoue à CHAQUE passage, et son étape porte
// `continue-on-error: true` sans `id` : le gate ne lit même pas son résultat.
// Le verdict du CI le dit en toutes lettres — « personne ne lit leur
// résultat ».
//
// Conséquence mesurée le 2026-10-07 : 1 076 erreurs, dont **1 053 sont des
// `no-explicit-any`** — une dette de typage. Les 23 autres sont des DÉFAUTS
// RÉELS de React (`set-state-in-effect`, `immutability`) que plus personne ne
// voyait, noyés dans le bruit. Une dette qui cache des défauts neufs ne coûte
// pas ce qu'elle semble coûter.
//
// ── POURQUOI UN CLIQUET PLUTÔT QU'UNE CAMPAGNE DE TYPAGE.
//
// Typer 1 053 `any` à la main est long, risqué sur un produit en ligne, et ne
// rend le lint utile qu'À LA FIN. Un cliquet le rend utile TOUT DE SUITE :
// l'état actuel est gelé, règle par règle, et toute AUGMENTATION échoue. La
// dette ne peut que diminuer, et une erreur NEUVE redevient visible le jour
// où elle est écrite.
//
// Ce cliquet ne masque rien : il imprime l'écart exact, et le fichier de
// référence est versionné — on y lit la dette en un coup d'œil.
// ============================================================
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(RACINE, "apps", "web");
const REFERENCE = join(RACINE, "scripts", "lint-reference.json");
const GELER = process.argv.includes("--geler");

/** Les erreurs d'eslint, comptées par règle. Les avertissements sont ignorés :
 *  ce cliquet tient ce qui ÉCHOUE, pas ce qui se discute. */
function compter() {
  let brut;
  try {
    brut = execFileSync("npx", ["eslint", ".", "--format", "json"], {
      cwd: APP,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (e) {
    // eslint sort en 1 dès qu'il trouve une erreur : c'est le cas NORMAL ici.
    brut = e.stdout ?? "";
  }
  const debut = brut.indexOf("[");
  if (debut < 0) throw new Error("eslint n'a rien rendu d'analysable");
  const par = {};
  for (const f of JSON.parse(brut.slice(debut))) {
    for (const m of f.messages) {
      if (m.severity !== 2) continue;
      const r = m.ruleId ?? "(analyse)";
      par[r] = (par[r] ?? 0) + 1;
    }
  }
  return par;
}

const actuel = compter();
const total = Object.values(actuel).reduce((a, b) => a + b, 0);

if (GELER || !existsSync(REFERENCE)) {
  writeFileSync(REFERENCE, JSON.stringify(actuel, null, 2) + "\n");
  console.log(`cliquet-lint : référence écrite — ${String(total)} erreur(s).`);
  for (const [r, n] of Object.entries(actuel).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${r}`);
  }
  process.exit(0);
}

const reference = JSON.parse(readFileSync(REFERENCE, "utf8"));
const refTotal = Object.values(reference).reduce((a, b) => a + b, 0);
const fautes = [];
const gains = [];

for (const [regle, n] of Object.entries(actuel)) {
  const avant = reference[regle] ?? 0;
  if (n > avant) fautes.push(`${regle} : ${String(avant)} → ${String(n)} (+${String(n - avant)})`);
  else if (n < avant) gains.push(`${regle} : ${String(avant)} → ${String(n)} (−${String(avant - n)})`);
}
for (const [regle, avant] of Object.entries(reference)) {
  if (!(regle in actuel) && avant > 0) gains.push(`${regle} : ${String(avant)} → 0 (règle éteinte)`);
}

console.log(`cliquet-lint : ${String(total)} erreur(s), référence ${String(refTotal)}.`);
for (const g of gains) console.log(`  🟢 ${g}`);
for (const f of fautes) console.log(`  🔴 ${f}`);

if (fautes.length > 0) {
  console.log("");
  console.log("La dette de lint a AUGMENTÉ. Elle n'a le droit que de diminuer.");
  console.log("Corrigez l'erreur neuve, ou — si elle est assumée — regelez la");
  console.log("référence avec `node scripts/lint-cliquet.mjs --geler` et dites");
  console.log("dans le commit POURQUOI elle est acceptée.");
  process.exit(1);
}

if (gains.length > 0) {
  console.log("");
  console.log("Dette en baisse. Pensez à regeler la référence pour la verrouiller :");
  console.log("  node scripts/lint-cliquet.mjs --geler");
}
process.exit(0);
