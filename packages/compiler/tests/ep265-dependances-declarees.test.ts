/**
 * EP-265 · TOUT IMPORT DIRECT D'UNE APPLICATION ÉMISE EST DÉCLARÉ.
 *
 * ── LE DÉFAUT, ET C'EST MOI QUI L'AI INTRODUIT LA VEILLE.
 *
 * En embarquant les faces de police, j'ai écrit dans le runtime natif
 * `import { useFonts } from "expo-font"` — et je n'ai PAS déclaré `expo-font`
 * dans les dépendances de l'application générée.
 *
 * Mesuré : ça compilait. Les 32 applications passaient `tsc`, la gate était
 * verte, et j'ai écrit « les deux cibles servent la même police » en toute
 * bonne foi. `expo-font` arrive TRANSITIVEMENT par `expo`, donc le module est
 * là, dans `node_modules`, et tout le monde est content.
 *
 * ── POURQUOI C'EST UN DÉFAUT RÉEL ET PAS UN DÉTAIL DE FORME.
 *
 * Une dépendance transitive n'est pas un contrat. `expo` peut cesser de tirer
 * `expo-font` à n'importe quelle montée mineure — et alors l'application d'un
 * client ne se construit plus, pour une ligne que PERSONNE n'a touchée. C'est
 * la définition d'une panne qu'on ne peut pas diagnostiquer : rien n'a changé
 * chez nous.
 *
 * `expo install --check` et les outils d'EAS signalent d'ailleurs ce cas.
 *
 * ── CE QUE CE CLIQUET TIENT, ET POURQUOI IL EST GÉNÉRIQUE.
 *
 * Nommer `expo-font` fermerait le défaut d'aujourd'hui et laisserait passer le
 * suivant. On EXTRAIT tous les spécificateurs nus des fichiers émis, et on
 * exige la déclaration — sur les DEUX cibles, parce qu'elles n'ont ni le même
 * code ni le même `package.json`, et que le propriétaire a demandé
 * explicitement de « couvrir web et native ».
 *
 * Mesuré au moment de l'écrire : natif 9 paquets importés / 15 déclarés, web
 * 4 / 7. Un seul manquait — le mien.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";
import { compileProject } from "../src/compile-project.ts";
import { compileWeb } from "../src/compile-web.ts";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CORPUS = join(R, "packages", "golden-corpus", "corpus-v3");

const documents = (): { nom: string; air: ProjectAir }[] =>
  readdirSync(CORPUS)
    .filter((f) => f.endsWith(".air.json"))
    .map((f) => ({
      nom: f.replace(".air.json", ""),
      air: migrateAirDocument(
        JSON.parse(readFileSync(join(CORPUS, f), "utf8")) as Record<string, unknown>,
      ),
    }));

/**
 * Le PAQUET désigné par un spécificateur.
 *
 * `expo-font` → `expo-font` ; `react-native/Libraries/x` → `react-native` ;
 * `@react-navigation/native` → `@react-navigation/native` (deux segments, le
 * scope ne se sépare pas de son nom).
 */
const paquetDe = (specificateur: string): string =>
  specificateur.startsWith("@")
    ? specificateur.split("/").slice(0, 2).join("/")
    : (specificateur.split("/")[0] ?? "");

/** Les spécificateurs NUS importés par les fichiers de code d'une application. */
const paquetsImportes = (files: ReadonlyMap<string, string>): Map<string, string[]> => {
  const out = new Map<string, string[]>();
  for (const [chemin, contenu] of files) {
    if (!/\.tsx?$/u.test(chemin) || typeof contenu !== "string") continue;
    // `from "x"`, `import("x")`, `require("x")` — un spécificateur NU ne
    // commence ni par `.` ni par `/`.
    for (const m of contenu.matchAll(
      /(?:from|import|require)\s*\(?\s*["']([^"'./][^"']*)["']/gu,
    )) {
      const p = paquetDe(m[1] ?? "");
      if (p === "") continue;
      const liste = out.get(p) ?? [];
      liste.push(chemin);
      out.set(p, liste);
    }
  }
  return out;
};

const declaresDe = (files: ReadonlyMap<string, string>): Set<string> => {
  const pkg = JSON.parse(files.get("package.json") ?? "{}") as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    // `react/jsx-runtime` vient de `react`, déjà déclaré : le découpage par
    // paquet le ramène à `react`, donc rien de spécial à exempter.
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
};

describe("EP-265 · les dépendances d'une application émise sont déclarées", () => {
  for (const [cible, compile] of [
    ["NATIF", compileProject],
    ["WEB", compileWeb],
  ] as const) {
    it(`${cible} — aucun import nu non déclaré, sur TOUT le corpus`, () => {
      const docs = documents();
      expect(docs.length, "corpus introuvable : ce cliquet ne mesure plus rien").toBeGreaterThan(
        10,
      );
      const griefs: string[] = [];
      for (const { nom, air } of docs) {
        const files = compile(air).files;
        const declares = declaresDe(files);
        expect(declares.size, `${nom} : aucune dépendance déclarée`).toBeGreaterThan(3);
        const importes = paquetsImportes(files);
        expect(importes.size, `${nom} : aucun import lu`).toBeGreaterThan(2);
        for (const [paquet, fichiers] of importes) {
          if (declares.has(paquet)) continue;
          griefs.push(`${nom} → ${paquet} (importé par ${fichiers[0] ?? "?"})`);
        }
      }
      expect(
        [...new Set(griefs)],
        "ces paquets sont IMPORTÉS par l'application émise et pas DÉCLARÉS. Ils " +
          "arrivent aujourd'hui par transitivité, donc tout compile — et le jour " +
          "où la dépendance parente cesse de les tirer, l'application d'un client " +
          "ne se construit plus pour une ligne que personne n'a touchée.",
      ).toEqual([]);
    });
  }

  it("LE VERROU DU GABARIT EST D'ACCORD AVEC SON `package.json`", () => {
    // ── POURQUOI CE CONTRÔLE EXISTE À CÔTÉ DU PREMIER.
    //
    // Déclarer une dépendance dans `package.json` sans l'inscrire à la RACINE
    // du verrou fait échouer `npm ci` — « lock file out of sync ». Et aucune
    // gate ne lance `npm ci` sur une application NATIVE : elles empruntent un
    // `node_modules` déjà installé. Le défaut serait donc invisible ici et
    // visible chez le client.
    const pkg = JSON.parse(
      readFileSync(join(R, "packages", "compiler", "template", "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const verrou = JSON.parse(
      readFileSync(join(R, "packages", "compiler", "template", "package-lock.json"), "utf8"),
    ) as { packages?: Record<string, { dependencies?: Record<string, string>; version?: string }> };

    const declarees = pkg.dependencies ?? {};
    const racine = verrou.packages?.[""]?.dependencies ?? {};
    const absentes = Object.keys(declarees).filter((p) => !(p in racine));
    expect(
      absentes,
      "ces dépendances sont déclarées mais absentes de la racine du verrou : " +
        "`npm ci` refusera le projet",
    ).toEqual([]);

    // ET LA VERSION RÉSOLUE EST BIEN CELLE QU'ON DEMANDE : un verrou qui
    // installe autre chose que la version déclarée est un verrou qui ment.
    const desaccords = Object.entries(declarees)
      .filter(([p, v]) => {
        const installee = verrou.packages?.[`node_modules/${p}`]?.version;
        return installee !== undefined && /^\d/u.test(v) && installee !== v;
      })
      .map(([p, v]) => `${p}: demandé ${v}, verrouillé ${String(verrou.packages?.[`node_modules/${p}`]?.version)}`);
    expect(desaccords, "le verrou installe une autre version que celle déclarée").toEqual([]);
  });
});
