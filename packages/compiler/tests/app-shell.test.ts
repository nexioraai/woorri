// ÉTAPE ② (mission Elite A++++, 2026-09-11) — APPSHELL, PROPRIÉTAIRE UNIQUE.
//
// EP-002 : les insets étaient écrits sur QUATRE sites répartis sur DEUX
// couches, et la barre d'état n'avait AUCUN propriétaire (incident « horloge
// derrière la recherche », mesuré à l'écran). Ces cliquets scellent la
// responsabilité : le shell possède la géométrie système, les écrans émis et
// la barre d'onglets n'y touchent JAMAIS plus.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrateAirDocument, projectAirSchema } from "@deribfy/air-schema";
import { emitProject } from "../src/emit-project.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOUGPLACE = join(HERE, "..", "..", "..", "slices", "dougplace", "dougplace.air.json");
const AIR = projectAirSchema.parse(
  migrateAirDocument(JSON.parse(readFileSync(DOUGPLACE, "utf8")) as Record<string, unknown>),
);

describe("étape ② — un seul propriétaire du shell mobile", () => {
  const { files } = emitProject(AIR);
  const ecrans = [...files.keys()].filter((f) => f.startsWith("screens/") && f.endsWith(".tsx"));

  it("chaque écran émis passe par AppShell et ne touche JAMAIS aux insets", () => {
    expect(ecrans.length).toBeGreaterThan(3);
    for (const f of ecrans) {
      const src = files.get(f) ?? "";
      expect(src, f).toContain("<AppShell");
      expect(src, f).not.toContain("useSafeAreaInsets");
      expect(src, f).not.toContain("insets.");
    }
  });

  it("CLIQUET — `useSafeAreaInsets` n'existe QUE dans le shell embarqué", () => {
    const proprietaires = [...files.entries()]
      .filter(([, contenu]) => contenu.includes("useSafeAreaInsets"))
      .map(([chemin]) => chemin);
    expect(proprietaires).toEqual(["lib/runtime/app-shell.tsx"]);
  });

  it("la barre d'état a un propriétaire : le shell la déclare (expo-status-bar)", () => {
    const shell = files.get("lib/runtime/app-shell.tsx") ?? "";
    expect(shell).toContain('from "expo-status-bar"');
    expect(shell).toContain("<StatusBar");
    // Aucun AUTRE fichier émis ne déclare la barre d'état.
    const declarants = [...files.entries()]
      .filter(([, c]) => c.includes("expo-status-bar"))
      .map(([chemin]) => chemin);
    expect(declarants).toEqual(["lib/runtime/app-shell.tsx"]);
  });

  it("l'inset du BAS est écrit UNE fois par cas : barre présente OU contenu", () => {
    const shell = files.get("lib/runtime/app-shell.tsx") ?? "";
    // Zone navigation : porte l'inset quand la barre existe.
    expect(shell).toContain('testID="app-shell-navigation"');
    // Zone contenu : le porte seulement sans barre.
    expect(shell).toContain("navigation === undefined ? insets.bottom : 0");
    // La barre d'onglets, elle, ne connaît plus les insets.
    const nav = files.get("lib/runtime/primary-nav.tsx") ?? "";
    expect(nav).not.toContain("useSafeAreaInsets");
  });

  it("zones dans l'ORDRE structurel : chrome → contenu → navigation", () => {
    const shell = files.get("lib/runtime/app-shell.tsx") ?? "";
    const iChrome = shell.indexOf("{chrome}");
    const iContenu = shell.indexOf('testID="app-shell-contenu"');
    const iNav = shell.indexOf('testID="app-shell-navigation"');
    expect(iChrome).toBeGreaterThan(0);
    expect(iContenu).toBeGreaterThan(iChrome);
    expect(iNav).toBeGreaterThan(iContenu);
  });
});
