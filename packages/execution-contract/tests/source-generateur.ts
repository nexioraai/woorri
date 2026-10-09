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

// `orchestration.mjs` et `moteur.mjs` s'ajoutent le 2026-10-08 : 201 lignes
// de plus ont quitte le script — la boucle des huit passes et la
// reparation — pour que le PRODUIT puisse les appeler. Meme raison, meme
// liste. Un controle qui lit le source du generateur doit lire les quatre.
// `gate-reparation.mjs` s'ajoute le 2026-10-09 : la gate anti-oscillation a
// DEMENAGE d'emit-v3 (le produit en avait besoin, la regle doit etre UNE).
// Six cliquets verifient que ses clauses ne bougent pas — ils lisent cette
// liste, et la regle vit desormais dans le cinquieme fichier.
export const FICHIERS_GENERATEUR = [
  "emit-v3.mjs",
  "emission-coeur.mjs",
  "orchestration.mjs",
  "moteur.mjs",
  "gate-reparation.mjs",
] as const;

/** Leur texte, concaténé : un test trouve ce qu'il cherche où qu'il vive. */
export const SOURCE_GENERATEUR = FICHIERS_GENERATEUR.map((f) =>
  readFileSync(join(BASE, f), "utf8"),
).join("\n");
