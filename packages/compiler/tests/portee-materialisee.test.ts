// EP-118 — CE QUE LE PLAN A DÉCIDÉ, IL LE TRANSMET.
//
// Dernière famille bloquante : AIR_CIBLE_IDENTITE_PERDUE ×3 sur des listes
// de catégories. MESURE : les cibles ignorent RÉELLEMENT l'élection (aucune
// n'est scopée) — le juge C4 a raison, le document est fautif. POURQUOI :
// `ecransDe` accepte « élire X puis parcourir Y relié » (EP-070) — le plan
// SAIT donc que les Y montrés sont ceux de l'instance élue — mais la surface
// de `chercher` porte `resultat:Y`, jamais `instance:X` : le plan décidait
// sans transmettre (4e occurrence du motif). Preuve sur kaviva (16 écrans).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  consommationsParPortee,
  ecransDe,
  obligationsPrescriptives,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const lire = (f: string): ModeleMetier => {
  const brut = JSON.parse(
    readFileSync(join(R, "benchmarks", "air-emission", "results", f), "utf8"),
  ) as { modele?: ModeleMetier };
  return (brut.modele ?? brut) as ModeleMetier;
};
const KAVIVA = lire("kaviva-spa.2026-09-11T23-00-50-047Z.modele-p0-t1.air.json");

describe("la dérivation expose le lien que la décision utilisait", () => {
  it("kaviva : élire un soin puis parcourir ses créneaux — le lien est NOMMÉ", () => {
    const liens = consommationsParPortee(KAVIVA);
    expect(liens).toHaveLength(1);
    expect(liens[0]?.elu).toBe("cpt_soin");
    expect(liens[0]?.parcouru).toBe("cpt_creneau");
  });

  it("l'obligation d'écrans TRANSMET le scope requis, avec son domaine (leçon EP-113)", () => {
    const texte = obligationsPrescriptives("ecrans", KAVIVA, ecransDe(KAVIVA));
    expect(texte).toContain("PORTÉES OBLIGATOIRES");
    expect(texte).toContain("DE L'INSTANCE de « cpt_soin »");
    expect(texte).toContain("scopeFieldId");
    expect(texte).toContain("l'instance choisie est PERDUE");
  });
});

describe("mutations isolées — le prédicat est celui de la décision", () => {
  it("MUTATION — la RELATION retirée : plus de lien, donc plus d'obligation (aucune invention)", () => {
    const m = structuredClone(KAVIVA);
    m.relations = m.relations.filter(
      (r) => !(r.de === "cpt_creneau" && r.vers === "cpt_soin") && !(r.de === "cpt_soin" && r.vers === "cpt_creneau"),
    );
    expect(consommationsParPortee(m)).toEqual([]);
    expect(obligationsPrescriptives("ecrans", m, ecransDe(m))).not.toContain("PORTÉES OBLIGATOIRES");
  });

  it("MUTATION — l'élection retirée : plus de lien (c'est bien l'élection qui le crée)", () => {
    const m = structuredClone(KAVIVA);
    for (const p of m.parcours) {
      p.etapes = p.etapes.filter((e) => !(e.geste === "choisir" && e.concept === "cpt_soin"));
    }
    expect(consommationsParPortee(m)).toEqual([]);
  });

  it("MUTATION — consommation par le MÊME concept : ce n'est pas une portée, aucun lien", () => {
    const m = structuredClone(KAVIVA);
    const p = m.parcours.find((x) => consommationsParPortee(KAVIVA)[0]?.parcours === x.id);
    const lien = consommationsParPortee(KAVIVA)[0];
    if (p && lien) p.etapes[lien.etapeConsommation] = { concept: lien.elu, geste: "consulter" };
    expect(consommationsParPortee(m)).toEqual([]);
  });

  it("les clauses EP-105/EP-113/EP-115 et la gate EP-102 ne bougent pas", () => {
    const juges = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    const emitV3 = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(juges).toContain("INDISSOCIABLES");
    expect(juges).toContain("champs éligibles");
    expect(emitV3).toContain("elargit(perimetreAvant, perimetreApres)");
    const actions = obligationsPrescriptives("actions", KAVIVA, ecransDe(KAVIVA));
    expect(actions).toContain("DEPUIS l'écran");
  });
});
