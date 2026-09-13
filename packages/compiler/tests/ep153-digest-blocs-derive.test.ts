// EP-153 — CE QUI BLOQUAIT LA COMPILATION.
//
// Quatre runs payés, aucun document installable. Le dernier échouait sur trois
// `BLOCK_PROPS_INVALID` : `filterValue: true` sur des champs booléens.
//
// LA RACINE, MESURÉE : le registre des blocs vit dans `definitions.ts`, et le
// prompt le RÉÉCRIVAIT à la main. La copie avait divergé — elle omettait
// `filterValue` et `filterOperator`, et ne donnait le type d'aucune prop. Le
// générateur a posé un booléen sur un champ booléen : geste sensé, valeur
// refusée. Huitième occurrence du motif « liste écrite deux fois ».
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getBlock, listBlockIds } from "@deribfy/blocks/registry";

const R = join(import.meta.dirname, "..", "..", "..");
const SOURCE = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");

/** Le digest, évalué hors du module (dont le chargement lance une campagne). */
function digest(): string {
  const debut = SOURCE.indexOf("function blocsDigest()");
  const corps = SOURCE.slice(debut, SOURCE.indexOf("\n}", debut) + 2);
  const f = new Function("blocksRegistry", "z", `${corps}; return blocsDigest();`) as (
    r: unknown,
    zod: unknown,
  ) => string;
  return f({ listBlockIds, getBlock }, z);
}

describe("EP-153 · le type des props est DIT, parce qu'il est DÉRIVÉ", () => {
  const d = digest();

  it("`filterValue` est documenté, AVEC son type — c'est ce qui manquait", () => {
    expect(d).toContain("filterValue? : string");
  });

  it("`filterOperator` aussi, avec ses valeurs — il manquait également", () => {
    expect(d).toMatch(/filterOperator\? : string parmi "eq"\|"neq"\|"contains"/);
  });

  it("CHAQUE bloc du registre figure au digest — plus d'omission possible", () => {
    for (const id of listBlockIds()) expect(d, id).toContain(`\`${id}\``);
  });

  it("CHAQUE prop de CHAQUE bloc y figure — la divergence ne peut plus naître", () => {
    for (const id of listBlockIds()) {
      const bloc = getBlock(id);
      if (bloc === undefined) continue;
      const js = z.toJSONSchema(bloc.propsSchema, { target: "draft-2020-12", io: "input" }) as {
        properties?: Record<string, unknown>;
      };
      for (const prop of Object.keys(js.properties ?? {})) {
        expect(d, `${id}.${prop} absent du digest`).toContain(prop);
      }
    }
  });

  it("les props REQUISES sont signalées comme telles", () => {
    expect(d).toMatch(/titleFieldId \(REQUIS\)/);
  });
});

describe("EP-153 · une valeur valide reste acceptée, une invalide est refusée", () => {
  const propsDeList = (valeur: unknown) => ({
    titleFieldId: "fld_x",
    filterFieldId: "fld_y",
    filterOperator: "eq",
    filterValue: valeur,
  });

  it("une chaîne passe — y compris « true » pour un champ booléen", () => {
    const bloc = getBlock("list");
    expect(bloc?.propsSchema.safeParse(propsDeList("true")).success).toBe(true);
    expect(bloc?.propsSchema.safeParse(propsDeList("a_venir")).success).toBe(true);
  });

  it("un booléen est REFUSÉ — et c'est le contrat qui a raison", () => {
    // Le runtime lit `str(props.filterValue)` et compare des CHAÎNES : les
    // valeurs d'instance sont stockées en chaînes. Un booléen n'y trouverait
    // jamais sa correspondance. Le registre n'est pas trop strict.
    const bloc = getBlock("list");
    const r = bloc?.propsSchema.safeParse(propsDeList(true));
    expect(r?.success).toBe(false);
  });

  it("le digest ENSEIGNE la forme correcte, au lieu de la laisser deviner", () => {
    // C'est tout l'objet de la passe : le générateur ne pouvait pas savoir.
    // La grammaire ne l'imposait pas non plus — les props voyagent en flat
    // config, qui accepte les booléens.
    expect(digest()).toContain("filterValue? : string");
  });
});

describe("EP-153 · CLIQUET (règle d'EP-132) — par quel autre chemin ?", () => {
  it("le prompt ne RÉÉCRIT plus aucune prop à la main", () => {
    // Le chemin d'origine : une énumération manuelle qui vieillit. Les lignes
    // de blocs sont désormais interpolées, jamais écrites.
    const section = SOURCE.slice(
      SOURCE.indexOf("REGISTRE DES SMART BLOCKS"),
      SOURCE.indexOf("RAPPELS DE FORME"),
    );
    expect(section).toContain("${blocsDigest()}");
    // Aucune ligne de bloc écrite à la main ne subsiste dans cette section.
    expect(section).not.toMatch(/^- \\`(header|list|form|button)\\`/m);
  });

  it("ce qui RESTE écrit à la main est déclaré comme non déductible", () => {
    // Honnêteté : certaines règles (budget de filtres, paires obligatoires)
    // ne se lisent pas dans un schéma. Elles sont groupées et annoncées.
    expect(SOURCE).toContain("RAPPELS DE FORME, non déductibles du registre");
  });
});
