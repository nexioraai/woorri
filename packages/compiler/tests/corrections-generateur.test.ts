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

describe("EP-081 · ② — PARITÉ DES ADAPTATEURS : la frontière suffit", () => {
  // Le second adaptateur expose EXACTEMENT la même surface que le premier,
  // et sa construction n'a touché AUCUN fichier du moteur. Un import statique
  // est interdit des deux côtés : le SDK n'entre que par creerClient.
  it("mêmes exports, aucun SDK importé statiquement, façade client identique", async () => {
    const a = await import("../../../benchmarks/air-emission/adaptateur-anthropic.mjs");
    const b = await import("../../../benchmarks/air-emission/adaptateur-openai.mjs");
    // EP-082 — troisième adaptateur (DeepSeek) : même parité exigée.
    const c = await import("../../../benchmarks/air-emission/adaptateur-deepseek.mjs");
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
    expect(Object.keys(c).sort()).toEqual(Object.keys(a).sort());
    for (const src of ["adaptateur-anthropic.mjs", "adaptateur-openai.mjs", "adaptateur-deepseek.mjs"]) {
      const code = readFileSync(join(R, "benchmarks", "air-emission", src), "utf8");
      expect(/^import .*(anthropic|openai|deepseek)/m.test(code), src).toBe(false);
    }
    // contraintes du second : DÉCLARÉES, PAS MESURÉES — le fichier le dit.
    const code2 = readFileSync(join(R, "benchmarks", "air-emission", "adaptateur-openai.mjs"), "utf8");
    expect(code2).toContain("DÉCLARÉES, PAS MESURÉES");
    expect(code2).toContain("PRODUCTIBILITÉ");
  });
});

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
    expect(SOURCE).toContain('CONTRAT_CIBLE = "1.23.0"');
  });

  it("B4 · références : jamais affichées ni saisies", () => {
    expect(SOURCE).toContain("39. UNE RÉFÉRENCE NE S'AFFICHE JAMAIS");
    expect(SOURCE).toContain("relationTraversal");
  });

  it("B5 · commerce : classification enseignée (le modèle économique, pas les écrans)", () => {
    expect(SOURCE).toContain("40. CLASSE DE COMMERCE");
    expect(SOURCE).toContain("MÊME SI l'app ne porte aucune étape de paiement");
  });

  it("EP-070 · ③ boucle bornée : 3 tirages P0 max, variance COMPTÉE et PUBLIÉE, juges intacts", () => {
    expect(SOURCE).toContain("const P0_TENTATIVES_MAX = 3;");
    // chaque tentative journalisée avec arrêt + diagnostics + coût.
    expect(SOURCE).toContain("journal.p0Tentatives.push({");
    // le taux de passage est une MESURE publiée au BILAN, pas un détail.
    expect(SOURCE).toContain("passage P0→P2");
    // à l'épuisement : arrêt et rapport — aucune dégradation de juge : la
    // grammaire est construite UNE fois HORS boucle, les juges appelés dans
    // la boucle sont les mêmes objets à chaque tour.
    expect(SOURCE).toContain("JAMAIS de dégradation ni");
    const debut = SOURCE.indexOf("for (let tentative");
    const boucle = SOURCE.slice(debut, SOURCE.indexOf("emitSectionsAvecPartiel", debut));
    expect(boucle).not.toContain("degraderGrammaire");
    expect(boucle).toContain("jugerSortieP0");
    expect(boucle).toContain("jugerPlanEcrans");
  });

  it("EP-070 · ② prompt v7 : transitions exercées + élire-X-pour-parcourir-Y, interpolés", () => {
    const passe0 = readFileSync(join(R, "benchmarks", "air-emission", "passe0.mjs"), "utf8");
    expect(passe0).toContain("CHAQUE TRANSITION DÉCLARÉE EST EXERCÉE");
    expect(passe0).toContain('TABLE_GESTES[g].effet === "mutation"');
    expect(passe0).toContain("ÉLIRE X POUR PARCOURIR Y RELIÉ À X");
    expect(passe0).toContain("gestesParcoursDeCollection().join");
  });

  it("EP-073 · ② la réparation reçoit les MÊMES prescriptions que l'émission", () => {
    // Cause racine mesurée de l'oscillation (22-09 : 14 corrigés, 10
    // réintroduits) : la section réparée était réécrite AVEUGLE à la
    // structure prescrite. Les deux consommations doivent exister.
    const occurrences = SOURCE.match(/obligationsPrescriptives\(part\.name/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
    expect(SOURCE).toContain("repairSections(document, diagnostics, intentionText, label, usage, refusals, partiel, prescriptif)");
  });

  it("EP-073 · ② gate anti-oscillation : une réparation qui introduit du neuf est REJETÉE", () => {
    expect(SOURCE).toContain("RÉPARATION REJETÉE — OSCILLATION");
    expect(SOURCE).toContain("journal.reparationOscillante");
    // le bilan de réparation est journalisé (avant/après/introduits) — la
    // courbe de convergence existe désormais par run.
    expect(SOURCE).toContain("journal.reparationBilan");
  });

  it("EP-086 · v10 : minItems INTERPOLÉ du schéma — recalculé avant d'être exigé", async () => {
    const p0 = await import("../../../benchmarks/air-emission/passe0.mjs");
    // dérivation recalculée ICI, indépendamment du prompt (cliquet EP-068).
    const chemins: string[] = [];
    const marcher = (n: unknown, chemin: string): void => {
      if (n === null || typeof n !== "object") return;
      for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
        if (k === "minItems" && typeof v === "number" && v >= 1) chemins.push(chemin || "racine");
        if (typeof v === "object")
          marcher(v, k === "properties" || k === "$defs" ? chemin : k === "items" ? chemin + "[]" : chemin + (chemin ? "." : "") + k);
      }
    };
    marcher(p0.grammaireP0(), "");
    const attendus = [...new Set(chemins)].sort();
    expect(p0.cheminsMinItems()).toEqual(attendus);
    expect(attendus.length).toBeGreaterThanOrEqual(3);
    for (const c of attendus) expect(p0.PROMPT_P0).toContain(c);
    expect(p0.PROMPT_P0).toContain("AUCUN TABLEAU EXIGÉ NE RESTE VIDE");
  });

  it("EP-097 · v11 : l'obligation d'élection est INTERPOLÉE des tables (dérive-puis-exige)", async () => {
    const p0 = await import("../../../benchmarks/air-emission/passe0.mjs");
    const mm = await import("../../../benchmarks/air-emission/modele-metier.mjs");
    // recalcul indépendant depuis TABLE_GESTES (cliquet EP-068).
    const consommateurs = mm.GESTES.filter(
      (g) => mm.TABLE_GESTES[g]?.transport === "itemId" && g !== "choisir",
    );
    expect(p0.PROMPT_P0).toContain("TOUTE ÉLECTION DOIT ÊTRE CONSOMMÉE");
    expect(p0.PROMPT_P0).toContain(consommateurs.join("/"));
    expect(p0.PROMPT_P0).toContain(mm.gestesParcoursDeCollection().join("/"));
  });

  it("B6/EP-065 · la garde de GO : une campagne ne part JAMAIS sans jeton", () => {
    expect(SOURCE).toContain('process.env.GO_CAMPAGNE !== "OUI-JE-PAIE"');
    expect(SOURCE).toContain("process.exit(2)");
  });
});
