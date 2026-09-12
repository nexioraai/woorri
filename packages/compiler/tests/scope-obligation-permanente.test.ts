// EP-125 (L-107-B, 2e traitement) — LE DÉFAUT ÉTAIT LE CANAL, PAS LA RÈGLE.
//
// MESURE sur l'archive 20-18 : le bloc fautif portait `scopeFieldId =
// fld_produit_categorie` — champ EXISTANT et du BON TYPE — sur `scr_entree`,
// écran SANS `detail_header`. EP-113 avait la bonne règle, mais elle vivait
// dans le message d'un diagnostic RÉACTIF : attempt1 ne portait QUE des
// erreurs de SCHÉMA, aucun AIR_CIBLE_IDENTITE_PERDUE n'a été émis, la règle
// n'a donc JAMAIS été dite. Correction : elle devient une OBLIGATION
// PERMANENTE (principe EP-122 : ce que le moteur exige, il le dit toujours).
// Preuve sur le modèle 15-27 (23 écrans ≠ 16).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ecransDe, obligationsPrescriptives, type ModeleMetier } from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const RES = join(R, "benchmarks", "air-emission", "results");
const lire = (f: string): ModeleMetier => {
  const brut = JSON.parse(readFileSync(join(RES, f), "utf8")) as { modele?: ModeleMetier };
  return (brut.modele ?? brut) as ModeleMetier;
};
// 23 écrans — une AUTRE taille que le défaut (16).
const MODELE = lire("marketplace-africain.2026-09-12T15-27-32-324Z.modele-p0-t1.air.json");
const texte = (): string => obligationsPrescriptives("ecrans", MODELE, ecransDe(MODELE));

describe("la règle du scope est dite À TOUS LES COUPS, plus seulement en réaction", () => {
  it("① elle est présente sans qu'AUCUN diagnostic ne l'ait déclenchée", () => {
    const o = texte();
    expect(o).toContain("PORTÉE D'UNE COLLECTION");
    expect(o).toContain("RÈGLE PERMANENTE");
  });

  it("② l'indissociabilité est énoncée : pas de scope sans detail_header", () => {
    const o = texte();
    expect(o).toContain("QUE sur un écran qui montre AUSSI le `detail_header`");
    expect(o).toContain("est INVALIDE");
  });

  it("③ le domaine est fourni : un champ `reference` vers l'entité du détail", () => {
    expect(texte()).toContain("champ `reference` de l'entité listée pointant l'entité de ce détail");
  });

  it("④ la conséquence est nommée : l'émission entière est refusée", () => {
    // le compilateur refuse en fail-closed (L-124-A) — le générateur doit le savoir.
    expect(texte()).toContain("l'émission entière est REFUSÉE");
  });

  it("⑤ la clause RÉACTIVE d'EP-113 demeure — les deux canaux coexistent", () => {
    const juges = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    expect(juges).toContain("INDISSOCIABLES");
    expect(juges).toContain("champs éligibles");
  });

  it("⑥ gate EP-102 et clauses EP-105/115/118 intactes", () => {
    const emitV3 = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(emitV3).toContain("elargit(perimetreAvant, perimetreApres)");
    const o = texte();
    expect(o).toContain("PORTÉES OBLIGATOIRES"); // EP-118
    expect(o).toContain("PORTE LE CHROME"); // EP-122
    expect(obligationsPrescriptives("actions", MODELE, ecransDe(MODELE))).toContain("DEPUIS l'écran"); // EP-115
  });
});
