// ============================================================
// TOUTE DEPENDANCE LIBRE DE L'ORCHESTRATION EST RECUE PAR LA FABRIQUE.
//
// Mesure du 2026-10-08 : la fabrique en recevait ONZE au lieu de douze.
// `repairScope` ne sert que dans `repairSections` — le defaut n'est donc
// apparu qu'apres la premiere validation refusee, soit 1 669 secondes et
// neuf passes PAYEES, sur un « repairScope is not defined ».
//
// L'analyse l'avait pourtant liste. C'est mon TRI A LA MAIN qui l'a perdu.
// Ce controle ne trie pas, et il partage son juge avec celui du coeur :
// deux juges qui divergent, ce sont deux verdicts, et on croit le plus
// indulgent.
// ============================================================
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { identifiantsNonResolus } from "./analyse-dependances.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { manquants, lies } = identifiantsNonResolus(join(HERE, "orchestration.mjs"));

if (manquants.length > 0) {
  console.error(
    `⛔ REFUS — ${String(manquants.length)} identifiant(s) non resolu(s) dans l'orchestration : ${manquants.join(", ")}\n` +
      "Chacun vaudra `undefined` A L'EXECUTION, et seulement sur le chemin qui\n" +
      "l'utilise — donc peut-etre tres tard, apres des appels deja payes.\n" +
      "Ajoutez-les aux parametres de `creerOrchestration`.",
  );
  process.exit(1);
}
console.log(`dependances-orchestration : aucune dependance non declaree (${String(lies)} noms lies).`);
