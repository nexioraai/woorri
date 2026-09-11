// EP-070 · ① — CONSOMMATION-PAR-PORTÉE : « élire X pour parcourir Y relié
// à X ». Trou d'expressivité démontré PAR LA VARIANCE (T2/T3, EP-069) ;
// la relation DÉCLARÉE est la condition — sans elle, refus maintenu.
// Vérifié avant d'écrire : porteeDe disait DÉJÀ instance:X (C6) pour ces
// surfaces — extension de l'existant, AUCUN champ nouveau au contrat.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  conceptsRelies,
  consommateursDIdentite,
  ecransDe,
  GESTES,
  gestesParcoursDeCollection,
  jugerPlanEcrans,
  TABLE_GESTES,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const lire = (run: string): ModeleMetier =>
  JSON.parse(
    readFileSync(
      join(R, "benchmarks", "air-emission", "results", `kaviva-spa.2026-09-11T${run}.modele-p0.air.json`),
      "utf8",
    ),
  ) as ModeleMetier;
const T2 = lire("16-29-34-139Z");
const T3 = lire("16-30-59-387Z");

describe("les fixtures de la variance, re-jugées sous la consommation-par-portée", () => {
  it("T3 (soin élu → créneaux DU soin, relation déclarée) : VERT — P1, plan, juges", () => {
    expect(validerModele(T3)).toEqual([]);
    const plan = ecransDe(T3);
    expect(plan.diagnostics).toEqual([]);
    expect(jugerPlanEcrans(plan, T3)).toEqual([]);
  });

  it("T2 : le refus categorie→chercher(soin) a DISPARU ; l'elliptique légitime RESTE, seul", () => {
    const d = ecransDe(T2).diagnostics;
    expect(d.map((x) => x.code)).toEqual(["DERIVATION_IDENTITE_SANS_SOURCE"]);
    expect(d[0]?.message).toContain("cpt_creneau");
  });
});

describe("MUTATION ISOLÉE (EP-028) — base verte T3", () => {
  it("la relation creneau↔soin RETIRÉE : l'élection redevient non consommée, diagnostic nommé, seul", () => {
    const m = structuredClone(T3);
    m.relations = m.relations.filter((r) => !(r.de === "cpt_creneau" && r.vers === "cpt_soin"));
    const codes = ecransDe(m).diagnostics.map((x) => x.code);
    expect([...new Set(codes)]).toEqual(["DERIVATION_IDENTITE_NON_CONSOMMEE"]);
  });

  it("un parcours de collection sur concept NON RELIÉ ne consomme JAMAIS une élection", () => {
    const m = structuredClone(T3);
    // compte n'est relié à soin par AUCUNE relation : élire un soin puis
    // parcourir les comptes doit rompre.
    const p = m.parcours.find((x) => x.id === "par_reserver_soin");
    p?.etapes.splice(4, 0, { concept: "cpt_compte", geste: "decouvrir" });
    const codes = ecransDe(m).diagnostics.map((x) => x.code);
    expect(codes).toContain("DERIVATION_IDENTITE_NON_CONSOMMEE");
  });
});

describe("dérivations — recalculées de la table, jamais énumérées (cliquet EP-068)", () => {
  it("parcours-de-collection ≡ bloc présentateur ∧ non-consommateur, recalculé", () => {
    const consommateurs = consommateursDIdentite();
    const attendu = GESTES.filter((g) => {
      const patron = TABLE_GESTES[g];
      if (patron === undefined) return false;
      return (
        (patron.bloc === "list" || patron.bloc === "search_entry") &&
        !consommateurs.includes(g)
      );
    });
    expect(gestesParcoursDeCollection()).toEqual(attendu);
    expect(gestesParcoursDeCollection()).not.toContain("consulter");
    expect(gestesParcoursDeCollection()).not.toContain("retirer");
  });

  it("le lien déclaré vaut dans LES DEUX SENS (T2 « possède », T3 « référence »)", () => {
    expect(conceptsRelies(T3, "cpt_soin", "cpt_creneau")).toBe(true);
    expect(conceptsRelies(T2, "cpt_categorie", "cpt_soin")).toBe(true);
    expect(conceptsRelies(T3, "cpt_soin", "cpt_compte")).toBe(false);
  });
});
