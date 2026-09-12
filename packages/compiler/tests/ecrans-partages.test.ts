// EP-093 — L'ÉCRAN PARTAGÉ DE PORTÉE PUBLIQUE (V2 raffiné).
//
// Fixture = t3 de la marketplace Tchad/Sahel (le modèle EXCELLENT refusé à
// tort). Le piège évité : V2 ne devient pas « deux acteurs autorisés » —
// la mort d'origine (étape posée sur un écran qu'un acteur n'atteint
// jamais) RESTE refusée, et l'identité ne se partage JAMAIS.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ecransDe,
  jugerPlanEcrans,
  validerModele,
  type ModeleMetier,
  type PlanEcrans,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const T3 = JSON.parse(
  readFileSync(
    join(R, "benchmarks", "air-emission", "results", "marketplace-africain.2026-09-12T08-39-49-061Z.modele-p0-t3.air.json"),
    "utf8",
  ),
) as ModeleMetier;

describe("base verte — la marketplace t3, refusée à tort, passe le juge raffiné", () => {
  it("P1 vert, plan sans diagnostic, juges verts : le partage PUBLIC est licite", () => {
    expect(validerModele(T3)).toEqual([]);
    const plan = ecransDe(T3);
    expect(plan.diagnostics).toEqual([]);
    expect(jugerPlanEcrans(plan, T3)).toEqual([]);
  });
});

describe("mutations isolées (EP-028) — ce qui doit RESTER mort", () => {
  it("m1 · la mort d'origine V2 : une étape d'un acteur greffée sur un écran sans SA surface — refusée, seule", () => {
    const plan = ecransDe(T3);
    // l'étape saisir(boutique) du vendeur (par_creer_boutique[1]) greffée
    // sur un écran public du catalogue : sa surface n'y est pas.
    const cible = plan.ecrans.find((e) => e.ecranId === "ecr_entree");
    expect(cible).toBeDefined();
    const mute: PlanEcrans = {
      ...plan,
      ecrans: plan.ecrans.map((e) =>
        e === cible
          ? { ...e, justification: [...e.justification, { parcours: "par_creer_boutique", etape: 1 }] }
          : e,
      ),
    };
    const codes = jugerPlanEcrans(mute, T3).map((x) => x.code);
    expect([...new Set(codes)]).toEqual(["DERIVATION_TRAVERSEE_ACTEUR"]);
    expect(jugerPlanEcrans(mute, T3)[0]?.message).toContain("étape étrangère");
  });

  it("m2 · l'identité ne se partage JAMAIS : un autre acteur greffé sur un écran de portée non publique — refusé, seul", () => {
    const plan = ecransDe(T3);
    // l'écran de l'historique des mises en avant (portée acteur:vendeur) se
    // voit greffer une justification d'un parcours ACHETEUR.
    const prive = plan.ecrans.find((e) => e.ecranId.includes("mise_en_avant_consulter_historique"));
    expect(prive, "écran privé attendu dans le plan t3").toBeDefined();
    const mute: PlanEcrans = {
      ...plan,
      ecrans: plan.ecrans.map((e) =>
        e === prive
          ? { ...e, justification: [...e.justification, { parcours: "par_chercher_produit", etape: 0 }] }
          : e,
      ),
    };
    const codes = jugerPlanEcrans(mute, T3).map((x) => x.code);
    expect([...new Set(codes)]).toEqual(["DERIVATION_TRAVERSEE_ACTEUR"]);
  });
});
