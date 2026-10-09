// ============================================================
// PREUVE D'EXTRACTION DE LA GATE — verbatim MODULO renommages declares.
//
// Un byte-identique strict etait impossible : le noyau lisait des noms
// locaux de campagne. Plutot que de le maquiller, la TABLE des renommages
// est declaree ICI, appliquee MECANIQUEMENT en sens inverse sur le texte du
// module, et le resultat doit etre A L'OCTET le texte d'origine releve dans
// `emit-v3.mjs` AVANT le demenagement (empreinte gelee ci-dessous). Tout
// ecart hors de la table — une ligne « amelioree », un commentaire retouche,
// une indentation rangee — est un REFUS.
// ============================================================
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EMPREINTE_AVANT = "832851e5a32793ce81c127eab668f90c";

// LA TABLE — cinq renommages, pas un de plus. Sens module → campagne.
const SUBSTITUTIONS = [
  ["(diagnosticsAvant ?? [])", "(journal.attempt1?.diagnostics ?? [])"],
  ["diagnosticsApres.filter", "diagnostics.filter"],
  ["validateLocal(documentAvant).air", "validateLocal(avantReparation).air"],
  ["perimetreDeJugement(airApres, prescriptif)", "perimetreDeJugement(air, prescriptif)"],
  // La condition du `if` campagne, extraite en expression nommee — verifiee
  // a part : elle ne vit pas dans le noyau borne.
];

const module_ = readFileSync(join(HERE, "gate-reparation.mjs"), "utf8");
const DEBUT = "// ── NOYAU DEMENAGE — DEBUT (ne pas reformater : l'empreinte le lit) ──\n";
const FIN = "\n    // ── NOYAU DEMENAGE — FIN ──";
const i = module_.indexOf(DEBUT);
const j = module_.indexOf(FIN, i);
if (i < 0 || j < i) {
  console.error("⛔ REFUS — noyau introuvable entre ses bornes.");
  process.exit(1);
}
let noyau = module_.slice(i + DEBUT.length, j);
for (const [apres, avant] of SUBSTITUTIONS) {
  if (!noyau.includes(apres)) {
    console.error(`⛔ REFUS — le renommage declare « ${apres} » est introuvable dans le noyau.`);
    process.exit(1);
  }
  noyau = noyau.split(apres).join(avant);
}
const empreinte = createHash("md5").update(noyau).digest("hex");
if (empreinte !== EMPREINTE_AVANT) {
  console.error("⛔ REFUS — le texte a change au-dela des renommages declares.");
  console.error(`   attendu ${EMPREINTE_AVANT} · obtenu ${empreinte}`);
  process.exit(1);
}

// La condition du if, relevee telle quelle de la campagne.
if (!module_.includes("const rejetee = introduits.length > 0 && !revelation;")) {
  console.error("⛔ REFUS — la condition du if campagne n'est pas reprise telle quelle.");
  process.exit(1);
}

// ET LE SCRIPT NE PORTE PLUS LE NOYAU : une copie laissee en place
// divergerait — c'est exactement ce que ce demenagement ferme.
const script = readFileSync(join(HERE, "emit-v3.mjs"), "utf8");
if (script.includes("const clesAttempt1 = new Set(")) {
  console.error("⛔ REFUS — le noyau vit encore dans emit-v3.mjs : deux copies.");
  process.exit(1);
}
if (!script.includes("gateReparation.verdict(")) {
  console.error("⛔ REFUS — la campagne n'appelle pas la gate extraite.");
  process.exit(1);
}

console.log(
  `✅ gate : noyau demenage, egalite a l'octet apres les ${String(SUBSTITUTIONS.length)} renommages declares (${empreinte}).`,
);
