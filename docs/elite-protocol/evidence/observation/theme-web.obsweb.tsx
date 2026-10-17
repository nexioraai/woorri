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
//   · le NATIF ne le sert pas. `fontFamily` y prend UN nom, pas une pile, et
//     aucun nom n'existe sur iOS ET Android ; un nom absent retombe EN
//     SILENCE sur la police système. Servir le rôle exigerait soit un
//     `Platform.OS` — interdit par le cliquet 4 de `keyboard-a11y-locks`, et
//     le dépôt n'en contenait aucun avant ce lot — soit un fichier de police
//     embarqué, qui est une décision du propriétaire (binaire + licence).
//
//   · le WEB le sert POUR DE VRAI. Une pile CSS se dégrade : le navigateur
//     prend la première police présente, et il n'y a là aucun branchement de
//     plateforme à inventer.
//
// La moitié servie est donc prouvée ici, par montage. L'autre moitié est
// nommée, avec sa cause exacte, et tenue par le contrôle ③ de
// `theme-identite.obs.tsx` — qui ROUGIT si quelqu'un pose un nom au natif.
//
// ── CE QUE CE FICHIER TIENT.
//
// ① l'application d'un thème `serif` porte une pile de polices à l'écran ;
// ② cette pile finit par un GÉNÉRIQUE — sinon la dégradation n'aboutit pas ;
// ③ CONTRÔLE NÉGATIF : un thème `systeme` n'en porte aucune.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Même convention que `corpus-web` : on lit ce que `gate:app-web` vient de
// compiler, et on REFUSE de deviner si le dossier n'est pas là.
const base = (app: string): string => join(tmpdir(), "deribfy-gate-web", app) + "/";
const SPA = "v3-kaviva-spa";
const FIT = "v3-coach-fitness";

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
        "en police système — le maillon qui a manqué trois fois dans ce dépôt",
    ).toBeGreaterThan(0);
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
});
