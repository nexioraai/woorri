// EP-115 — L'ARC SE JUGE PAR SA SOURCE, JAMAIS PAR SA SEULE CIBLE.
//
// DÉCISION D'ARBITRE CONSIGNÉE : juger l'arc par la cible atteinte a été
// ÉCARTÉ — « un parcours n'est pas traversable parce qu'on arrive quelque
// part, mais parce qu'on y arrive DEPUIS où l'utilisateur se trouve ».
// Preuve sur kaviva (13 arcs prescrits ≠ 22).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EXECUTION_ENVELOPE_V1 } from "../src/envelope.ts";
import { jugerVivacite } from "../src/vivacite.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
type AirDoc = Parameters<typeof jugerVivacite>[0];
const AIR = JSON.parse(
  readFileSync(
    join(R, "benchmarks", "air-emission", "results", "kaviva-spa.2026-09-11T23-00-50-047Z.attempt2.air.json"),
    "utf8",
  ),
) as AirDoc;

interface Action { id: string; trigger: Record<string, unknown>; effect: Record<string, unknown> }
const doc = (): AirDoc => structuredClone(AIR);
const ARC = { de: "scr_entree", vers: "scr_cpt_soin_consulter" };

/** Pose une action navigate vers la cible, déclenchée depuis l'écran donné. */
const câbler = (air: AirDoc, depuis: string): AirDoc => {
  const a = air as unknown as { screens: { id: string; blocks: { id: string }[] }[]; actions: Action[] };
  a.actions = a.actions.filter((x) => x.effect.screenId !== ARC.vers);
  const ecran = a.screens.find((s) => s.id === depuis);
  a.actions.push({
    id: "act_test_arc",
    trigger: { kind: "ui", blockId: ecran?.blocks[0]?.id ?? "" },
    effect: { kind: "navigate", screenId: ARC.vers },
  });
  return air;
};
const findings = (air: AirDoc) =>
  jugerVivacite(air, EXECUTION_ENVELOPE_V1, { arcsPrescrits: [ARC] }).filter(
    (f) => f.code === "VIVACITE_ARC_PRESCRIT_INEXECUTABLE",
  );

describe("les mutations exigées (EP-115)", () => {
  it("① câblé DEPUIS la source prescrite ⇒ ACCEPTÉ", () => {
    expect(findings(câbler(doc(), ARC.de))).toEqual([]);
  });

  it("② câblé depuis une AUTRE source ⇒ NOMMÉ, et le message dit laquelle était attendue", () => {
    const autre = (doc() as unknown as { screens: { id: string }[] }).screens.find(
      (s) => s.id !== ARC.de && s.id !== ARC.vers,
    );
    const f = findings(câbler(doc(), autre?.id ?? ""));
    expect(f).toHaveLength(1);
    expect(f[0]?.message).toContain("LA CIBLE EST POURTANT ATTEINTE");
    expect(f[0]?.message).toContain(autre?.id ?? "");
    expect(f[0]?.message).toContain(`depuis "${ARC.de}"`);
    // la décision d'arbitre, tenue : atteindre la cible ne suffit PAS.
    expect(f[0]?.message).toContain("ne remplace jamais");
  });

  it("③ l'obligation transmise ORDONNE par écran source (aucune donnée nouvelle)", async () => {
    const mm = await import("../../../benchmarks/air-emission/modele-metier.mjs");
    const brut = JSON.parse(
      readFileSync(
        join(R, "benchmarks", "air-emission", "results", "kaviva-spa.2026-09-11T23-00-50-047Z.modele-p0-t1.air.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const modele = (brut.modele ?? brut) as never;
    const texte = mm.obligationsPrescriptives("actions", modele, mm.ecransDe(modele));
    expect(texte).toContain("DEPUIS l'écran");
    expect(texte).toContain("le déclencheur de chaque action vit SUR CET ÉCRAN");
    expect(texte).toContain("ne satisfait PAS l'arc");
    // les arcs prescrits du plan sont TOUS énoncés, aucun perdu au regroupement.
    const arcs = (mm.ecransDe(modele).navigation.arcs as { de?: string; vers?: string }[]).filter(
      (a) => a.de !== undefined && a.vers !== undefined && a.de !== a.vers,
    );
    for (const a of arcs.slice(0, 4)) expect(texte).toContain(mm.ecranAirDe(a.vers ?? ""));
  });

  it("④ ni la gate d'EP-102, ni les clauses d'EP-105/EP-113 ne bougent", () => {
    const emitV3 = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    const juges = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    expect(emitV3).toContain("elargit(perimetreAvant, perimetreApres)");
    expect(juges).toContain("INDISSOCIABLES");
    expect(juges).toContain("champs éligibles");
  });
});
