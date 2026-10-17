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
import { emitThemeModule, hasThemeOverrides } from "./emit-theme.ts";
import { EMBEDDED_ASSETS_WEB } from "./embedded-assets.generated.ts";
import type { ProjectAir } from "@deribfy/air-schema";
import { policesRequises } from "./emit-theme.ts";

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
  // ── LES FACES TRUETYPE DU NATIF SORTENT : LE WEB A LES SIENNES EN WOFF2.
  //
  // DÉFAUT MESURÉ EN POSANT CE LOT : `compileWeb` part de l'émission NATIVE
  // puis superpose. Les TrueType arrivaient donc par là, et l'overlay ajoutait
  // les WOFF2 PAR-DESSUS sans retirer les premiers — chaque application web
  // portait 182 Ko de faces dont 125 jamais lues.
  //
  // Rien ne l'aurait dit sans le plafond de poids d'`ep218`, le cliquet que ce
  // lot a dû amender et qui a servi dans l'heure.
  //
  // On retire par EXTENSION, pas par nom : une quatrième face ajoutée demain
  // sortira aussi, sans que personne n'ait à y penser.
  for (const f of [...files.keys()]) {
    if (f.startsWith("public/polices/") && f.endsWith(".ttf")) files.delete(f);
  }
  // ── LES PRIMITIVES WEB REMPLACENT LES NATIVES.
  //
  // C'est le branchement final, et le seul qui touche la bibliothèque : tout le
  // reste de `lib/` — blocs, runtime, jetons — est le même fichier des deux
  // côtés. Sans ce remplacement, l'application web embarquerait des composants
  // React Native et ne monterait pas : elle serait émise, et morte.
  // ── LES FACES NE VOYAGENT QUE SI LE THÈME LES EMPLOIE.
  //
  // Mesuré sur une application construite : elle expédie 91 Ko gzip. Les trois
  // WOFF2 en ajoutent 56 — les onze documents en police système ne doivent pas
  // les payer, et le cliquet `ep218` l'exige, cahier client à l'appui.
  const avecPolices = policesRequises(air);
  for (const [cible, contenu] of Object.entries(EMBEDDED_ASSETS_WEB)) {
    if (!avecPolices && cible.startsWith("public/polices/")) continue;
    files.set(cible, contenu);
  }
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
  // ── L'IDENTITÉ DE L'APPLICATION SE REPOSE APRÈS L'OVERLAY.
  //
  // ── LE DÉFAUT, MESURÉ LE 2026-10-16 SUR L'ÉCRAN D'UN CLIENT.
  //
  // Le document `tontine` déclare `design.theme: "tontine_sobre"`, dont le
  // moteur dérive un accent BLEU (`#1E4DFA`). L'application native l'affichait
  // bien. La PWA du même document, construite la même minute, affichait
  // `#FA5D1E` — L'ORANGE DE DERIBFY. Deux identités pour un seul document, et
  // la cible web portait la marque du GÉNÉRATEUR dans l'application d'un
  // client.
  //
  // ── LA CAUSE N'ÉTAIT PAS UN OUBLI, C'ÉTAIT UN ORDRE.
  //
  // `emitProject` calcule et pose déjà le thème propre à l'app
  // (`emit-project.ts`, « THÈME PAR APP »). Mais `EMBEDDED_ASSETS_WEB`
  // contient la table COMMUNE — ce fichier le dit lui-même vingt lignes plus
  // haut — et l'overlay REPOSE donc par-dessus la copie par défaut des
  // jetons. Le calcul avait lieu, et son résultat était écrasé.
  //
  // C'est EXACTEMENT le piège déjà payé pour `navigation-native.tsx` : « une
  // ligne juste, au mauvais endroit, ne fait rien et le fait silencieusement ».
  // Il a mordu deux fois sur le même mécanisme, pour deux fichiers différents.
  //
  // ── POURQUOI ICI, ET PAS EN RETIRANT LE FICHIER DE LA TABLE COMMUNE.
  //
  // Les jetons DOIVENT rester dans la table commune : une application sans
  // identité propre s'en sert, et l'en retirer la laisserait sans thème du
  // tout. Ce qui doit changer n'est pas la table, c'est le MOMENT — ce qui
  // appartient à l'application passe après ce qui appartient à la plateforme.
  //
  // Aucune logique n'est dupliquée : on rappelle la fonction que l'émetteur
  // natif emploie. La validation des surcharges, elle, a déjà eu lieu dans
  // `emitProject`, qui lève avant d'arriver ici.
  if (hasThemeOverrides(air)) {
    files.set("lib/tokens/theme.generated.ts", emitThemeModule(air));
  }
  for (const [nom, contenu] of enveloppeWeb(air, pascal).files) files.set(nom, contenu);
  return { ...natif, files };
}
