// PASSE B (EP-064) — CLIQUETS DES CORRECTIONS GÉNÉRATEUR.
//
// Ces cliquets prouvent que le prompt ENSEIGNE les corrections (et que les
// listes viennent de l'ENVELOPPE, jamais recopiées — une liste écrite deux
// fois diverge, EP-059). Ce qu'ils NE prouvent PAS, et qui reste dû à la
// re-campagne : que le MODÈLE suive ces règles sur une génération fraîche.
// Aucun vert n'est affirmé sur une génération non refaite.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const SOURCE = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");

describe("PASSE B — le prompt enseigne les corrections, depuis l'enveloppe", () => {
  it("B1 · déclencheurs : la liste est INTERPOLÉE de l'enveloppe, data est enseigné mort", () => {
    expect(SOURCE).toContain("38. DÉCLENCHEURS — LES SEULS QUI EXISTENT");
    expect(SOURCE).toContain("EXECUTION_ENVELOPE_V1.triggers.join");
    expect(SOURCE).toContain("VIVACITE_DECLENCHEUR_HORS_ENVELOPPE");
  });

  it("B2 · params auth : clés INTERPOLÉES des consommées ; les clés fantômes n'existent nulle part", () => {
    expect(SOURCE).toContain("capabilityParamsConsommes.auth.join");
    // Les clés inventées par la génération EP-061 ne doivent apparaître NULLE
    // PART dans la source du générateur — ni règle, ni exemple, ni commentaire.
    expect(SOURCE).not.toContain("identifierFieldId");
    expect(SOURCE).not.toContain("passwordFieldId");
  });

  it("B3 · thenScreenId : enseigné SUR L'EFFET capability, jamais dans les params", () => {
    expect(SOURCE).toContain("SUR L'EFFET \\`capability\\`");
    expect(SOURCE).toContain("JAMAIS dans les params");
    expect(SOURCE).toContain('CONTRAT_CIBLE = "1.22.0"');
  });

  it("B4 · références : jamais affichées ni saisies", () => {
    expect(SOURCE).toContain("39. UNE RÉFÉRENCE NE S'AFFICHE JAMAIS");
    expect(SOURCE).toContain("relationTraversal");
  });

  it("B5 · commerce : classification enseignée (le modèle économique, pas les écrans)", () => {
    expect(SOURCE).toContain("40. CLASSE DE COMMERCE");
    expect(SOURCE).toContain("MÊME SI l'app ne porte aucune étape de paiement");
  });

  it("B6/EP-065 · la garde de GO : une campagne ne part JAMAIS sans jeton", () => {
    expect(SOURCE).toContain('process.env.GO_CAMPAGNE !== "OUI-JE-PAIE"');
    expect(SOURCE).toContain("process.exit(2)");
  });
});
