// KAVIVA — PREUVE DU MOTEUR FINAL (étape ⑦, 2026-09-11) : premier archétype
// NON marketplace (réservation institut/spa) généré APRÈS les six étapes de
// la mission Elite A++++. Pipeline IDENTIQUE aux tranches précédentes :
// document généré → validé → compileProject → écrivain UNIQUE (élagage).
// Aucune retouche d'app générée — ce dossier mesure le moteur.
// ── LA RACINE SE DÉDUIT, ELLE NE SE GRAVE PLUS (2026-10-17).
//
// Ce script portait `const R = "/Users/yia/Documents/woorri/"` — l'ancien
// emplacement du dépôt, abandonné le 2026-10-11 quand il est sorti d'iCloud.
// Il échouait donc au PREMIER appel, sur un message parlant d'un module
// introuvable plutôt que d'un chemin mort. Quarante fichiers portaient encore
// cette adresse ; ceux qui SERVENT sont corrigés, les campagnes historiques
// sont laissées telles quelles.
//
// `import.meta.url` est l'emplacement RÉEL de ce fichier : le dépôt peut
// déménager encore, le script suivra.
const R = new URL("../../", import.meta.url).pathname;
const { readFileSync, writeFileSync } = await import("node:fs");
const { migrateAirDocument, assertValidAir } = await import(R + "packages/air-schema/src/index.ts");
const { compileProject } = await import(R + "packages/compiler/src/index.ts");
const { ecrireApp } = await import(R + "slices/lib/ecrire-app.mjs");

const doc = JSON.parse(readFileSync(R + "slices/kaviva/kaviva.air.json", "utf8"));
const v = assertValidAir(migrateAirDocument(doc));
const c = compileProject(v);
const OUT = R + "slices/kaviva/app/";
const { elagues } = ecrireApp(OUT, c.files);
if (elagues.length > 0) console.log(`🧹 élagués (périmés) : ${elagues.join(", ")}`);
writeFileSync(OUT + "eas.json", JSON.stringify({
  cli: { version: ">= 16.0.0", appVersionSource: "local" },
  build: { preview: { distribution: "internal", channel: "preview", android: { buildType: "apk" } } },
}, null, 2) + "\n");
console.log(`🟢 app émise : ${c.files.size} fichiers · rootHash ${c.rootHash.slice(0, 12)}…`);
