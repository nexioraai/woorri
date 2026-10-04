// Émet l'application de gestion à partir de l'AIR dérivé de SGD.
// Même pipeline que les autres slices : valider, compiler, écrire, élaguer.
const R = new URL("../../", import.meta.url).pathname;
const { readFileSync } = await import("node:fs");
const { migrateAirDocument, assertValidAir } = await import(R + "packages/air-schema/src/index.ts");
const { compileProject } = await import(R + "packages/compiler/src/index.ts");

const doc = JSON.parse(readFileSync(R + "slices/gestion/gestion.air.json", "utf8"));
const c = compileProject(assertValidAir(migrateAirDocument(doc)));

const { ecrireApp } = await import(R + "slices/lib/ecrire-app.mjs");
const OUT = R + "slices/gestion/app/";
const { elagues } = ecrireApp(OUT, c.files);
if (elagues.length > 0) console.log(`🧹 élagués : ${elagues.join(", ")}`);

const porte = doc.intent.needs.filter((b) => b.resolution.kind === "satisfied");
const absent = doc.intent.needs.filter((b) => b.resolution.kind === "unexpressible");
console.log(`  ${c.files.size} fichiers écrits dans ${OUT}`);
console.log(`  besoins portés : ${porte.length} · INEXPRIMABLES : ${absent.length}`);
for (const b of absent) console.log(`   ✗ ${b.statement.slice(0, 92)}`);
