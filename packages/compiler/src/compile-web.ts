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
import { EMBEDDED_ASSETS_WEB } from "./embedded-assets.generated.ts";
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
  // `eas.json` configure le service de BUILD d'Expo, `PUBLICATION.md` natif
  // parle de comptes développeur et de captures d'écran : deux artefacts de
  // magasin d'applications. L'enveloppe web réécrit la note de publication —
  // une PWA se dépose chez un hébergeur, pas chez Apple.
  for (const f of ["app.json", "eas.json", ".easignore", ".fingerprintignore", "index.ts"]) {
    files.delete(f);
  }
  // ── LES PRIMITIVES WEB REMPLACENT LES NATIVES.
  //
  // C'est le branchement final, et le seul qui touche la bibliothèque : tout le
  // reste de `lib/` — blocs, runtime, jetons — est le même fichier des deux
  // côtés. Sans ce remplacement, l'application web embarquerait des composants
  // React Native et ne monterait pas : elle serait émise, et morte.
  for (const [cible, contenu] of Object.entries(EMBEDDED_ASSETS_WEB)) files.set(cible, contenu);
  // ── LA COUTURE NATIVE SORT APRÈS L'OVERLAY, ET L'ORDRE EST LE POINT.
  //
  // `navigation-native.tsx` remplit la couture avec React Navigation. Laissé
  // dans un projet web, il n'est pas seulement inutile : il importe un paquet
  // ABSENT du gabarit Vite, et `tsc` refuse le projet ENTIER. Mesuré par la
  // gate web : 29 applications sur 29.
  //
  // La suppression était d'abord écrite plus haut, avec les fichiers d'Expo —
  // et elle ne servait à rien : `EMBEDDED_ASSETS_WEB` contient la table
  // COMMUNE, donc le fichier revenait juste après. Une ligne juste, au mauvais
  // endroit, ne fait rien et le fait silencieusement.
  files.delete("lib/runtime/navigation-native.tsx");
  for (const [nom, contenu] of enveloppeWeb(air, pascal).files) files.set(nom, contenu);
  return { ...natif, files };
}
