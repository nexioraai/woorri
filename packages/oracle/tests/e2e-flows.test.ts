// ORACLE L2 — générateur de flows (6.4) : flows GÉNÉRÉS DEPUIS L'AIR sur le
// corpus v2 — testID = identités stables (screenId/blockId), écran d'entrée
// asserté, chaque action ui→navigate couverte, variante RTL présente,
// aucun texte de langue naturelle dans le flow. CI sans réseau.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { projectAirSchema } from "@deribfy/air-schema";
import { normalizeAir } from "@deribfy/compiler";
import { generateMaestroFlows } from "../src/index.ts";

const CORPUS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "golden-corpus", "corpus-v2");
const docs = readdirSync(CORPUS).filter((f) => f.endsWith(".air.json")).sort();
// ÉDITION CONSCIENTE (D-044) : documents du corpus GELÉ en 1.0.0, migrés en
// mémoire vers la version courante avant parse. Fichiers inchangés.
const load = (f: string) =>
  projectAirSchema.parse(normalizeAir(JSON.parse(readFileSync(join(CORPUS, f), "utf8"))));

describe("générateur de flows E2E (Oracle L2)", () => {
  for (const file of docs) {
    it(`flows générés conformes : ${file}`, () => {
      const air = load(file);
      const flows = generateMaestroFlows(air, "com.example.app");
      // Écran d'entrée asserté dans les deux flows.
      expect(flows.navigation).toContain(`id: "${air.navigation.entryScreenId}"`);
      expect(flows.rtl).toContain("forceRTL: true");
      // Chaque action de navigation de couverture apparaît (tap + cible).
      for (const n of flows.coverage.navActions) {
        expect(flows.navigation).toContain(`id: "${n.blockId}"`);
        expect(flows.navigation).toContain(`id: "${n.targetScreenId}"`);
      }
      // testID = identités stables uniquement (préfixes scr_/blk_).
      const ids = [...flows.navigation.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
      for (const id of ids) {
        expect(/^(scr_|blk_)/.test(id ?? ""), id).toBe(true);
      }
      // Déterminisme : re-génération identique.
      expect(generateMaestroFlows(air, "com.example.app").navigation).toBe(flows.navigation);
    });
  }

  it("resto-quartier : couvre les 2 nav de l'écran d'entrée", () => {
    const air = load("resto-quartier.air.json");
    const flows = generateMaestroFlows(air, "com.deribfy.preview.maquis");
    expect(flows.coverage.entryScreenId).toBe("scr_menu");
    expect(flows.coverage.navActions.map((n) => n.targetScreenId).sort()).toEqual(["scr_commandes", "scr_panier"]);
  });
});

// EP-165 ① — LE PARCOURS DE CAPTURE.
//
// Le socle du second œil, et il vaut SANS lui : deux captures du même écran
// entre deux générations se comparent AU PIXEL — régression visuelle
// DÉTERMINISTE, sans modèle, sans dépense. Ce cliquet tient les propriétés
// dont dépend cette comparaison.
describe("EP-165 · le parcours de capture", () => {
  for (const file of docs) {
    it(`une image par écran, jamais deux : ${file}`, () => {
      const air = load(file);
      const flows = generateMaestroFlows(air, "com.example.app");
      const ids = flows.coverage.capturedScreenIds;

      // LE DÉFAUT QUI A ÉTÉ MESURÉ, puis fermé : sur `agence-immo`, DEUX
      // blocs de l'accueil ouvrent le MÊME écran. La version naïve prenait
      // deux captures du même nom — la seconde écrasait la première et le
      // compte était faux.
      expect(new Set(ids).size, "un écran capturé deux fois").toBe(ids.length);
      const prises = [...flows.captures.matchAll(/takeScreenshot: (\S+)/g)].map((m) => m[1]);
      expect(prises.length, "autant de captures que d'écrans annoncés").toBe(ids.length);
      expect(new Set(prises).size, "deux captures écriraient le même fichier").toBe(prises.length);

      // L'ENTRÉE EST TOUJOURS CAPTURÉE : c'est le seul écran garanti
      // présent, et celui qui porte la hiérarchie visuelle et la barre
      // supérieure — les deux défauts qu'aucun juge de document ne voit.
      expect(ids[0]).toBe(air.navigation.entryScreenId);
      expect(flows.captures).toContain(`takeScreenshot: capture-${air.navigation.entryScreenId}`);
    });
  }

  it("LES NOMS SONT DÉRIVÉS DES ÉCRANS — c'est la condition même du « au pixel »", () => {
    // Un fichier NUMÉROTÉ (capture-01, capture-02) se décale dès qu'un écran
    // s'insère, et deux campagnes cessent d'être comparables. Le nom doit
    // suivre l'identité de l'écran, jamais son rang dans le parcours.
    for (const file of docs) {
      const air = load(file);
      const flows = generateMaestroFlows(air, "com.example.app");
      const noms = [...flows.captures.matchAll(/takeScreenshot: (\S+)/g)].map((m) => m[1] ?? "");
      expect(noms.length, file).toBeGreaterThan(0);
      for (const n of noms) {
        expect(n, `${file} — nom non dérivé d'un screenId`).toMatch(/^capture-scr_/);
        expect(/capture-\d+$/.test(n), `${file} — nom NUMÉROTÉ`).toBe(false);
      }
    }
  });

  it("le flow de capture est DÉTERMINISTE — sans quoi rien ne se compare", () => {
    for (const file of docs) {
      const air = load(file);
      expect(generateMaestroFlows(air, "com.example.app").captures).toBe(
        generateMaestroFlows(air, "com.example.app").captures,
      );
    }
  });

  it("LA COUVERTURE EST PARTIELLE, ET LE CLIQUET LE DIT PLUTÔT QUE DE LAISSER CROIRE", () => {
    // MESURÉ sur 46 documents du dépôt : 185 écrans capturés sur 683, soit
    // 27 %. Le parcours ne visite que l'entrée et ce qu'une action de
    // l'entrée ouvre — un écran atteint en deux sauts n'est jamais vu.
    // C'est une dette DISTINCTE [L-165-A], pas un défaut de ce parcours.
    for (const file of docs) {
      const air = load(file);
      const flows = generateMaestroFlows(air, "com.example.app");
      expect(
        flows.coverage.capturedScreenIds.length,
        `${file} — la capture prétendrait couvrir tous les écrans`,
      ).toBeLessThanOrEqual(air.screens.length);
    }
  });
});
