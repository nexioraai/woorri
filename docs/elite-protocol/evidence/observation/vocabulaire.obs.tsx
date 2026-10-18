// ════════════════════════════════════════════════════════════════════
//  PREUVE — LE VOCABULAIRE DE BOLT EST RÉELLEMENT RENDU (cible NATIVE).
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI CE FICHIER EXISTE, ET C'EST UN AVEU MESURÉ.
//
// Le propriétaire a demandé, le 2026-10-18 : « est-ce que les absences sont
// couvertes des 2 côtés, web et appli native ». J'ai mesuré au lieu de
// répondre, et la mesure était sévère.
//
// Six éléments du tableau de comparaison avec Bolt n'étaient prouvés qu'au
// niveau de la COMPILATION — `ep261-carte-de-chiffre` et
// `ep263-catalogue-themes` joignent les fichiers émis et cherchent une chaîne.
// Mesuré : ZÉRO `createElement` dans ces deux fichiers. Aucun montage, sur
// AUCUNE des deux cibles.
//
//   · D9  la carte de chiffre        · D12 la barre de progression
//   · D10 la courbe                  · D13 la pastille de statut
//   · D7  le surtitre                · D18 la sémantique de couleur
//
// C'est exactement la famille « grepper n'est pas monter », qui m'a déjà coûté
// une fausse affirmation sur la pastille de statut : j'avais annoncé deux
// manques qui n'existaient pas, parce que j'avais cherché dans les DONNÉES ce
// qui se résout à l'exécution.
//
// Une chaîne présente dans un fichier émis prouve que le compilateur l'a
// écrite. Elle ne prouve pas qu'un œil la voit.
//
// ── CE QUE CE FICHIER TIENT, ET SON JUMEAU WEB AUSSI.
//
// `vocabulaire-web.obsweb.tsx` monte les MÊMES écrans sur la cible web. Les
// deux sont nécessaires : les primitives qui dessinent ces éléments ont deux
// implémentations, et l'avatar à initiales l'a prouvé au prix de 32/32
// applications web cassées.
//
// Le document est `tontine` — celui du propriétaire, et le seul qui porte à la
// fois la carte de chiffre, la courbe et le surtitre, sur le MÊME écran.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer, ReactTestInstance } from "react-test-renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { compilerANeuf } from "./app-fraiche.ts";

const DOCUMENT = "slices/tontine/tontine.air.json";
let APP = "";
beforeAll(async () => {
  const a = await compilerANeuf(DOCUMENT, "deribfy-vocabulaire");
  APP = a.base;
  expect(a.fichiers, "rien d'émis : il n'y a rien à monter").toBeGreaterThan(10);
}, 180_000);

async function monter(ecran: string): Promise<ReactTestRenderer> {
  const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(APP + "lib/runtime/form-state.tsx");
  const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(APP + "demo.data.ts");
  const Ecran = (await import(APP + `screens/${ecran}.tsx`)).default as () => unknown;
  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(DataRoot as never, { provider: buildDemoProvider(demoData) } as never,
        createElement(FormStateRoot as never, null as never, createElement(Ecran as never))) as never,
    );
  });
  return r!;
}

const parID = (r: ReactTestRenderer, fragment: string): ReactTestInstance[] =>
  r.root.findAll((n) => String((n.props as { testID?: string }).testID ?? "").includes(fragment));

/** Tout le texte rendu, à plat. */
const textes = (r: ReactTestRenderer): string[] =>
  r.root
    .findAll(() => true)
    .flatMap((n) => (Array.isArray(n.props.children) ? n.props.children : [n.props.children]))
    .filter((c): c is string => typeof c === "string");

describe("PREUVE NATIVE — le vocabulaire de Bolt est rendu", () => {
  it("D9 · LA CARTE DE CHIFFRE REND SES QUATRE CARTES, AVEC LEURS VALEURS", async () => {
    // Bolt ouvre son tableau de bord sur quatre cartes — solde, cotisations,
    // membres, échéance. Deribfy ne savait dessiner que sept formes, et le
    // manque n'était pas le thème mais le VOCABULAIRE.
    const r = await monter("scr_mon_tableau");
    const cartes = parID(r, "-item-");
    const t = textes(r);
    console.log(`\n[VOC] cartes de chiffre : ${String(cartes.length)}`);
    expect(cartes.length, "aucune carte de chiffre rendue").toBeGreaterThanOrEqual(4);
    // ── LA VALEUR, PAS SEULEMENT LA CARTE.
    //
    // Quatre cadres vides passeraient « quatre cartes ». On exige le nombre
    // ÉCRIT DANS LE DOCUMENT — le moteur n'en fabrique aucun (F3).
    expect(t, "la valeur de la carte n'atteint pas l'écran").toContain("265 000 FCFA");
    expect(t, "le libellé de la carte n'atteint pas l'écran").toContain("Cagnotte du tour");
    expect(t, "la légende de la carte n'atteint pas l'écran").toContain("+12,5 % ce mois-ci");
    r.unmount();
  });

  it("D10 · LA COURBE REND SES BARRES ET SES LIBELLÉS", async () => {
    // `graphique` était INEXPRIMABLE depuis sa création : il exigeait un
    // tableau d'OBJETS que `flatConfigSchema` refuse. Zéro document ne
    // pouvait le déclarer. Il est aplati depuis le registre 1.18.0 — et
    // jusqu'ici, personne n'avait vérifié qu'il se DESSINE.
    const r = await monter("scr_mon_tableau");
    const barres = parID(r, "-barre-");
    const t = textes(r);
    console.log(`[VOC] barres de la courbe : ${String(barres.length)}`);
    expect(barres.length, "aucune barre rendue : le graphique ne se dessine pas").toBeGreaterThan(2);
    expect(t, "le libellé de série n'atteint pas l'écran").toContain("Juil");
    expect(t, "la valeur de série n'atteint pas l'écran").toContain("120 000 FCFA");
    expect(t, "le titre du graphique n'atteint pas l'écran").toContain("Évolution de la cagnotte");
    r.unmount();
  });

  it("D12 · CHAQUE BARRE PORTE UNE LARGEUR — sinon le graphique est plat", async () => {
    // ── POURQUOI CE CONTRÔLE EST SÉPARÉ DU PRÉCÉDENT.
    //
    // Six barres rendues à largeur ZÉRO, ou toutes à la même, passeraient « six
    // barres ». La PROPORTION est ce qu'une courbe raconte ; sans elle, le
    // bloc est un décor qui ment.
    const r = await monter("scr_mon_tableau");
    // ── LA PROPORTION EST UN `flex`, PAS UNE LARGEUR EN POUR CENT.
    //
    // Ma première sonde cherchait `width: "NN%"` sur le nœud de la barre et
    // rendait ZÉRO. La primitive `Barre` dessine autrement, et il fallait la
    // LIRE plutôt que supposer sa forme : elle pose deux vues sœurs dans une
    // piste, l'une `flex: part`, l'autre `flex: 1 - part`. C'est la même
    // proportion, exprimée comme React Native l'exprime.
    //
    // Je l'ai découvert parce que le contrôle a rougi. Une sonde qui suppose
    // la forme de ce qu'elle mesure accuse le code de son propre défaut.
    // ── ON NE LIT QUE LE REMPLISSAGE, ET C'EST UNE CORRECTION.
    //
    // Ma première forme collectait TOUS les `flex` sous une barre. La primitive
    // en pose DEUX : `flex: part` pour le remplissage, `flex: 1 - part` pour le
    // reste. Mesuré par mutation — forcer le remplissage à `flex: 0` laissait
    // le contrôle VERT, parce que le RESTE, lui, variait encore et valait 1.
    //
    // Autrement dit : une courbe entièrement plate passait pour une courbe
    // vivante. On lit donc la PREMIÈRE valeur de chaque barre, qui est le
    // remplissage — ordre vérifié au montage, `[part, 1 - part]`.
    const aplatir = (s: unknown): { flex?: unknown }[] =>
      Array.isArray(s) ? s.flatMap(aplatir) : s === null || s === undefined || s === false ? [] : [s as { flex?: unknown }];
    const identite = (n: ReactTestInstance): string => {
      const p = n.props as Record<string, unknown>;
      return String(p["data-testid"] ?? p.testID ?? "");
    };
    // `findAll` rend plusieurs nœuds par barre (composite + hôte) : on
    // DÉDUPLIQUE par identité, sinon une seule barre compterait pour trois.
    const parBarre = new Map<string, number>();
    for (const n of parID(r, "-barre-")) {
      const id = identite(n);
      if (parBarre.has(id)) continue;
      const f = n
        .findAll(() => true)
        .flatMap((x) => aplatir((x.props as { style?: unknown }).style))
        .map((d) => d.flex)
        .filter((x): x is number => typeof x === "number");
      if (f.length > 0) parBarre.set(id, f[0] ?? 0);
    }
    const remplissages = [...parBarre.values()];
    const distinctes = [...new Set(remplissages.map((p) => p.toFixed(3)))];
    console.log(`[VOC] remplissages distincts : ${distinctes.slice(0, 6).join(" ")}`);
    expect(remplissages.length, "aucune barre ne porte de proportion").toBeGreaterThan(2);
    expect(
      distinctes.length,
      "toutes les barres ont le même remplissage : la courbe ne raconte rien",
    ).toBeGreaterThan(1);
    expect(
      remplissages.some((p) => p > 0.05),
      "toutes les barres sont vides : le graphique est un cadre",
    ).toBe(true);
    r.unmount();
  });

  it("D7 · LE SURTITRE EST RENDU — trois niveaux, pas deux", async () => {
    // Chaque écran de Bolt ouvre sur une petite ligne grise en capitales, puis
    // le grand titre, puis une phrase. Deribfy n'en portait que DEUX, et le
    // lecteur ne savait pas OÙ il était avant d'avoir lu le titre entier.
    const r = await monter("scr_mon_tableau");
    const t = textes(r);
    console.log(`[VOC] surtitre rendu : ${t.includes("PILOTAGE") ? "PILOTAGE" : "ABSENT"}`);
    expect(t, "le surtitre n'atteint pas l'écran").toContain("PILOTAGE");
    expect(t, "le titre n'atteint pas l'écran").toContain("Mon tableau de bord");
    // LES TROIS NIVEAUX, et dans l'ordre : le surtitre AVANT le titre.
    expect(
      t.indexOf("PILOTAGE"),
      "le surtitre arrive après le titre : il ne se lit plus comme un surtitre",
    ).toBeLessThan(t.indexOf("Mon tableau de bord"));
    r.unmount();
  });

  it("D13/D18 · LA PASTILLE PORTE SON TON — la couleur dit quelque chose", async () => {
    // ── CE CONTRÔLE RÉPARE UNE AFFIRMATION FAUSSE DE MA PART.
    //
    // J'avais annoncé « pastille de statut : absent » et « sémantique couleur :
    // débranchée ». Les DEUX étaient faux, et je l'ai découvert en montant :
    // le ton se résout à l'exécution via `champ?.enumTones?.[brut]`, donc un
    // grep dans les données ne pouvait pas le voir.
    //
    // Ce qui manquait n'était pas le mécanisme — c'était la PREUVE qu'il
    // agit. La voici, et elle manquait sur les deux cibles.
    const r = await monter("scr_mon_tableau");
    const lignes = parID(r, "-row-");
    expect(lignes.length, "aucune ligne : rien à juger").toBeGreaterThan(0);
    const tons = r.root
      .findAll(() => true)
      .map((n) => (n.props as { badgeTone?: unknown; tone?: unknown }).badgeTone ?? (n.props as { tone?: unknown }).tone)
      .filter((x): x is string => typeof x === "string");
    const distincts = [...new Set(tons)];
    console.log(`[VOC] tons de pastille rendus : ${distincts.join(" ")}`);
    expect(tons.length, "aucune pastille ne porte de ton").toBeGreaterThan(0);
    expect(
      distincts.length,
      "toutes les pastilles portent le même ton : la couleur ne dit rien",
    ).toBeGreaterThan(1);

    // ── ET LE TON EST PEINT, PAS SEULEMENT TRANSMIS.
    //
    // CE CONTRÔLE A ÉTÉ ÉCRIT TROIS FOIS, ET LES DEUX PREMIÈRES ÉTAIENT
    // FAIBLES. Mutation : faire ignorer le ton à la primitive — `tone ===
    // "success"` remplacé par `false`.
    //
    //   ① Je mesurais la PROP reçue par le composant. Transmettre n'est pas
    //      peindre : vert.
    //   ② Je comparais les styles de TOUTES les pastilles. `muted` a un rendu
    //      structurellement différent — pas de fond de pastille — donc il
    //      faisait varier l'ensemble à lui seul : vert encore.
    //
    // On compare donc les tons SÉMANTIQUES ENTRE EUX. C'est la propriété que
    // D18 réclame : « vert = entrée, rouge = sortie, systématique ». Si
    // `success`, `warn` et `error` se peignent de la même couleur, la
    // sémantique est débranchée — et c'est précisément ce qu'on avait cru
    // mesurer deux fois.
    const aplatirS = (s: unknown): Record<string, unknown>[] =>
      Array.isArray(s) ? s.flatMap(aplatirS) : s === null || s === undefined || s === false ? [] : [s as Record<string, unknown>];
    const SEMANTIQUES = ["success", "warn", "error"];
    const couleurParTon = new Map<string, string>();
    for (const n of r.root.findAll(
      (x) => typeof (x.props as { tone?: unknown }).tone === "string",
    )) {
      const ton = String((n.props as { tone: string }).tone);
      if (!SEMANTIQUES.includes(ton) || couleurParTon.has(ton)) continue;
      const couleurs = n
        .findAll(() => true)
        .flatMap((x) => aplatirS((x.props as { style?: unknown }).style))
        .map((d) => d.color)
        .filter((c): c is string => typeof c === "string");
      // La DERNIÈRE couleur gagne : c'est l'ordre d'application des styles,
      // et c'est donc celle que l'œil voit.
      couleurParTon.set(ton, couleurs[couleurs.length - 1] ?? "");
    }
    console.log(
      `[VOC] couleur par ton : ${[...couleurParTon].map(([t, c]) => `${t}=${c}`).join(" ")}`,
    );
    expect(
      couleurParTon.size,
      "moins de deux tons sémantiques à l’écran : ce contrôle ne discrimine rien",
    ).toBeGreaterThan(1);
    expect(
      new Set(couleurParTon.values()).size,
      "les tons sémantiques se peignent de la MÊME couleur : le ton est " +
        "transmis et IGNORÉ, la sémantique est débranchée",
    ).toBe(couleurParTon.size);
    r.unmount();
  });
});
