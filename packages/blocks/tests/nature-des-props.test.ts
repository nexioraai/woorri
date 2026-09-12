// EP-108 — LA NATURE D'UN PROP EST UNE PROPRIÉTÉ DU REGISTRE.
//
// Cause : le juge des références brutes parcourait TOUS les props de champ,
// donc `scopeFieldId` — que la règle C5 ORDONNE de poser sur un champ
// `reference`. Le moteur punissait ce qu'il ordonnait (oscillation ×4).
// La nature (affichage vs filtrage) n'était déclarée NULLE PART : elle est
// désormais au registre, en PARTITION EXHAUSTIVE — un prop futur ne peut
// pas être oublié en silence, le cliquet mord.
import { describe, expect, it } from "vitest";
import { getBlock, listBlockIds } from "../src/registry.ts";

describe("partition exhaustive — aucun prop de champ ne peut être oublié", () => {
  it("tout fieldRefProp est classé EXACTEMENT une fois : affichage OU filtrage", () => {
    for (const id of listBlockIds()) {
      const d = getBlock(id);
      if (d === undefined) continue;
      const aff = new Set(d.fieldRefPropsAffichage);
      const fil = new Set(d.fieldRefPropsFiltrage);
      for (const prop of d.fieldRefProps) {
        const dansAff = aff.has(prop);
        const dansFil = fil.has(prop);
        expect(dansAff || dansFil, `${id}.${prop} : non classé — ajoute-le à affichage OU filtrage`).toBe(true);
        expect(dansAff && dansFil, `${id}.${prop} : classé DEUX fois`).toBe(false);
      }
      // et rien ne se classe qui ne soit pas un prop de champ.
      for (const prop of [...aff, ...fil]) {
        expect(d.fieldRefProps, `${id}.${prop} hors fieldRefProps`).toContain(prop);
      }
    }
  });

  it("les natures sont celles que le moteur rend : scope/filtre/tri ne s'affichent pas", () => {
    const list = getBlock("list");
    expect(list?.fieldRefPropsFiltrage).toContain("scopeFieldId");
    expect(list?.fieldRefPropsFiltrage).toContain("filterFieldId");
    expect(list?.fieldRefPropsFiltrage).toContain("sortFieldId");
    expect(list?.fieldRefPropsAffichage).toContain("titleFieldId");
    expect(list?.fieldRefPropsAffichage).not.toContain("scopeFieldId");
  });
});
