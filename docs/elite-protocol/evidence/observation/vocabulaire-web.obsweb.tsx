// ════════════════════════════════════════════════════════════════════
//  PREUVE — LE VOCABULAIRE DE BOLT EST RÉELLEMENT RENDU (cible WEB).
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI UN JUMEAU, ET NON UNE DÉDUCTION.
//
// Les blocs sont partagés ; les PRIMITIVES ne le sont pas. `Barre`, `Badge`,
// `StateView`, `AppText` ont deux implémentations, une par cible. Déduire du
// natif que le web rend la même chose est exactement l'erreur qui a coûté
// 32/32 applications web cassées le 2026-10-17, quand l'avatar à initiales
// avait été posé d'un seul côté.
//
// Les contrôles sont les MÊMES que ceux du natif, volontairement. Deux preuves
// qui divergeraient ne compareraient plus rien — et la question du
// propriétaire était précisément : « est-ce que les absences sont couvertes
// des 2 côtés ».
//
// ── CE QUI DIFFÈRE, ET SEULEMENT CELA.
//
// ① la cible : `compileWeb` au lieu de `compileProject` ;
// ② l'identité : `data-testid` sur les nœuds HÔTES, `testID` sur les
//    composites — on lit les deux, parce que les gestes et les styles ne
//    vivent pas sur les mêmes nœuds.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer, ReactTestInstance } from "react-test-renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync, rmSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const REPO = new URL("../../../../", import.meta.url).pathname;
const DOCUMENT = "slices/tontine/tontine.air.json";
/** Le fixture du titre qui se POURSUIT — un salut en deux parties. */
const FIXTURE_TITRE = "docs/elite-protocol/evidence/fixtures/titre-continu.air.json";
let APP = "";

beforeAll(async () => {
  const { migrateAirDocument } = (await import(REPO + "packages/air-schema/src/index.ts")) as {
    migrateAirDocument: (d: Record<string, unknown>) => unknown;
  };
  const { compileWeb } = (await import(REPO + "packages/compiler/src/compile-web.ts")) as {
    compileWeb: (a: unknown) => { files: Map<string, string> };
  };
  const { estBinaire } = (await import(REPO + "packages/compiler/src/fichiers-binaires.ts")) as {
    estBinaire: (c: string) => boolean;
  };
  const { readFileSync } = await import("node:fs");
  const air = migrateAirDocument(
    JSON.parse(readFileSync(join(REPO, DOCUMENT), "utf8")) as Record<string, unknown>,
  );
  const fichiers = compileWeb(air).files;
  const base = join(tmpdir(), "deribfy-vocabulaire-web") + "/";
  rmSync(base, { recursive: true, force: true });
  for (const [chemin, contenu] of fichiers) {
    const abs = join(base, chemin);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, estBinaire(chemin) ? Buffer.from(contenu, "base64") : contenu);
  }
  const deps = REPO + "slices/resto-riche/app/node_modules";
  expect(existsSync(deps), "aucun `node_modules` de référence à emprunter").toBe(true);
  symlinkSync(deps, join(base, "node_modules"), "dir");
  APP = base;
  expect(fichiers.size, "rien d'émis : il n'y a rien à monter").toBeGreaterThan(10);
}, 240_000);

/**
 * COMPILE UN DOCUMENT EN WEB, DANS UN DOSSIER NEUF, ET REND SON CHEMIN.
 *
 * Le pendant web de `compilerANeuf`. Il existe parce que le contrôle D8 monte
 * un FIXTURE — un salut en deux parties — et non le document de la tranche :
 * poser un salut à la place du titre d'un document réel serait réécrire son
 * contenu, ce qui appartient à celui qui l'écrit.
 */
async function compilerWebANeuf(document: string, nom: string): Promise<string> {
  const { readFileSync } = await import("node:fs");
  const { migrateAirDocument } = (await import(REPO + "packages/air-schema/src/index.ts")) as {
    migrateAirDocument: (d: Record<string, unknown>) => unknown;
  };
  const { compileWeb } = (await import(REPO + "packages/compiler/src/compile-web.ts")) as {
    compileWeb: (a: unknown) => { files: Map<string, string> };
  };
  const { estBinaire } = (await import(REPO + "packages/compiler/src/fichiers-binaires.ts")) as {
    estBinaire: (c: string) => boolean;
  };
  const air = migrateAirDocument(
    JSON.parse(readFileSync(join(REPO, document), "utf8")) as Record<string, unknown>,
  );
  const base = join(tmpdir(), nom) + "/";
  rmSync(base, { recursive: true, force: true });
  for (const [chemin, contenu] of compileWeb(air).files) {
    const abs = join(base, chemin);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, estBinaire(chemin) ? Buffer.from(contenu, "base64") : contenu);
  }
  symlinkSync(REPO + "slices/resto-riche/app/node_modules", join(base, "node_modules"), "dir");
  return base;
}

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

/**
 * LES DEUX NOMS DE L'IDENTITÉ, et il faut les deux.
 *
 * Les COMPOSITES reçoivent `testID` — le contrat des blocs, identique des deux
 * côtés. Les nœuds HÔTES rendus par le web portent `data-testid`, l'attribut
 * HTML. Ne chercher que l'un des deux rendrait zéro nœud sur la moitié des
 * contrôles, et un vert mensonger sur l'autre.
 */
const parID = (r: ReactTestRenderer, fragment: string): ReactTestInstance[] =>
  r.root.findAll((n) => {
    const p = n.props as Record<string, unknown>;
    return (
      String(p["data-testid"] ?? "").includes(fragment) || String(p.testID ?? "").includes(fragment)
    );
  });

/** Tout le texte rendu, à plat. */
const textes = (r: ReactTestRenderer): string[] =>
  r.root
    .findAll(() => true)
    .flatMap((n) => (Array.isArray(n.props.children) ? n.props.children : [n.props.children]))
    .filter((c): c is string => typeof c === "string");

describe("PREUVE WEB — le vocabulaire de Bolt est rendu", () => {
  it("D9 · LA CARTE DE CHIFFRE REND SES QUATRE CARTES, AVEC LEURS VALEURS", async () => {
    // Bolt ouvre son tableau de bord sur quatre cartes — solde, cotisations,
    // membres, échéance. Deribfy ne savait dessiner que sept formes, et le
    // manque n'était pas le thème mais le VOCABULAIRE.
    const r = await monter("scr_mon_tableau");
    const cartes = parID(r, "-item-");
    const t = textes(r);
    console.log(`\n[VOC-WEB] cartes de chiffre : ${String(cartes.length)}`);
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
    console.log(`[VOC-WEB] barres de la courbe : ${String(barres.length)}`);
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
    // ── ON NE LIT QUE LE REMPLISSAGE, ET C'EST UNE CORRECTION MESURÉE.
    //
    // Ma première forme collectait TOUS les `flex` sous une barre. La primitive
    // en pose DEUX : `flex: part` pour le remplissage, `flex: 1 - part` pour le
    // reste. Mutation M44 — forcer le remplissage de la primitive WEB à
    // `flex: 0` laissait ce contrôle VERT, parce que le RESTE valait alors 1 et
    // variait encore.
    //
    // Autrement dit : une courbe entièrement plate, côté web, passait pour une
    // courbe vivante. On lit donc la PREMIÈRE valeur de chaque barre — le
    // remplissage — dont l'ordre a été vérifié au montage : `[part, 1 - part]`.
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
    console.log(`[VOC-WEB] remplissages distincts : ${distinctes.slice(0, 6).join(" ")}`);
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
    console.log(`[VOC-WEB] surtitre rendu : ${t.includes("PILOTAGE") ? "PILOTAGE" : "ABSENT"}`);
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
    console.log(`[VOC-WEB] tons de pastille rendus : ${distincts.join(" ")}`);
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
      `[VOC-WEB] couleur par ton : ${[...couleurParTon].map(([t, c]) => `${t}=${c}`).join(" ")}`,
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

  it("D8 · LE TITRE QUI SE POURSUIT TIENT SUR UNE LIGNE", async () => {
    // ── LE VOCABULAIRE EXISTAIT ; LA FORME NON.
    //
    // Bolt ouvre sur « Bonjour Aminata, » en gras suivi de « voici votre
    // espace. » en gris, SUR LA MEME LIGNE. Deribfy portait `title` ET
    // `subtitle` depuis toujours, et les rendait l'un SOUS l'autre.
    //
    // MESURE QUI A DÉCIDÉ L'AJOUT : zéro document du dépôt n'écrit un titre
    // qui se poursuit. Ce n'est pas un désintérêt — la forme n'existait pas,
    // donc P0 ne pouvait pas l'écrire. Même raison que `graphique`, inemployé
    // parce qu'inexprimable. Le registre transmet les props à P0 en JSON
    // Schema, description comprise : l'ajouter la rend DISPONIBLE.
    //
    // Le fixture est explicite (`fixtures/titre-continu.air.json`), et c'est
    // assumé : poser un salut à la place du titre d'un document réel serait
    // réécrire son contenu, ce qui appartient à celui qui l'écrit.
    const precedent = APP;
    APP = await compilerWebANeuf(FIXTURE_TITRE, "deribfy-titre-continu-web");
    try {
      const r = await monter("scr_mon_tableau");
      const t = textes(r);
      console.log(`[VOC-WEB] titre continu : ${t.slice(0, 4).join(" | ")}`);
      expect(t, "le titre n'atteint pas l'écran").toContain("Bonjour Aminata,");
      // ── LA SUITE EST UN ENFANT DU TITRE, PAS UNE LIGNE À PART.
      //
      // C'est la seule forme qu'un rendu « l'un sous l'autre » ne peut pas
      // produire : on cherche le nœud du TITRE, et on exige que la suite soit
      // DEDANS.
      const titre = r.root
        .findAll(() => true)
        .find((n) => {
          const k = Array.isArray(n.props.children) ? n.props.children : [n.props.children];
          return k.some((c) => c === "Bonjour Aminata,");
        });
      expect(titre, "aucun nœud ne porte le titre").not.toBeUndefined();
      const dedans = (titre as ReactTestInstance)
        .findAll(() => true)
        .flatMap((x) => (Array.isArray(x.props.children) ? x.props.children : [x.props.children]))
        .filter((c): c is string => typeof c === "string")
        .join("");
      expect(
        dedans,
        "la suite n'est pas DANS le titre : elle est rendue sur sa propre " +
          "ligne, et le titre ne se poursuit pas",
      ).toContain("voici votre tontine.");
    } finally {
      APP = precedent;
    }
  });
});
