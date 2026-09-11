// R3 (GO humain, 2026-09-11) — DÉRIVATIONS STRUCTURELLES + PREUVE PAR
// MUTATION DU JUGE. Chaque mutation viole UN invariant, est refusée par LE
// juge attendu avec LE diagnostic attendu, et la base (sans mutation) est
// VERTE — une mutation refusée pour une autre raison n'est pas une preuve.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  capacitesDe,
  ecransDe,
  jugerPlanEcrans,
  migrerModele,
  validerModele,
  type ModeleMetier,
  type PlanEcrans,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const BASE = migrerModele(
  JSON.parse(readFileSync(join(R, "slices", "kaviva", "kaviva-modele.json"), "utf8")),
) as ModeleMetier;

const propre = () => structuredClone(BASE);
const codesModele = (m: unknown) => validerModele(m).map((x) => x.code);
const codesDerivation = (m: ModeleMetier) => ecransDe(m).diagnostics.map((x) => x.code);

describe("R3 — base verte : la fixture métier passe TOUS les juges", () => {
  it("modèle vert, dérivation verte, plan vert", () => {
    expect(validerModele(BASE)).toEqual([]);
    const plan = ecransDe(BASE);
    expect(plan.diagnostics).toEqual([]);
    expect(jugerPlanEcrans(plan)).toEqual([]);
  });
});

describe("R3 — BATTERIE DE MUTATIONS ISOLÉES (juge attendu, diagnostic attendu)", () => {
  it("M1 · concept référencé inexistant → validerModele → MODELE_REFERENCE_INCONNUE", () => {
    const m = propre();
    const p0 = m.parcours[0];
    if (p0?.etapes[0]) p0.etapes[0].concept = "cpt_fantome";
    expect(codesModele(m)).toContain("MODELE_REFERENCE_INCONNUE");
  });

  it("M2 · identifiant → attribut inexistant → validerModele → MODELE_IDENTIFIANT_INCONNU", () => {
    const m = propre();
    const soin = m.concepts.find((c) => c.id === "cpt_soin");
    if (soin) soin.identifiant = "att_fantome";
    const codes = codesModele(m);
    expect(codes).toContain("MODELE_IDENTIFIANT_INCONNU");
    expect(codes.filter((c) => c !== "MODELE_IDENTIFIANT_INCONNU")).toEqual([]);
  });

  it("M2b · attribut.producteur inconnu → validerModele → MODELE_REFERENCE_INCONNUE", () => {
    const m = propre();
    const soin = m.concepts.find((c) => c.id === "cpt_soin");
    if (soin?.attributs?.[0]) soin.attributs[0].producteur = "act_fantome";
    expect(codesModele(m)).toContain("MODELE_REFERENCE_INCONNUE");
  });

  it("M3 · transition vers un état inconnu → validerModele → MODELE_TRANSITION_INCONNUE", () => {
    const m = propre();
    const rdv = m.concepts.find((c) => c.id === "cpt_rendez_vous");
    if (rdv?.etats?.[0] && typeof rdv.etats[0] !== "string") {
      rdv.etats[0].transitions = [{ vers: "etat_fantome", geste: "confirmer" }];
    }
    expect(codesModele(m)).toContain("MODELE_TRANSITION_INCONNUE");
  });

  it("M4 · transition non représentée par un parcours → MODELE_TRANSITION_NON_REPRESENTEE", () => {
    const m = propre();
    const rdv = m.concepts.find((c) => c.id === "cpt_rendez_vous");
    if (rdv?.etats?.[0] && typeof rdv.etats[0] !== "string") {
      // retirer est un geste FERMÉ jamais utilisé par les parcours kaviva.
      rdv.etats[0].transitions = [{ vers: "passe", geste: "retirer" }];
    }
    const codes = codesModele(m);
    expect(codes).toContain("MODELE_TRANSITION_NON_REPRESENTEE");
    expect(codes).not.toContain("MODELE_TRANSITION_INCONNUE");
  });

  it("M5 · geste hors table fermée → schéma strict → MODELE_SCHEMA", () => {
    const m = propre() as { parcours: { etapes: { geste: string }[] }[] };
    const p0 = m.parcours[0];
    if (p0?.etapes[0]) p0.etapes[0].geste = "geste_libre";
    expect(codesModele(m)).toContain("MODELE_SCHEMA");
  });

  it("M6 · parcours sans acteur valide → validerModele → MODELE_REFERENCE_INCONNUE", () => {
    const m = propre();
    const p0 = m.parcours[0];
    if (p0) p0.acteur = "act_fantome";
    expect(codesModele(m)).toContain("MODELE_REFERENCE_INCONNUE");
  });

  it("M7 · précondition sur état inconnu → validerModele → MODELE_ETAT_INCONNU", () => {
    const m = propre();
    const p0 = m.parcours[0];
    if (p0?.etapes[1]) p0.etapes[1].preconditions = [{ concept: "cpt_rendez_vous", etat: "fantome" }];
    const codes = codesModele(m);
    expect(codes).toContain("MODELE_ETAT_INCONNU");
  });

  it("M8 · confirmer sans écriture en amont → ecransDe → DERIVATION_CONFIRMATION_SANS_ECRITURE", () => {
    // ISOLATION : on AJOUTE le parcours cassé sans toucher au reste — la
    // première rédaction retirait par_reserver et cassait trois invariants
    // sans rapport (couverture, concepts morts) : mutation non probante.
    const m = propre();
    m.parcours = [
      ...m.parcours,
      { id: "par_casse", besoin: "confirmer dans le vide", acteur: "act_cliente",
        etapes: [
          { concept: "cpt_soin", geste: "decouvrir" },
          { concept: "cpt_soin", geste: "confirmer" },
        ] },
    ];
    expect(validerModele(m)).toEqual([]); // le MODÈLE est bien formé…
    expect(codesDerivation(m)).toContain("DERIVATION_CONFIRMATION_SANS_ECRITURE"); // …la DÉRIVATION refuse
  });

  it("M9 · identité produite jamais consommée (le symptôme kaviva) → DERIVATION_IDENTITE_NON_CONSOMMEE", () => {
    const m = propre();
    const reserver = m.parcours.find((p) => p.id === "par_reserver");
    // choisir un créneau… puis saisir un rendez-vous SANS relation créneau :
    // la portée instance:cpt_creneau disparaît, l'identité élue est perdue.
    m.relations = m.relations.filter((r) => r.vers !== "cpt_creneau");
    expect(reserver).toBeDefined();
    expect(validerModele(m)).toEqual([]);
    expect(codesDerivation(m)).toContain("DERIVATION_IDENTITE_NON_CONSOMMEE");
  });

  it("M10 · écran sans justification / route hors plan → jugerPlanEcrans", () => {
    const plan = ecransDe(BASE);
    const orphelin: PlanEcrans = {
      ...plan,
      ecrans: [...plan.ecrans, { ecranId: "ecr_orphelin", surfaces: [], justification: [] }],
    };
    expect(jugerPlanEcrans(orphelin).map((x) => x.code)).toContain("PLAN_ECRAN_SANS_JUSTIFICATION");
    const routeFantome: PlanEcrans = {
      ...plan,
      navigation: { ...plan.navigation, destinations: [...plan.navigation.destinations, "ecr_fantome"] },
    };
    expect(jugerPlanEcrans(routeFantome).map((x) => x.code)).toContain("NAVIGATION_ROUTE_HORS_PLAN");
  });

  it("M11 · parcours sans preuve observable → MODELE_PARCOURS_SANS_PREUVE (existant)", () => {
    const m = propre();
    const p0 = m.parcours[0];
    if (p0) p0.etapes = p0.etapes.slice(0, 2);
    expect(codesModele(m)).toContain("MODELE_PARCOURS_SANS_PREUVE");
  });

  it("M12 · capacité indécidable (payer sans classe commerce) → DISCRIMINANT_ABSENT", () => {
    const m = propre();
    const reserver = m.parcours.find((p) => p.id === "par_reserver");
    reserver?.etapes.splice(5, 0, { concept: "cpt_rendez_vous", geste: "payer" });
    expect(validerModele(m)).toEqual([]);
    const { diagnostics } = capacitesDe(m);
    expect(diagnostics.map((x) => x.code)).toContain("DISCRIMINANT_ABSENT");
  });
});

describe("R3 — PROPRIÉTAIRES : P2a capacités, P2c surfaces, P2d écrans/navigation", () => {
  it("P2a — s_identifier ⇒ auth avec le concept de profil ; rien d'autre n'apparaît", () => {
    const { capacites, diagnostics } = capacitesDe(BASE);
    expect(capacites).toEqual([{ capacite: "auth", profilConceptId: "cpt_profil" }]);
    expect(diagnostics).toEqual([]);
  });

  it("P2d — le nombre d'écrans est une SORTIE ; chaque écran est justifié", () => {
    const plan = ecransDe(BASE);
    expect(plan.ecrans.length).toBeGreaterThan(3);
    for (const e of plan.ecrans) {
      expect(e.justification.length, e.ecranId).toBeGreaterThan(0);
    }
    // l'entrée agrège la découverte + le chrome de recherche (R-chrome).
    const entree = plan.ecrans.find((e) => e.ecranId === "ecr_entree");
    expect(entree).toBeDefined();
    expect(plan.chrome.length).toBeGreaterThan(0);
  });

  it("P2d — destinations = ordre des parcours ; barre ssi ≥ 2 racines", () => {
    const plan = ecransDe(BASE);
    expect(plan.navigation.destinations[0]).toBe("ecr_entree");
    expect(plan.navigation.destinations.length).toBeGreaterThanOrEqual(2);
    expect(plan.navigation.barre).toBe(true);
  });

  it("H — la chaîne acteur→…→observation est portée par les artefacts dérivés", () => {
    const plan = ecransDe(BASE);
    // arc de la réservation : choisir (créneau, itemId) → saisie (rendez-vous)
    const arc = plan.navigation.arcs.find(
      (a) => a.parcours === "par_reserver" && a.geste === "choisir",
    );
    expect(arc?.transport).toBe("itemId");
    expect(arc?.de).toBeDefined();
    expect(arc?.vers).toBeDefined();
    // et l'observation finale : l'arc saisir → confirmation existe.
    const fin = plan.navigation.arcs.find(
      (a) => a.parcours === "par_reserver" && a.geste === "saisir",
    );
    expect(fin?.vers).toBeDefined();
  });
});
