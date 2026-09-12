// EP-108 — LE JUGE DES RÉFÉRENCES BRUTES DÉRIVE LA NATURE DU REGISTRE.
//
// Les trois mutations exigées. Preuve sur kaviva (16 écrans ≠ 19).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getBlock } from "@deribfy/blocks/registry";
import { rawReferences } from "../src/graph.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
type Air = Parameters<typeof rawReferences>[0];
const AIR = JSON.parse(
  readFileSync(
    join(R, "benchmarks", "air-emission", "results", "kaviva-spa.2026-09-11T23-00-50-047Z.attempt2.air.json"),
    "utf8",
  ),
) as Air;

interface Bloc { id: string; blockType: string; entityId?: string; props?: { key: string; value: unknown }[] }
interface Champ { id: string; type: string; referencesEntityId?: string }
const doc = (): Air => structuredClone(AIR);
const premierRef = (air: Air): { bloc: Bloc; champ: Champ } | undefined => {
  for (const s of (air as unknown as { screens: { blocks: Bloc[] }[] }).screens) {
    for (const b of s.blocks) {
      const ent = (air as unknown as { entities: { id: string; fields: Champ[] }[] }).entities.find(
        (e) => e.id === b.entityId,
      );
      const champ = ent?.fields.find((f) => f.type === "reference");
      if (champ && b.blockType === "list") return { bloc: b, champ };
    }
  }
  return undefined;
};

describe("les trois mutations exigées (EP-108)", () => {
  it("① un champ `reference` en prop d'AFFICHAGE reste REFUSÉ — le juge R6 ne perd rien", () => {
    const air = doc();
    const cible = premierRef(air);
    expect(cible).toBeDefined();
    const prop = (cible?.bloc.props ?? []).find((p) => p.key === "titleFieldId");
    if (prop && cible) prop.value = cible.champ.id;
    const trouve = rawReferences(air).filter((r) => r.blockId === cible?.bloc.id);
    expect(trouve.map((r) => r.propKey)).toContain("titleFieldId");
  });

  it("② le MÊME champ en `scopeFieldId` est SILENCIEUX — le moteur ne punit plus ce qu'il ordonne", () => {
    const air = doc();
    const cible = premierRef(air);
    (cible?.bloc.props ?? []).push({ key: "scopeFieldId", value: cible?.champ.id });
    const trouve = rawReferences(air).filter((r) => r.blockId === cible?.bloc.id);
    expect(trouve.map((r) => r.propKey)).not.toContain("scopeFieldId");
  });

  it("③ un prop de FILTRAGE hérite du bon traitement SANS ajout à la main — c'est le registre qui décide", () => {
    // on prend CHAQUE prop de filtrage déclaré au registre, sans en nommer
    // aucun : tous doivent être silencieux, y compris ceux ajoutés demain.
    const list = getBlock("list");
    expect((list?.fieldRefPropsFiltrage ?? []).length).toBeGreaterThan(1);
    for (const prop of list?.fieldRefPropsFiltrage ?? []) {
      const air = doc();
      const cible = premierRef(air);
      (cible?.bloc.props ?? []).push({ key: prop, value: cible?.champ.id });
      const trouve = rawReferences(air).filter((r) => r.blockId === cible?.bloc.id);
      expect(trouve.map((r) => r.propKey), `${prop} devrait être silencieux`).not.toContain(prop);
    }
  });
});
