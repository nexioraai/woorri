// CLIQUET — LA PREUVE DE MATIÈRE, testée sur le CADAVRE RÉEL.
//
// Le contrôle positif de ce test n'est pas une fabrication : c'est le
// document dougplace du 2026-09-10, 6,81 $ payés pour une marketplace dont
// la seule entité était le profil. Il DOIT être refusé. Le corpus vivant
// (kôrô, 8 entités) DOIT passer.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrateAirDocument, projectAirSchema } from "@deribfy/air-schema";
import { accueilNonFractionne, preuveDeMatiere } from "../src/matiere.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const lire = (p: string) =>
  projectAirSchema.parse(
    migrateAirDocument(JSON.parse(readFileSync(join(R, p), "utf8")) as Record<string, unknown>),
  );

describe("composition — l'accueil coule, il ne se partage pas", () => {
  it("REFUSE l'écran fractionné RÉEL (dougplace : 3 listes verticales en tiers)", () => {
    const air = lire("slices/dougplace/dougplace.air.json");
    const d = accueilNonFractionne(air);
    expect(d.length).toBeGreaterThan(0);
    expect(d[0]?.code).toBe("CAMPAGNE_ACCUEIL_FRACTIONNE");
  });

  it("ACCEPTE le même contenu recomposé en rangées horizontales", () => {
    const air = lire("slices/dougplace/dougplace.air.json");
    const recompose = {
      ...air,
      screens: air.screens.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) =>
          b.blockType !== "list"
            ? b
            : {
                ...b,
                props: [
                  ...(b.props ?? []).filter((p) => p.key !== "layout"),
                  { key: "layout", value: "row" },
                ],
              },
        ),
      })),
    };
    expect(accueilNonFractionne(recompose)).toEqual([]);
  });
});

describe("preuve de matière — un document qui vend montre sa marchandise", () => {
  it("REFUSE le document creux réel (dougplace, 1 entité = le profil)", () => {
    const air = lire("benchmarks/air-emission/results/dougplace.2026-09-10T12-57-13-483Z.reparation-partielle.air.json");
    const d = preuveDeMatiere(air);
    expect(d).toHaveLength(1);
    expect(d[0]?.code).toBe("CAMPAGNE_MATIERE_INSUFFISANTE");
  });

  it("ACCEPTE le document vivant réel (kôrô, 8 entités dont produits affichés)", () => {
    const air = lire("slices/marketplace-artisans/koro-artisans.air.json");
    expect(preuveDeMatiere(air)).toEqual([]);
  });

  it("CONTRÔLE — un document sans commerce n'est pas concerné", () => {
    const air = lire("benchmarks/air-emission/results/dougplace.2026-09-10T12-57-13-483Z.reparation-partielle.air.json");
    const sansCommerce = {
      ...air,
      compliance: { ...air.compliance, commerceClass: "none" as const },
    };
    expect(preuveDeMatiere(sansCommerce)).toEqual([]);
  });
});
