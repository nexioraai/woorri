// ============================================================
// PREUVE D'EXTRACTION — L'ORCHESTRATION DÉPLACÉE EST INTACTE.
//
// 201 lignes ont quitté `emit-v3.mjs` pour `orchestration.mjs`. Comme pour le
// cœur la veille, la seule chose qu'un contrôle à COÛT NUL puisse établir,
// c'est que le texte n'a pas changé en chemin : ni une ligne « améliorée »,
// ni une constante « nettoyée », ni une indentation « rangée ».
//
// Il le dit, et RIEN DE PLUS. Qu'un déplacement soit textuellement exact ne
// prouve pas que la chaîne rend le même document — cette preuve-là demande un
// tirage, donc des appels payants.
//
// L'empreinte de référence a été relevée AVANT le déplacement, sur les lignes
// 233 à 433 du script, par analyse de portée (acorn) pour en déduire les onze
// dépendances. Elle n'est pas recalculée depuis le résultat : ce serait
// comparer le texte à lui-même.
// ============================================================
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EMPREINTE_AVANT = "62e7da1ca4f7969f2fce900c87803f6c";

const module = readFileSync(join(HERE, "orchestration.mjs"), "utf8");

// Repères de DÉBUT et de FIN du bloc déplacé. Le repère de fin est la ligne
// que la fabrique ajoute APRÈS le bloc — jamais une ligne du bloc lui-même,
// qu'un reformatage ferait disparaître (leçon du vérificateur du cœur).
const DEBUT = "function contexteClient(intention) {";
const FIN = "\nreturn { contexteClient";

const i = module.indexOf(DEBUT);
const j = module.indexOf(FIN, i);
if (i < 0 || j < i) {
  console.error("⛔ REFUS — bloc introuvable dans le module.");
  process.exit(1);
}
const bloc = module.slice(i, j);
const empreinte = createHash("md5").update(bloc).digest("hex");

if (empreinte !== EMPREINTE_AVANT) {
  console.error(`⛔ REFUS — le texte a changé en chemin.`);
  console.error(`   attendu ${EMPREINTE_AVANT}`);
  console.error(`   obtenu  ${empreinte}`);
  process.exit(1);
}

// ET LE SCRIPT NE DOIT PLUS LE PORTER. Sans ce second contrôle, une copie
// laissée en place passerait inaperçue — et les deux divergeraient.
const script = readFileSync(join(HERE, "emit-v3.mjs"), "utf8");
if (script.includes(DEBUT)) {
  console.error("⛔ REFUS — le bloc est encore dans `emit-v3.mjs` : deux copies.");
  process.exit(1);
}
if (!script.includes("creerOrchestration({")) {
  console.error("⛔ REFUS — le script n'appelle pas la fabrique.");
  process.exit(1);
}

console.log(`✅ orchestration : ${String(bloc.split("\n").length)} lignes déplacées, texte intact (${empreinte}).`);
