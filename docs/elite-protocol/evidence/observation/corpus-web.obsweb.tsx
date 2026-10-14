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
      // ajoutée ou perdue sans décision le fait échouer.
      //
      // ÉDITION CONSCIENTE (2026-10-05) : 31, et c'est le MÊME nombre que le
      // natif depuis que la liste des documents est PARTAGÉE
      // (`corpus-documents.mjs`). Les deux gates en portaient chacune une :
      // 31 d'un côté, 29 de l'autre, quatre heures après la naissance de
      // celle-ci. Une cible qui mesure un document que l'autre ignore ne se
      // voit pas — les deux gates restent vertes.
      // ÉDITION CONSCIENTE (2026-10-13, quatrième) : 32 avec
      // `boutique-mode-agent`. Mesure qui l'a imposée : ZÉRO document du corpus
      // ne déclarait `apis` ni `agent`. Le connecteur d'API, la porte de
      // l'agent, son cerveau et son écran étaient prouvés par trente-huit tests
      // et par AUCUNE gate — donc « émis et supposé bon ». Dès son ajout, la
      // gate de compilation a trouvé ce que les tests ne voyaient pas : un
      // agent monté SANS racine de session, dont chaque appel aurait été refusé
      // 403. Une variante d'un document RÉEL, pas un document fabriqué : un cas
      // écrit pour l'occasion ne mesure que ma capacité à le faire passer.
      expect(apps.length, "les applications web du corpus").toBe(32);

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

            // ── AUCUN CODE MACHINE SOUS LES YEUX D'UN HUMAIN (2026-10-13).
            //
            // MESURE QUI A IMPOSÉ CE CONTRÔLE. Le propriétaire a ouvert une
            // application web générée et a jugé : « visuellement nul ».
            // Compté ensuite sur le corpus : 33 documents sur 46 affichaient
            // des valeurs BRUTES — « en_attente_documents »,
            // « SEQUESTRE_BLOQUE », « coupe_ciseaux », « bientot_epuise ».
            // 98 champs montrés, 229 valeurs distinctes.
            //
            // ── POURQUOI ICI EN PLUS DU VALIDATEUR.
            //
            // `AIR_ENUM_CODE_MONTRE` refuse le DOCUMENT qui n'a pas nommé ses
            // états. C'est la bonne porte, et elle ne suffit pas : elle ne
            // voit que les quatre propriétés qu'elle connaît. Un code peut
            // arriver à l'écran par un autre chemin — un champ non énuméré,
            // un libellé de bouton, un titre d'écran recopié depuis un
            // identifiant. Ce contrôle lit le TEXTE RENDU et ne suppose
            // aucun chemin. Deux portes, pas une (règle des chemins
            // d'entrée : fermer par cliquet, pas par correction).
            //
            // ── CE QU'IL APPELLE UN CODE, ET CE QU'IL LAISSE PASSER.
            //
            // Deux formes mécaniques, sans aucun jugement de langue :
            // `mot_mot` en minuscules, et MOT_MOT en capitales avec tiret
            // bas. Rien d'autre. « XXL » passe — c'est une taille légitime,
            // et une règle sur les capitales seules l'aurait faussement
            // accusé (mesuré : 1 faux sur 69). Une date ISO passe aussi :
            // c'est un autre défaut, consigné et non traité ici.
            //
            // Les textes des DONNÉES DE DÉMONSTRATION sont concernés comme
            // les autres : c'est ce que le propriétaire voit à l'écran.
            const CODE = /^[a-z0-9]+(_[a-z0-9]+)+$|^[A-Z0-9]+(_[A-Z0-9]+)+$/;
            const textesVus: string[] = [];
            const ramasser = (n: unknown): void => {
              if (typeof n === "string") {
                textesVus.push(n);
                return;
              }
              if (Array.isArray(n)) {
                n.forEach(ramasser);
                return;
              }
              const o = n as { children?: unknown } | null;
              if (o !== null && typeof o === "object" && o.children !== undefined) {
                ramasser(o.children);
              }
            };
            ramasser(r!.toJSON());
            const codesVus = [...new Set(textesVus.map((t) => t.trim()).filter((t) => CODE.test(t)))];
            if (codesVus.length > 0) {
              problemes.push(
                `${app}/${f} — CODE MACHINE À L'ÉCRAN : ` +
                  codesVus.slice(0, 4).map((c) => `« ${c} »`).join(", "),
              );
            }

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
      // ── CHANGER D'ADRESSE DOIT CHANGER L'ÉCRAN (2026-10-14).
      //
      // MESURE, et c'est le PROPRIÉTAIRE qui l'a vue sur une capture : la
      // barre d'adresse affichait « #/scr_profil » et l'écran montrait
      // toujours « Mon compteur ». L'onglet actif restait « Accueil ».
      // L'application paraissait gelée.
      //
      // ── LA CAUSE N'ÉTAIT PAS L'ABONNEMENT. IL MARCHAIT.
      //
      // `NavigationWeb` s'abonne à `hashchange` et `popstate` depuis
      // toujours, et appelle bien son `setState`. Mais l'écran lui arrive en
      // `children` — une PROP. Quand un composant se redessine à cause de son
      // propre état, React compare l'élément `children` au précédent, le
      // trouve RÉFÉRENTIELLEMENT identique, et écarte tout son sous-arbre.
      // L'abonnement fonctionnait parfaitement et ne servait à rien.
      //
      // C'est la classe de défaut la plus coûteuse de ce dépôt : le code qui
      // doit agir EXISTE, se lit comme correct, et n'a aucun effet.
      //
      // ── POURQUOI CETTE GATE NE LE VOYAIT PAS, ALORS QU'ELLE PRESSE TOUT.
      //
      // Elle monte 244 écrans et presse chaque geste — elle vérifie qu'aucune
      // pression ne LÈVE, jamais que l'écran a CHANGÉ. Un bouton de
      // navigation parfaitement mort la passait. C'était son angle mort, et
      // il est fermé ici.
      //
      // ── SUR LE RUNTIME ÉMIS, PAS SUR CELUI DU DÉPÔT.
      //
      // Le module testé est celui que l'application EMPORTE. Une correction
      // qui resterait dans le dépôt sans être recopiée ne passerait pas.
      {
        const base = RACINE + apps[0] + "/";
        const { NavigationWeb, ecranDeLAdresse } = await import(
          base + "lib/runtime/navigation-web.tsx"
        );
        const ecouteurs = new Map<string, Set<() => void>>();
        const faux = {
          location: { hash: "#/depart" },
          addEventListener: (t: string, f: () => void) => {
            const g = ecouteurs.get(t) ?? new Set<() => void>();
            g.add(f);
            ecouteurs.set(t, g);
          },
          removeEventListener: (t: string, f: () => void) => {
            ecouteurs.get(t)?.delete(f);
          },
          history: { replaceState: () => undefined },
        };
        const avant = (globalThis as { window?: unknown }).window;
        (globalThis as { window?: unknown }).window = faux;
        try {
          const Enfant = () =>
            createElement("span", null, (ecranDeLAdresse as (d: string) => string)("depart"));
          let rn: ReactTestRenderer | undefined;
          act(() => {
            rn = create(
              createElement(
                NavigationWeb as never,
                { ecranDEntree: "depart" } as never,
                createElement(Enfant),
              ) as never,
            );
          });
          const lire = (): string => JSON.stringify(rn?.toJSON() ?? null);
          const depart = lire().includes("depart");
          act(() => {
            faux.location.hash = "#/arrivee";
            for (const f of ecouteurs.get("hashchange") ?? []) f();
          });
          const arrive = lire().includes("arrivee") && !lire().includes("depart");
          if (!depart || !arrive) {
            problemes.push(
              `${apps[0]} — L'ADRESSE CHANGE, L'ÉCRAN NON : ` +
                `départ=${String(depart)} arrivée=${String(arrive)} · rendu ${lire().slice(0, 120)}`,
            );
          }
        } finally {
          if (avant === undefined) delete (globalThis as { window?: unknown }).window;
          else (globalThis as { window?: unknown }).window = avant;
        }
      }

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
