// EP-141 ② — OÙ SE TIENNENT LES PRIMITIVES.
//
// Accueil en PREMIÈRE position, Compte en DERNIÈRE, le domaine entre les
// deux. Écrit en RANGS et jamais en gauche-droite : en arabe la barre
// s'inverse, et une règle écrite en gauche-droite serait fausse ce jour-là.
import { describe, expect, it } from "vitest";
import {
  DESTINATIONS_MAX,
  DESTINATIONS_MIN,
  jugerBarreInferieure,
  jugerPositionPrimitives,
} from "../src/presentation.ts";
import { L, P, air, requis } from "./fixtures.ts";

const codes = (f: readonly { code: string }[]): string[] => f.map((x) => x.code);
const CTX = { entryScreenId: "scr_accueil", ecransDIdentite: ["scr_compte"] };

/** Barre conforme : accueil au rang 0, domaine au milieu, compte en dernier. */
function barre(rangs: { accueil: number; domaine: number; compte: number }): ReturnType<typeof air> {
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
        { id: "nav_accueil", screenId: "scr_accueil" },
        { id: "nav_domaine", screenId: "scr_domaine" },
        { id: "nav_compte", screenId: "scr_compte" },
      ],
      primary: {
        destinations: [
          { routeId: "nav_accueil", label: L("Accueil"), order: rangs.accueil, icon: "accueil" },
          { routeId: "nav_domaine", label: L("Domaine"), order: rangs.domaine, icon: "liste" },
          { routeId: "nav_compte", label: L("Compte"), order: rangs.compte, icon: "compte" },
        ],
      },
    },
  });
}

describe("EP-141 ② · base verte", () => {
  it("accueil premier, compte dernier : aucun diagnostic", () => {
    expect(codes(jugerPositionPrimitives(barre({ accueil: 0, domaine: 1, compte: 2 }), CTX)))
      .toEqual([]);
  });

  it("les rangs n'ont pas à commencer à zéro — c'est un ORDRE, pas un index", () => {
    expect(codes(jugerPositionPrimitives(barre({ accueil: 5, domaine: 9, compte: 12 }), CTX)))
      .toEqual([]);
  });
});

describe("EP-141 ② · l'accueil occupe la PREMIÈRE position", () => {
  it("l'accueil au milieu est refusé", () => {
    const f = jugerPositionPrimitives(barre({ accueil: 1, domaine: 0, compte: 2 }), CTX);
    expect(codes(f)).toEqual(["PRESENTATION_ACCUEIL_HORS_PREMIERE_POSITION"]);
    expect(requis(f[0], "f0").message).toContain("DÉCISION PRODUIT");
  });

  it("l'accueil en dernier est refusé DEUX fois — il prend la place du compte", () => {
    const f = jugerPositionPrimitives(barre({ accueil: 2, domaine: 1, compte: 0 }), CTX);
    expect(codes(f).sort()).toEqual([
      "PRESENTATION_ACCUEIL_HORS_PREMIERE_POSITION",
      "PRESENTATION_COMPTE_HORS_DERNIERE_POSITION",
    ]);
  });
});

describe("EP-141 ② · le compte occupe la DERNIÈRE position", () => {
  it("le compte au milieu est refusé", () => {
    expect(codes(jugerPositionPrimitives(barre({ accueil: 0, domaine: 2, compte: 1 }), CTX)))
      .toEqual(["PRESENTATION_COMPTE_HORS_DERNIERE_POSITION"]);
  });
});

describe("EP-141 ② · ce que la règle NE casse PAS", () => {
  it("une barre à DEUX destinations reste valide pour ce juge", () => {
    const m = barre({ accueil: 0, domaine: 1, compte: 2 });
    requis(m.navigation.primary, "m.navigation.primary").destinations = requis(m.navigation.primary, "m.navigation.primary").destinations.filter(
      (d) => d.routeId !== "nav_domaine",
    );
    // Accueil premier, compte dernier : rien à redire ICI. La borne de trois
    // relève de l'autre juge, et les deux ne se confondent pas.
    expect(codes(jugerPositionPrimitives(m, CTX))).toEqual([]);
  });

  it("la borne de Material tient toujours, et c'est un juge SÉPARÉ", () => {
    const m = barre({ accueil: 0, domaine: 1, compte: 2 });
    expect(requis(m.navigation.primary, "m.navigation.primary").destinations.length).toBeGreaterThanOrEqual(DESTINATIONS_MIN);
    expect(requis(m.navigation.primary, "m.navigation.primary").destinations.length).toBeLessThanOrEqual(DESTINATIONS_MAX);
    expect(codes(jugerBarreInferieure(m))).toEqual([]);
  });

  it("aucune barre, aucun jugement", () => {
    const m = barre({ accueil: 0, domaine: 1, compte: 2 });
    delete m.navigation.primary;
    expect(codes(jugerPositionPrimitives(m, CTX))).toEqual([]);
  });
});

describe("EP-141 ② · CLIQUET — la règle est écrite en RANGS", () => {
  it("ni gauche ni droite dans le code de la règle", () => {
    // En arabe la barre s'inverse. Une règle écrite en gauche-droite sera
    // fausse ce jour-là ; `order` est un rang, indépendant du sens de lecture.
    const source = jugerPositionPrimitives.toString().toLocaleLowerCase();
    for (const mot of ["gauche", "droite", "left", "right", "ltr", "rtl"]) {
      expect(source.includes(mot), `« ${mot} »`).toBe(false);
    }
  });

  it("l'identité décide, PAS l'icône — la leçon d'EP-130", () => {
    // Un document mesuré portait une icône « compte » sur un tout autre
    // écran. On reconnaît donc le compte à l'écran d'IDENTITÉ.
    const m = barre({ accueil: 0, domaine: 1, compte: 2 });
    requis(requis(m.navigation.primary, "m.navigation.primary").destinations[1], "rimarym.navigation.primary.destinations1").icon = "compte";
    expect(codes(jugerPositionPrimitives(m, CTX))).toEqual([]);
  });
});
