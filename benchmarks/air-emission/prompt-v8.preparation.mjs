// EP-078 — PROMPT v8 : PRÉPARÉ, PAS APPLIQUÉ.
//
// ORDRE STRICT DU GO : V2 (hold-out) tire sur v7 SCELLÉ — un prompt corrigé
// entre V1 et V2 détruirait la mesure anti-surapprentissage (on ne saurait
// plus si le hold-out passe grâce à v8 ou malgré lui). Ce module N'EST PAS
// importé par passe0.mjs : les scellés v7 (passe0-integration, dry-run)
// restent la preuve que rien n'est entré. L'application de v8 (insertion de
// ces lignes + re-scellement des deux gardes) se fait APRÈS le tirage V2,
// sur consignation.
//
// Les lignes sont INTERPOLÉES depuis la source (leçon v3/v4 : la prose ne
// transmet pas) — évaluées ici pour être MESURABLES avant application.
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = join(fileURLToPath(import.meta.url), "..");
const mm = await import(join(HERE, "modele-metier.mjs"));

// ① L-V1-1 (MODELE_REFERENCE_INCONNUE ×9 en V1) — le contrat l'exige (P1
// refuse toute relation vers un concept absent), le prompt est muet : EP-043.
// Vérification d'effet de bord RENDUE : « v7 l'a créé » = 🟠 NON DÉTERMINÉ,
// affaibli (kaviva sous v7 : 0/5, relations correctement déclarées ; axe
// domaine totalement confondu — aucune archive multi-domaine pré-v7).
export const LIGNE_V8_RELATIONS =
  "· CHAQUE BOUT D'UNE RELATION EST UN CONCEPT DÉCLARÉ : relations[].de et " +
  "relations[].vers ne portent QUE des ids présents dans concepts[] — une " +
  "relation vers un concept absent est REFUSÉE (déclare le concept, ou " +
  "retire la relation).";

// ② L-V1-2 (livraison : capacités {auth+psp}/{∅}/{psp} sur le même besoin) —
// VÉRIFICATION RENDUE : le contrat sait DÉJÀ dire — payer = geste de
// paiement DANS l'application ; hors-app ⇒ pas de payer, pas de commerce au
// modèle (le tirage p2 était CONFORME) ; la classe économique vit à la
// conformité AIR (règle 40). PAS de 3e valeur de commerce (frontière EP-044
// respectée). Le manque était la FRONTIÈRE, jamais dite à P0. Les gestes
// mutants cités viennent de la table (source unique).
export const LIGNE_V8_PAYER =
  "· payer = un paiement QUI A LIEU DANS L'APPLICATION — c'est le seul des " +
  "gestes d'écriture (" +
  mm.GESTES.filter((g) => mm.TABLE_GESTES[g].effet === "mutation").join("/") +
  ") qui déclenche une capacité de paiement. Un paiement à la réception, " +
  "sur place ou hors application N'EST PAS un geste payer : le parcours " +
  "s'écrit SANS payer et le modèle ne porte PAS de champ commerce.";
