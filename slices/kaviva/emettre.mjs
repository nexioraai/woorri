// KAVIVA — PREUVE DU MOTEUR FINAL (étape ⑦, 2026-09-11) : premier archétype
// NON marketplace (réservation institut/spa) généré APRÈS les six étapes de
// la mission Elite A++++. Pipeline IDENTIQUE aux tranches précédentes :
// document généré → validé → compileProject → écrivain UNIQUE (élagage).
// Aucune retouche d'app générée — ce dossier mesure le moteur.
const R = "/Users/yia/Documents/woorri/";
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
