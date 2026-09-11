// R1 (GO humain, 2026-09-11) — ENVELOPPE VÉRIDIQUE PAR MÉTHODE (EP-020).
//
// DOUBLE VOLET, tous deux EXÉCUTÉS :
//   ENVELOPE = GREEN — les 5 diagnostics kaviva (4 cibles auth « mortes »
//   + 1 besoin « satisfait par du mort ») tombent à 0 par LES MÊMES
//   instruments que la campagne (evaluatePromises / evaluateIntentCoverage
//   × EXECUTION_ENVELOPE_V1). Contrôle négatif : une capability non
//   déclarée (camera) reste morte.
//   MODEL = RED — la fixture `kaviva-modele.json` (le VRAI symptôme métier,
//   pas les diagnostics auth) est un BON modèle (P1 vert) que le document
//   kaviva NE MATÉRIALISE PAS : l'étape « choisir un créneau » exige que
//   l'identité du créneau élu atteigne la saisie du rendez-vous — le
//   document la JETTE (listes de créneaux → formulaire sans consommation).
//   R1 corrige le JUGE, il ne masque PAS l'insuffisance du modèle.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrateAirDocument, projectAirSchema } from "@deribfy/air-schema";
import {
  EXECUTION_ENVELOPE_V1,
  controls,
  navigationsDeLigne,
} from "@deribfy/execution-contract";
import { evaluateIntentCoverage, evaluatePromises } from "@deribfy/fidelity";
import {
  surfacesDe,
  validerModele,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const KAVIVA_DOC = join(
  R, "benchmarks", "air-emission", "results",
  "kaviva-spa.2026-09-11T06-32-03-705Z.reparation-partielle.air.json",
);
const KAVIVA_MODELE = join(R, "slices", "kaviva", "kaviva-modele.json");

const air = projectAirSchema.parse(
  migrateAirDocument(JSON.parse(readFileSync(KAVIVA_DOC, "utf8")) as Record<string, unknown>),
);

describe("R1 · volet 1 — ENVELOPE = GREEN (exécuté par les instruments réels)", () => {
  it("les 4 promesses auth deviennent VIVANTES — plus aucune cible morte", () => {
    const verdicts = evaluatePromises(air, EXECUTION_ENVELOPE_V1).verdicts;
    const mortes = verdicts.filter((v) => v.state === "cible_morte");
    expect(mortes).toEqual([]);
    // Les 4 actions auth précisément : vivantes, nommées.
    for (const cible of [
      "act_inscription_soumettre", "act_connexion_soumettre",
      "act_mot_de_passe_oublie_soumettre", "act_deconnexion",
    ]) {
      const v = verdicts.find((x) => x.targetId === cible);
      expect(v?.state, cible).toBe("cible_vivante");
    }
  });

  it("le besoin « création de compte » n'est plus satisfait-par-du-mort", () => {
    expect(air.intent).toBeDefined();
    const verdicts = evaluateIntentCoverage(air, EXECUTION_ENVELOPE_V1).verdicts;
    expect(verdicts.filter((v) => v.state === "satisfait_par_du_mort")).toEqual([]);
  });

  it("CONTRÔLE NÉGATIF — une capability NON déclarée (camera) reste morte", () => {
    const bloc = air.screens.flatMap((s) => s.blocks).find((b) => b.blockType === "button");
    const ecran = air.screens.find((s) => s.blocks.some((b) => b.id === bloc?.id));
    expect(bloc && ecran).toBeTruthy();
    const mute = {
      ...air,
      capabilities: [...air.capabilities, { capability: "camera" }],
      permissions: [
        ...air.permissions,
        { platform: "android", permission: "android.permission.CAMERA",
          reason: [{ locale: "fr", text: "prise de vue" }],
          requiredByCapability: "camera" },
      ],
      actions: [
        ...air.actions,
        { id: "act_photo", name: "prendre une photo",
          trigger: { kind: "ui", blockId: bloc?.id ?? "" },
          effect: { kind: "capability", capability: "camera", method: "capture", params: [] } },
      ],
    };
    const parse = projectAirSchema.parse(migrateAirDocument(mute));
    const c = controls(parse, EXECUTION_ENVELOPE_V1).find((x) => x.actionId === "act_photo");
    // Le bouton dispatche SA prop actionId — le déclencheur est décoratif :
    // quel que soit le dispatch, l'EFFET camera n'est pas déclaré exécutable.
    expect(c?.executed ?? false).toBe(false);
  });
});

describe("R1 · volet 2 — MODEL = RED (exécuté sur la fixture kaviva-modèle)", () => {
  const modele = JSON.parse(readFileSync(KAVIVA_MODELE, "utf8")) as Parameters<typeof validerModele>[0];

  it("la fixture est un BON modèle : P1 vert (le rouge n'est pas un modèle cassé)", () => {
    expect(validerModele(modele)).toEqual([]);
  });

  it("STRUCTURE ATTENDUE FIGÉE : le modèle exige l'identité du créneau dans la saisie", () => {
    const surfaces = surfacesDe(modele as never);
    const choix = surfaces.find((s) => s.concept === "cpt_creneau" && s.role === "choix");
    expect(choix).toBeDefined();
    // « choisir » est la collection qui PRODUIT l'identité élue…
    expect(choix?.cardinalite).toBe("collection");
    expect(choix?.origine.some((o) => o.parcours === "par_reserver")).toBe(true);
    // …et la SAISIE qui suit la CONSOMME : sa portée est l'instance du
    // créneau choisi (relation déclarée rdv→créneau). C'est LA structure
    // attendue figée que le document doit matérialiser.
    const saisie = surfaces.find((s) => s.concept === "cpt_rendez_vous" && s.role === "saisie");
    expect(saisie?.portee).toBe("instance:cpt_creneau");
  });

  it("MODEL = RED : le document kaviva JETTE l'identité du créneau choisi", () => {
    const navs = navigationsDeLigne(air).filter((n) => n.entityId === "ent_creneau");
    expect(navs.length).toBeGreaterThan(0);
    // Chaque liste de créneaux navigue vers la saisie SANS consommation :
    // ni detail_header ent_creneau, ni liste scopée — le créneau élu est
    // PERDU avant la réservation. C'est le symptôme métier, indépendant
    // des 5 diagnostics auth (volet 1).
    for (const n of navs) {
      expect(n.consommation, `${n.blockId}→${n.targetScreenId}`).toBe("aucune");
    }
    const cible = air.screens.find((s) => s.id === navs[0]?.targetScreenId);
    expect(cible?.blocks.some((b) => b.blockType === "detail_header" && b.entityId === "ent_creneau")).toBe(false);
  });
});
