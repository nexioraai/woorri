// EP-130 — LA LOI DU PLACEMENT. Chaque mutation est ISOLÉE : une base verte,
// un seul écart, un seul diagnostic attendu.
//
// Les juges de cette passe ne sont PAS dérivés d'un défaut mesuré — ils
// dérivent des CONVENTIONS documentées des plateformes, citées dans
// `presentation.ts` [S1][S2][S3]. Les tests vérifient donc deux choses :
// que la convention est appliquée, et que ce qui la respecte reste VERT.
import { describe, expect, it } from "vitest";
import {
  jugerBarreInferieure,
  jugerExclusivite,
  jugerPositionRecherche,
  jugerPrimitivesDeNavigation,
} from "../src/presentation.ts";
import { L, P, air } from "./fixtures.ts";

const codes = (f: readonly { code: string }[]): string[] => f.map((x) => x.code);

type Dest = NonNullable<ReturnType<typeof air>["navigation"]["primary"]>["destinations"][number];
const dest = (routeId: string, icon: Dest["icon"], order: number): Dest => ({
  routeId,
  label: L(routeId),
  order,
  ...(icon === undefined ? {} : { icon }),
});

/** Base VERTE : un accueil, un espace compte, trois destinations, icônes. */
const baseVerte = (): ReturnType<typeof air> =>
  air({
    screens: [
      {
        id: "scr_a",
        title: L("A"),
        blocks: [
          { id: "blk_a_s", blockType: "search_entry", props: P({ placeholder: "…" }) },
        ],
      },
      { id: "scr_b", title: L("B"), blocks: [] },
      { id: "scr_c", title: L("C"), blocks: [] },
    ],
    navigation: {
      entryScreenId: "scr_a",
      routes: [
        { id: "nav_a", screenId: "scr_a" },
        { id: "nav_b", screenId: "scr_b" },
        { id: "nav_c", screenId: "scr_c" },
      ],
      primary: {
        destinations: [
          dest("nav_a", "accueil", 0),
          dest("nav_b", "liste", 1),
          dest("nav_c", "compte", 2),
        ],
      },
    },
  });

const CTX = { entryScreenId: "scr_a", ecransDIdentite: ["scr_c"] };
const enChrome = (): string => "chrome";

describe("EP-130 · base verte", () => {
  it("ne rend AUCUN diagnostic de placement", () => {
    const base = baseVerte();
    expect(codes(jugerExclusivite(base))).toEqual([]);
    expect(codes(jugerPositionRecherche(base, enChrome))).toEqual([]);
    expect(codes(jugerBarreInferieure(base))).toEqual([]);
    expect(codes(jugerPrimitivesDeNavigation(base, CTX))).toEqual([]);
  });
});

describe("EP-130 · ① un emplacement porte UN élément", () => {
  it("refuse deux recherches sur le même écran", () => {
    const mute = baseVerte();
    mute.screens[0]!.blocks.push({
      id: "blk_a_s2",
      blockType: "search_entry",
      props: P({ placeholder: "…" }),
    });
    expect(codes(jugerExclusivite(mute))).toEqual(["PRESENTATION_EMPLACEMENT_OCCUPE"]);
    expect(jugerExclusivite(mute)[0]!.message).toContain("blk_a_s, blk_a_s2");
  });

  it("n'invente pas de collision entre écrans différents", () => {
    const mute = baseVerte();
    mute.screens[1]!.blocks.push({
      id: "blk_b_s",
      blockType: "search_entry",
      props: P({ placeholder: "…" }),
    });
    expect(codes(jugerExclusivite(mute))).toEqual([]);
  });
});

describe("EP-130 · ② la recherche est en haut [S3]", () => {
  it("refuse une recherche tombée dans le flux défilant", () => {
    const base = baseVerte();
    const f = jugerPositionRecherche(base, () => "contenu");
    expect(codes(f)).toEqual(["PRESENTATION_RECHERCHE_HORS_BARRE"]);
    expect(f[0]!.message).toContain("défilerait");
  });
});

describe("EP-130 · ③ la barre inférieure [S1]", () => {
  it("refuse moins de trois destinations", () => {
    const mute = baseVerte();
    mute.navigation.primary!.destinations.pop();
    expect(codes(jugerBarreInferieure(mute))).toEqual([
      "PRESENTATION_DESTINATIONS_HORS_BORNES",
    ]);
  });

  it("refuse plus de cinq destinations", () => {
    const mute = baseVerte();
    for (const i of [1, 2, 3]) {
      mute.screens.push({ id: `scr_x${String(i)}`, title: L("X"), blocks: [] });
      mute.navigation.routes.push({ id: `nav_x${String(i)}`, screenId: `scr_x${String(i)}` });
      mute.navigation.primary!.destinations.push(dest(`nav_x${String(i)}`, "liste", 2 + i));
    }
    expect(codes(jugerBarreInferieure(mute))).toEqual([
      "PRESENTATION_DESTINATIONS_HORS_BORNES",
    ]);
  });

  it("refuse une destination sans icône", () => {
    const mute = baseVerte();
    delete mute.navigation.primary!.destinations[1]!.icon;
    expect(codes(jugerBarreInferieure(mute))).toEqual([
      "PRESENTATION_DESTINATION_SANS_ICONE",
    ]);
  });

  it("ne juge rien quand il n'y a pas de barre", () => {
    const mute = baseVerte();
    delete mute.navigation.primary;
    expect(codes(jugerBarreInferieure(mute))).toEqual([]);
    expect(codes(jugerPrimitivesDeNavigation(mute, CTX))).toEqual([]);
  });
});

describe("EP-130 · ③ primitives — DÉCISION PRODUIT, pas convention", () => {
  it("refuse une barre qui ne ramène pas à l'accueil", () => {
    const mute = baseVerte();
    mute.navigation.primary!.destinations[0] = dest("nav_b", "accueil", 0);
    expect(codes(jugerPrimitivesDeNavigation(mute, CTX))).toEqual([
      "PRESENTATION_ACCUEIL_ABSENT",
    ]);
  });

  it("refuse une barre sans espace compte", () => {
    const mute = baseVerte();
    mute.navigation.primary!.destinations[2] = dest("nav_b", "compte", 2);
    expect(codes(jugerPrimitivesDeNavigation(mute, CTX))).toEqual([
      "PRESENTATION_ESPACE_COMPTE_ABSENT",
    ]);
  });

  // LE PIÈGE, tenu en test : un document mesuré portait exactement cela —
  // une icône « compte » posée sur un écran d'un tout autre parcours.
  it("ne prend PAS une icône « compte » pour un espace compte", () => {
    const mute = baseVerte();
    mute.navigation.primary!.destinations[1]!.icon = "compte";
    mute.navigation.primary!.destinations[2] = dest("nav_b", "liste", 2);
    const f = jugerPrimitivesDeNavigation(mute, CTX);
    expect(codes(f)).toEqual(["PRESENTATION_ESPACE_COMPTE_ABSENT"]);
    expect(f[0]!.message).toContain("une icône « compte » posée ailleurs");
  });

  it("nomme la cause quand le MODÈLE ne porte aucune identité", () => {
    const f = jugerPrimitivesDeNavigation(baseVerte(), {
      entryScreenId: "scr_a",
      ecransDIdentite: [],
    });
    expect(codes(f)).toEqual(["PRESENTATION_ESPACE_COMPTE_ABSENT"]);
    expect(f[0]!.message).toContain("AUCUN concept d'identité");
  });
});
