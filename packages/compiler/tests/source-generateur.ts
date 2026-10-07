// ============================================================
// LE SOURCE DU GÉNÉRATEUR — EN UN SEUL ENDROIT, PARCE QU'IL EST EN DEUX
// FICHIERS DEPUIS LE 2026-10-07.
//
// Vingt fichiers de test lisent le source de la chaîne d'émission pour y
// vérifier des propriétés : que le prompt ne porte pas de table sectorielle,
// que les digests sont DÉRIVÉS et non recopiés, que les corrections sont
// enseignées depuis l'enveloppe.
//
// Ils lisaient tous `emit-v3.mjs`. L'extraction de son cœur dans
// `emission-coeur.mjs` les a tous cassés d'un coup — douze échecs, et le
// message était net : « blocsDigest is not defined ».
//
// Corriger vingt chemins aurait recréé le même piège pour la prochaine
// extraction. Le source du générateur est désormais DÉFINI ICI, une fois : le
// jour où il se répartit sur un troisième fichier, une seule ligne change.
// ============================================================
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BASE = join(R, "benchmarks", "air-emission");

/** Les fichiers qui, ensemble, FONT la chaîne d'émission. */
export const FICHIERS_GENERATEUR = ["emit-v3.mjs", "emission-coeur.mjs"] as const;

/**
 * Leur texte, concaténé dans l'ordre de lecture.
 *
 * La concaténation est volontaire : un test qui cherche une chaîne la trouve
 * où qu'elle vive, et son verdict ne dépend pas de la découpe en fichiers —
 * qui est une affaire d'organisation, pas de sens.
 */
export const SOURCE_GENERATEUR = FICHIERS_GENERATEUR.map((f) =>
  readFileSync(join(BASE, f), "utf8"),
).join("\n");
