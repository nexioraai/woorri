// COMPILER LE SERVEUR — ou ne pas le compiler, et c'est le document qui dit.
//
// ── LA FLEXIBILITÉ EXIGÉE, ET OÙ ELLE VIT.
//
// « Si l'utilisateur exige son propre serveur, on le fait selon sa demande ;
// s'il n'exige rien, on donne celui de Deribfy. »
//
// Cette phrase ne se code pas dans un `if` du compilateur : elle se DÉCLARE au
// document (`backend.kind`), et le compilateur l'applique. La différence
// compte — un choix inscrit dans le document se relit, se valide et se migre ;
// un choix enfoui dans le moteur ne se discute plus.
//
//   · `externe` — aucun fichier émis. Le client tient son serveur ; Deribfy
//                 lui a déjà remis le CONTRAT que l'application appelle ;
//   · `genere`  — le serveur est écrit, dans la pile qu'il a demandée.
//   · absent    — aucun fichier émis, comportement d'avant 1.34.0.
import type { ProjectAir } from "@deribfy/air-schema";
import { enveloppeSpring, type EnveloppeBackend } from "./emit-spring.ts";

/** Ce que Deribfy écrit comme serveur pour ce document. Vide si rien à écrire. */
export function compileBackend(air: ProjectAir): EnveloppeBackend {
  const b = air.backend;
  if (b === undefined || b.kind === "externe") return { files: new Map() };
  // Le schéma garantit `stack` sur un backend généré, et son énumération est
  // FERMÉE : un `else` ici serait du code qu'aucune entrée ne peut atteindre.
  return enveloppeSpring(air);
}
