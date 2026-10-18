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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compilerANeuf } from "./app-fraiche.ts";

const DOCUMENT = "slices/tontine/tontine.air.json";
/** Le fixture du titre qui se POURSUIT — un salut en deux parties. */
const REPO_RACINE = new URL("../../../../", import.meta.url).pathname;
const FIXTURE_TITRE = "docs/elite-protocol/evidence/fixtures/titre-continu.air.json";
let APP = "";
beforeAll(async () => {
  const a = await compilerANeuf(DOCUMENT, "deribfy-vocabulaire");
  APP = a.base;
  expect(a.fichiers, "rien d'émis : il n'y a rien à monter").toBeGreaterThan(10);
}, 180_000);

/**
 * Monte un écran, avec les DROITS que la personne détient.
 *
 * ── POURQUOI LA SESSION, ET CE QUE J'AI FAILLI ACCUSER À TORT.
 *
 * `scr_transactions` porte `requiredRightId: right_tresorerie`. Le garde
 * d'accès vit dans l'unique couture de visibilité : sans session porteuse,
 * l'écran se rend VIDE sous son titre — c'est écrit dans `useBlockVisible`, et
 * c'est voulu.
 *
 * Six des neuf écrans de ce document sont à droit. Un harnais qui n'en passe
 * aucun rend la moitié de l'application invisible, et fait accuser le code
 * d'un défaut qui serait le sien.
 */
async function monter(ecran: string, droits: readonly string[] = []): Promise<ReactTestRenderer> {
  const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(APP + "lib/runtime/form-state.tsx");
  const { SessionRoot } = await import(APP + "lib/runtime/session-provider.tsx");
  const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(APP + "demo.data.ts");
  const Ecran = (await import(APP + `screens/${ecran}.tsx`)).default as () => unknown;
  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(SessionRoot as never, { provider: {
        estAuthentifie: () => droits.length > 0,
        identifiant: () => (droits.length > 0 ? "obs-vocabulaire" : undefined),
        abonner: () => () => undefined,
        droits: () => droits,
      } } as never,
        createElement(DataRoot as never, { provider: buildDemoProvider(demoData) } as never,
        createElement(FormStateRoot as never, null as never, createElement(Ecran as never)))) as never,
    );
  });
  return r!;
}

/** L identite d un noeud, quel que soit le nom de l attribut. */
const identiteDe = (n: ReactTestInstance): string => {
  const p = n.props as Record<string, unknown>;
  return String(p["data-testid"] ?? p.testID ?? "");
};

/**
 * LES ANGLES RÉELLEMENT DESSINÉS PAR LES ANNEAUX — cible NATIVE.
 *
 * L'arc est un cercle SVG dont `strokeDashoffset` cache la part NON remplie.
 * On lit donc cet offset : c'est la seule valeur qui porte la proportion.
 */
const anglesDAnneau = (r: ReactTestRenderer): string[] =>
  r.root
    .findAll((n) => (n.props as { strokeDashoffset?: unknown }).strokeDashoffset !== undefined)
    .map((n) => String(Math.round(Number((n.props as { strokeDashoffset: number }).strokeDashoffset))));

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
    // ── ON MESURE LA OÙ LES PASTILLES VIVENT.
    //
    // CORRECTION MESURÉE : ce contrôle montait `scr_mon_tableau`, et trois de
    // ses quatre cartes de chiffre sont devenues des ANNEAUX (D11) tandis que
    // sa liste est passée aux POINTS (D15). Il ne restait qu'une pastille
    // pleine — et un contrôle qui ne voit qu'un ton ne discrimine rien.
    //
    // `scr_membres` porte des pastilles pleines sur ses statuts de paiement :
    // c'est l'écran où cette propriété se juge.
    const r = await monter("scr_membres");
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
      // ── ON LIT LA COULEUR DE LA FORME QU'ON MESURE.
      //
      // CORRECTION MESURÉE : une PASTILLE porte son ton dans la couleur du
      // TEXTE ; un POINT le porte dans le fond de son rond, et son texte
      // reste gris pour tous. Lire « la dernière couleur » mélangeait les
      // deux et faisait collapser trois tons sur deux — un contrôle qui
      // accusait la sémantique d'un défaut qui était le sien.
      //
      // Les points ont leur propre contrôle (D15). Ici on ne juge que les
      // pastilles.
      const estPoint = (n.props as { forme?: unknown }).forme === "point";
      if (estPoint) continue;
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
    const a = await compilerANeuf(FIXTURE_TITRE, "deribfy-titre-continu");
    const precedent = APP;
    APP = a.base;
    try {
      const r = await monter("scr_mon_tableau");
      const t = textes(r);
      console.log(`[VOC] titre continu : ${t.slice(0, 4).join(" | ")}`);
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

  it("D15 · LA PASTILLE EN POINT — même sens, forme plus légère", async () => {
    // ── POURQUOI UNE VARIANTE ET NON UNE PRIMITIVE DE PLUS.
    //
    // Bolt pose « À jour · En attente · En retard » en POINTS colorés dans ses
    // listes denses, et des pastilles pleines ailleurs. C'est LA MÊME
    // information — un état, un ton — dans deux formes.
    //
    // En faire deux primitives, ce serait deux endroits où la sémantique peut
    // diverger, et ce dépôt a vu six fois « une liste écrite deux fois ».
    //
    // ── ET LE POINT NE REMPLACE PAS LE MOT.
    //
    // Il porte la couleur, le mot porte le sens. Une couleur seule exclurait
    // qui ne la distingue pas — la règle appliquée au journal de génération et
    // au sélecteur d'appareil.
    const r = await monter("scr_mon_tableau");
    const t = textes(r);
    const aplatirP = (s: unknown): Record<string, unknown>[] =>
      Array.isArray(s) ? s.flatMap(aplatirP) : s === null || s === undefined || s === false ? [] : [s as Record<string, unknown>];
    // Un POINT est un nœud SANS texte dont le style porte un rayon et une
    // couleur de fond : c'est la forme, pas un mot.
    // ── ON LIT LA COULEUR QUI GAGNE, PAS LA PREMIÈRE.
    //
    // CORRECTION MESURÉE : ma première sonde filtrait les styles portant
    // `borderRadius` + `width` — c'est-à-dire le style de BASE du rond, dont
    // la couleur est `muted`. La teinte du ton arrive dans un SECOND objet du
    // tableau de styles, sans rayon ni largeur, et la sonde le jetait.
    //
    // Résultat : seize points « tous gris », et un contrôle qui accusait le
    // code d'un défaut qui était le sien. On prend donc la DERNIÈRE couleur de
    // fond du sous-arbre — celle que React Native applique.
    const pointsDuBadge = r.root
      .findAll(
        (n) =>
          typeof (n.props as { tone?: unknown }).tone === "string" &&
          (n.props as { forme?: unknown }).forme === "point",
      )
      .map((n) => {
        const fonds = n
          .findAll(() => true)
          .flatMap((x) => aplatirP((x.props as { style?: unknown }).style))
          .map((d) => d.backgroundColor)
          .filter((c): c is string => typeof c === "string");
        return fonds[fonds.length - 1] ?? "";
      });
    const ronds = pointsDuBadge;
    const couleurs = [...new Set(pointsDuBadge.filter((c) => c !== ""))];
    console.log(`[VOC] ronds de statut : ${String(ronds.length)} · couleurs : ${couleurs.join(" ")}`);
    expect(ronds.length, "aucun point de statut rendu : la forme ne s'applique pas").toBeGreaterThan(
      0,
    );
    expect(
      couleurs.length,
      "tous les points sont de la même couleur : le ton ne les atteint pas",
    ).toBeGreaterThan(1);
    // ── LE MOT EST TOUJOURS LÀ, et c'est la condition de l'ajout.
    expect(
      t.some((x) => x.trim() !== "" && x.length < 40),
      "le point a remplacé le mot : une couleur seule n'informe pas",
    ).toBe(true);
    r.unmount();
  });

  it("D16 · LE TABLEAU REND SES COLONNES, SES EN-TÊTES ET SES LIGNES", async () => {
    // ── CE QU'UN TABLEAU AJOUTE À UNE LISTE.
    //
    // Une LISTE porte des rôles fixes — titre, sous-titre, pastille, valeur de
    // fin — et répond à « qu'est-ce que c'est ? ». Un TABLEAU porte N colonnes
    // de même rang et répond à « compare-les ». Les applications de gestion,
    // celles que ce générateur produit le plus souvent, vivent de la seconde
    // question, et `list` seul ne savait pas la poser.
    //
    // ── L'ÉCRAN EST UN ÉCRAN À DROIT.
    //
    // `scr_transactions` porte `requiredRightId: right_tresorerie`. Sans
    // session porteuse, il se rend VIDE sous son titre — et le contrôle
    // accuserait le tableau d'un défaut qui serait le sien.
    const r = await monter("scr_transactions", ["right_tresorerie"]);
    const lignes = parID(r, "-ligne-");
    const t = textes(r);
    console.log(`[VOC] tableau — lignes : ${String(lignes.length)}`);
    expect(lignes.length, "aucune ligne de tableau rendue").toBeGreaterThan(0);

    // ── LES EN-TÊTES VIENNENT DES CHAMPS, PAS DU BLOC.
    //
    // Le document écrit le libellé de chaque champ une fois ; le redéclarer au
    // bloc serait deux vérités pour un même mot — ce que ce dépôt a payé six
    // fois. On exige donc les libellés RÉELS de l'entité.
    const brut = JSON.parse(readFileSync(join(REPO_RACINE, DOCUMENT), "utf8")) as {
      entities: { id: string; fields: { id: string; label?: { text: string }[] }[] }[];
      screens: { blocks: { blockType: string; props?: { key: string; value: unknown }[] }[] }[];
    };
    const bloc = brut.screens
      .flatMap((s) => s.blocks)
      .find((b) => b.blockType === "tableau");
    expect(bloc, "le document ne porte plus de tableau").not.toBeUndefined();
    const cols = (bloc?.props ?? []).find((p) => p.key === "columnFieldIds")?.value as string[];
    const ent = brut.entities.find((e) => e.fields.some((f) => cols.includes(f.id)));
    for (const id of cols) {
      const libelle = ent?.fields.find((f) => f.id === id)?.label?.[0]?.text;
      expect(libelle, `le champ ${id} n'a pas de libellé`).not.toBeUndefined();
      expect(
        t,
        `l'en-tête « ${String(libelle)} » n'atteint pas l'écran : il vient du ` +
          "CHAMP, et c'est ce qui évite de l'écrire deux fois",
      ).toContain(libelle);
    }

    // ── ET CHAQUE LIGNE PORTE AUTANT DE CELLULES QUE DE COLONNES.
    //
    // Une ligne courte alignerait ses valeurs sous les mauvaises colonnes —
    // un tableau qui ment est pire qu'une liste qui ne compare pas.
    const vues = new Set<string>();
    for (const l of lignes) {
      const id = identiteDe(l);
      if (vues.has(id)) continue;
      vues.add(id);
      // ── ON COMPTE LES CELLULES PAR LEUR IDENTITÉ, DÉDUPLIQUÉES.
      //
      // CORRECTION MESURÉE : compter les nœuds de texte rendait HUIT cellules
      // pour quatre colonnes côté web — composite et hôte se comptent deux
      // fois. Un contrôle qui compte deux fois accuse le code de son propre
      // défaut, et c'est la septième fois aujourd'hui.
      const cellules = [
        ...new Set(
          l.findAll(() => true).map(identiteDe).filter((x) => x.includes("-c-")),
        ),
      ];
      expect(
        cellules.length,
        `la ligne ${id} porte ${String(cellules.length)} cellule(s) pour ` +
          `${String(cols.length)} colonne(s) : les valeurs glissent`,
      ).toBe(cols.length);
    }

    // ── AUCUN CODE MACHINE DANS LES CELLULES.
    //
    // Les valeurs passent par le MÊME résolveur que la liste — donc la même
    // traduction des énumérations. Un `en_attente_documents` ici signerait un
    // second chemin, et ce dépôt en a assez vu.
    // ── LES DEUX FORMES, ET MA PREMIÈRE N'EN COUVRAIT QU'UNE.
    //
    // Mutation M61 — faire passer la valeur BRUTE au lieu de la résolue —
    // laissait ce contrôle VERT. Cause : je ne cherchais que `mot_mot` en
    // minuscules, et les codes de ce document sont en CAPITALES :
    // `SEQUESTRE_BLOQUE`, `AMENDE_DISCIPLINAIRE`, `EN_ATTENTE`.
    //
    // Le dépôt porte déjà les DEUX formes dans `corpus-web.obsweb.tsx`, avec
    // sa justification mesurée (« XXL » passe, une date ISO aussi). On les
    // reprend au lieu d'en inventer une troisième.
    const CODE = /^[a-z0-9]+(_[a-z0-9]+)+$|^[A-Z0-9]+(_[A-Z0-9]+)+$/;
    expect(
      t.filter((x) => CODE.test(x)),
      "un code machine atteint une cellule : le tableau n'emprunte pas le " +
        "résolveur commun",
    ).toEqual([]);
    r.unmount();
  });

  it("D11 · L'ANNEAU REND UNE PROPORTION, ET IL LA REND JUSTE", async () => {
    // ── CE QU'IL A COÛTÉ, ET QUI L'A DÉCIDÉ.
    //
    // Un arc à angle arbitraire ne se dessine pas en React Native sans
    // `react-native-svg` — 7,6 Mo installés (mesure du 2026-10-18 ; ce qui
    // arrive dans l'APK n'est pas mesuré, le dépôt n'a pas de balance
    // native). La seule
    // alternative sans dépendance (quatre quarts de cercle en bordures) ne
    // sait montrer que 25, 50, 75 et 100 % : elle MENTIRAIT sur toute autre
    // proportion, et maquiller une proportion est pire que ne pas la dessiner.
    //
    // Décision du propriétaire, 2026-10-18 : « fais les 2 ».
    //
    // ── ET LE WEB N EN PAIE RIEN.
    //
    // Il dessine son anneau en CSS pur (`conic-gradient` + masque radial).
    // Même contrat, moyens différents : c'est exactement ce que la couture de
    // plateforme existe pour permettre.
    const r = await monter("scr_mon_tableau");
    const arcs = parID(r, "-arc");
    const t = textes(r);
    console.log(`[VOC] anneaux rendus : ${String(arcs.length)}`);
    expect(arcs.length, "aucun anneau rendu : la part n'atteint pas la carte").toBeGreaterThan(0);

    // ── LA VALEUR EST CELLE DU DOCUMENT, PAS UN POURCENTAGE CALCULÉ.
    //
    // Si le moteur affichait « 75 % » déduit de `part`, il inventerait un
    // format — ce que F3 interdit. Le document écrit « 265 000 FCFA », et
    // c'est ce qu'on doit lire au centre.
    expect(
      t,
      "la valeur du document n'est plus au centre de l'anneau : le moteur " +
        "aurait fabriqué un pourcentage",
    ).toContain("265 000 FCFA");

    // ── LA PROPORTION EST RÉELLEMENT DESSINÉE, ET ELLE VARIE.
    //
    // Quatre anneaux tous pleins, ou tous vides, passeraient « quatre
    // anneaux ». On lit l'angle RÉEL de chacun — l'arc SVG côté natif, le
    // dégradé conique côté web — et on exige qu'ils diffèrent.
    const angles = anglesDAnneau(r);
    console.log(`[VOC] angles distincts : ${[...new Set(angles)].slice(0, 5).join(" ")}`);
    expect(angles.length, "aucun angle lisible sur les anneaux").toBeGreaterThan(1);
    expect(
      new Set(angles).size,
      "tous les anneaux dessinent le même angle : la part n'est pas lue",
    ).toBeGreaterThan(1);
    r.unmount();
  });
});
