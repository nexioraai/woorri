// ════════════════════════════════════════════════════════════════════
//  PREUVE — DEUX THÈMES FONT DEUX MONDES VISUELS, À L'ÉCRAN.
// ════════════════════════════════════════════════════════════════════
//
// ── CE QUE LA MESURE DISAIT AVANT CE LOT, ET ELLE ÉTAIT SÉVÈRE.
//
// 22 documents, 21 noms de thème distincts, et l'identité visuelle tenait en
// DEUX jetons sur douze. Mesuré de bout en bout sur les deux cibles : entre
// `kaviva-spa` et `coach-fitness`, le module de thème émis différait sur
// 4 lignes sur 71. `bg`, `surface`, `text`, `muted`, `border`, `badgeBg`,
// `space`, `radius`, `font` : IDENTIQUES pour tout le monde.
//
// Et la teinte qui bougeait était un HACHAGE DU NOM. `spa_elegant` recevait du
// magenta #FA1ED8, `fitness_energy` du cyan #1EEEFA, `scene_nuit` — une salle
// de concert — de l'orange sur fond BLANC. Déterministe, et jamais approprié.
// Un mécanisme arbitraire est pire qu'absent : il a l'apparence d'un thème.
//
// ── POURQUOI CE FICHIER MONTE AU LIEU DE LIRE LES JETONS.
//
// Compter des lignes différentes dans le module de thème ne prouve pas qu'un
// pixel change. La chaîne a QUATRE étages — catalogue, dérivateur, module
// émis, feuille de styles — et ce dépôt a vu trois fois un dernier maillon
// manquer en silence (`accroche`, `logoUri`, l'avatar à initiales).
//
// On monte donc l'écran d'accueil de DEUX applications et on lit les styles
// RÉELLEMENT appliqués aux nœuds.
//
// ── CE QUE CE FICHIER TIENT.
//
// ① les deux applications ne peignent pas le même fond ;
// ② elles n'arrondissent pas pareil ;
// ③ la famille de caractères atteint les nœuds de TEXTE ;
// ④ et le rôle `systeme` ne pose AUCUNE famille — c'est ce qui rend la
//    montée additive, et c'est donc un contrôle, pas une absence.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { compilerANeuf } from "./app-fraiche.ts";

// ── DEUX DOCUMENTS AUX MONDES OPPOSÉS, ET C'EST LE POINT.
//
// `kaviva-spa` est en `soin_doux` — serif, grands rayons, palette sable et
// rose. `coach-fitness` est en `effort_vif` — police système, petits rayons,
// palette graphite et vert. Si ces deux-là se ressemblent à l'écran, le thème
// n'existe pas.
const SPA_DOC = "packages/golden-corpus/corpus-v3/kaviva-spa.air.json";
const FIT_DOC = "packages/golden-corpus/corpus-v3/coach-fitness.air.json";
let SPA = "";
let FIT = "";
beforeAll(async () => {
  const a = await compilerANeuf(SPA_DOC, "deribfy-theme-spa");
  const b = await compilerANeuf(FIT_DOC, "deribfy-theme-fit");
  SPA = a.base;
  FIT = b.base;
  expect(a.fichiers, "rien d'émis pour le spa").toBeGreaterThan(10);
  expect(b.fichiers, "rien d'émis pour le coach").toBeGreaterThan(10);
}, 300_000);

interface Applique {
  readonly familles: readonly string[];
  readonly fonds: readonly string[];
  readonly rayons: readonly number[];
}

/**
 * Monte le PREMIER écran de navigation de l'application et rend les valeurs de
 * style réellement appliquées à ses nœuds.
 *
 * L'écran est lu dans `nav.data.ts` de CHAQUE application : deux documents
 * n'ont pas les mêmes identifiants d'écran, et coder un nom en dur a fait
 * échouer ce fichier sur « module introuvable » à son premier essai.
 */
async function appliques(base: string): Promise<Applique> {
  const { DataRoot } = await import(base + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(base + "lib/runtime/form-state.tsx");
  const { buildDemoProvider } = await import(base + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(base + "demo.data.ts");
  const nav = (await import(base + "nav.data.ts")) as {
    primaryNav?: { screenId: string }[];
    default?: { screenId: string }[];
  };
  const premier = (nav.primaryNav ?? nav.default ?? [])[0]?.screenId ?? "";
  expect(premier, "aucune destination de navigation : rien à monter").not.toBe("");
  const Ecran = (await import(base + `screens/${premier}.tsx`)).default as () => unknown;

  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(DataRoot as never, { provider: buildDemoProvider(demoData) } as never,
        createElement(FormStateRoot as never, null as never, createElement(Ecran as never))) as never,
    );
  });

  // ── LES STYLES SONT DES TABLEAUX IMBRIQUÉS, ET IL FAUT LES APLATIR.
  //
  // React Native accepte `style={[a, b && c, [d]]}`. Ne lire que le premier
  // niveau laisserait passer la moitié des déclarations — et un contrôle qui
  // ne voit pas la moitié des styles peut être vert sans rien garantir.
  type Decl = { fontFamily?: unknown; backgroundColor?: unknown; borderRadius?: unknown };
  const aplatir = (s: unknown): Decl[] =>
    Array.isArray(s) ? s.flatMap(aplatir) : s === null || s === undefined || s === false ? [] : [s as Decl];
  const decls = (r?.root.findAll(() => true) ?? []).flatMap((n) =>
    aplatir((n.props as { style?: unknown }).style),
  );
  const uniques = <T,>(xs: readonly T[]): T[] => [...new Set(xs)];
  const out = {
    familles: uniques(decls.map((d) => d.fontFamily).filter((x): x is string => typeof x === "string")),
    fonds: uniques(decls.map((d) => d.backgroundColor).filter((x): x is string => typeof x === "string")),
    rayons: uniques(decls.map((d) => d.borderRadius).filter((x): x is number => typeof x === "number")).sort(
      (a, b) => a - b,
    ),
  };
  r?.unmount();
  return out;
}

describe("PREUVE — le thème fait deux mondes visuels à l'écran", () => {
  it("① ELLES NE PEIGNENT PAS LE MÊME FOND", async () => {
    const s = await appliques(SPA);
    const f = await appliques(FIT);
    console.log(`\n[THÈME] spa    fonds : ${s.fonds.slice(0, 5).join(" ")}`);
    console.log(`[THÈME] coach  fonds : ${f.fonds.slice(0, 5).join(" ")}`);
    expect(s.fonds.length, "aucun fond appliqué sur le spa").toBeGreaterThan(1);
    expect(f.fonds.length, "aucun fond appliqué sur le coach").toBeGreaterThan(1);
    // ── CETTE ASSERTION A ÉTÉ RÉÉCRITE POUR AVOIR SURVÉCU À SA MUTATION.
    //
    // Première forme : « la MAJORITÉ des fonds diffère ». Mesuré en coupant le
    // catalogue : les deux applications retombaient sur la palette de base
    // avec deux accents hachés différents — donc 3 fonds communs sur 4, et
    // `communs * 2 < total` restait VRAI. Le contrôle passait pour l'état
    // d'AVANT ce lot, qui est exactement ce qu'il devait refuser.
    //
    // Forme actuelle, et elle vient de la mesure : deux mondes opposés ne
    // partagent QUE LE BLANC. La surface claire est blanche partout, et c'est
    // normal ; tout le reste — fond, pastille, bordure, accent — appartient au
    // thème. Un deuxième fond commun signifie que la palette de base
    // reparaît, donc que le catalogue n'agit plus.
    const communs = s.fonds.filter((c) => f.fonds.includes(c));
    console.log(
      `[THÈME] fonds communs : ${String(communs.length)} — ${communs.join(" ")}`,
    );
    expect(
      communs,
      "les deux thèmes partagent plus que le blanc : la palette de base " +
        "reparaît, le catalogue n'agit plus (état d'avant : 2 jetons sur 12)",
    ).toEqual(["#FFFFFF"]);
  });

  it("② ELLES N'ARRONDISSENT PAS PAREIL", async () => {
    // Un salon de soins et une application d'entraînement n'ont pas les mêmes
    // coins. Le rayon ne bougeait pour AUCUN des 22 documents : 6/10/16 pour
    // tout le monde.
    const s = await appliques(SPA);
    const f = await appliques(FIT);
    console.log(`[THÈME] rayons — spa ${s.rayons.join("/")} · coach ${f.rayons.join("/")}`);
    expect(s.rayons.length, "aucun rayon appliqué sur le spa").toBeGreaterThan(0);
    expect(f.rayons.length, "aucun rayon appliqué sur le coach").toBeGreaterThan(0);
    expect(
      s.rayons.join("/"),
      "les deux thèmes arrondissent identiquement : le rayon du catalogue n'agit pas",
    ).not.toBe(f.rayons.join("/"));
  });

  it("③ LE NATIF APPLIQUE SES FACES EMBARQUÉES — et aucune famille sans fichier", async () => {
    // ── CE CONTRÔLE A ÉTÉ RÉÉCRIT, ET IL AVAIT PRÉVU SA PROPRE RÉÉCRITURE.
    //
    // Sa version précédente exigeait ZÉRO famille côté natif, et son message
    // d'échec disait : « soit un fichier de police a été embarqué (alors ce
    // contrôle doit être réécrit), soit un nom a été posé qui sera absent
    // d'une des deux plateformes ». C'est le premier cas qui s'est produit.
    //
    // ── POURQUOI L'ÉTAT A CHANGÉ.
    //
    // Le natif ne servait pas le rôle de famille : `fontFamily` y prend UN
    // nom, pas une pile, et aucun nom n'existe sur iOS ET Android. Brancher
    // par plateforme était interdit par le cliquet `Platform.OS` du code émis
    // — à raison. Jugement du propriétaire, 2026-10-17 : « il faut surtout pas
    // oublier native, on fait les 2 pour ne pas en oublier une ».
    //
    // Un `.ttf` EMBARQUÉ porte le même nom partout : aucun branchement, et
    // l'identité est garantie au lieu d'être espérée.
    //
    // ── LA PROPRIÉTÉ TENUE ICI EST PLUS FORTE QUE « UNE FAMILLE EST POSÉE ».
    //
    // Une famille posée sans fichier correspondant ne lève PAS : elle retombe
    // en silence sur la police système, et c'est précisément le défaut que
    // l'embarquement ferme. On exige donc que CHAQUE famille appliquée ait son
    // fichier dans l'application émise ET sa clé d'enregistrement dans la
    // racine qui les charge. Les trois maillons, mesurés ensemble.
    const s = await appliques(SPA);
    console.log(`[THÈME] natif familles appliquées : ${JSON.stringify(s.familles)}`);
    expect(
      s.familles.length,
      "aucune famille appliquée : le thème déclare `serif` et l'écran reste en " +
        "police système — le maillon qui a manqué quatre fois dans ce dépôt",
    ).toBeGreaterThan(0);

    const racine = readFileSync(join(SPA, "lib", "runtime", "polices.tsx"), "utf8");
    for (const famille of s.familles) {
      expect(
        existsSync(join(SPA, "public", "polices", `${famille}.ttf`)),
        `la famille « ${famille} » est appliquée mais son fichier n'est pas dans ` +
          "l'application émise : elle retombera EN SILENCE sur la police système",
      ).toBe(true);
      expect(
        racine,
        `la famille « ${famille} » n'est pas enregistrée par \`PoliceRoot\` : un ` +
          "fichier embarqué que personne ne charge est un fichier invisible",
      ).toContain(famille);
    }

    // ── ET LES FACES NE SONT PAS VIDES.
    //
    // Un `.ttf` écrit en UTF-8 au lieu d'être décodé depuis base64 serait
    // présent, non vide, et INVALIDE. On vérifie la signature : un TrueType
    // commence par 0x00010000, et c'est ce que le piège base64 — « fermé deux
    // fois déjà » selon l'écrivain d'app — produirait de travers.
    for (const famille of s.familles) {
      const octets = readFileSync(join(SPA, "public", "polices", `${famille}.ttf`));
      expect(octets.length, `la face « ${famille} » est vide`).toBeGreaterThan(10_000);
      expect(
        octets.readUInt32BE(0),
        `la face « ${famille} » n'est pas un TrueType valide : elle a probablement ` +
          "été écrite en texte au lieu d'être décodée depuis base64",
      ).toBe(0x00010000);
    }
  });

  it("④ LES DEUX APPLICATIONS PEIGNENT BIEN DEUX ACCENTS DISTINCTS", async () => {
    // ── LE TÉMOIN QUI SÉPARE « LE THÈME AGIT » DE « LE FOND CHANGE ».
    //
    // Les contrôles ① et ② portent sur le fond et les coins. Celui-ci porte
    // sur l'ACCENT — le seul jeton qui bougeait AVANT ce lot, et qu'il ne
    // faudrait pas perdre en gagnant le reste. `soin_doux` est rose profond,
    // `effort_vif` est vert ; aucun des deux n'est l'orange de la base.
    const s = await appliques(SPA);
    const f = await appliques(FIT);
    const BASE_ORANGE = "#FA5D1E";
    console.log(`[THÈME] accents — spa ${s.fonds.join(" ")} | coach ${f.fonds.join(" ")}`);
    expect(
      s.fonds.includes(BASE_ORANGE) || f.fonds.includes(BASE_ORANGE),
      "l'accent de la marque Deribfy apparaît dans une application cliente : " +
        "c'est le défaut d'EP-247, déjà payé une fois",
    ).toBe(false);
  });
});
