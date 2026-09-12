// EP-102 · ① — LA GATE ANTI-OSCILLATION NE COMPARE QUE DES DOCUMENTS
// COMPARABLES.
//
// MOTIF GÉNÉRAL : un compteur qui compare deux états dont l'un n'est pas
// observable mesure autre chose que ce qu'il croit. Le discriminant est la
// COMPARABILITÉ (même ensemble de juges), JAMAIS l'invalidité — sinon une
// base partiellement jugeable rouvrirait le même trou au domaine suivant.
// Preuve sur kaviva (16 écrans) : une AUTRE taille que le défaut (20).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  elargit,
  jugerAcceptation,
  perimetreDeJugement,
  sontComparables,
  validateLocal,
} from "../../../benchmarks/air-emission/acceptation.mjs";
import { ecransDe } from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const R_RES = join(R, "benchmarks", "air-emission", "results");
const lire = (f: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(R_RES, f), "utf8")) as Record<string, unknown>;

// FIXTURE : kaviva 23-00 — 16 écrans, document VALIDE (run vert).
const VALIDE = lire("kaviva-spa.2026-09-11T23-00-50-047Z.attempt2.air.json");
const MODELE_BRUT = lire("kaviva-spa.2026-09-11T23-00-50-047Z.modele-p0-t1.air.json");
const MODELE = (MODELE_BRUT.modele ?? MODELE_BRUT) as never;
const PRESCRIPTIF = { modele: MODELE, plan: ecransDe(MODELE) };

/** Casse le SCHÉMA sans toucher au reste (un champ d'entité invalide). */
const schemaInvalide = (): Record<string, unknown> => {
  const doc = structuredClone(VALIDE) as { entities: { fields: unknown }[] };
  const premiere = doc.entities[0];
  if (premiere) premiere.fields = "pas-un-tableau";
  return doc;
};

describe("le périmètre de jugement — ce qui a RÉELLEMENT tourné", () => {
  it("document valide : schéma + sémantique + prescriptions ; invalide : AUCUN juge", () => {
    expect(perimetreDeJugement(validateLocal(VALIDE).air, PRESCRIPTIF)).toEqual([
      "schema",
      "semantique",
      "prescriptions",
    ]);
    expect(perimetreDeJugement(validateLocal(schemaInvalide()).air, PRESCRIPTIF)).toEqual([]);
  });

  it("sans prescriptif, le périmètre est PLUS ÉTROIT — la comparabilité le voit", () => {
    const large = perimetreDeJugement(validateLocal(VALIDE).air, PRESCRIPTIF);
    const etroit = perimetreDeJugement(validateLocal(VALIDE).air, undefined);
    expect(sontComparables(large, etroit)).toBe(false);
    expect(elargit(etroit, large)).toBe(true);
    // LE PIÈGE ÉVITÉ : ce n'est pas « invalide vs valide », c'est le
    // périmètre — une base PARTIELLEMENT jugeable est déjà non comparable.
    expect(elargit(large, etroit)).toBe(false);
  });
});

describe("les trois cas exigés (EP-102), sur une taille AUTRE que le défaut", () => {
  it("① base INVALIDE + réparation VALIDE ⇒ élargissement : les diagnostics sont RÉVÉLÉS", () => {
    const avant = perimetreDeJugement(validateLocal(schemaInvalide()).air, PRESCRIPTIF);
    const apres = perimetreDeJugement(validateLocal(VALIDE).air, PRESCRIPTIF);
    expect(elargit(avant, apres)).toBe(true);
    // et il y a bien des diagnostics à révéler (sinon la preuve serait creuse).
    const v = validateLocal(VALIDE);
    expect(jugerAcceptation(v.air, PRESCRIPTIF, {}).length).toBeGreaterThanOrEqual(0);
  });

  it("② base VALIDE + réparation qui introduit ⇒ périmètres ÉGAUX : la gate juge comme avant (L-098-C inchangé)", () => {
    const doc2 = structuredClone(VALIDE) as { screens: { blocks: unknown[] }[] };
    const ecran = doc2.screens[0];
    if (ecran) ecran.blocks = [...ecran.blocks];
    const avant = perimetreDeJugement(validateLocal(VALIDE).air, PRESCRIPTIF);
    const apres = perimetreDeJugement(validateLocal(doc2).air, PRESCRIPTIF);
    expect(sontComparables(avant, apres)).toBe(true);
    expect(elargit(avant, apres)).toBe(false); // aucune exemption possible
  });

  it("③ base VALIDE + réparation qui casse le schéma ⇒ RÉTRÉCISSEMENT, jamais une révélation", () => {
    const avant = perimetreDeJugement(validateLocal(VALIDE).air, PRESCRIPTIF);
    const apres = perimetreDeJugement(validateLocal(schemaInvalide()).air, PRESCRIPTIF);
    expect(elargit(avant, apres)).toBe(false);
    expect(sontComparables(avant, apres)).toBe(false);
  });
});

describe("branchement — la gate consomme la comparabilité, elle ne s'assouplit pas", () => {
  const emitV3 = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
  it("le rejet reste la règle ; la révélation est la SEULE exemption, et elle est nommée", () => {
    expect(emitV3).toContain("if (introduits.length > 0 && !revelation) {");
    expect(emitV3).toContain("RÉPARATION REJETÉE — OSCILLATION");
    expect(emitV3).toContain("elargit(perimetreAvant, perimetreApres)");
    expect(emitV3).toContain("journal.reparationRevelation");
  });
});
