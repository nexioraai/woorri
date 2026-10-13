/**
 * EP-211 · UN MODULE DÉCLARÉ DOIT EXISTER DANS LE SDK QU'ON LIVRE.
 *
 * MESURE QUI A COMMANDÉ CE CLIQUET, ET C'ÉTAIT MON ERREUR, LE JOUR MÊME OÙ
 * JE L'AI ÉCRITE.
 *
 * J'ai déclaré la capacité `audio_capture` avec `implementation: expo-av ~16`.
 * Plausible, et faux : `expo-av` est ABSENT du SDK 57, celui que ce dépôt
 * installe. Le bon module est `expo-audio`, en ~57.0.4.
 *
 * Les numéros le disaient déjà, et je ne les avais pas lus : `expo-audio`
 * suit le SDK (57.x), tandis que `expo-av` est resté sur l'ancien schéma
 * indépendant (16.x). Une déclaration erronée ne casse RIEN au typecheck, RIEN
 * aux tests, RIEN aux gates — elle donne simplement, à chaque application
 * déclarant le micro, une dépendance ORPHELINE. Le défaut se découvre chez la
 * personne qui installe.
 *
 * ── LA SOURCE DE VÉRITÉ N'EST PAS MA MÉMOIRE, C'EST LE FICHIER DU SDK.
 *
 * `expo/bundledNativeModules.json` est livré AVEC Expo et dit, pour ce SDK
 * précis, quel module et quelle version vont ensemble. C'est lui qui fait foi
 * ici — pas une liste recopiée à la main, qui aurait divergé au premier SDK
 * suivant.
 *
 * Mesure du 2026-10-13 : treize capacités déclarent un module Expo. Douze
 * étaient justes, UNE tombait — exactement celle qu'il fallait voir.
 */
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { CAPABILITIES } from "../src/index.ts";

const require_ = createRequire(import.meta.url);

/** La liste livrée avec le SDK installé. */
const SDK = require_("expo/bundledNativeModules.json") as Record<string, string>;

interface Declaration {
  readonly id: string;
  readonly paquet: string;
  readonly version: string;
}

const declarations: readonly Declaration[] = CAPABILITIES.flatMap((c) => {
  const i = c.implementation as { kind?: string; package?: string; version?: string } | undefined;
  return i?.kind === "expo_module" && i.package !== undefined && i.version !== undefined
    ? [{ id: c.id, paquet: i.package, version: i.version }]
    : [];
});

/** Le majeur d'une contrainte comme `~57`, `~57.0.4` ou `^16`. */
const majeur = (v: string): string => (/(\d+)/u.exec(v)?.[1] ?? "");

describe("EP-211 ① · la mesure elle-même doit être possible", () => {
  it("la liste du SDK est lisible et non vide", () => {
    // Si ce fichier disparaissait d'une version future d'Expo, ce cliquet
    // passerait en ne mesurant plus rien. Un test qui ne mesure plus rien doit
    // tomber.
    expect(Object.keys(SDK).length).toBeGreaterThan(20);
  });

  it("des capacités déclarent bien des modules Expo", () => {
    expect(declarations.length).toBeGreaterThan(10);
  });
});

describe("EP-211 ② · CHAQUE MODULE DÉCLARÉ EXISTE DANS LE SDK", () => {
  it("aucune capacité ne nomme un module absent du SDK installé", () => {
    const absents = declarations
      .filter((d) => SDK[d.paquet] === undefined)
      .map((d) => `${d.id} → ${d.paquet} (déclaré ${d.version})`);
    expect(absents).toEqual([]);
  });

  it("ET LA VERSION MAJEURE CORRESPOND — un module présent peut être mal épinglé", () => {
    // Nommer le bon module avec la mauvaise contrainte donne une installation
    // qui résout une version que le SDK ne prévoit pas : les modules natifs
    // d'Expo sont solidaires du SDK, et un décalage se voit au premier build
    // natif, pas avant.
    const decales = declarations
      .filter((d) => SDK[d.paquet] !== undefined)
      .filter((d) => majeur(d.version) !== majeur(SDK[d.paquet] ?? ""))
      .map((d) => `${d.id} → ${d.paquet} : déclaré ${d.version}, SDK ${SDK[d.paquet] ?? "?"}`);
    expect(decales).toEqual([]);
  });
});

describe("EP-211 ③ · le cliquet sait refuser — sinon il ne prouve rien", () => {
  it("il REFUSERAIT `expo-av`, le module que j'avais déclaré", () => {
    // La preuve que ce cliquet mord : le module exact de mon erreur est
    // absent du SDK, et c'est ce qui l'aurait fait tomber.
    expect(SDK["expo-av"]).toBeUndefined();
  });

  it("et il ACCEPTE `expo-audio`, le bon", () => {
    expect(SDK["expo-audio"]).toBeDefined();
    expect(majeur(SDK["expo-audio"] ?? "")).toBe("57");
  });

  it("la voix déclare bien `expo-audio`", () => {
    const voix = declarations.find((d) => d.id === "audio_capture");
    expect(voix?.paquet).toBe("expo-audio");
  });
});
