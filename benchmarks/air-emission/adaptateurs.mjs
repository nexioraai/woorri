// EP-091 — REGISTRE DES ADAPTATEURS (module de CONFIGURATION).
//
// Le cliquet anti-fournisseur (EP-049 : « aucun nom hors adaptateur+config »)
// a mordu sur le sélecteur EP-089 posé dans emit-v3 — à raison. Les noms de
// fournisseurs vivent ICI, dans la configuration : le pipeline actif charge
// par CE registre et n'écrit plus jamais un nom de fournisseur.
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = join(fileURLToPath(import.meta.url), "..");
const REGISTRE = ["anthropic", "openai", "deepseek"];
const DEFAUT = REGISTRE[0];

/** Charge l'adaptateur demandé (défaut : le premier du registre — les
 * campagnes se décident GO par GO, l'appelant choisit explicitement). */
export async function chargerAdaptateur(nom) {
  const choisi = nom ?? DEFAUT;
  if (!REGISTRE.includes(choisi)) {
    throw new Error(`ADAPTATEUR_INCONNU: « ${choisi} » — registre [${REGISTRE.join(", ")}]`);
  }
  return import(join(HERE, `adaptateur-${choisi}.mjs`));
}
