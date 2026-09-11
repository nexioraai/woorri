// PASSE « JUGES J1–J3 + D6 etat » (GO EP-059, 2026-09-11).
// LA FIXTURE RÉELLE SCELLÉE EST L'ATTENDU : le modèle que P0 a produit en
// campagne (refusé à tort par les juges d'avant) passe désormais les juges
// de PLAN — et chaque correction est prouvée par mutation ISOLÉE sur base
// verte, diagnostic NOMMÉ exact.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  consommateursDIdentite,
  ecransDe,
  estConceptIdentite,
  jugerPlanEcrans,
  TABLE_GESTES,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
// LA fixture réelle, scellée par la campagne (EP-058).
const REEL = JSON.parse(
  readFileSync(
    join(R, "benchmarks", "air-emission", "results", "kaviva-spa.2026-09-11T14-17-24-117Z.modele-p0.air.json"),
    "utf8",
  ),
) as ModeleMetier;

describe("l'ATTENDU : la fixture réelle passe les juges de PLAN corrigés", () => {
  it("les 4 diagnostics de la campagne ont disparu — flux légitimes reconnus", () => {
    const plan = ecransDe(REEL);
    const codes = plan.diagnostics.map((x) => x.code);
    expect(codes).not.toContain("DERIVATION_IDENTITE_NON_CONSOMMEE");
    expect(codes).not.toContain("DERIVATION_IDENTITE_SANS_SOURCE");
    expect(plan.diagnostics).toEqual([]);
    expect(jugerPlanEcrans(plan, REEL)).toEqual([]);
  });
  it("J2 · le discriminant est STRUCTUREL : cpt_compte est concept d'identité PAR s_identifier", () => {
    expect(estConceptIdentite(REEL, "cpt_compte")).toBe(true);
    expect(estConceptIdentite(REEL, "cpt_soin")).toBe(false);
  });
});

describe("MUTATIONS ISOLÉES (base verte = la fixture réelle)", () => {
  const propre = () => structuredClone(REEL);

  it("J1 · une étape interposée qui touche une AUTRE identité ROMPT la chaîne", () => {
    const m = propre();
    const p0 = m.parcours.find((x) => x.id === "par_reserver_soin");
    expect(p0).toBeDefined();
    // choisir créneau → [consulter SOIN interposé : touche une autre
    // identité] → saisir rendez-vous : la chaîne du créneau doit rompre.
    p0?.etapes.splice(3, 0, { concept: "cpt_soin", geste: "consulter" });
    const codes = ecransDe(m).diagnostics.map((x) => x.code);
    expect(codes).toContain("DERIVATION_IDENTITE_NON_CONSOMMEE");
  });

  it("J1 · les TRANSPARENTES ne rompent rien : payer interposé passe aussi", () => {
    const m = propre();
    m.commerce = "physique_ou_hors_app";
    const p0 = m.parcours.find((x) => x.id === "par_reserver_soin");
    p0?.etapes.splice(3, 0, { concept: "cpt_rendez_vous", geste: "payer" });
    expect(ecransDe(m).diagnostics).toEqual([]);
  });

  it("J2 · un consulter sur concept-COLLECTION sans source RESTE refusé", () => {
    const m = propre();
    m.parcours.push({
      id: "par_sans_source", besoin: "consulter un soin sans ligne", acteur: "act_cliente",
      etapes: [
        { concept: "cpt_rendez_vous", geste: "consulter_historique" },
        { concept: "cpt_soin", geste: "consulter" },
      ],
    });
    const codes = ecransDe(m).diagnostics.map((x) => x.code);
    expect(codes).toContain("DERIVATION_IDENTITE_SANS_SOURCE");
  });

  it("J3 · les consommateurs sont DÉRIVÉS de la table — retirer en fait partie", () => {
    const derives = consommateursDIdentite();
    // dérivation, pas énumération : transport itemId, hors électeur choisir.
    const attendus = Object.entries(TABLE_GESTES)
      .filter(([g, v]) => v.transport === "itemId" && g !== "choisir")
      .map(([g]) => g);
    expect(derives.sort()).toEqual(attendus.sort());
    expect(derives).toContain("retirer");
    expect(derives).toContain("consulter");
    // et la mutation inverse : retirer la consommation (retirer → decouvrir)
    // fait revenir le refus.
    const m = propre();
    const pa = m.parcours.find((x) => x.id === "par_annuler_rendez_vous");
    const etape = pa?.etapes.find((e) => e.geste === "retirer");
    if (etape) etape.geste = "decouvrir";
    const codes = ecransDe(m).diagnostics.map((x) => x.code);
    expect(codes).toContain("DERIVATION_IDENTITE_NON_CONSOMMEE");
  });
});

describe("D6 · etat — cible OU filtre : chaque sens a SON champ", () => {
  it("l'usage réel (etat-cible sur gestes mutants) est REFUSÉ en le nommant", () => {
    // La fixture réelle porte confirmer[etat=reserve], saisir[etat=…] :
    // l'état-CIBLE vit dans les transitions du concept — pas sur l'étape.
    const codes = validerModele(REEL).map((x) => x.code);
    expect(codes).toContain("MODELE_ETAT_SUR_GESTE_MUTANT");
    expect(codes.filter((c) => c === "MODELE_ETAT_SUR_GESTE_MUTANT").length).toBeGreaterThanOrEqual(3);
  });
  it("le FILTRE consommé sur geste de LECTURE reste accepté (contrôle)", () => {
    const m = structuredClone(REEL);
    for (const p of m.parcours) {
      for (const e of p.etapes) {
        if (e.etat !== undefined && TABLE_GESTES[e.geste]?.effet === "mutation") delete e.etat;
      }
    }
    const codes = validerModele(m).map((x) => x.code);
    expect(codes).not.toContain("MODELE_ETAT_SUR_GESTE_MUTANT");
    // les filtres de lecture (consulter_historique[etat], choisir[etat]) restent.
    expect(m.parcours.some((p) => p.etapes.some((e) => e.etat !== undefined))).toBe(true);
  });
});
