// KÔRÔ ARTISANS — première application née du générateur resynchronisé (1.19).
// Document GÉNÉRÉ (campagne du 2026-09-09, 3,48 $), marque et liaison de build
// injectées par le pipeline (rôle déclaré — le LLM n'invente ni octets ni ids).
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

const doc = JSON.parse(readFileSync(R + "slices/marketplace-artisans/koro-artisans.air.json", "utf8"));
const v = assertValidAir(migrateAirDocument(doc));
const c = compileProject(v);
const OUT = R + "slices/marketplace-artisans/app/";
// ÉTAPE ⑥ (EP-012) — écriture + ÉLAGAGE par l'écrivain UNIQUE.
const { ecrireApp } = await import(R + "slices/lib/ecrire-app.mjs");
const { elagues } = ecrireApp(OUT, c.files);
if (elagues.length > 0) console.log(`🧹 élagués (périmés) : ${elagues.join(", ")}`);
writeFileSync(OUT + "eas.json", JSON.stringify({
  cli: { version: ">= 16.0.0", appVersionSource: "local" },
  build: { preview: { distribution: "internal", channel: "preview", android: { buildType: "apk" } } },
}, null, 2) + "\n");
console.log(`🟢 app émise : ${c.files.size} fichiers · rootHash ${c.rootHash.slice(0, 12)}…`);
