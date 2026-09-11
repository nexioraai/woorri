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
import { imagesDeVitrine, principesDeComposition, preuveDeMatiere } from "../src/matiere.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const lire = (p: string) =>
  projectAirSchema.parse(
    migrateAirDocument(JSON.parse(readFileSync(join(R, p), "utf8")) as Record<string, unknown>),
  );

describe("principes de composition — mécaniques, aveugles au domaine", () => {
  it("LES GATES DISCRIMINENT : marketa (après enseignement) passe, dougplace (avant) échoue", () => {
    // La preuve que ces principes mesurent un PROGRÈS RÉEL et non une
    // tautologie : la génération POSTÉRIEURE à l'enseignement de la
    // composition les satisfait d'elle-même (0 violation), la génération
    // ANTÉRIEURE en viole 5 — sections muettes et recherche non offerte à
    // l'accueil. Dougplace reste le cas HISTORIQUE de comparaison ; les
    // gates ne jugent que les générations futures.
    expect(principesDeComposition(lire("slices/marketa/marketa.air.json"))).toEqual([]);
    const historique = principesDeComposition(lire("slices/dougplace/dougplace.air.json"));
    expect(historique.filter((x) => x.code === "CAMPAGNE_SECTION_SANS_TITRE").length).toBe(4);
    expect(historique.filter((x) => x.code === "CAMPAGNE_RECHERCHE_NON_STRUCTURELLE").length).toBe(1);
  });

  it("CONTRÔLE — une section muette est nommée par son diagnostic", () => {
    const air = lire("slices/marketa/marketa.air.json");
    const muette = {
      ...air,
      screens: air.screens.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) =>
          b.blockType !== "list" ? b : { ...b, props: (b.props ?? []).filter((p) => p.key !== "title") },
        ),
      })),
    };
    const d = principesDeComposition(muette);
    expect(d.some((x) => x.code === "CAMPAGNE_SECTION_SANS_TITRE")).toBe(true);
  });

  it("CONTRÔLE — un accueil qui n'offre pas la recherche est refusé", () => {
    const air = lire("slices/marketa/marketa.air.json");
    const sansEntree = {
      ...air,
      screens: air.screens.map((s) => ({
        ...s,
        blocks: s.blocks.filter((b) => b.blockType !== "search_entry"),
      })),
    };
    const d = principesDeComposition(sansEntree);
    expect(d.some((x) => x.code === "CAMPAGNE_RECHERCHE_NON_STRUCTURELLE")).toBe(true);
  });

  it("CONTRÔLE — une liste distante sans états est refusée", () => {
    // v1 est la génération qui déclarait du distant — c'est elle le banc.
    const air = lire("benchmarks/air-emission/results/marketa.air.valide.json");
    const sansEtats = {
      ...air,
      screens: air.screens.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) =>
          b.blockType !== "list"
            ? b
            : { ...b, props: (b.props ?? []).filter((p) => p.key !== "errorTitle") },
        ),
      })),
    };
    const d = principesDeComposition(sansEtats);
    expect(d.some((x) => x.code === "CAMPAGNE_ETATS_REMOTE_MANQUANTS")).toBe(true);
  });
});

describe("images de vitrine — le verrou que la prose n'a pas su tenir", () => {
  it("les deux générations RÉELLES portent leurs URLs ; les retirer déclenche le verrou", () => {
    // v1 ET v2 portent leurs images (graines descriptives — 36ter tenue par
    // le modèle deux fois). Le verrou garantit que ça RESTE vrai : générique,
    // il tombe si une génération future les perd.
    expect(imagesDeVitrine(lire("benchmarks/air-emission/results/marketa.air.valide.json"))).toEqual([]);
    const v2 = lire("benchmarks/air-emission/results/marketa2.air.valide.json");
    expect(imagesDeVitrine(v2)).toEqual([]);
    const sansImages = {
      ...v2,
      entities: v2.entities.map((e) => ({
        ...e,
        fields: e.fields.map((f) => {
          if (f.type !== "asset") return f;
          const copie = { ...f };
          delete copie.demoValues;
          return copie;
        }),
      })),
    };
    const d = imagesDeVitrine(sansImages);
    expect(d.length).toBeGreaterThan(0);
    expect(d[0]?.code).toBe("CAMPAGNE_IMAGES_DEMO_MANQUANTES");
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
