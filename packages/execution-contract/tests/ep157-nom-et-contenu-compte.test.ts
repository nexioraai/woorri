// EP-157 — LE NOM ET LE CONTENU DU COMPTE.
//
// CONSTATÉ À L'APPAREIL (run EP-156) : la barre portait « Accueil · Mon
// espace · Inscription ». Le générateur nomme librement ; il a appelé le
// compte « Mon espace », et promu la création de compte en destination.
// La primitive d'EP-130 était satisfaite par un écran qui ne porte pas son nom.
import { describe, expect, it } from "vitest";
import {
  LIBELLES_PRIMITIFS,
  ORDRE_BAS_DE_COMPTE,
  jugerBasDeCompte,
  jugerLibellesPrimitifs,
} from "../src/index.ts";
import type { GenreEcran } from "../src/presentation.ts";
import { L, P, air, requis } from "./fixtures.ts";

type Air = ReturnType<typeof air>;
const codes = (f: readonly { code: string }[]): string[] => f.map((x) => x.code);
const CTX = { entryScreenId: "scr_accueil", ecransDIdentite: ["scr_compte"] };

function barre(libelles: { accueil: string; compte: string; autre?: string }): Air {
  const ecran = (id: string) => ({
    id,
    title: L(id),
    blocks: [{ id: `blk_${id}`, blockType: "header" as const, props: P({ title: id }) }],
  });
  return air({
    screens: [ecran("scr_accueil"), ecran("scr_domaine"), ecran("scr_compte")],
    navigation: {
      entryScreenId: "scr_accueil",
      routes: [
        { id: "nav_a", screenId: "scr_accueil" },
        { id: "nav_d", screenId: "scr_domaine" },
        { id: "nav_c", screenId: "scr_compte" },
      ],
      primary: {
        destinations: [
          { routeId: "nav_a", label: L(libelles.accueil), order: 0, icon: "accueil" },
          { routeId: "nav_d", label: L(libelles.autre ?? "Soins"), order: 1, icon: "liste" },
          { routeId: "nav_c", label: L(libelles.compte), order: 2, icon: "compte" },
        ],
      },
    },
  });
}

describe("EP-157 ① · le libellé d'une primitive est IMPOSÉ", () => {
  it("les libellés justes ne produisent rien", () => {
    expect(codes(jugerLibellesPrimitifs(barre({ accueil: "Accueil", compte: "Compte" }), CTX)))
      .toEqual([]);
  });

  it("« Mon espace » est refusé — le cas exact vu à l'appareil", () => {
    const f = jugerLibellesPrimitifs(barre({ accueil: "Accueil", compte: "Mon espace" }), CTX);
    expect(codes(f)).toEqual(["PRESENTATION_LIBELLE_PRIMITIF_LIBRE"]);
    expect(requis(f[0], "f0").message).toContain("« Mon espace »");
    expect(requis(f[0], "f0").message).toContain("« Compte »");
    expect(requis(f[0], "f0").message).toContain("DÉCISION PRODUIT");
  });

  it("aucun synonyme n'est admis, même proche", () => {
    for (const variante of ["Mon compte", "Profil", "Espace client", "compte"]) {
      expect(
        codes(jugerLibellesPrimitifs(barre({ accueil: "Accueil", compte: variante }), CTX)),
        variante,
      ).toEqual(["PRESENTATION_LIBELLE_PRIMITIF_LIBRE"]);
    }
  });

  it("l'accueil est tenu de la même façon", () => {
    expect(codes(jugerLibellesPrimitifs(barre({ accueil: "Découvrir", compte: "Compte" }), CTX)))
      .toEqual(["PRESENTATION_LIBELLE_PRIMITIF_LIBRE"]);
  });

  it("les destinations du DOMAINE gardent leur liberté", () => {
    // Seules les deux primitives sont imposées : le domaine se nomme lui-même.
    expect(codes(jugerLibellesPrimitifs(
      barre({ accueil: "Accueil", compte: "Compte", autre: "Nos soins" }), CTX,
    ))).toEqual([]);
  });

  it("les deux libellés imposés sont exactement deux", () => {
    expect(Object.keys(LIBELLES_PRIMITIFS).sort()).toEqual(["accueil", "compte"]);
  });
});

describe("EP-157 ③ · le bas de l'espace compte a un ordre", () => {
  function compteAvec(genres: readonly GenreEcran[], suivi: readonly string[] = []): Air {
    const ecran = (id: string, purpose?: GenreEcran) => ({
      id,
      title: L(id),
      ...(purpose === undefined ? {} : { purpose }),
      blocks: [{ id: `blk_${id}`, blockType: "header" as const, props: P({ title: id }) }],
    });
    return air({
      screens: [
        ecran("scr_accueil"),
        {
          id: "scr_compte",
          title: L("Compte"),
          blocks: [
            { id: "blk_utile", blockType: "header", props: P({ title: "Compte" }) },
            ...genres.map((g) => ({
              id: `blk_${g}`,
              blockType: "button" as const,
              props: P({ label: g, actionId: `act_${g}` }),
            })),
            ...suivi.map((id) => ({
              id,
              blockType: "button" as const,
              props: P({ label: id, actionId: `act_${id}` }),
            })),
          ],
        },
        ...genres.map((g) => ecran(`scr_${g}`, g)),
      ],
      navigation: { entryScreenId: "scr_accueil", routes: [{ id: "nav_a", screenId: "scr_accueil" }] },
      actions: [
        ...genres.map((g) => ({
          id: `act_${g}`,
          name: `ouvrir ${g}`,
          trigger: { kind: "ui" as const, blockId: `blk_${g}` },
          effect: { kind: "navigate" as const, screenId: `scr_${g}` },
        })),
        ...suivi.map((id) => ({
          id: `act_${id}`,
          name: `autre ${id}`,
          trigger: { kind: "ui" as const, blockId: id },
          effect: { kind: "navigate" as const, screenId: "scr_accueil" },
        })),
      ],
    });
  }

  it("l'ordre de référence ne produit rien", () => {
    expect(codes(jugerBasDeCompte(compteAvec(ORDRE_BAS_DE_COMPTE), CTX))).toEqual([]);
  });

  it("un ordre inversé est refusé, et le message donne l'ordre attendu", () => {
    const f = jugerBasDeCompte(compteAvec([...ORDRE_BAS_DE_COMPTE].reverse()), CTX);
    expect(codes(f)).toEqual(["PRESENTATION_BAS_DE_COMPTE_DESORDONNE"]);
    expect(requis(f[0], "f0").message).toContain("help → contact → terms");
  });

  it("un sous-ensemble garde l'ordre relatif", () => {
    expect(codes(jugerBasDeCompte(compteAvec(["help", "privacy_policy"]), CTX))).toEqual([]);
    expect(codes(jugerBasDeCompte(compteAvec(["privacy_policy", "help"]), CTX)))
      .toEqual(["PRESENTATION_BAS_DE_COMPTE_DESORDONNE"]);
  });

  it("les renvois FERMENT l'écran — rien ne les suit", () => {
    const f = jugerBasDeCompte(compteAvec(ORDRE_BAS_DE_COMPTE, ["blk_apres"]), CTX);
    expect(codes(f)).toContain("PRESENTATION_BAS_DE_COMPTE_INTERROMPU");
  });

  it("un seul renvoi ne se juge pas — il n'y a pas d'ordre à un élément", () => {
    expect(codes(jugerBasDeCompte(compteAvec(["help"]), CTX))).toEqual([]);
  });
});
