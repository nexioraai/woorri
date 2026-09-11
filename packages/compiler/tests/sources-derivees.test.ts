// EP-068 — SOURCES D'IDENTITÉ DÉRIVÉES DE LA TABLE, ET LE MOTIF TRAITÉ.
//
// Troisième divergence liste-à-la-main / table (prompt v3-v4, J3/EP-059,
// retirer-source/EP-067). La fixture est le modèle FRAIS refusé du re-tirage
// 16-09-56 : sous la dérivation, seuls les DEUX refus légitimes restent.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ecransDe,
  estSourceDIdentite,
  GESTES,
  GESTES_TERMINAUX,
  jugerPlanEcrans,
  sourcesDIdentite,
  TABLE_GESTES,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const FRAIS = JSON.parse(
  readFileSync(
    join(R, "benchmarks", "air-emission", "results", "kaviva-spa.2026-09-11T16-09-56-354Z.modele-p0.air.json"),
    "utf8",
  ),
) as ModeleMetier;

describe("la fixture fraîche refusée, re-jugée sous la dérivation", () => {
  it("le refus retirer→consulter a DISPARU ; les 2 refus légitimes (parcours elliptiques) RESTENT", () => {
    expect(validerModele(FRAIS)).toEqual([]);
    const d = ecransDe(FRAIS).diagnostics;
    expect(d.map((x) => x.code)).toEqual([
      "DERIVATION_IDENTITE_SANS_SOURCE",
      "DERIVATION_IDENTITE_SANS_SOURCE",
    ]);
    // et AUCUN des deux ne vise le consulter post-retirer de par_annuler.
    expect(d.some((x) => x.message.includes("annule"))).toBe(false);
  });
});

describe("BASE VERTE (EP-028) puis mutation isolée", () => {
  const verte = (): ModeleMetier => {
    const m = structuredClone(FRAIS);
    const reserver = m.parcours.find((p) => p.id === "par_reserver_rendez_vous");
    // le parcours porte désormais SA source de soin (structure, pas template).
    reserver?.etapes.splice(1, 0, { concept: "cpt_soin", geste: "decouvrir" });
    const annuler = m.parcours.find((p) => p.id === "par_annuler_rendez_vous");
    // l'instance à annuler est ÉLUE avant d'être touchée.
    if (annuler) {
      annuler.etapes = [
        { concept: "cpt_compte", geste: "s_identifier" },
        { concept: "cpt_rendez_vous", geste: "consulter_historique", etat: "confirme" },
        { concept: "cpt_rendez_vous", geste: "choisir", etat: "confirme" },
        { concept: "cpt_rendez_vous", geste: "retirer" },
        { concept: "cpt_rendez_vous", geste: "consulter", etat: "annule" },
      ];
    }
    return m;
  };

  it("la base est VERTE : plan sans diagnostic, juges verts — retirer PORTE l'identité vers l'aval", () => {
    const plan = ecransDe(verte());
    expect(plan.diagnostics).toEqual([]);
    expect(jugerPlanEcrans(plan, verte())).toEqual([]);
  });

  it("MUTATION — toutes les sources retirées de l'amont : DERIVATION_IDENTITE_SANS_SOURCE, seul", () => {
    const m = verte();
    const annuler = m.parcours.find((p) => p.id === "par_annuler_rendez_vous");
    if (annuler) {
      annuler.etapes = [
        { concept: "cpt_compte", geste: "s_identifier" },
        { concept: "cpt_rendez_vous", geste: "consulter", etat: "annule" },
      ];
    }
    const codes = ecransDe(m).diagnostics.map((x) => x.code);
    expect([...new Set(codes)]).toEqual(["DERIVATION_IDENTITE_SANS_SOURCE"]);
  });
});

describe("LE MOTIF — les listes se dérivent, le cliquet recalcule et refuse la prose", () => {
  it("sources ≡ prédicat de table (transport OU bloc de présentation), recalculé ici", () => {
    const attendu = GESTES.filter((g) => {
      const patron = TABLE_GESTES[g];
      if (patron === undefined) return false;
      return patron.transport !== null || patron.bloc === "list" || patron.bloc === "search_entry";
    });
    expect(sourcesDIdentite()).toEqual(attendu);
    expect(sourcesDIdentite()).toContain("retirer");
    expect(estSourceDIdentite("payer")).toBe(false);
  });

  it("le complément du prédicat est EXACTEMENT l'ensemble transparent de J1", () => {
    expect(GESTES.filter((g) => !estSourceDIdentite(g)).sort()).toEqual(
      ["confirmer", "payer", "s_identifier"],
    );
  });

  it("terminaux ≡ colonne `terminal`, recalculée", () => {
    expect(GESTES_TERMINAUX).toEqual(GESTES.filter((g) => TABLE_GESTES[g]?.terminal === true));
  });

  it("CLIQUET — aucune liste de gestes écrite à la main hors table (le motif ne revient pas)", () => {
    const source = readFileSync(
      join(R, "benchmarks", "air-emission", "modele-metier.mjs"),
      "utf8",
    );
    // la définition de la table et l'énum primaire GESTES sont LES sources :
    // on les retire du scan, tout le reste doit dériver.
    const debutTable = source.indexOf("export const TABLE_GESTES = {");
    const finTable = source.indexOf("};", debutTable);
    const debutGestes = source.indexOf("export const GESTES = [");
    const finGestes = source.indexOf("];", debutGestes);
    const corps = source.slice(0, debutGestes) + source.slice(finGestes, debutTable) + source.slice(finTable);
    const nomsGestes = GESTES.join("|");
    const listeManuelle = new RegExp(
      `\\[(?:\\s*"(?:${nomsGestes})"\\s*,?\\s*){2,}\\]`,
    );
    expect(listeManuelle.test(corps), "liste de gestes à la main trouvée — dérive-la de TABLE_GESTES").toBe(false);
    // et l'énum primaire reste le domaine exact de la table.
    expect([...GESTES].sort()).toEqual(Object.keys(TABLE_GESTES).sort());
  });
});
