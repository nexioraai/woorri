// ÉCRIVAIN D'APP UNIQUE (étape ②, EP-012 — 2026-09-11).
//
// DÉFAUT MESURÉ : chaque script de tranche dupliquait sa boucle d'écriture,
// et AUCUNE n'élaguait — trois écrans d'une émission précédente restaient
// sur le disque de Marketa et cassaient le tsc de l'app avec des .data
// périmés. L'écriture d'une app émise devient UNE responsabilité, ici :
//   - octets réels pour les .png (piège base64 fermé deux fois déjà) ;
//   - ÉLAGAGE des répertoires possédés par le moteur (screens/, lib/,
//     manifests/) : tout fichier absent du jeu émis est un cadavre, retiré ;
//   - manifeste `manifests/fichiers-emis.json` : la liste EXACTE émise,
//     consultable par les gates.
// Les fichiers du PIPELINE (eas.json, package.json, verrous, node_modules)
// ne sont jamais touchés : ils n'appartiennent pas à l'émission.
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
// ── UNE SEULE DÉCISION POUR LES FICHIERS BINAIRES (2026-10-17).
//
// `.png` n'est plus seul : les polices embarquées voyagent aussi en base64.
// Quatre écrivains décidaient séparément, et l'en-tête de celui-ci dit
// « piège base64 fermé DEUX FOIS déjà ». La décision vit dans
// `packages/compiler/src/fichiers-binaires.ts`, une fois.
const { estBinaire } = await import(
  new URL("../../packages/compiler/src/fichiers-binaires.ts", import.meta.url).href,
);

// ── `public` AJOUTÉ LE 2026-10-17, ET IL MANQUAIT VRAIMENT.
//
// DÉFAUT MESURÉ : la tranche `tontine` porte un thème en police SYSTÈME, donc
// l'émission ne produit AUCUNE face — `policesRequises` rend `false`, vérifié.
// Et pourtant les TROIS faces d'une émission PRÉCÉDENTE restaient sur le
// disque, dans `public/polices/`.
//
// C'est exactement le défaut qui a fait naître ce fichier : « trois écrans
// d'une émission précédente restaient sur le disque de Marketa ». Le moteur
// possède désormais `public/` — manifeste PWA, service worker, icônes, faces
// de police, sur les DEUX cibles — et tout fichier absent du jeu émis y est un
// cadavre.
//
// LA CONSÉQUENCE SI ON NE L'ÉLAGUE PAS : l'artefact qu'on peut OUVRIR porte
// 128 Ko de police que le thème n'emploie pas, pendant que le moteur a raison.
// La « vérité d'écran contre vérité de moteur », une fois de plus.
const DOSSIERS_MOTEUR = ["screens", "lib", "manifests", "public"];

function fichiersSous(racine) {
  const resultat = [];
  const marcher = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) marcher(p);
      else resultat.push(p);
    }
  };
  try {
    marcher(racine);
  } catch {
    return [];
  }
  return resultat;
}

/**
 * Écrit le jeu de fichiers émis dans `out` et élague les cadavres.
 * @param {string} out — répertoire de l'app (barre finale acceptée)
 * @param {ReadonlyMap<string, string>} files — sortie d'emitProject
 * @returns {{ ecrits: number, elagues: string[] }}
 */
export function ecrireApp(out, files) {
  const racine = out.endsWith(sep) || out.endsWith("/") ? out.slice(0, -1) : out;
  const attendus = new Set([...files.keys()].map((f) => f.split("/").join(sep)));
  const elagues = [];
  for (const dossier of DOSSIERS_MOTEUR) {
    for (const p of fichiersSous(join(racine, dossier))) {
      const rel = relative(racine, p);
      if (!attendus.has(rel)) {
        rmSync(p);
        elagues.push(rel.split(sep).join("/"));
      }
    }
  }
  for (const [f, contenu] of files) {
    const p = join(racine, ...f.split("/"));
    mkdirSync(join(racine, ...f.split("/").slice(0, -1)), { recursive: true });
    writeFileSync(p, estBinaire(f) ? Buffer.from(contenu, "base64") : contenu);
  }
  // Le manifeste s'écrit APRÈS l'élagage : il décrit l'état RÉEL du disque.
  const liste = [...files.keys()].sort();
  mkdirSync(join(racine, "manifests"), { recursive: true });
  writeFileSync(
    join(racine, "manifests", "fichiers-emis.json"),
    JSON.stringify({ fichiers: liste }, null, 2) + "\n",
  );
  return { ecrits: files.size, elagues: elagues.sort() };
}
