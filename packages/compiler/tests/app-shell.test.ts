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

  // ── LE CLIQUET S'EST RESSERRÉ EN CHANGEANT DE FORME (2026-10-05).
  //
  // Il exigeait que `useSafeAreaInsets` et `expo-status-bar` n'apparaissent que
  // dans le shell. En branchant la cible web, ces deux paquets — qui n'existent
  // PAS dans un navigateur — ont été déplacés derrière une COUTURE
  // (`lib/runtime/plateforme`). Le shell reste le seul à s'en servir.
  //
  // La règle est désormais plus forte qu'avant, et en deux morceaux : UN SEUL
  // consommateur (le shell, qui possède la géométrie système) et UN SEUL
  // déclarant (la couture, le seul fichier qui nomme un paquet de plateforme).
  // L'ancienne version admettait que le shell fasse les deux ; celle-ci
  // l'interdit, et c'est ce qui rend la même enveloppe émissible pour le web.

  it("CLIQUET — le shell est le SEUL consommateur des zones sûres", () => {
    const consommateurs = [...files.entries()]
      .filter(([chemin, c]) => c.includes("useSafeAreaInsets()") && chemin !== "lib/runtime/plateforme.tsx")
      .map(([chemin]) => chemin);
    expect(consommateurs).toEqual(["lib/runtime/app-shell.tsx"]);
  });

  it("CLIQUET — la COUTURE est le seul fichier émis qui nomme un paquet de plateforme", () => {
    // Le GABARIT a le droit de nommer ces paquets — `package.json` doit les
    // installer, et `app.json` les configurer. Ce que le cliquet interdit,
    // c'est qu'un fichier de CODE les importe ailleurs qu'à la couture.
    for (const paquet of ["expo-status-bar", "react-native-safe-area-context"]) {
      const declarants = [...files.entries()]
        .filter(([chemin]) => chemin.endsWith(".ts") || chemin.endsWith(".tsx"))
        .filter(([, c]) => c.includes(paquet))
        .map(([chemin]) => chemin);
      expect(declarants, paquet).toEqual(["lib/runtime/plateforme.tsx"]);
    }
  });

  it("la barre d'état a un propriétaire : le shell la monte, la couture la fournit", () => {
    const shell = files.get("lib/runtime/app-shell.tsx") ?? "";
    expect(shell).toContain('from "./plateforme"');
    expect(shell).toContain("<StatusBar");
    // Aucun AUTRE fichier émis ne monte la barre d'état.
    const monteurs = [...files.entries()]
      .filter(([, c]) => c.includes("<StatusBar"))
      .map(([chemin]) => chemin);
    expect(monteurs).toEqual(["lib/runtime/app-shell.tsx"]);
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
