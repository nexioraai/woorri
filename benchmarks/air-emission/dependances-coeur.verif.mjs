// ============================================================
// PREUVE — LE CŒUR N'A AUCUNE DÉPENDANCE NON DÉCLARÉE.
//
// ── POURQUOI CE CONTRÔLE EXISTE.
//
// L'extraction a déplacé 619 lignes qui lisaient SEIZE choses construites par
// le script. Je les ai cherchées À L'ŒIL, et j'ai payé un lancement par
// oubli : `etatDepense`, puis `CONTRAT_CIBLE`, puis quatre autres. Chaque
// lancement s'arrêtait AVANT le moindre appel — le garde budgétaire a tenu —
// mais c'était trois allers-retours pour un travail qu'une machine fait d'un
// coup.
//
// Ce contrôle analyse le module avec un vrai parseur, lie les portées, et
// nomme tout identifiant qui n'est ni déclaré dedans, ni reçu en paramètre,
// ni un global du langage. Il coûte zéro et il ne se fatigue pas.
// ============================================================
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { identifiantsNonResolus } from "./analyse-dependances.mjs";

// LE JUGE EST PARTAGE avec `dependances-orchestration.verif.mjs` depuis le
// 2026-10-08. Il vivait ici en exemplaire unique ; il en fallait un second
// pour l orchestration, et le recopier aurait donne deux juges susceptibles
// de diverger — on croit alors le plus indulgent. L algorithme est inchange.
const HERE = dirname(fileURLToPath(import.meta.url));
const { manquants, lies } = identifiantsNonResolus(join(HERE, "emission-coeur.mjs"));
if (manquants.length > 0) {
  console.error(
    `⛔ REFUS — ${manquants.length} identifiant(s) non résolu(s) dans le cœur : ${manquants.join(", ")}\n` +
      "Chacun fera échouer la construction de la fabrique AU LANCEMENT, donc avant\n" +
      "tout appel payant — mais après avoir coûté un aller-retour. Ajoutez-les aux\n" +
      "paramètres de `creerCoeurEmission`, ou rapatriez l'état s'il est interne.",
  );
  process.exit(1);
}
console.log(`dependances-coeur : aucune dependance non declaree (${String(lies)} noms lies).`);
