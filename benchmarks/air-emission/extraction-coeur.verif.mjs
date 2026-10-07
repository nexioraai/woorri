// ============================================================
// PREUVE D'EXTRACTION — LE TEXTE DÉPLACÉ EST INTACT.
//
// 624 lignes ont quitté `emit-v3.mjs` pour `emission-coeur.mjs`. La seule
// chose qu'un contrôle à COÛT NUL puisse établir, c'est que le texte n'a pas
// changé en chemin : ni une ligne « améliorée », ni une constante « nettoyée ».
//
// Ce contrôle le dit, et il ne dit RIEN DE PLUS. Qu'un déplacement soit
// textuellement exact ne prouve pas que la campagne rend le même résultat —
// cette preuve-là demande un tirage, donc des appels payants.
// ============================================================
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EMPREINTE_AVANT = "4ffbfe96e560f51042641bb512aa9633";

const coeur = readFileSync(join(HERE, "emission-coeur.mjs"), "utf8");
// DEUX repères, pas six : `SYSTEM_TRANSCRIBE` est RESTÉ dans le script — il
// ne sert qu'à l'aller-retour de la campagne, que le produit n'utilise pas.
// Le bloc déplacé est donc fait de deux tranches contiguës, et c'est ainsi
// qu'il faut le relire pour le comparer.
const reperes = [
  ["const PARTS = [", "async function callPart("],
  ["async function callPart(", "return { PARTS, partsPour"],
];
let bloc = "";
for (const [d, f] of reperes) {
  const i = coeur.indexOf(d);
  const j = coeur.indexOf(f, i);
  if (i < 0 || j < i) {
    console.error(`⛔ REFUS — bloc introuvable dans le module : ${d.slice(0, 40)}`);
    process.exit(1);
  }
  // Le déplacement a ajouté DEUX espaces d'indentation à chaque ligne : on les
  // retire pour comparer le texte, pas sa mise en page.
  bloc += coeur.slice(i, j).split("\n").map((l) => (l.startsWith("  ") ? l.slice(2) : l)).join("\n");
}
const empreinte = createHash("sha256").update(bloc.replace(/\s+$/u, "")).digest("hex").slice(0, 32);
if (empreinte !== EMPREINTE_AVANT) {
  console.error(`⛔ REFUS — le texte a change pendant le deplacement : ${empreinte} != ${EMPREINTE_AVANT}`);
  process.exit(1);
}
console.log(`extraction-coeur : texte intact (${empreinte}) · ${bloc.split("\n").length} lignes verifiees.`);
