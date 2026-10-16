// Valide le document, puis le compile en PWA — la cible que le cahier demande.
//
// ── POURQUOI UN SECOND ÉMETTEUR, ET PAS UN DRAPEAU SUR LE PREMIER.
//
// `emettre.mjs` écrit dans `app/`, un projet Expo avec son `package.json`,
// son verrou et ses `node_modules`. La cible web a les siens, et ils ne sont
// pas les mêmes — Vite contre Metro, `react-dom` contre `react-native`.
// Mélanger les deux dans un seul dossier donnerait un projet qui n'installe
// ni ne construit, et on ne s'en apercevrait qu'après téléchargement.
//
// Les deux sorties viennent du MÊME document : c'est tout l'intérêt. Le
// cahier V1.3 demande une PWA (§1 « application Web Progressive »,
// §9.2 « Architecture Offline-First avec Service Workers »), et les stores
// demandent du natif. Un document, deux robinets.
const R = new URL("../../", import.meta.url).pathname;
const { readFileSync } = await import("node:fs");
const { migrateAirDocument, assertValidAir } = await import(R + "packages/air-schema/src/index.ts");
const { compileWeb } = await import(R + "packages/compiler/src/index.ts");

const doc = JSON.parse(readFileSync(R + "slices/tontine/tontine.air.json", "utf8"));
const c = compileWeb(assertValidAir(migrateAirDocument(doc)));

const { ecrireApp } = await import(R + "slices/lib/ecrire-app.mjs");
const OUT = R + "slices/tontine/app-web/";
const { elagues } = ecrireApp(OUT, c.files);
if (elagues.length > 0) console.log(`🧹 élagués : ${elagues.join(", ")}`);

console.log(`  ${c.files.size} fichiers écrits dans ${OUT}`);
// CE QUI FAIT D'UNE PAGE UNE PWA, et non un site : un travailleur de service
// (fonctionne hors ligne) et un manifeste (s'installe sur l'écran d'accueil).
// On le DIT à chaque émission, parce que c'est l'exigence §9.2 du cahier.
for (const f of ["sw.js", "manifest.webmanifest", "index.html"]) {
  console.log(`  ${c.files.has(f) ? "✓" : "✗"} ${f}`);
}
