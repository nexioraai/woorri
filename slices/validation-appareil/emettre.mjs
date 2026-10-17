// ÉMISSION de l'app de validation par le VRAI compilateur (aucun mock,
// aucune branche « appareil ») — patron gate-app-compile (D-074).
import { mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const ICI = join(fileURLToPath(import.meta.url), "..");
const R = join(ICI, "..", "..") + "/";
// ── UNE SEULE DÉCISION POUR LES FICHIERS BINAIRES (2026-10-17).
//
// `.png` n'est plus seul : les polices embarquées voyagent aussi en base64.
// Quatre écrivains décidaient séparément, et l'en-tête de celui-ci dit
// « piège base64 fermé DEUX FOIS déjà ». La décision vit dans
// `packages/compiler/src/fichiers-binaires.ts`, une fois.
const { estBinaire } = await import(R + "packages/compiler/src/fichiers-binaires.ts");
const { migrateAirDocument } = await import(R + "packages/air-schema/src/migrations.ts");
const { compileProject } = await import(R + "packages/compiler/src/index.ts");

const air = migrateAirDocument(JSON.parse(readFileSync(join(ICI, "validation-appareil.air.json"), "utf8")));
const slots = air.slots.map((s) => ({
  slotId: s.id,
  source: `export function runSlot(entrees: { valeur?: string }): { resultat: string } {\n  return { resultat: String(entrees.valeur ?? "") };\n}\n`,
  authorId: "validation-appareil",
}));
const c = compileProject(air, undefined, slots.length > 0 ? { slots } : undefined);

const APP = join(ICI, "app") + "/";
rmSync(APP, { recursive: true, force: true });
for (const [f, contenu] of c.files) {
  const p = APP + f;
  mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true });
  // Les BINAIRES (marque) sont portés en base64 par le document : les écrire
  // tels quels produirait un fichier texte que le prebuild refuserait.
  writeFileSync(p, estBinaire(f) ? Buffer.from(contenu, "base64") : contenu);
}
// Profil EAS : patron v3-resto-quartier (APK interne). AUCUN build lancé ici.
writeFileSync(APP + "eas.json", JSON.stringify({
  cli: { version: ">= 16.0.0", appVersionSource: "local" },
  // CANAL (Phase 11) : dès que `app.json` porte une adresse de livraison, le
  // build DOIT déclarer quel flux il écoute. Sans lui, la phase
  // « Configure expo-updates » échoue — mesuré, build 6fd9f394.
  build: {
    preview: { distribution: "internal", channel: "preview", android: { buildType: "apk" } },
  },
}, null, 2) + "\n");
console.log(`🟢 app émise : ${c.files.size} fichiers · rootHash ${c.rootHash.slice(0, 12)}… · lock ${c.lock.lockSchemaVersion}`);
