// ════════════════════════════════════════════════════════════════════
//  PREUVE WEB — LA POLICE DU THÈME ATTEINT VRAIMENT L'ÉCRAN.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI CE FICHIER EXISTE, ET C'EST UNE ASYMÉTRIE ASSUMÉE.
//
// Le jeton `font.famille` (tokens 1.6.0) porte un RÔLE — `systeme`, `serif`,
// `mono` — et la couture de plateforme le résout. Les deux cibles n'en sont
// PAS au même point, et il faut le dire :
//
// ── L'ASYMÉTRIE A EXISTÉ UNE DEMI-JOURNÉE, ET ELLE N'EXISTE PLUS.
//
// Premier état livré : le web servait le rôle, le natif non. `fontFamily` du
// natif prend UN nom, pas une pile, et aucun nom n'existe sur iOS ET Android ;
// un nom absent retombe EN SILENCE sur la police système. Brancher par
// plateforme était interdit par le cliquet 4 de `keyboard-a11y-locks`.
//
// Jugement du propriétaire, 2026-10-17 : « il faut surtout pas oublier native,
// on fait les 2 pour ne pas en oublier une ». Les trois faces sont désormais
// EMBARQUÉES — un `.ttf` porte le même nom partout, aucun branchement.
//
// ── CE QUI RESTE DIFFÉRENT, ET C'EST DANS LA NATURE DES DEUX CIBLES.
//
// Le web déclare les trois faces sous UNE famille, chacune avec sa
// `font-weight` : le navigateur choisit, et 600 est servi par SemiBold sans
// synthèse. Le natif nomme une FACE par graisse, parce qu'Android ne
// synthétise pas. Et la pile web finit par un générique, donc le CARACTÈRE
// survit même si la face ne se charge pas — un `fontFamily` natif, lui, ne
// sait pas se replier.
//
// ── CE QUE CE FICHIER TIENT.
//
// ① l'application d'un thème `serif` porte la face embarquée à l'écran ;
// ② la pile finit par un GÉNÉRIQUE — sinon la dégradation n'aboutit pas ;
// ③ CONTRÔLE NÉGATIF : un thème `systeme` n'en porte aucune ;
// ④ les trois `@font-face` sont déclarées ET leurs fichiers sont servis.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Même convention que `corpus-web` : on lit ce que `gate:app-web` vient de
// compiler, et on REFUSE de deviner si le dossier n'est pas là.
const base = (app: string): string => join(tmpdir(), "deribfy-gate-web", app) + "/";
const SPA = "v3-kaviva-spa";
const FIT = "v3-coach-fitness";

/** Les valeurs de style réellement appliquées aux nœuds montés. */
interface Applique {
  readonly familles: readonly string[];
  readonly fonds: readonly string[];
  readonly rayons: readonly number[];
}

/**
 * MONTE UNE APPLICATION ET REND CE QUE SES NŒUDS PORTENT VRAIMENT.
 *
 * ── POURQUOI CETTE FONCTION A ÉTÉ AJOUTÉE LE 2026-10-18.
 *
 * Ce fichier ne mesurait que les POLICES. La palette et les rayons du thème
 * n'avaient de preuve montée QUE sur la cible native (`theme-identite`), et
 * c'est exactement ce que le propriétaire demandait de vérifier : « est-ce que
 * les absences sont couvertes des 2 côtés ».
 *
 * Déduire du natif aurait été l'erreur qui a cassé 32/32 applications web
 * quand l'avatar à initiales avait été posé d'un seul côté.
 */
async function appliques(app: string): Promise<Applique> {
  const familles = await famillesDe(app);
  const b = base(app);
  const { DataRoot } = await import(b + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(b + "lib/runtime/form-state.tsx");
  const { buildDemoProvider } = await import(b + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(b + "demo.data.ts");
  const nav = (await import(b + "nav.data.ts")) as { primaryNav?: { screenId: string }[] };
  const premier = nav.primaryNav?.[0]?.screenId ?? "";
  const Ecran = (await import(b + `screens/${premier}.tsx`)).default as () => unknown;
  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(DataRoot as never, { provider: buildDemoProvider(demoData) } as never,
        createElement(FormStateRoot as never, null as never, createElement(Ecran as never))) as never,
    );
  });
  type Decl = { backgroundColor?: unknown; borderRadius?: unknown };
  const aplatir = (s: unknown): Decl[] =>
    Array.isArray(s) ? s.flatMap(aplatir) : s === null || s === undefined || s === false ? [] : [s as Decl];
  const decls = (r?.root.findAll(() => true) ?? []).flatMap((n) =>
    aplatir((n.props as { style?: unknown }).style),
  );
  const uniques = <T,>(xs: readonly T[]): T[] => [...new Set(xs)];
  const out = {
    familles,
    fonds: uniques(decls.map((d) => d.backgroundColor).filter((x): x is string => typeof x === "string")),
    rayons: uniques(decls.map((d) => d.borderRadius).filter((x): x is number => typeof x === "number")).sort(
      (a, b) => a - b,
    ),
  };
  r?.unmount();
  return out;
}

/** Les familles de polices réellement déclarées dans les styles montés. */
async function famillesDe(app: string): Promise<readonly string[]> {
  const b = base(app);
  expect(existsSync(b), `lancer d'abord \`npm run gate:app-web\` (${app} absent)`).toBe(true);
  const { DataRoot } = await import(b + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(b + "lib/runtime/form-state.tsx");
  const { buildDemoProvider } = await import(b + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(b + "demo.data.ts");
  const nav = (await import(b + "nav.data.ts")) as {
    primaryNav?: { screenId: string }[];
    default?: { screenId: string }[];
  };
  const premier = (nav.primaryNav ?? nav.default ?? [])[0]?.screenId ?? "";
  expect(premier, "aucune destination de navigation").not.toBe("");
  const Ecran = (await import(b + `screens/${premier}.tsx`)).default as () => unknown;

  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(DataRoot as never, { provider: buildDemoProvider(demoData) } as never,
        createElement(FormStateRoot as never, null as never, createElement(Ecran as never))) as never,
    );
  });
  // Les styles sont des tableaux imbriqués : ne lire que le premier niveau
  // laisserait passer la moitié des déclarations.
  type Decl = { fontFamily?: unknown };
  const aplatir = (s: unknown): Decl[] =>
    Array.isArray(s) ? s.flatMap(aplatir) : s === null || s === undefined || s === false ? [] : [s as Decl];
  const out = [
    ...new Set(
      (r?.root.findAll(() => true) ?? [])
        .flatMap((n) => aplatir((n.props as { style?: unknown }).style))
        .map((d) => d.fontFamily)
        .filter((x): x is string => typeof x === "string"),
    ),
  ];
  r?.unmount();
  return out;
}

describe("PREUVE WEB — la police du thème atteint l'écran", () => {
  it("① UN THÈME `serif` PORTE UNE PILE DE POLICES", async () => {
    const familles = await famillesDe(SPA);
    console.log(`\n[THÈME-WEB] spa familles : ${JSON.stringify(familles)}`);
    expect(
      familles.length,
      "aucune famille appliquée : le thème déclare `serif` et l'écran reste " +
        "en police système — le maillon qui a manqué quatre fois dans ce dépôt",
    ).toBeGreaterThan(0);
    // LA FACE EMBARQUÉE EST EN TÊTE DE PILE. Si elle n'y était pas, le
    // navigateur servirait Georgia — présent sur beaucoup de machines, donc le
    // défaut passerait inaperçu chez qui l'a, et pas chez les autres.
    for (const f of familles) {
      expect(
        f,
        `la pile « ${f} » ne commence pas par la face embarquée : le rendu ` +
          "dépendrait des polices installées sur la machine du lecteur",
      ).toMatch(/^"DeribfySerif"/u);
    }
  });

  it("② LA PILE FINIT PAR UN GÉNÉRIQUE — sinon la dégradation n'aboutit pas", async () => {
    // ── POURQUOI CE CONTRÔLE N'EST PAS DU ZÈLE.
    //
    // Une pile `Georgia, "Noto Serif"` sur une machine qui n'a ni l'une ni
    // l'autre retombe sur la police PAR DÉFAUT du navigateur — qui n'est pas
    // forcément un serif. Le générique final (`serif`, `monospace`) est ce qui
    // garantit que le CARACTÈRE de la police survit, même quand aucun nom
    // propre n'est présent.
    const familles = await famillesDe(SPA);
    for (const f of familles) {
      expect(
        /,\s*(serif|sans-serif|monospace|system-ui)\s*$/u.test(f),
        `la pile « ${f} » ne finit pas par un générique : sur une machine sans ` +
          "aucune de ces polices, le caractère du thème disparaît",
      ).toBe(true);
    }
  });

  it("③ CONTRÔLE NÉGATIF : un thème `systeme` ne porte AUCUNE famille", async () => {
    // ── C'EST CE CONTRÔLE QUI REND LA MONTÉE ADDITIVE.
    //
    // `coach-fitness` est en `effort_vif`, dont la famille est `systeme`. Ne
    // PAS poser `font-family` laisse la pile du document — que `emit-web` fixe
    // déjà sur la pile système — donc le rendu exact d'avant les tokens 1.6.0.
    //
    // Sans ce contrôle, une famille posée partout passerait pour une réussite,
    // et toute application non migrée changerait d'apparence sans que son
    // document ait rien demandé.
    const familles = await famillesDe(FIT);
    console.log(`[THÈME-WEB] coach familles : ${JSON.stringify(familles)}`);
    expect(
      familles,
      "une famille est posée alors que le thème dit `systeme`",
    ).toEqual([]);
  });
  it("④ LES TROIS @font-face SONT DÉCLARÉES, ET LEURS FICHIERS SERVIS", () => {
    // ── LE MAILLON QUI NE SE VOIT PAS AU MONTAGE.
    //
    // `react-test-renderer` lit les styles, pas le CSS du document. Une pile
    // `"DeribfySerif", Georgia, serif` passerait donc les contrôles ① à ③
    // même si AUCUNE `@font-face` n'était déclarée — le navigateur servirait
    // Georgia, et personne ne verrait la différence sur une machine qui l'a.
    //
    // On lit donc l'enveloppe émise, et on exige les trois faces AVEC leurs
    // fichiers. `publicDir: "assets"` est ce qui fait arriver les fichiers :
    // sans lui, Vite ne les copie pas et les URL pointent dans le vide.
    const b = base(SPA);
    expect(existsSync(b), "lancer d'abord `npm run gate:app-web`").toBe(true);
    const html = readFileSync(join(b, "index.html"), "utf8");
    const vite = readFileSync(join(b, "vite.config.ts"), "utf8");
    // ── CETTE ASSERTION ENCODE UNE ERREUR QUE J'AI FAITE, ET MESURÉE.
    //
    // Premier essai : les faces en `assets/polices/` + `publicDir: "assets"`.
    // Résultat mesuré : **0/32 applications web se CONSTRUISAIENT**. Un
    // `public/` existait déjà — manifeste PWA, service worker, icônes — et le
    // redéfinir les a sortis de `dist/`.
    //
    // Les faces vivent donc dans `public/polices/`, que Vite copie PAR DÉFAUT.
    // On exige l'inverse de ce qu'on exigeait : que personne ne redéfinisse
    // `publicDir`, parce que le faire casse tout le reste.
    expect(
      vite,
      "`publicDir` est redéfini : un `public/` existe déjà avec le manifeste " +
        "PWA, le service worker et les icônes. Le redéfinir les sort de " +
        "`dist/` — mesuré, 0/32 applications web construites.",
    ).not.toContain("publicDir");
    for (const [face, poids] of [
      ["Regular", "400"],
      ["SemiBold", "600"],
      ["Bold", "700"],
    ] as const) {
      // ── LE FORMAT EST WOFF2, ET C'EST LA MESURE QUI L'A DÉCIDÉ.
      //
      // Un cliquet du dépôt interdisait tout `@font-face`, cahier client à
      // l'appui : « < 150 KB pour réseaux 3G ». Mesuré sur une application
      // construite, ce qui VOYAGE : 88 Ko de JS gzip + 2,6 Ko d'enveloppe.
      // Avec trois faces TrueType (73 Ko gzip) → 164 Ko, au-DESSUS. Avec trois
      // WOFF2 (56 Ko, déjà compressés) → 147 Ko, DESSOUS.
      //
      // Le natif garde le TrueType : React Native ne lit pas le WOFF2, et son
      // fichier ne voyage pas — il est dans le paquet.
      expect(html, `la face ${face} n'est pas déclarée`).toContain(
        `DeribfySerif-${face}.woff2`,
      );
      expect(html, `la graisse ${poids} n'est pas déclarée`).toMatch(
        new RegExp(`DeribfySerif-${face}\\.woff2[\\s\\S]{0,120}font-weight:\\s*${poids}`, "u"),
      );
      const fichier = join(b, "public", "polices", `DeribfySerif-${face}.woff2`);
      expect(existsSync(fichier), `le fichier de la face ${face} est absent`).toBe(true);
      const octets = readFileSync(fichier);
      // La signature d'un WOFF2 est `wOF2`. Un fichier écrit en TEXTE au lieu
      // d'être décodé depuis base64 serait présent, non vide et INVALIDE —
      // c'est ainsi que le cinquième écrivain non routé a été trouvé.
      expect(
        octets.subarray(0, 4).toString("latin1"),
        `la face ${face} n'est pas un WOFF2 valide : écrite en texte au lieu ` +
          "d'être décodée depuis base64 ?",
      ).toBe("wOF2");
    }
  });
  it("⑤ LES DEUX APPLICATIONS NE PEIGNENT PAS LE MÊME FOND — sur le WEB aussi", async () => {
    // ── LE CONTRÔLE QUI MANQUAIT, ET QUI EXISTAIT DÉJÀ CÔTÉ NATIF.
    //
    // `theme-identite.obs.tsx` ① tient cette propriété depuis le 2026-10-17.
    // Ce fichier-ci ne mesurait que les polices : la palette du thème n'avait
    // AUCUNE preuve montée sur la cible web.
    //
    // La forme de l'assertion est celle du natif, volontairement — deux mondes
    // opposés ne partagent QUE LE BLANC. Un deuxième fond commun signifie que
    // la palette de base reparaît, donc que le catalogue n'agit plus.
    const s = await appliques(SPA);
    const f = await appliques(FIT);
    console.log(`\n[THÈME-WEB] spa fonds   : ${s.fonds.slice(0, 5).join(" ")}`);
    console.log(`[THÈME-WEB] coach fonds : ${f.fonds.slice(0, 5).join(" ")}`);
    expect(s.fonds.length, "aucun fond appliqué sur le spa").toBeGreaterThan(1);
    expect(f.fonds.length, "aucun fond appliqué sur le coach").toBeGreaterThan(1);
    const communs = s.fonds.filter((c) => f.fonds.includes(c));
    console.log(`[THÈME-WEB] fonds communs : ${communs.join(" ")}`);
    expect(
      communs,
      "les deux thèmes partagent plus que le blanc sur la cible WEB : la " +
        "palette de base reparaît, le catalogue n'agit plus de ce côté",
    ).toEqual(["#FFFFFF"]);
  });

  it("⑥ ELLES N'ARRONDISSENT PAS PAREIL — sur le WEB aussi", async () => {
    // Un salon de soins et une application d'entraînement n'ont pas les mêmes
    // coins. Le rayon ne bougeait pour AUCUN des 22 documents avant le
    // catalogue : 6/10/16 pour tout le monde. La preuve existait côté natif,
    // pas ici.
    const s = await appliques(SPA);
    const f = await appliques(FIT);
    console.log(`[THÈME-WEB] rayons — spa ${s.rayons.join("/")} · coach ${f.rayons.join("/")}`);
    expect(s.rayons.length, "aucun rayon appliqué sur le spa").toBeGreaterThan(0);
    expect(f.rayons.length, "aucun rayon appliqué sur le coach").toBeGreaterThan(0);
    expect(
      s.rayons.join("/"),
      "les deux thèmes arrondissent identiquement sur la cible WEB : le rayon " +
        "du catalogue n'y agit pas",
    ).not.toBe(f.rayons.join("/"));
  });
});
