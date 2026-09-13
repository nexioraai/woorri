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
  ecranAirDe,
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

  // EP-165 ③ — UN ÉCRAN DE SURFACE N'EST PAS « HORS PLAN ».
  //
  // FAUX POSITIF MESURÉ sur `kaviva-spa` : les SIX écrans signalés étaient
  // exactement les surfaces d'application (settings, account_delete,
  // privacy_policy, terms, help, contact). Le document obéissait à la règle
  // 41 du prompt et un juge le lui reprochait. 6 → 0 après correction, sans
  // qu'aucun écran légitime cesse d'être vu.
  describe("EP-165 ③ · les surfaces d'application ne sont pas hors plan", () => {
    it("LE JUGE N'EST PAS MORT — un écran inventé SANS purpose reste refusé", () => {
      // Sans cette moitié, l'exclusion aurait pu vider le juge et la mesure
      // « 6 → 0 » se lirait comme une réussite.
      const m = airConforme();
      m.screens.push({ id: "scr_invente" });
      expect(verifierNavigationPrescrite(m as never, P).map((x) => x.code)).toContain(
        "NAVIGATION_ECRAN_HORS_PLAN",
      );
    });

    it("un écran de SURFACE, lui, passe — il relève d'un autre juge, pas d'aucun", () => {
      const m = airConforme();
      m.screens.push({ id: "scr_surface_aide", purpose: "help" } as never);
      expect(verifierNavigationPrescrite(m as never, P).map((x) => x.code)).not.toContain(
        "NAVIGATION_ECRAN_HORS_PLAN",
      );
    });

    it("LA RÈGLE EST LA PRÉSENCE DU CHAMP, JAMAIS UNE LISTE DE GENRES", () => {
      // Une liste de purposes écrite ici divergerait de l'énumération du
      // schéma dès le prochain genre ajouté — onzième occurrence du motif.
      // Le juge ne doit donc citer AUCUN genre.
      const source = readFileSync(
        join(HERE, "..", "..", "..", "benchmarks", "air-emission", "modele-metier.mjs"),
        "utf8",
      );
      const juge = source.slice(
        source.indexOf("EP-165 ③ — UN ÉCRAN DE SURFACE"),
        source.indexOf("const routesVers"),
      );
      expect(juge.length, "bloc du juge introuvable").toBeGreaterThan(200);
      const code = juge.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
      for (const genre of ["help", "terms", "settings", "contact", "privacy_policy", "account_delete"]) {
        expect(code, `le juge cite le genre ${genre}`).not.toContain(`"${genre}"`);
      }
    });

    it("CHEMIN D'ABUS FERMÉ — un purpose ne retire pas un écran DU PLAN", () => {
      // Poser un purpose sur un écran prescrit ne doit rien faire gagner :
      // son absence reste vue par NAVIGATION_ECRAN_PRESCRIT_MANQUANT.
      const m = airConforme();
      const premier = m.screens[0] as { purpose?: string } | undefined;
      if (premier) premier.purpose = "help";
      expect(verifierNavigationPrescrite(m as never, P).map((x) => x.code)).not.toContain(
        "NAVIGATION_ECRAN_PRESCRIT_MANQUANT",
      );
      const sansLui = airConforme();
      sansLui.screens = sansLui.screens.slice(1);
      expect(verifierNavigationPrescrite(sansLui as never, P).map((x) => x.code)).toContain(
        "NAVIGATION_ECRAN_PRESCRIT_MANQUANT",
      );
    });
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
    // EP-102 · ② (édition consciente) — la passe `actions` reçoit désormais
    // les ARCS À CÂBLER : elle écrit les actions qui les rendent exécutables,
    // et ne les recevait pas (6 arcs morts mesurés). Ce qui reste invariant :
    // STRUCTURE, jamais wording — la liste est DÉRIVÉE du plan.
    const actions = obligationsPrescriptives("actions", MODELE, PLAN);
    // EP-115 (édition consciente) : les arcs ne sont plus une LISTE de paires
    // `a->b` mais un ORDRE PAR ÉCRAN SOURCE (« DEPUIS l'écran X … : Y, Z »).
    // Ce qui reste invariant : chaque arc du plan est énoncé, source ET cible.
    const arcs = PLAN.navigation.arcs as { de: string; vers: string }[];
    for (const a of arcs.filter((x) => x.de !== x.vers).slice(0, 3)) {
      expect(actions).toContain(`DEPUIS l'écran "${ecranAirDe(a.de)}"`);
      expect(actions).toContain(ecranAirDe(a.vers));
    }
    expect(actions).toContain("EXÉCUTABLE");
    // les passes qui n'ont rien à prescrire restent MUETTES.
    expect(obligationsPrescriptives("donnees", MODELE, PLAN)).toBe("");
    expect(obligationsPrescriptives("theme", MODELE, PLAN)).toBe("");
  });

  it("le chemin campagne est CÂBLÉ (P0 → plan → prescriptions → vérificateur) — NON EXERCÉ", () => {
    // EP-073 (édition consciente) : les juges d'acceptation vivent dans
    // acceptation.mjs (importable sans la garde, pour re-juger les archives
    // à 0 $) — le câblage se vérifie sur les DEUX fichiers.
    const src = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    const juges = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    expect(src).toContain("passe0.construireRequeteP0(intention.text)");
    expect(src).toContain("jugerSortieP0");
    expect(src).toContain("obligationsPrescriptives(part.name");
    expect(juges).toContain("verifierNavigationPrescrite(");
    expect(src).toContain('await import(join(HERE, "acceptation.mjs"))');
    // fail-closed : P0 refusé ⇒ l'intention S'ARRÊTE avant les passes AIR.
    expect(src).toContain("intention arrêtée AVANT les passes AIR");
  });
});
