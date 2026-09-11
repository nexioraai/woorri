// R5 (GO EP-055, 2026-09-11) — LE GÉNÉRATEUR PERD LE STYLO STRUCTUREL.
// Navigation MÉCANISÉE depuis P2d (F8/O.3) : prescriptions dérivées,
// vérificateur FAIL-CLOSED (mutations isolées), obligations prescriptives
// par passe. Base verte d'abord (EP-028).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ecransDe,
  migrerModele,
  obligationsPrescriptives,
  prescriptionsNavigation,
  verifierNavigationPrescrite,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const MODELE = migrerModele(
  JSON.parse(readFileSync(join(R, "slices", "kaviva", "kaviva-modele.json"), "utf8")),
) as ModeleMetier;
const PLAN = ecransDe(MODELE);
const P = prescriptionsNavigation(PLAN);

// Un document AIR MINIMAL conforme aux prescriptions (structure seule).
const airConforme = () => ({
  navigation: {
    entryScreenId: P.entree,
    routes: P.ecrans.map((scr) => ({ id: "nav_" + scr.slice(4), screenId: scr })),
    primary: P.barre
      ? { destinations: P.destinations.map((scr, i) => ({ routeId: "nav_" + scr.slice(4), label: "L", order: i })) }
      : undefined,
  },
  screens: P.ecrans.map((scr) => ({ id: scr })),
});

describe("R5 — prescriptions de navigation dérivées de P2d", () => {
  it("bijection mécanique ecr_→scr_ ; entrée = première destination ; barre du plan", () => {
    expect(P.entree.startsWith("scr_")).toBe(true);
    expect(P.ecrans.length).toBe(PLAN.ecrans.length);
    expect(P.destinations[0]).toBe(P.entree);
    expect(P.barre).toBe(PLAN.navigation.barre);
  });

  it("BASE VERTE — un document conforme passe le vérificateur sans diagnostic", () => {
    expect(verifierNavigationPrescrite(airConforme() as never, P)).toEqual([]);
  });

  it("MUTATIONS ISOLÉES — chaque divergence structurelle est refusée en la nommant", () => {
    const m1 = airConforme(); m1.navigation.entryScreenId = "scr_autre";
    expect(verifierNavigationPrescrite(m1 as never, P).map((x) => x.code)).toContain("NAVIGATION_ENTREE_HORS_PLAN");
    const m2 = airConforme(); m2.screens.push({ id: "scr_libre" });
    expect(verifierNavigationPrescrite(m2 as never, P).map((x) => x.code)).toContain("NAVIGATION_ECRAN_HORS_PLAN");
    const m3 = airConforme(); m3.screens = m3.screens.slice(1);
    expect(verifierNavigationPrescrite(m3 as never, P).map((x) => x.code)).toContain("NAVIGATION_ECRAN_PRESCRIT_MANQUANT");
    const m4 = airConforme(); m4.navigation.routes = m4.navigation.routes.slice(1);
    expect(verifierNavigationPrescrite(m4 as never, P).map((x) => x.code)).toContain("NAVIGATION_ROUTE_PRESCRITE_MANQUANTE");
    const m5 = airConforme();
    // la vraie mutation : échanger les VALEURS d'order (inverser le tableau
    // ne changerait rien — le vérificateur trie par order, mesuré).
    if (m5.navigation.primary) {
      const d0 = m5.navigation.primary.destinations[0];
      const d1 = m5.navigation.primary.destinations[1];
      if (d0 && d1) { d0.order = 1; d1.order = 0; }
    }
    expect(verifierNavigationPrescrite(m5 as never, P).map((x) => x.code)).toContain("NAVIGATION_DESTINATIONS_HORS_PLAN");
  });

  it("OBLIGATIONS PRESCRIPTIVES — base/entites/ecrans reçoivent la structure, pas le wording", () => {
    const base = obligationsPrescriptives("base", MODELE, PLAN);
    expect(base).toContain(`entryScreenId = ${P.entree}`);
    expect(base).toContain("seuls les libellés t'appartiennent");
    const entites = obligationsPrescriptives("entites", MODELE, PLAN);
    for (const c of MODELE.concepts.filter((x) => x.donnees)) {
      expect(entites).toContain(c.id);
    }
    const ecrans = obligationsPrescriptives("ecrans", MODELE, PLAN);
    for (const scr of P.ecrans) expect(ecrans).toContain(scr);
    expect(obligationsPrescriptives("actions", MODELE, PLAN)).toBe("");
  });

  it("le chemin campagne est CÂBLÉ (P0 → plan → prescriptions → vérificateur) — NON EXERCÉ", () => {
    const src = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(src).toContain("passe0.construireRequeteP0(intention.text)");
    expect(src).toContain("jugerSortieP0");
    expect(src).toContain("obligationsPrescriptives(part.name");
    expect(src).toContain("verifierNavigationPrescrite(");
    // fail-closed : P0 refusé ⇒ l'intention S'ARRÊTE avant les passes AIR.
    expect(src).toContain("intention arrêtée AVANT les passes AIR");
  });
});
