// ════════════════════════════════════════════════════════════════════
//  LOT 4 — NIVEAU ③ : VOTRE APPLICATION SE MONTE-T-ELLE VRAIMENT ?
// ════════════════════════════════════════════════════════════════════
//
// ── CE QU'AUCUN JUGE NE VOYAIT, ET QUI SE MESURE DÉJÀ AILLEURS.
//
// Les cinq juges d'acceptation lisent le DOCUMENT. Le LOT 2 a ajouté la
// COMPILATION. Reste le troisième niveau : l'écran se monte-t-il ?
//
// Deribfy sait déjà le faire — `gate:app-rendu` monte 244 écrans. Mais il
// ne sait le faire QUE sur le corpus de 29 applications, et son cliquet
// exige ce nombre EXACT. Y glisser une génération du propriétaire aurait
// cassé un cliquet juste, ou obligé à l'assouplir. Ni l'un ni l'autre.
//
// Ce fichier est donc l'instrument du CAS PARTICULIER : une application,
// désignée par `DERIBFY_APP`, montée écran par écran.
//
// ── D'OÙ VIENT L'IDÉE, ET ELLE N'EST PAS DE MOI.
//
// v0, observé le 2026-10-16 : `agent-browser open` → `set viewport 390 844`
// → lecture de l'arbre d'accessibilité → `fill @e9 "13000"` → vérification
// que le nombre affiché a changé. Quatre niveaux : types, build, rendu,
// COMPORTEMENT. Base44 s'arrête au rendu (une capture). Deribfy s'arrêtait
// au document.
//
// Ce fichier atteint le niveau ③. Le ④ — presser et constater l'effet —
// est le LOT 6, et il est atteignable sans navigateur : `react-test-renderer`
// sait déclencher un `onPress`.
//
// ── POURQUOI IL NE TOURNE PAS AVEC LES AUTRES.
//
// Son extension est `.une.tsx`, pas `.obs.tsx` : la configuration du corpus
// ne le ramasse pas. Un fichier qui se SAUTE tout seul dans une gate est un
// trou silencieux — celui-ci n'y est simplement pas.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const BASE = (process.env.DERIBFY_APP ?? "").replace(/\/?$/u, "/");

describe("UNE APPLICATION — ses écrans se montent", () => {
  it("chaque écran rend, et dit ce qui l'en empêche", { timeout: 120_000 }, async () => {
    expect(
      BASE !== "/" && existsSync(BASE),
      "aucune application désignée — passer par `npm run verifier:une-app <document.json>`",
    ).toBe(true);

    // ── LES AVERTISSEMENTS DE REACT SONT DES DÉFAUTS, PAS DU BRUIT.
    //
    // Une clé manquante, un état posé pendant le rendu, un hôte inconnu :
    // React les écrit sur la console et rend quand même. Les laisser filer,
    // c'est déclarer « ça marche » sur une application qui se plaint.
    //
    // TROIS BRUITS SONT ÉCARTÉS, et ce ne sont pas des exceptions de
    // complaisance — c'est la MÊME liste que la gate du corpus, pour la même
    // raison. Deux d'entre eux viennent du HARNAIS (`react-test-renderer`
    // déprécié, `act(...)` non configuré) : ils parlent de l'outil, pas de
    // l'application. Le troisième, `AIR_CAPABILITY_NOT_IMPLEMENTED`, est le
    // fournisseur par défaut qui REFUSE ET TRACE, exactement comme conçu.
    //
    // Recopier cette liste serait une dérive en puissance ; si elle change
    // dans la gate, elle doit changer ici. On la garde courte et on dit
    // d'où elle vient.
    const plaintes: string[] = [];
    const avant = { error: console.error, warn: console.warn };
    const BRUIT_DU_HARNAIS = [
      "AIR_CAPABILITY_NOT_IMPLEMENTED",
      "react-test-renderer is deprecated",
      "not configured to support act",
    ];
    const capturer = (...a: unknown[]): void => {
      const m = a.map((x) => String(x)).join(" ");
      if (!BRUIT_DU_HARNAIS.some((b) => m.includes(b))) plaintes.push(m.slice(0, 200));
    };
    console.error = capturer;
    console.warn = capturer;

    const problemes: string[] = [];
    let ecrans = 0;
    let muets = 0;

    try {
      const { DataRoot } = await import(BASE + "lib/runtime/data-provider.tsx");
      const { FormStateRoot } = await import(BASE + "lib/runtime/form-state.tsx");
      const { buildDemoProvider } = await import(BASE + "lib/runtime/demo-provider.ts");
      const { demoData } = await import(BASE + "demo.data.ts");
      const provider = buildDemoProvider(demoData);

      for (const f of readdirSync(BASE + "screens")
        .filter((x) => x.endsWith(".tsx"))
        .sort()) {
        ecrans += 1;
        const Ecran = (await import(BASE + "screens/" + f)).default as () => unknown;
        let r: ReactTestRenderer | undefined;
        try {
          act(() => {
            r = create(
              createElement(
                DataRoot as never,
                { provider } as never,
                createElement(FormStateRoot as never, null as never, createElement(Ecran as never)),
              ) as never,
            );
          });
        } catch (e) {
          problemes.push(`${f} — EXCEPTION : ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }
        // ── UN ÉCRAN QUI REND « null » REND, ET NE MONTRE RIEN.
        //
        // Le distinguer d'un écran vivant est tout l'intérêt : « il se monte »
        // serait vrai, et faux.
        const ids = r?.root.findAll(
          (n) => typeof (n.props as { testID?: string }).testID === "string",
        ).length ?? 0;
        if (ids === 0) {
          muets += 1;
          problemes.push(`${f} — AUCUNE identité adressable : l'écran rend du vide`);
        }
      }
    } finally {
      console.error = avant.error;
      console.warn = avant.warn;
    }

    console.log(`\n  ${String(ecrans)} écran(s) monté(s) · ${String(muets)} muet(s)`);
    for (const p of problemes.slice(0, 20)) console.log(`   🔴 ${p}`);
    for (const p of [...new Set(plaintes)].slice(0, 10)) console.log(`   ⚠️  ${p}`);

    // Sans ce compte, une application SANS écran passerait au vert sans que
    // rien n'ait été monté.
    expect(ecrans, "aucun écran monté : il n'y a rien à vérifier").toBeGreaterThan(0);
    expect(problemes, problemes.slice(0, 6).join(" · ")).toEqual([]);
    expect(
      [...new Set(plaintes)],
      "React se plaint pendant le rendu — l'application marche en se plaignant",
    ).toEqual([]);
  });
});
