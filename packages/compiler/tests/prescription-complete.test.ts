// EP-105 (L-098-C) — UNE PRESCRIPTION DE RÉPARATION DOIT ÊTRE COMPLÈTE.
//
// QUESTION DE RACINE, TRANCHÉE PAR LA MESURE (et non par préférence) : le
// type d'écran est-il prescrit par le plan, ou dérivé des blocs ? La
// correspondance rôle-prescrit → trait-dérivé N'EST PAS univoque sur une
// fixture VERTE (detail/instance → listing OU form) : le plan NE prescrit
// PAS le type, il est DÉRIVÉ. Donc le réparateur est jugé sur le document
// RÉSULTANT — ce qui est déjà le cas — et le défaut est ailleurs : le
// diagnostic ORDONNE d'ajouter un détail sans dire que la collection déjà
// présente basculera sous C5. Preuve sur kaviva (16 écrans ≠ 19).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { consequencesDeReclassement } from "../../../benchmarks/air-emission/acceptation.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const AIR = JSON.parse(
  readFileSync(
    join(R, "benchmarks", "air-emission", "results", "kaviva-spa.2026-09-11T23-00-50-047Z.attempt2.air.json"),
    "utf8",
  ),
) as Record<string, unknown>;

interface Bloc { id: string; blockType: string; entityId?: string; props?: { key: string; value: unknown }[] }
interface Ecran { id: string; blocks: Bloc[] }
const ecrans = (a: Record<string, unknown>): Ecran[] => a.screens as Ecran[];
const clone = (): Record<string, unknown> => structuredClone(AIR);

describe("la clause est DÉRIVÉE du document, jamais un nom de bloc en dur", () => {
  it("écran portant une collection NUE : la conséquence C5 est énoncée, et elle NOMME le bloc concerné", () => {
    const air = clone();
    const cible = ecrans(air).find(
      (s) => s.blocks.some((b) => b.blockType === "list" && !(b.props ?? []).some((p) => p.key === "scopeFieldId")) &&
        !s.blocks.some((b) => b.blockType === "detail_header"),
    );
    expect(cible, "fixture : un écran à collection nue sans détail est attendu").toBeDefined();
    const clause = consequencesDeReclassement(air, cible?.id ?? "");
    // EP-113 (édition consciente) : le libellé passe au PLURIEL (« sa ou ses
    // collections ») puisque la clause nomme désormais CHAQUE liste avec son
    // domaine de valeurs. Ce qui reste invariant : la conséquence C5 est
    // énoncée et le bloc concerné est NOMMÉ.
    expect(clause).toContain("NON CONTEXTUALISÉES (règle C5)");
    const nu = cible?.blocks.find((b) => b.blockType === "list");
    expect(clause).toContain(nu?.id ?? "");
  });

  it("MUTATION — la collection est SCOPÉE : plus aucune conséquence (le correctif ne gèle pas la réparation)", () => {
    const air = clone();
    const cible = ecrans(air).find(
      (s) => s.blocks.some((b) => b.blockType === "list" && !(b.props ?? []).some((p) => p.key === "scopeFieldId")) &&
        !s.blocks.some((b) => b.blockType === "detail_header"),
    );
    for (const b of cible?.blocks ?? []) {
      if (b.blockType === "list") (b.props ??= []).push({ key: "scopeFieldId", value: "fld_x" });
    }
    expect(consequencesDeReclassement(air, cible?.id ?? "")).toBe("");
  });

  it("MUTATION — l'écran est DÉJÀ une fiche : aucune conséquence (pas de reclassement possible)", () => {
    const air = clone();
    const cible = ecrans(air).find((s) => s.blocks.some((b) => b.blockType === "detail_header"));
    expect(cible).toBeDefined();
    expect(consequencesDeReclassement(air, cible?.id ?? "")).toBe("");
  });

  it("MUTATION — écran sans aucune collection : aucune conséquence", () => {
    const air = clone();
    const cible = ecrans(air).find((s) => !s.blocks.some((b) => b.blockType === "list"));
    expect(cible).toBeDefined();
    expect(consequencesDeReclassement(air, cible?.id ?? "")).toBe("");
  });

  it("écran inconnu : silence, jamais d'invention", () => {
    expect(consequencesDeReclassement(clone(), "scr_inexistant")).toBe("");
  });
});

describe("EP-113 — LE DOMAINE DES VALEURS VALIDES EST FOURNI AVEC L'ORDRE", () => {
  // Mesuré : le réparateur posait un scopeFieldId EXISTANT et du BON TYPE,
  // mais sur un écran SANS detail_header — la clause ordonnait « scope-la »
  // sans dire que les deux gestes sont indissociables ni quels champs sont
  // éligibles. Une prescription qui ordonne sans fournir le domaine est
  // INCOMPLÈTE. Aucun juge ajouté en aval : la correction empêche que la
  // valeur soit posée. Preuve sur kaviva (16 écrans ≠ 21).
  const clauseDe = (air: Record<string, unknown>, id: string): string =>
    consequencesDeReclassement(air, id);

  it("① la clause NOMME les champs éligibles quand ils existent (domaine fourni)", () => {
    const air = clone();
    const cible = ecrans(air).find(
      (s) =>
        !s.blocks.some((b) => b.blockType === "detail_header") &&
        s.blocks.some((b) => {
          const ent = (air.entities as { id: string; fields: { type: string }[] }[]).find(
            (e) => e.id === b.entityId,
          );
          return b.blockType === "list" && (ent?.fields ?? []).some((f) => f.type === "reference");
        }),
    );
    expect(cible, "fixture : une liste à champ reference sans détail est attendue").toBeDefined();
    const clause = clauseDe(air, cible?.id ?? "");
    expect(clause).toContain("champs éligibles");
    expect(clause).toContain("→");
  });

  it("② une liste SANS champ reference est déclarée NON SCOPABLE — l'ordre ne peut pas être suivi à tort", () => {
    const air = clone();
    const cible = ecrans(air).find(
      (s) =>
        !s.blocks.some((b) => b.blockType === "detail_header") &&
        s.blocks.some((b) => {
          const ent = (air.entities as { id: string; fields: { type: string }[] }[]).find(
            (e) => e.id === b.entityId,
          );
          return b.blockType === "list" && !(ent?.fields ?? []).some((f) => f.type === "reference");
        }),
    );
    expect(cible).toBeDefined();
    const clause = clauseDe(air, cible?.id ?? "");
    expect(clause).toContain("NE PEUT PAS être scopée");
    expect(clause).toContain("ne pose pas de détail sur cet écran");
  });

  it("③ l'indissociabilité est ÉNONCÉE : un scope sans detail_header est déclaré INVALIDE", () => {
    const air = clone();
    const cible = ecrans(air).find(
      (s) => !s.blocks.some((b) => b.blockType === "detail_header") && s.blocks.some((b) => b.blockType === "list"),
    );
    const clause = clauseDe(air, cible?.id ?? "");
    expect(clause).toContain("INDISSOCIABLES");
    expect(clause).toContain("est INVALIDE");
    expect(clause).toContain("Fais les deux, ou ne fais ni l'un ni l'autre.");
  });

  it("④ le correctif ne touche NI la gate d'EP-102 NI le reste de la clause d'EP-105", () => {
    const emitV3 = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(emitV3).toContain("elargit(perimetreAvant, perimetreApres)");
    expect(emitV3).toContain("if (introduits.length > 0 && !revelation) {");
    // la clause reste conditionnée aux MÊMES cas qu'EP-105 (silences intacts).
    const air = clone();
    const fiche = ecrans(air).find((s) => s.blocks.some((b) => b.blockType === "detail_header"));
    expect(clauseDe(air, fiche?.id ?? "")).toBe("");
  });
});
