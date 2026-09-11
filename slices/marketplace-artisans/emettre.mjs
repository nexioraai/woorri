// KÔRÔ ARTISANS — première application née du générateur resynchronisé (1.19).
// Document GÉNÉRÉ (campagne du 2026-09-09, 3,48 $), marque et liaison de build
// injectées par le pipeline (rôle déclaré — le LLM n'invente ni octets ni ids).
const R = "/Users/yia/Documents/woorri/";
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
