// EP-130 — LA LOI DU PLACEMENT. Chaque mutation est ISOLÉE : une base verte,
// un seul écart, un seul diagnostic attendu.
//
// Les juges de cette passe ne sont PAS dérivés d'un défaut mesuré — ils
// dérivent des CONVENTIONS documentées des plateformes, citées dans
// `presentation.ts` [S1][S2][S3]. Les tests vérifient donc deux choses :
// que la convention est appliquée, et que ce qui la respecte reste VERT.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  jugerBarreInferieure,
  jugerExclusivite,
  jugerPositionRecherche,
  jugerGenreRacineCompte,
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

describe("EP-131 · ① l'emplacement « titre » de la barre supérieure", () => {
  // Base verte : l'en-tête natif porte le titre, et un bloc voisin porte un
  // texte DIFFÉRENT — un contenu éditorial, pas un second titre.
  const avecEnteteEtBloc = (titreBloc: string, masquee = false): ReturnType<typeof air> => {
    const a = baseVerte();
    a.screens[1] = {
      id: "scr_b",
      title: L("Titre de l'écran"),
      ...(masquee ? { showsScreenTitle: false } : {}),
      blocks: [{ id: "blk_b_h", blockType: "header", props: P({ title: titreBloc }) }],
    };
    return a;
  };

  it("laisse passer un bloc qui porte un texte DIFFÉRENT", () => {
    expect(codes(jugerExclusivite(avecEnteteEtBloc("Une phrase à elle")))).toEqual([]);
  });

  it("refuse un bloc qui REDIT le titre déjà porté par l'en-tête natif", () => {
    const f = jugerExclusivite(avecEnteteEtBloc("Titre de l'écran"));
    expect(codes(f)).toEqual(["PRESENTATION_TITRE_REPETE"]);
    expect(f[0]!.message).toContain("blk_b_h");
  });

  it("ignore la casse et les espaces — c'est la même donnée redite", () => {
    expect(codes(jugerExclusivite(avecEnteteEtBloc("  TITRE DE L'ÉCRAN ")))).toEqual([
      "PRESENTATION_TITRE_REPETE",
    ]);
  });

  it("laisse passer le même texte quand l'en-tête natif est MASQUÉ", () => {
    // Un seul titre à l'écran : le bloc prend la place laissée libre.
    expect(codes(jugerExclusivite(avecEnteteEtBloc("Titre de l'écran", true)))).toEqual([]);
  });

  it("ne confond pas un titre vide avec une répétition", () => {
    const a = avecEnteteEtBloc("");
    a.screens[1]!.title = L("");
    expect(codes(jugerExclusivite(a))).toEqual([]);
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
  it("DEUX DESTINATIONS PASSENT — « Accueil » et « Compte » suffisent", () => {
    // RÉVISÉ EN EP-190. La borne était à 3, d'après Material. TENUE PENDANT
    // TROIS PASSES, elle a produit la même impasse à chaque run : le plan
    // prescrit 2 destinations — celles que Youssouf exige dans TOUTE
    // application — le juge en réclame 3, et le générateur en INVENTE une
    // troisième puis lui laisse `showsPrimaryNav: false`. Seul diagnostic
    // bloquant de QUATRE runs consécutifs.
    //
    // Une application dont le domaine ne porte que deux lieux n'a que deux
    // onglets. Exiger un troisième, c'est demander d'inventer un lieu.
    const mute = baseVerte();
    mute.navigation.primary!.destinations.pop();
    expect(mute.navigation.primary!.destinations.length).toBe(2);
    expect(codes(jugerBarreInferieure(mute))).not.toContain(
      "PRESENTATION_DESTINATIONS_HORS_BORNES",
    );
  });

  it("UNE SEULE destination reste refusée — ce n'est plus une barre", () => {
    const mute = baseVerte();
    mute.navigation.primary!.destinations.pop();
    mute.navigation.primary!.destinations.pop();
    expect(codes(jugerBarreInferieure(mute))).toContain(
      "PRESENTATION_DESTINATIONS_HORS_BORNES",
    );
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

describe("EP-191 · le genre de la racine du compte", () => {
  // CE QUE CE JUGE GARDE, ET IL A ÉTÉ PAYÉ QUATRE RUNS : le compte n'était
  // nommé NULLE PART au document. Il se dérivait du modèle, hors de l'AIR, et
  // se transmettait au compilateur par une option que les NEUF appelants réels
  // omettaient (EP-190 ⑤). Le libellé « Compte » n'a donc jamais été posé, et
  // le défaut s'est vu sur l'appareil. Le genre vit désormais au document —
  // et ce qu'un moteur exige, il doit le vérifier, sinon ce n'est qu'un vœu.
  const avecGenre = (ecran: string) => {
    const a = baseVerte();
    return {
      ...a,
      screens: a.screens.map((e) => (e.id === ecran ? { ...e, purpose: "account_home" } : e)),
    } as ReturnType<typeof air>;
  };

  it("ABSENT alors que le modèle porte une identité — il manque", () => {
    expect(codes(jugerGenreRacineCompte(baseVerte(), CTX))).toEqual([
      "PRESENTATION_GENRE_RACINE_COMPTE_ABSENT",
    ]);
  });

  it("POSÉ SUR L'ÉCRAN D'IDENTITÉ — rien à dire", () => {
    expect(codes(jugerGenreRacineCompte(avecGenre("scr_c"), CTX))).toEqual([]);
  });

  it("POSÉ AILLEURS — il ment, et c'est pire qu'absent", () => {
    // Un genre qui désigne le mauvais écran intitule « Compte » une surface
    // qui n'en est pas une : l'utilisateur y cherche son compte et ne le
    // trouve pas, sans qu'aucun juge ne l'ait dit.
    expect(codes(jugerGenreRacineCompte(avecGenre("scr_b"), CTX))).toEqual([
      "PRESENTATION_GENRE_RACINE_COMPTE_DEPLACE",
    ]);
  });

  it("POSÉ DEUX FOIS — l'espace compte est UN lieu", () => {
    const a = avecGenre("scr_c");
    const deux = {
      ...a,
      screens: a.screens.map((e) => (e.id === "scr_b" ? { ...e, purpose: "account_home" } : e)),
    } as ReturnType<typeof air>;
    expect(codes(jugerGenreRacineCompte(deux, CTX))).toEqual([
      "PRESENTATION_GENRE_RACINE_COMPTE_MULTIPLE",
      "PRESENTATION_GENRE_RACINE_COMPTE_DEPLACE",
    ]);
  });

  it("SANS IDENTITÉ AU MODÈLE — le juge se tait, il ne fabrique pas d'écran", () => {
    // L'absence est ici le cas JUSTE : une application sans comptes n'a pas
    // d'espace compte et n'en gagne pas un de force.
    expect(codes(jugerGenreRacineCompte(baseVerte(), { ecransDIdentite: [] }))).toEqual([]);
  });

  it("LE CLIQUET — le juge a un APPELANT (EP-161)", () => {
    // Un juge sans appelant ne juge rien. Les deux chemins réels l'invoquent :
    // la validation du contrat, et le segment `base` de l'émission.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "src", "presentation.ts"),
      "utf8",
    );
    const appels = [...src.matchAll(/\.\.\.jugerGenreRacineCompte\(/g)].length;
    expect(appels, "le juge n'est plus appelé dans le contrat").toBeGreaterThanOrEqual(1);
    const acc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "benchmarks", "air-emission", "acceptation.mjs"),
      "utf8",
    );
    expect(acc, "le juge n'est plus appelé au segment base").toContain("jugerGenreRacineCompte");
  });
});
