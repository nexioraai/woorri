// ════════════════════════════════════════════════════════════════════
//  QUELS FICHIERS ÉMIS SONT BINAIRES — UNE SEULE DÉCISION.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT QUE CE MODULE FERME AVANT QU'IL NE SE PRODUISE.
//
// La carte de fichiers d'une application émise porte le texte tel quel et les
// binaires en base64. Jusqu'au 2026-10-17, `.png` était la SEULE extension
// binaire — et QUATRE écrivains la décidaient séparément :
//
//   · `slices/lib/ecrire-app.mjs` (« l'écrivain d'app unique », EP-012) ;
//   · `slices/validation-appareil/emettre.mjs` ;
//   · `docs/elite-protocol/evidence/observation/app-fraiche.ts` ;
//   · `scripts/verifier-une-app.mjs`.
//
// L'en-tête de l'écrivain unique le dit lui-même : « piège base64 fermé DEUX
// FOIS déjà ». Ce dépôt a par ailleurs vu CINQ fois « une liste écrite deux
// fois diverge » — dont la dernière le matin même, où `ListBlock` rendait ses
// lignes à deux endroits et je n'en avais câblé qu'un.
//
// En embarquant les polices, j'ajoutais une SECONDE extension binaire. Écrire
// `|| chemin.endsWith(".ttf")` dans quatre fichiers, c'était programmer le
// sixième épisode : un écrivain oublié écrit la police en UTF-8, le fichier est
// corrompu, et rien ne lève — la police retombe en silence sur la police
// système, exactement le défaut que l'embarquement existe pour fermer.
//
// La décision vit donc ICI, une fois.
//
// ── POURQUOI UNE ALLOWLIST ET PAS UNE HEURISTIQUE.
//
// Deviner « ce fichier a l'air binaire » rouvrirait la porte dans l'autre
// sens : un `.json` mal détecté serait écrit en base64 et deviendrait
// illisible. La liste est FERMÉE et courte — le patron du registre de blocs,
// appliqué à six lettres.

/** Extensions dont le contenu voyage en base64 dans la carte de fichiers. */
export const EXTENSIONS_BINAIRES: readonly string[] = [".png", ".ttf", ".woff2"];

/**
 * Le contenu de ce chemin doit-il être décodé depuis base64 avant écriture ?
 *
 * Tout écrivain d'application émise DOIT passer par ici. Un écrivain qui
 * décide tout seul est un écrivain qui divergera.
 */
export const estBinaire = (chemin: string): boolean =>
  EXTENSIONS_BINAIRES.some((ext) => chemin.endsWith(ext));
