/**
 * EP-244 · LES DEUX CIBLES SONT LIVRABLES, ET ELLES NE SE MÉLANGENT PAS.
 *
 * ── LE CONSTAT QUI A COMMANDÉ CE FICHIER.
 *
 * Le moteur est BI-CIBLE depuis le 2026-10-05 : `compileProject` émet une
 * application React Native / Expo, `compileWeb` une application Vite. Les
 * deux sont gatées à chaque vérification (`app_compile`, `app_web`).
 *
 * Mais la route de livraison n'appelait que `compileWeb`. Le natif existait,
 * mature et testé — et n'était offert à personne. Moteur bi-cible, interface
 * mono-cible.
 *
 * ── CE QUE CE FICHIER TIENT.
 *
 * ① Les deux cibles compilent le MÊME document AIR, sans rien regénérer.
 * ② Elles ne se contaminent PAS : aucune dépendance de l'une dans l'autre,
 *    aucun fichier d'enveloppe de l'une dans l'autre.
 *
 * La séparation n'est pas une intention de design : elle est mesurée ici,
 * dépendance par dépendance. Si un jour Vite entrait dans le zip Expo, ou
 * React Native dans le zip web, ce fichier rougirait avant l'utilisateur.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..");

const document = (): ProjectAir =>
  migrateAirDocument(
    JSON.parse(
      readFileSync(join(RACINE, "packages/golden-corpus/corpus-v3/bus-intercites.air.json"), "utf8"),
    ),
  );

const deps = (files: ReadonlyMap<string, string>): string[] => {
  const brut = files.get("package.json");
  if (brut === undefined) return [];
  const p = JSON.parse(brut) as { dependencies?: Record<string, string> };
  return Object.keys(p.dependencies ?? {});
};

describe("EP-244 · la livraison sait produire les deux cibles", () => {
  it("le MÊME document AIR compile en web ET en Expo", async () => {
    const { compileWeb, compileProject } = await import("../src/index.ts");
    const air = document();
    const web = compileWeb(air);
    const expo = compileProject(air);
    expect(web.files.size, "la cible web n émet rien").toBeGreaterThan(10);
    expect(expo.files.size, "la cible Expo n émet rien").toBeGreaterThan(10);
  });

  it("LA CIBLE EXPO est bien du React Native — pas du web déguisé", async () => {
    const { compileProject } = await import("../src/index.ts");
    const d = deps(compileProject(document()).files);
    expect(d, "aucun react-native : ce n est pas une application native").toContain("react-native");
    expect(d.some((x) => x === "expo" || x.startsWith("expo-"))).toBe(true);
  });

  it("LA CIBLE WEB est bien du Vite/React — pas du natif déguisé", async () => {
    const { compileWeb } = await import("../src/index.ts");
    const projet = compileWeb(document());
    expect(deps(projet.files)).toContain("react-dom");
    expect(projet.files.has("index.html"), "une application web sans page").toBe(true);
  });

  it("SÉPARATION — aucune dépendance de l une ne fuit dans l autre", async () => {
    // LE CONTRÔLE QUI COMPTE. Un zip Expo qui embarquerait Vite, ou un zip
    // web qui embarquerait React Native, ne s installerait ni ne se
    // construirait — et l utilisateur ne le découvrirait qu après l avoir
    // téléchargé.
    const { compileWeb, compileProject } = await import("../src/index.ts");
    const air = document();
    const web = new Set(deps(compileWeb(air).files));
    const expo = new Set(deps(compileProject(air).files));

    const natifDansWeb = [...web].filter((x) => x === "react-native" || x === "expo" || x.startsWith("expo-"));
    expect(natifDansWeb, `le zip WEB embarque du natif : ${natifDansWeb.join(", ")}`).toEqual([]);

    const webDansNatif = [...expo].filter((x) => x === "react-dom" || x === "vite" || x.startsWith("@vitejs/"));
    expect(webDansNatif, `le zip EXPO embarque du web : ${webDansNatif.join(", ")}`).toEqual([]);
  });

  it("SÉPARATION — aucune enveloppe de l une ne fuit dans l autre", async () => {
    const { compileWeb, compileProject } = await import("../src/index.ts");
    const air = document();
    const web = compileWeb(air).files;
    const expo = compileProject(air).files;

    // `index.html` et le manifeste PWA n ont aucun sens dans un projet Expo.
    for (const f of ["index.html", "manifest.webmanifest", "vite.config.ts", "sw.js"]) {
      expect(expo.has(f), `« ${f} » — fichier WEB présent dans le zip Expo`).toBe(false);
    }
    // `app.json` (Expo) n a aucun sens dans un projet Vite.
    for (const f of ["app.json", "metro.config.js"]) {
      expect(web.has(f), `« ${f} » — fichier NATIF présent dans le zip web`).toBe(false);
    }
  });

  it("la route de livraison OFFRE les deux cibles", () => {
    // Le branchement lui-même : sans lui, tout ce qui précède resterait vrai
    // et l utilisateur ne recevrait quand même que du web.
    const route = readFileSync(
      join(RACINE, "apps/web/src/app/api/generateur/livraison/route.ts"),
      "utf8",
    );
    expect(route, "la route n importe pas le compilateur natif").toMatch(/compileProject/u);
    expect(route, "aucun choix de cible n est lu").toMatch(/cible/u);
    // ET LE DÉFAUT RESTE `web` : changer en silence ce que reçoivent les
    // appelants existants serait une régression, pas une fonctionnalité.
    expect(route).toMatch(/=== 'expo' \? 'expo' : 'web'/u);
  });
});
