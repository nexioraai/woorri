// COMPILER POUR LE WEB — l'émission commune, puis l'enveloppe.
//
// Ce fichier tient en vingt lignes, et c'est le résultat qui compte : tout ce
// qui fait une application — les écrans, leurs données, les droits, les slots,
// les blocs — sort de `emitProject` SANS MODIFICATION. Seule l'enveloppe
// change.
//
// Si ce fichier grossissait, ce serait le signe que du comportement de
// plateforme a fui hors des quatre endroits prévus (entrée, racine,
// navigation, gabarit).
import { emitProject, type EmittedProject } from "./emit-project.ts";
import { enveloppeWeb } from "./emit-web.ts";
import type { ProjectAir } from "@deribfy/air-schema";

const pascal = (id: string): string =>
  id.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");

export function compileWeb(input: unknown): EmittedProject {
  const natif = emitProject(input);
  const air = input as ProjectAir;
  const files = new Map(natif.files);
  // ── LES FICHIERS PROPRES AU NATIF SORTENT.
  //
  // Les laisser produirait une application qui porte à la fois un `app.json`
  // d'Expo et un `index.html` : deux promesses contradictoires dans le même
  // dossier, et c'est celle qu'on ne voulait pas qui finirait par être lue.
  for (const f of ["app.json", ".easignore", ".fingerprintignore", "index.ts"]) files.delete(f);
  for (const [nom, contenu] of enveloppeWeb(air, pascal).files) files.set(nom, contenu);
  return { ...natif, files };
}
