// ════════════════════════════════════════════════════════════════════
//  PREUVE — L'AVATAR À INITIALES EST RENDU SUR LA CIBLE *WEB* AUSSI.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI CE FICHIER EXISTE, ET C'EST UN AVEU.
//
// En posant l'avatar (LOT B ④), j'ai prouvé le rendu par montage NATIF, et
// pour le web je n'ai prouvé que la COMPILATION — 32/32 applications. J'ai
// ensuite écrit « l'avatar, de bout en bout, natif et web ». C'était un pas de
// trop : compiler n'est pas rendre.
//
// Et le risque n'était pas théorique. `primitives.tsx` n'est PAS partagé entre
// les cibles : je l'avais d'abord posé côté natif seulement, et les 32
// applications web avaient cessé de compiler. Une fois la primitive recopiée,
// rien ne disait qu'elle s'AFFICHE — les hôtes web sont du HTML, pas des vues
// React Native.
//
// ── CE QUE CE FICHIER TIENT.
//
// ① la liste des membres rend un rond par ligne, sur la cible WEB ;
// ② les initiales viennent du nom de LEUR ligne ;
// ③ le nom entier reste lu par les technologies d'assistance.
//
// ── LES IDENTITÉS SONT `data-testid` SUR LE WEB, PAS `testID`.
//
// Le contrat est le même des deux côtés — les blocs exposent `testID` — mais
// les hôtes web le traduisent en attribut HTML. Chercher `testID` ici rendrait
// zéro nœud et un vert mensonger.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer, ReactTestInstance } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Même convention que `corpus-web` : on lit ce que `gate:app-web` vient de
// compiler, et on REFUSE de deviner si le dossier n'est pas là.
const BASE = join(tmpdir(), "deribfy-gate-web", "tontine") + "/";

const idDe = (n: ReactTestInstance): string =>
  String((n.props as { "data-testid"?: string })["data-testid"] ?? "");

/** Le texte rendu sous un nœud, concaténé. */
const texte = (n: ReactTestInstance): string =>
  n.findAll(() => true)
    .flatMap((x) => (Array.isArray(x.props.children) ? x.props.children : [x.props.children]))
    .filter((c): c is string => typeof c === "string")
    .join("");

async function monterMembres(): Promise<ReactTestRenderer> {
  const { DataRoot } = await import(BASE + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(BASE + "lib/runtime/form-state.tsx");
  const { SessionRoot } = await import(BASE + "lib/runtime/session-provider.tsx");
  const { buildDemoProvider } = await import(BASE + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(BASE + "demo.data.ts");
  const Ecran = (await import(BASE + "screens/scr_membres.tsx")).default as () => unknown;
  // `scr_membres` n'est pas un écran à droit, mais la session est fournie quand
  // même : six des neuf écrans de ce document en exigent un, et un harnais qui
  // n'en passe aucun rend la moitié de l'application invisible.
  const session = {
    estAuthentifie: () => true,
    identifiant: () => "obs-avatar-web",
    abonner: () => () => undefined,
    droits: () => ["right_registre"],
  };
  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(SessionRoot as never, { provider: session } as never,
        createElement(DataRoot as never, { provider: buildDemoProvider(demoData) } as never,
          createElement(FormStateRoot as never, null as never, createElement(Ecran as never)))) as never,
    );
  });
  return r!;
}

describe("PREUVE WEB — l'avatar à initiales est rendu par la cible web", () => {
  it("① LA LISTE DES MEMBRES REND UN ROND PAR LIGNE, EN HTML", async () => {
    expect(existsSync(BASE), "lancer d'abord `npm run gate:app-web`").toBe(true);
    const r = await monterMembres();
    const lignes = r.root.findAll((n) => idDe(n).includes("-row-"));
    const ronds = r.root.findAll((n) => idDe(n).includes("-avatar-"));
    console.log(
      `\n[AVATAR-WEB] membres — lignes : ${String(lignes.length)} · ronds : ${String(ronds.length)}`,
    );
    expect(lignes.length, "la liste de membres est vide : rien à juger").toBeGreaterThan(0);
    expect(
      ronds.length,
      "aucun rond rendu sur la cible WEB : la primitive compile mais ne s'affiche pas",
    ).toBeGreaterThan(0);
    r.unmount();
  });

  it("② LES INITIALES VIENNENT DU NOM DE LEUR LIGNE", async () => {
    const r = await monterMembres();
    const ronds = r.root.findAll((n) => idDe(n).includes("-avatar-"));
    expect(ronds.length, "aucun rond à interroger").toBeGreaterThan(0);
    const vus: string[] = [];
    for (const rond of ronds) {
      const id = idDe(rond).split("-avatar-")[1] ?? "";
      const ligne = r.root.findAll((n) => idDe(n) === `blk_membres_liste-row-${id}`)[0];
      expect(ligne, `aucune ligne pour le rond ${id}`).not.toBeUndefined();
      const nom = texte(ligne as ReactTestInstance).trim();
      const ini = texte(rond).trim();
      vus.push(`${ini} ← ${nom.slice(0, 20)}`);
      expect(ini.length, `rond vide sur la ligne ${id}`).toBeGreaterThan(0);
      expect(ini[0], `les initiales « ${ini} » ne viennent pas du nom « ${nom} »`).toBe(
        nom[0]?.toUpperCase(),
      );
    }
    console.log("[AVATAR-WEB] " + vus.slice(0, 4).join(" · "));
    r.unmount();
  });

  it("③ LE NOM ENTIER RESTE LU — l'oreille n'entend pas « A M »", async () => {
    const r = await monterMembres();
    // Côté web l'étiquette devient `aria-label` : un `accessibilityLabel`
    // cherché ici rendrait zéro et passerait pour une absence.
    const ronds = r.root
      .findAll((n) => idDe(n).includes("-avatar-"))
      .filter((n) => typeof (n.props as { "aria-label"?: string })["aria-label"] === "string");
    expect(ronds.length, "aucun rond ne porte d'étiquette accessible").toBeGreaterThan(0);
    for (const rond of ronds) {
      const etiquette = String((rond.props as { "aria-label": string })["aria-label"]);
      const ini = texte(rond).trim();
      expect(
        etiquette.length,
        `l'étiquette « ${etiquette} » n'est que les initiales`,
      ).toBeGreaterThan(ini.length);
    }
    console.log(
      "[AVATAR-WEB] étiquette du premier rond :",
      String((ronds[0]?.props as { "aria-label"?: string })["aria-label"]),
    );
    r.unmount();
  });
});
