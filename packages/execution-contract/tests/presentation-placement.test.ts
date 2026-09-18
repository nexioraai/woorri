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
  jugerCompteSelonSession,
  jugerFicheDIdentite,
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

  it("EP-192 — UN DOCUMENT SANS `screens` NE LE FAIT PAS TOMBER", () => {
    // LE DÉFAUT QUE CE TEST GARDE, ET IL A COÛTÉ UN RUN À 0,56 $ : l'émission
    // est SEGMENTÉE. Au segment `base`, `navigation` existe déjà et `screens`
    // PAS ENCORE. Ce juge y était branché ; `undefined.filter` a arrêté le run
    // au troisième appel.
    //
    // ET AUCUN DES CINQ TESTS AU-DESSUS NE POUVAIT LE VOIR : tous lui passent
    // un document COMPLET. C'est la faute même qu'EP-191 réparait — un test
    // qui fournit ce que la chaîne ne fournit pas ne mesure pas la chaîne —
    // recommise en la réparant.
    const sansEcrans = { ...baseVerte(), screens: undefined } as unknown as ReturnType<typeof air>;
    expect(() => jugerGenreRacineCompte(sansEcrans, CTX)).not.toThrow();
    // Et il le DIT plutôt que de se taire : un compte attendu reste manquant.
    expect(codes(jugerGenreRacineCompte(sansEcrans, CTX))).toEqual([
      "PRESENTATION_GENRE_RACINE_COMPTE_ABSENT",
    ]);
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
    expect(acc, "le juge n'est plus appelé dans l'émission").toContain("jugerGenreRacineCompte");
    // EP-192 — ET IL NE DOIT PAS REVENIR AU SEGMENT `base`, où les écrans
    // n'existent pas encore. `jugerBase` est la frontière : le juge est
    // AILLEURS, auprès de ceux qui lisent `screens`.
    const base = acc.slice(acc.indexOf("export function jugerBase"), acc.indexOf("export function", acc.indexOf("export function jugerBase") + 10));
    expect(base, "le juge est retourné au segment base, où screens est undefined")
      .not.toContain("jugerGenreRacineCompte");
  });
});

describe("EP-193 · LE CRIBLE INVERSÉ — un juge ne lit pas ce qui n'est pas encore émis", () => {
  // CE QUE CE CLIQUET GARDE, ET IL A DÉJÀ COÛTÉ 0,56 $ : l'émission est
  // SEGMENTÉE. Au segment `base`, `navigation` existe et `screens` PAS ENCORE.
  // Un juge branché là qui lit `screens` jette `undefined.filter` et arrête le
  // run — pas au banc d'essai, mais en production, après un appel payant.
  //
  // EP-170 avait établi le crible dans un sens : quel segment suffit à un
  // juge ? Celui-ci le prend à L'ENVERS, comme Youssouf l'a demandé : pour
  // chaque juge DÉJÀ branché à un segment, ce qu'il lit est-il déjà émis ?
  //
  // Ni la liste des juges ni celle des sections ne sont écrites ici : les deux
  // sont DÉRIVÉES de leurs sources — le motif « une liste écrite deux fois
  // diverge » est le défaut dominant de ce dépôt, quatorze fois documenté.
  const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const lire = (...p: string[]): string => readFileSync(join(RACINE, ...p), "utf8");

  /** Les sections émises au segment `base` — DÉRIVÉES de PARTS, jamais recopiées. */
  const sectionsDuSegmentBase = (): string[] => {
    const src = lire("benchmarks", "air-emission", "emit-v3.mjs");
    const i = src.indexOf('name: "base"');
    const debut = src.indexOf("keys: [", i);
    const bloc = src.slice(debut, src.indexOf("]", debut));
    return [...bloc.matchAll(/"(\w+)"/g)].map((m) => m[1]!);
  };

  /** Les juges branchés dans `jugerBase` — DÉRIVÉS de l'appelant réel. */
  const jugesDuSegmentBase = (): string[] => {
    const acc = lire("benchmarks", "air-emission", "acceptation.mjs");
    const i = acc.indexOf("export function jugerBase");
    const j = acc.indexOf("export function", i + 10);
    const corps = acc.slice(i, j === -1 ? acc.length : j);
    return [...new Set([...corps.matchAll(/presentation\.(juger\w+)/g)].map((m) => m[1]!))];
  };

  /** Ce qu'un juge lit de l'AIR — directement, et via ses helpers locaux. */
  const sectionsLues = (nom: string, src: string, vus = new Set<string>()): string[] => {
    if (vus.has(nom)) return [];
    vus.add(nom);
    const i = src.search(new RegExp(`(export function|function|const) ${nom}\\b`));
    if (i === -1) return [];
    const j = src.indexOf("\nexport function", i + 10);
    const corps = src.slice(i, j === -1 ? Math.min(src.length, i + 6000) : j);
    const directes = [...corps.matchAll(/\bair\.(\w+)/g)].map((m) => m[1]!);
    // Les lectures INDIRECTES comptent aussi : un helper qui lit `air.screens`
    // fait tomber son appelant exactement pareil.
    const helpers = [...new Set([...corps.matchAll(/\b([a-z][a-zA-Z0-9]*)\(/g)].map((m) => m[1]!))];
    const indirectes = helpers.flatMap((h) =>
      h === nom || /^(if|for|while|return|String|Number|Object|Array|Set|Map)$/.test(h)
        ? []
        : sectionsLues(h, src, vus),
    );
    return [...new Set([...directes, ...indirectes])];
  };

  it("AUCUN juge du segment `base` ne lit une section non encore émise", () => {
    const emises = new Set(sectionsDuSegmentBase());
    expect(emises.size, "les sections du segment base n'ont pas été dérivées").toBeGreaterThan(0);
    const src = lire("packages", "execution-contract", "src", "presentation.ts");
    const juges = jugesDuSegmentBase();
    expect(juges.length, "aucun juge dérivé — le crible ne mesure rien").toBeGreaterThan(0);

    const fautifs: string[] = [];
    for (const nom of juges) {
      const corpsI = src.search(new RegExp(`export function ${nom}\\b`));
      if (corpsI === -1) continue;
      const j = src.indexOf("\nexport function", corpsI + 10);
      const corps = src.slice(corpsI, j === -1 ? src.length : j);
      for (const section of sectionsLues(nom, src)) {
        if (emises.has(section)) continue;
        // Une lecture GARDÉE (`air.x ?? []`, `air.x?.`) ne jette pas.
        const gardee = new RegExp(`air\\.${section}\\s*\\?\\?|air\\.${section}\\?\\.`).test(corps);
        if (!gardee) fautifs.push(`${nom} lit air.${section}, non émis au segment base`);
      }
    }
    expect(fautifs, fautifs.join(" · ")).toEqual([]);
  });

  it("LE CRIBLE MORD — un juge fautif serait vu", () => {
    // Un cliquet qui ne tombe pas quand on retire ce qu'il garde ne garde rien
    // (EP-165 ③c). On rejoue ici la logique sur un juge FICTIF qui lit une
    // section absente : le crible doit le désigner.
    const emises = new Set(sectionsDuSegmentBase());
    const faux = "export function jugerFictif(air) {\n  return air.screens.filter((e) => e);\n}";
    const lues = [...new Set([...faux.matchAll(/\bair\.(\w+)/g)].map((m) => m[1]!))];
    const manquantes = lues.filter((x) => !emises.has(x));
    expect(manquantes, "le crible ne verrait pas un juge lisant `screens`").toContain("screens");
  });
});

describe("EP-196 · la fiche d'identité ne demande que ce qu'il faut pour entrer", () => {
  // RÈGLE DE YOUSSOUF, APRÈS INSPECTION : « pas besoin de nous casser les
  // couilles avec d'autres trucs ». MESURÉ sur le document du run : la fiche
  // « Créer un compte » portait SEPT champs — type, ville, téléphone, whatsapp
  // en plus des trois dus. Quatre questions posées avant même d'avoir un
  // compte, quand rien ne les exige pour en ouvrir un.
  //
  // Aucun nom de champ ni de domaine ici : le discriminant est `sensitive`,
  // que le schéma porte depuis 1.12.0.
  const avecFiche = (champs: readonly string[], roles: readonly string[]) => {
    const a = baseVerte();
    return {
      ...a,
      entities: [
        {
          id: "ent_x",
          name: "x",
          fields: [
            { id: "fld_1", name: "f1", type: "string", required: true },
            { id: "fld_2", name: "f2", type: "string", required: true },
            { id: "fld_3", name: "f3", type: "string", required: true },
            { id: "fld_4", name: "f4", type: "string", required: true },
            { id: "fld_s", name: "s", type: "string", required: true, sensitive: true },
          ],
        },
      ],
      screens: a.screens.map((e) =>
        e.id === "scr_b"
          ? {
              ...e,
              blocks: [
                {
                  id: "blk_f",
                  blockType: "form",
                  props: P({ fieldIds: [...champs], saisieRoles: [...roles] }),
                },
              ],
            }
          : e,
      ),
    } as unknown as ReturnType<typeof air>;
  };

  it("DEUX CHAMPS POUR SE CONNECTER — identifiant et secret, rien de plus", () => {
    expect(codes(jugerFicheDIdentite(avecFiche(["fld_1", "fld_s"], ["verification"])))).toEqual([]);
  });

  it("TROIS POUR CRÉER — nom, identifiant, secret, avec confirmation", () => {
    expect(
      codes(jugerFicheDIdentite(avecFiche(["fld_1", "fld_2", "fld_s"], ["confirmation"]))),
    ).toEqual([]);
  });

  it("SEPT CHAMPS SONT REFUSÉS — le profil se remplit APRÈS, pas pour entrer", () => {
    // LE DÉFAUT QUE CE CAS GARDE, et il était à l'écran.
    const r = codes(
      jugerFicheDIdentite(avecFiche(["fld_1", "fld_2", "fld_3", "fld_4", "fld_s"], ["confirmation"])),
    );
    expect(r).toContain("PRESENTATION_FICHE_IDENTITE_SURCHARGEE");
  });

  it("UN SECRET ENREGISTRÉ SANS CONFIRMATION EST REFUSÉ — la faute de frappe enferme dehors", () => {
    const r = codes(jugerFicheDIdentite(avecFiche(["fld_1", "fld_s"], ["acceptation"])));
    expect(r).toContain("PRESENTATION_SECRET_SANS_CONFIRMATION");
  });

  it("UNE FICHE SANS SECRET N'EST PAS CONCERNÉE — le juge ne déborde pas", () => {
    // Un formulaire métier à dix champs reste légitime : la règle ne vise que
    // ce qui fait entrer dans un compte.
    expect(
      codes(jugerFicheDIdentite(avecFiche(["fld_1", "fld_2", "fld_3", "fld_4"], []))),
    ).toEqual([]);
  });

  it("SANS AUCUN CHAMP SENSIBLE AU DOCUMENT, LE JUGE SE TAIT", () => {
    expect(codes(jugerFicheDIdentite(baseVerte()))).toEqual([]);
  });
});

describe("EP-197 · l'espace compte sert les DEUX états de session", () => {
  // RÈGLE DE YOUSSOUF : « quand l'utilisateur n'a pas créé son compte, montrer
  // créer son compte ; s'il se connecte, afficher déconnecter et gérer son
  // compte. »
  //
  // VÉRIFIÉ AVANT D'ÉCRIRE CE JUGE, et le résultat a changé ce qu'il fallait
  // faire : le document du run POSAIT DÉJÀ les bons prédicats, et le runtime
  // les honore. La règle était SUIVIE SANS ÊTRE EXIGÉE — et c'est le danger :
  // un générateur qui fait bien sans y être tenu fera mal un jour, comme en
  // EP-191 où le silence a coûté quatre runs.
  const CTX_COMPTE = { ecransDIdentite: ["scr_b"] };
  const avecEtats = (kinds: readonly (string | undefined)[]) => {
    const a = baseVerte();
    return {
      ...a,
      screens: a.screens.map((e) =>
        e.id === "scr_b"
          ? {
              ...e,
              blocks: kinds.map((k, i) => ({
                id: `blk_${String(i)}`,
                blockType: "button",
                props: P({ label: `b${String(i)}`, kind: "primary" }),
                ...(k === undefined ? {} : { visibleWhen: { kind: k } }),
              })),
            }
          : e,
      ),
    } as unknown as ReturnType<typeof air>;
  };

  it("LES DEUX ÉTATS SERVIS — rien à dire", () => {
    expect(
      codes(jugerCompteSelonSession(avecEtats(["session_anonymous", "session_authenticated"]), CTX_COMPTE)),
    ).toEqual([]);
  });

  it("SANS L'ÉTAT CONNECTÉ — l'utilisateur n'a aucune sortie", () => {
    const r = jugerCompteSelonSession(avecEtats(["session_anonymous"]), CTX_COMPTE);
    expect(codes(r)).toEqual(["PRESENTATION_COMPTE_ETAT_NON_SERVI"]);
    expect(r[0]?.message).toContain("aucune sortie");
  });

  it("SANS L'ÉTAT ANONYME — le visiteur trouve une porte sans poignée", () => {
    const r = jugerCompteSelonSession(avecEtats(["session_authenticated"]), CTX_COMPTE);
    expect(codes(r)).toEqual(["PRESENTATION_COMPTE_ETAT_NON_SERVI"]);
    expect(r[0]?.message).toContain("porte sans poignée");
  });

  it("AUCUN PRÉDICAT DU TOUT — tous les boutons s'affichent ensemble", () => {
    // LE DÉFAUT QUE CE CAS GARDE : entrer et sortir proposés en même temps.
    expect(codes(jugerCompteSelonSession(avecEtats([undefined, undefined]), CTX_COMPTE))).toEqual([
      "PRESENTATION_COMPTE_ETAT_NON_SERVI",
    ]);
  });

  it("HORS DE L'ESPACE COMPTE, LE JUGE NE DÉBORDE PAS", () => {
    expect(codes(jugerCompteSelonSession(avecEtats([undefined]), { ecransDIdentite: [] }))).toEqual([]);
  });
});
