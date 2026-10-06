// GATE RACINE — LES APPLICATIONS WEB ÉMISES SE MONTENT VRAIMENT.
//
// ── LE TROU QUE CETTE GATE FERME.
//
// La cible web est née le 2026-10-05 avec sa gate de COMPILATION (`app_web`,
// 29/29, zéro import react-native). Elle n'avait pas d'équivalent de
// `app_rendu` — et c'était la seule limite de la cible web déclarée dans son
// propre code.
//
// Une PWA peut compiler parfaitement et n'afficher RIEN. Le dépôt connaît ce
// défaut par cœur : au lot d'accès 1.28.0, le modèle de droits était émis et
// INERTE ; en branchant la cible web, `navigate` recevait des paramètres et ne
// les écrivait nulle part — tout écran de détail se serait ouvert vide. Les
// deux compilaient.
//
// ── CE QU'ELLE PROUVE, ET DANS QUEL ORDRE.
//
// ① l'arbre de composants s'EXÉCUTE — hooks, fournisseurs, données d'écran ;
// ② chaque écran porte des identités adressables (`data-testid`) ;
// ③ aucun avertissement React — qui est un DÉFAUT, pas du bruit ;
// ④ chaque geste se PRESSE sans exception. C'est la moitié qui compte : un
//    écran peut se rendre parfaitement et n'avoir que des boutons muets.
//
// ── ET CE QU'ELLE NE PROUVE PAS, DIT ICI.
//
// 🟠 La MISE EN PAGE. Aucun style n'est calculé : rien ici ne dit qu'un écran
//    est lisible, seulement qu'il vit. Seul un vrai navigateur le dirait.
// 🟠 Le point d'entrée (`index.tsx`, `createRoot`) et la racine (`App.tsx`) ne
//    sont pas montés : ils exigent un DOM. Ce sont les deux seuls fichiers de
//    l'enveloppe web qui en dépendent, et ils sont de dix lignes.
//
// Prérequis : `npm run gate:app-web` a écrit les projets sous `gate-web/`.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Même répertoire que `gate:app-web`, calculé et non codé en dur (D-074).
const RACINE = join(tmpdir(), "deribfy-gate-web") + "/";

describe("GATE RACINE — les applications WEB émises se MONTENT vraiment", () => {
  it(
    "chaque écran web rend, porte des identités, et se presse",
    { timeout: 180_000 },
    async () => {
      expect(existsSync(RACINE), "lancer d'abord `npm run gate:app-web`").toBe(true);
      const apps = readdirSync(RACINE).sort();
      // Le cliquet est EXACT, comme son jumeau natif : toute application
      // ajoutée ou perdue sans décision le fait échouer. Il vise le MÊME
      // corpus que la gate de compilation web — 29 documents au 2026-10-05.
      expect(apps.length, "les applications web du corpus").toBe(29);

      let ecrans = 0;
      const problemes: string[] = [];

      // AVERTISSEMENTS REACT (D-076) — un avertissement est un défaut. La
      // première version de la gate native ne regardait que les exceptions, et
      // la CI a révélé « two children with the same key », que React qualifie
      // lui-même de comportement non supporté.
      const avertissements: string[] = [];
      const vraiError = console.error;
      const vraiWarn = console.warn;
      const capturer = (...args: unknown[]): void => {
        const m = args.map((a) => String(a)).join(" ");
        if (
          // Le fournisseur par défaut REFUSE ET TRACE : c'est la conception,
          // pas un défaut.
          !m.includes("AIR_CAPABILITY_NOT_IMPLEMENTED") &&
          !m.includes("react-test-renderer is deprecated") &&
          !m.includes("not configured to support act")
        ) {
          avertissements.push(m.slice(0, 160));
        }
      };
      console.error = capturer;
      console.warn = capturer;

      try {
        for (const app of apps) {
          const base = RACINE + app + "/";
          const { DataRoot } = await import(base + "lib/runtime/data-provider.tsx");
          const { FormStateRoot } = await import(base + "lib/runtime/form-state.tsx");
          const { buildDemoProvider } = await import(base + "lib/runtime/demo-provider.ts");
          const { demoData } = await import(base + "demo.data.ts");
          const provider = buildDemoProvider(demoData);

          for (const f of readdirSync(base + "screens")
            .filter((x) => x.endsWith(".tsx"))
            .sort()) {
            ecrans += 1;
            const Ecran = (await import(base + "screens/" + f)).default as () => unknown;
            let r: ReactTestRenderer | undefined;
            try {
              act(() => {
                r = create(
                  createElement(
                    DataRoot as never,
                    { provider } as never,
                    createElement(
                      FormStateRoot as never,
                      null as never,
                      createElement(Ecran as never),
                    ),
                  ) as never,
                );
              });
            } catch (e) {
              problemes.push(
                `${app}/${f} — EXCEPTION : ${e instanceof Error ? e.message : String(e)}`,
              );
              continue;
            }

            // ── LES IDENTITÉS SONT `data-testid` SUR LE WEB, PAS `testID`.
            //
            // Le CONTRAT est le même des deux côtés — les blocs exposent
            // `testID` — mais les hôtes web le traduisent en `data-testid`,
            // la convention que lisent les harnais du web. Chercher `testID`
            // ici aurait rendu ZÉRO sur toutes les applications, et la gate
            // aurait accusé les écrans d'un défaut qui serait le sien.
            const ids = r!.root.findAll(
              (n) => typeof (n.props as Record<string, unknown>)["data-testid"] === "string",
            ).length;
            if (ids === 0) problemes.push(`${app}/${f} — AUCUNE identité adressable`);

            // ── PRESSER, PAS SEULEMENT MONTER.
            //
            // Sur le web, un geste est un `<button onClick>` : `Geste`
            // traduit `onPress` en `onClick`, et c'est délibéré — un `div`
            // cliquable n'est ni atteignable au clavier ni annoncé.
            try {
              act(() => {
                for (const b of r!.root.findAll(
                  (n) => typeof (n.props as { onClick?: unknown }).onClick === "function",
                )) {
                  (b.props as { onClick: () => void }).onClick();
                }
              });
            } catch (e) {
              problemes.push(
                `${app}/${f} — PRESSION FATALE : ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }
        }
      } finally {
        console.error = vraiError;
        console.warn = vraiWarn;
      }

      // Le nombre d'écrans est publié AVANT les verdicts : une gate qui dirait
      // « 0 problème » sur 0 écran monté ne prouverait rien.
      //
      // `process.stdout` et non `console.error` : le harnais regroupe les
      // sorties de console par test et les masque quand il passe. Un compte
      // qu'on ne voit qu'en échec ne sert à rien — c'est précisément quand la
      // gate est verte qu'il faut pouvoir vérifier qu'elle a travaillé.
      process.stdout.write(
        `\n  ${String(apps.length)} applications web · ${String(ecrans)} écrans montés\n`,
      );
      expect(ecrans, "des écrans ont été montés").toBeGreaterThan(100);
      expect(problemes, problemes.slice(0, 6).join(" · ")).toEqual([]);
      expect(
        [...new Set(avertissements)],
        "avertissement React = défaut (D-076)",
      ).toEqual([]);
    },
  );
});
