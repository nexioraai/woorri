// Le source du générateur, en UN endroit — il est en deux fichiers depuis
// l'extraction de son cœur le 2026-10-07. La même extraction a cassé vingt
// tests d'un coup ; corriger vingt chemins aurait recréé le piège pour la
// prochaine.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = join(
  dirname(fileURLToPath(import.meta.url)), "..", "..", "..",
  "benchmarks", "air-emission",
);

export const FICHIERS_GENERATEUR = ["emit-v3.mjs", "emission-coeur.mjs"] as const;

/** Leur texte, concaténé : un test trouve ce qu'il cherche où qu'il vive. */
export const SOURCE_GENERATEUR = FICHIERS_GENERATEUR.map((f) =>
  readFileSync(join(BASE, f), "utf8"),
).join("\n");
