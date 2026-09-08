// CLIQUET — TOUTE PROP DÉCLARÉE AU REGISTRE EST LUE PAR LE RUNTIME.
//
// Défaut RÉEL qui a motivé ce test : `accroche` et `logoUri` étaient déclarés
// au document, portés par l'artefact émis, acceptés par le contrat du bloc —
// et le runtime ne les TRANSMETTAIT pas. Rien n'échouait : l'en-tête rendait
// simplement sa forme antérieure. Une prop peut donc traverser trois couches
// et mourir à la quatrième, en silence.
//
// La sonde regarde le RUNTIME ÉMIS, pas la source : c'est ce qui part sur
// l'appareil.
import { describe, expect, it } from "vitest";
// Import DIRECT des définitions : passer par l'index du paquet entraînerait
// les composants, donc react-native, que ce harnais node ne sait pas charger.
import { BLOCKS } from "../../blocks/src/definitions.ts";
import { EMBEDDED_ASSETS } from "../src/embedded-assets.generated.ts";

const RUNTIME = EMBEDDED_ASSETS["lib/runtime/air-runtime.tsx"] ?? "";

// Props consommées AUTREMENT que par `props.<clé>` — chacune justifiée.
const LUES_INDIRECTEMENT = new Set([
  // Référencée par le nom d'action du bloc (`uiActionsByBlock`), pas par prop.
  "actionId",
]);

describe("cliquet — aucune prop déclarée ne meurt en chemin", () => {
  it("le runtime émis LIT chaque prop de chaque bloc", () => {
    expect(RUNTIME.length).toBeGreaterThan(0);
    const orphelines: string[] = [];
    for (const bloc of BLOCKS) {
      const schema = bloc.propsSchema as { shape?: Record<string, unknown> };
      for (const cle of Object.keys(schema.shape ?? {})) {
        if (LUES_INDIRECTEMENT.has(cle)) continue;
        if (!RUNTIME.includes(`props.${cle}`)) orphelines.push(`${bloc.id}.${cle}`);
      }
    }
    expect(orphelines, "props déclarées que le runtime ne lit pas").toEqual([]);
  });

  it("CONTRÔLE NÉGATIF — la sonde VOIT une prop non lue", () => {
    // Sans lui, une recherche qui trouve toujours passerait pour une preuve.
    expect(RUNTIME.includes("props.cettePropNExistePas")).toBe(false);
  });
});
