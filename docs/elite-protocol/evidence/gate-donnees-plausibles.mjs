// ════════════════════════════════════════════════════════════════════
//  GATE — DES DONNÉES DE DÉMONSTRATION QUI ONT UN SENS.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT, ET IL EST CELUI QUE LE PROPRIÉTAIRE A VU EN PREMIER.
//
// « Montants absurdes, dates futures. » Mesuré le 2026-10-17 sur sa tontine :
// un ORDRE DE PASSAGE À 314 dans une tontine de douze membres, et un code
// d'adhésion affiché « code d adhesion recu 1 » — le libellé de la colonne,
// servi à l'écran.
//
// ── TOUT EXISTAIT DÉJÀ, ET RIEN N'AGISSAIT. C'EST LE CŒUR DE L'AFFAIRE.
//
//   ① la CONSIGNE est écrite, en détail, dans `emission-coeur.mjs` : règles
//      36bis, 36ter, 36quinquies, 37bis — « tout champ `number` ou `decimal`
//      porte `demoValues` », avec les défauts mesurés cités (un bureau de
//      907 pièces, une note de 466,11/5) ;
//   ② le SCHÉMA porte `demoValues` depuis 1.20.0 ;
//   ③ le JUGE existe (`fidelity.nombresVraisemblables`) et il est appelé par
//      `acceptation.mjs` ;
//   ④ et pourtant : 13,9 % des champs du dépôt en portent.
//
// Il manquait la dernière marche : un CLIQUET. Un grief qui voyage dans les
// diagnostics se lit une fois et s'oublie ; un grief qui fait rougir la gate
// se répare.
//
// ── L'ANGLE MORT DU JUGE, CORRIGÉ LE MÊME JOUR.
//
// Le juge ne regardait que les champs `required`, au motif qu'« exiger des
// valeurs pour ce que l'utilisateur ne verra pas serait du zèle ». Le motif
// est juste ; la portée ne le suivait pas. L'ordre de passage à 314 n'est pas
// `required` — il est AFFICHÉ deux fois, en `trailingFieldId` et en
// `sortFieldId`. Le juge applique désormais son propre critère : requis OU
// affiché. L'élargissement a révélé 22 griefs de plus (69 → 91).
//
// ── CE QUE CE CLIQUET TIENT, ET POURQUOI DEUX PLAFONDS.
//
// Les TRANCHES sont les applications vivantes — celles qu'on régénère, celles
// que le propriétaire ouvre. Le CORPUS est un jeu d'artefacts GELÉS qui sert
// de témoin de non-régression au compilateur : y toucher changerait la
// référence de douze autres gates.
//
// Deux plafonds, donc, chacun à sa mesure du jour. Ils ne peuvent que
// DESCENDRE : un document qui perd ses valeurs plausibles fait rougir, un
// document qui en gagne fait baisser le plafond au tir suivant.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, join } from "node:path";

const { nombresVraisemblables } = await import("../../../packages/fidelity/src/index.ts");
const { migrateAirDocument } = await import("../../../packages/air-schema/src/index.ts");

// ── LES PLAFONDS, MESURÉS LE 2026-10-17.
//
// Un plafond AU-DESSUS de la mesure ne mord pas ; celui-ci est À la mesure.
// Le baisser est le geste qui répare — jamais le lever.
// Les tranches sont à ZÉRO depuis le 2026-10-17 : 43 champs affichés sans
// valeur plausible ont été posés le même jour (un index d'électricité qui
// progresse, un prix de plat de quartier, des places de bus). Zéro est un
// plafond qui ne se lève pas — un champ affiché sans valeur fait rougir.
const PLAFOND_TRANCHES = 0;
const PLAFOND_CORPUS = 90;

const documentsDe = (dossier, profondeur = 1) => {
  if (!existsSync(dossier)) return [];
  const out = [];
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const p = join(dossier, e.name);
    if (e.isDirectory() && profondeur > 0) out.push(...documentsDe(p, profondeur - 1));
    else if (e.isFile() && e.name.endsWith(".air.json")) out.push(p);
  }
  return out;
};

const griefsDe = (chemin) => {
  const air = migrateAirDocument(JSON.parse(readFileSync(chemin, "utf8")));
  return nombresVraisemblables(air) ?? [];
};

const familles = [
  { nom: "tranches", docs: documentsDe("slices", 2), plafond: PLAFOND_TRANCHES },
  { nom: "corpus", docs: documentsDe("packages/golden-corpus/corpus-v3", 0), plafond: PLAFOND_CORPUS },
];

let rouge = false;
for (const f of familles) {
  const parDoc = f.docs
    .map((d) => ({ doc: basename(d, ".air.json"), n: griefsDe(d).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const total = parDoc.reduce((n, x) => n + x.n, 0);
  const verdict = total > f.plafond ? "🔴 AU-DESSUS" : total < f.plafond ? "⬇️  EN BAISSE" : "✅ au plafond";
  console.log(
    `\n  ${f.nom.toUpperCase()} — ${String(f.docs.length)} document(s) · ` +
      `${String(total)} grief(s) / plafond ${String(f.plafond)}  ${verdict}`,
  );
  for (const x of parDoc.slice(0, 8)) console.log(`     ${x.doc.padEnd(26)} ${String(x.n).padStart(3)}`);
  if (total > f.plafond) {
    rouge = true;
    console.error(
      `     Des champs AFFICHÉS n'ont plus de valeur plausible : l'écran montrera\n` +
        `     un entier tiré entre 1 et 999, ou le libellé de la colonne suivi d'un\n` +
        `     chiffre. Posez \`demoValues\` sur les champs cités.`,
    );
  }
  if (total < f.plafond) {
    console.log(
      `     Le plafond peut descendre à ${String(total)} dans ce fichier — c'est le geste qui ferme.`,
    );
  }
}

console.log("");
process.exit(rouge ? 1 : 0);
