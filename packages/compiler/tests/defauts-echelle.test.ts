// EP-099 — DÉFAUTS D'ÉCHELLE (livrables L-098, fixtures = run marketplace
// 11-32-52). Ce ne sont pas des variances : ils se reproduisent sur tout
// domaine de cette taille. Vérifications d'hypothèse RENDUES avant tout
// correctif (les deux ont été réfutées — voir EP-099 au registre).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ecranAirDe,
  ecransDe,
  jugerPlanEcrans,
  surfacesDe,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const brut = JSON.parse(
  readFileSync(
    join(R, "benchmarks", "air-emission", "results", "marketplace-africain.2026-09-12T11-32-52-914Z.modele-p0-t1.air.json"),
    "utf8",
  ),
) as { modele?: ModeleMetier };
const MARCHE = (brut.modele ?? brut) as ModeleMetier;

describe("L-098-B — l'identifiant de surface est INJECTIF (la bijection redevient tenable)", () => {
  it("base verte : 22 écrans prescrits, 22 identifiants AIR DISTINCTS", () => {
    expect(validerModele(MARCHE)).toEqual([]);
    const plan = ecransDe(MARCHE);
    const ids = plan.ecrans.map((e) => ecranAirDe(e.ecranId));
    expect(plan.ecrans.length).toBeGreaterThan(20);
    expect(new Set(ids).size).toBe(plan.ecrans.length);
    expect(plan.diagnostics).toEqual([]);
    expect(jugerPlanEcrans(plan, MARCHE)).toEqual([]);
  });

  it("la collision RÉELLE est nommée : même (concept, geste, état), portées différentes", () => {
    const surfaces = surfacesDe(MARCHE).filter(
      (s) => s.concept === "cpt_produit" && s.role === "detail" && s.etat === "publie",
    );
    // deux surfaces distinctes (portée globale ET portée acteur) …
    expect(surfaces.length).toBe(2);
    expect(new Set(surfaces.map((s) => s.portee)).size).toBe(2);
    // … donc DEUX identifiants distincts, désormais.
    expect(new Set(surfaces.map((s) => s.surfaceId)).size).toBe(2);
  });

  it("CHIRURGIE — aucun identifiant SANS collision n'a bougé (fixtures intactes)", () => {
    // kaviva (16 écrans, aucune collision) : aucun suffixe de portée nulle part.
    const kav = JSON.parse(
      readFileSync(
        join(R, "benchmarks", "air-emission", "results", "kaviva-spa.2026-09-11T23-00-50-047Z.modele-p0-t1.air.json"),
        "utf8",
      ),
    ) as { modele?: ModeleMetier };
    const kaviva = (kav.modele ?? kav) as ModeleMetier;
    const ids = surfacesDe(kaviva).map((s) => s.surfaceId);
    expect(ids.some((i) => i.includes("_acteur_") || i.includes("_instance_"))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("MUTATION — un modèle SANS collision garde des identifiants nus", () => {
    const m = structuredClone(MARCHE);
    // retirer le parcours vendeur qui produit la seconde surface détail.
    m.parcours = m.parcours.filter((p) => p.id !== "par_publier_produit");
    const ids = surfacesDe(m).map((s) => s.surfaceId);
    expect(ids.some((i) => i.includes("_acteur_"))).toBe(false);
  });
});
