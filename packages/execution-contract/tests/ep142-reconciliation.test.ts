// EP-142 — RÉCONCILIATION DES OBLIGATIONS DE PUBLICATION.
//
// Quatre dettes, une famille : une obligation déclarée au contrat qui ne
// produit rien. « Lu sans effet » est le pire état — il donne l'apparence de
// la conformité sans la produire.
import { describe, expect, it } from "vitest";
import { jugerEspaceCompte, obligationsDuProprietaire, surfacesAttendues } from "../src/index.ts";
import type { GenreEcran } from "../src/presentation.ts";
import { L, P, air } from "./fixtures.ts";

const codes = (f: readonly { code: string }[]): string[] => f.map((x) => x.code);
const AVEC = { ecransDIdentite: ["scr_compte"] };
const SANS = { ecransDIdentite: [] };

function document(
  genres: readonly GenreEcran[],
  compliance: Partial<ReturnType<typeof air>["compliance"]> = {},
): ReturnType<typeof air> {
  const ecran = (id: string, purpose?: GenreEcran) => ({
    id,
    title: L(id),
    ...(purpose === undefined ? {} : { purpose }),
    blocks: [{ id: `blk_${id}`, blockType: "header" as const, props: P({ title: id }) }],
  });
  return air({
    screens: [
      ecran("scr_a"),
      ecran("scr_compte"),
      ...genres.map((g) => ecran(`scr_${g}`, g)),
    ],
    navigation: {
      entryScreenId: "scr_a",
      routes: [{ id: "nav_a", screenId: "scr_a" }],
    },
    actions: genres.map((g) => ({
      id: `act_${g}`,
      name: `ouvrir ${g}`,
      trigger: { kind: "ui" as const, blockId: `blk_scr_${g}` },
      effect: { kind: "navigate" as const, screenId: `scr_${g}` },
    })),
    compliance: {
      commerceClass: "none" as const,
      accountDeletionRequired: true,
      dataCollected: [],
      ...compliance,
    },
  });
}

describe("EP-142 ① · le fait et la surface sont la MÊME exigence", () => {
  it("des comptes sans déclaration de suppression : refusé, source citée", () => {
    const d = document(surfacesAttendues(true), { accountDeletionRequired: false });
    const f = jugerEspaceCompte(d, AVEC);
    expect(codes(f)).toContain("PRESENTATION_SUPPRESSION_NON_DECLAREE");
    expect(f.find((x) => x.code === "PRESENTATION_SUPPRESSION_NON_DECLAREE")!.message)
      .toContain("5.1.1(v)");
  });

  it("une déclaration sans la surface : refusée aussi — le fait doit PRODUIRE", () => {
    const sansSurface = surfacesAttendues(true).filter((g) => g !== "account_delete");
    const f = jugerEspaceCompte(document(sansSurface, { accountDeletionRequired: true }), AVEC);
    expect(codes(f)).toContain("PRESENTATION_SUPPRESSION_DECLAREE_SANS_SURFACE");
  });

  it("les deux d'accord : rien à dire", () => {
    expect(codes(jugerEspaceCompte(document(surfacesAttendues(true)), AVEC))).toEqual([]);
  });

  it("sans comptes, l'obligation ne s'invente pas", () => {
    const d = document(surfacesAttendues(false), { accountDeletionRequired: false });
    expect(codes(jugerEspaceCompte(d, SANS))).toEqual([]);
  });
});

describe("EP-142 ② · `dataCollected` pèse sur une sortie", () => {
  it("ce que le document déclare collecter est RENDU au propriétaire", () => {
    const d = document(surfacesAttendues(true), { dataCollected: ["location", "identifiers"] });
    const data = obligationsDuProprietaire(d).find((o) => o.quoi.includes("Data safety"));
    expect(data).toBeDefined();
    expect(data!.matiere).toEqual(["location", "identifiers"]);
    expect(data!.ou).toBe("console");
  });

  it("rien de collecté, rien à déclarer — la liste suit le document", () => {
    const d = document(surfacesAttendues(true), { dataCollected: [] });
    expect(obligationsDuProprietaire(d).some((o) => o.quoi.includes("Data safety"))).toBe(false);
  });
});

describe("EP-142 ④ · le lien web de suppression est DIT, pas inventé", () => {
  it("une application à comptes doit fournir une page web — Google exige les deux", () => {
    const o = obligationsDuProprietaire(document(surfacesAttendues(true)));
    const lien = o.find((x) => x.quoi.includes("web"));
    expect(lien).toBeDefined();
    expect(lien!.source).toContain("13327111");
    // Le moteur ne peut pas l'inventer : c'est une adresse du propriétaire.
    expect(lien!.ou).toBe("console");
  });

  it("sans comptes, ni lien web ni compte de démonstration", () => {
    const d = document(surfacesAttendues(false), { accountDeletionRequired: false });
    const o = obligationsDuProprietaire(d);
    expect(o.some((x) => x.quoi.includes("web"))).toBe(false);
    expect(o.some((x) => x.quoi.includes("démonstration"))).toBe(false);
  });
});

describe("EP-142 · la colonne 3 est DÉRIVÉE, jamais une liste fixe", () => {
  it("chaque obligation cite sa source et son lieu", () => {
    for (const o of obligationsDuProprietaire(document(surfacesAttendues(true)))) {
      expect(["console", "contenu", "compte_developpeur"]).toContain(o.ou);
      expect(o.source.length).toBeGreaterThan(10);
      expect(o.quoi.length).toBeGreaterThan(30);
    }
  });

  it("le texte des politiques est TOUJOURS dû — c'est ce que le moteur n'écrira jamais", () => {
    for (const compliance of [{ dataCollected: [] }, { accountDeletionRequired: false }]) {
      const o = obligationsDuProprietaire(document([], compliance));
      expect(o.some((x) => x.ou === "contenu")).toBe(true);
    }
  });

  it("une application plus simple doit MOINS de choses", () => {
    const riche = obligationsDuProprietaire(
      document(surfacesAttendues(true), { dataCollected: ["usage_data"] }),
    );
    const pauvre = obligationsDuProprietaire(
      document([], { accountDeletionRequired: false, dataCollected: [] }),
    );
    expect(pauvre.length).toBeLessThan(riche.length);
  });
});
