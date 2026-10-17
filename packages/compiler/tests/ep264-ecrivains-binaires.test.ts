/**
 * EP-264 · NEUF ÉCRIVAINS, UNE SEULE DÉCISION SUR LE BINAIRE.
 *
 * ── LE DÉFAUT, ET IL A ÉTÉ TROUVÉ PAR UN AUTRE CLIQUET.
 *
 * La carte de fichiers d'une application émise porte le texte tel quel et les
 * binaires en base64. Jusqu'au 2026-10-17, `.png` était la SEULE extension
 * binaire — et NEUF écrivains décidaient séparément quoi décoder. Quatre le
 * faisaient (`ecrire-app.mjs`, `validation-appareil/emettre.mjs`,
 * `app-fraiche.ts`, `verifier-une-app.mjs`), cinq ne le faisaient PAS (les
 * gates et les fixtures d'observation).
 *
 * Ça ne gênait personne : aucune gate ne LIT un PNG. En embarquant les faces
 * de police, c'est devenu un défaut réel — Vite copie les `.ttf`, le moteur
 * natif les enregistre, et une face écrite en texte est une face invalide.
 * Pire : une famille introuvable NE LÈVE PAS. Elle retombe en silence sur la
 * police système, soit exactement le défaut que l'embarquement ferme.
 *
 * J'avais routé QUATRE écrivains et cru avoir fini. C'est le contrôle ④ de
 * `theme-web.obsweb.tsx` — « la face est-elle un TrueType valide ? » — qui a
 * trouvé le cinquième, en lisant les quatre premiers octets du fichier servi :
 * 0x41414541, soit « AAEA » en ASCII, le début du base64 d'un TrueType.
 *
 * ── POURQUOI CE CLIQUET, ALORS QUE LE DÉFAUT EST CORRIGÉ.
 *
 * Ce dépôt a vu SIX fois « une liste écrite deux fois diverge », dont deux le
 * jour même. Corriger neuf endroits sans fermer la porte, c'est attendre le
 * dixième écrivain — qui sera écrit par quelqu'un qui n'a pas lu ceci.
 *
 * On interdit donc le test d'extension PARTOUT ailleurs que dans le module qui
 * le porte.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { estBinaire, EXTENSIONS_BINAIRES } from "../src/fichiers-binaires.ts";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SOURCE_UNIQUE = join("packages", "compiler", "src", "fichiers-binaires.ts");

/** Tous les fichiers de code du dépôt, hors dépendances et artefacts. */
const fichiersDeCode = (): string[] => {
  const out: string[] = [];
  // ── CE QU'ON IGNORE, ET POURQUOI CHAQUE NOM Y EST.
  //
  // `.trigger` et `tmp` portent du code VENDU, groupé par un bundler : il
  // contient des `fs2.writeFileSync(tempFile, contents)` qui n'ont rien à voir
  // avec nos cartes de fichiers. Les inclure ferait rougir ce cliquet pour du
  // code que personne ici n'écrit — et un cliquet qui rougit pour rien finit
  // par être désarmé.
  const IGNORE = new Set([
    "node_modules",
    ".git",
    ".next",
    ".trigger",
    "tmp",
    "dist",
    "build",
    "app",
    "app-web",
    "coverage",
  ]);
  const marcher = (abs: string, profondeur: number): void => {
    if (profondeur > 6) return;
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      if (IGNORE.has(e.name)) continue;
      const p = join(abs, e.name);
      if (e.isDirectory()) marcher(p, profondeur + 1);
      else if (/\.(ts|tsx|mjs)$/u.test(e.name) && statSync(p).size < 2_000_000) out.push(p);
    }
  };
  marcher(R, 0);
  return out;
};

describe("EP-264 · une seule décision sur le binaire", () => {
  it("① LA DÉCISION EXISTE ET ELLE EST FERMÉE", () => {
    expect(EXTENSIONS_BINAIRES.length, "la liste est vide").toBeGreaterThanOrEqual(2);
    expect(EXTENSIONS_BINAIRES, "le PNG a disparu de la liste").toContain(".png");
    expect(EXTENSIONS_BINAIRES, "la police a disparu de la liste").toContain(".ttf");
    expect(estBinaire("assets/polices/DeribfySerif-Bold.ttf")).toBe(true);
    expect(estBinaire("assets/icon.png")).toBe(true);
    // ── ET LE TEXTE RESTE DU TEXTE.
    //
    // Une heuristique « ça a l'air binaire » rouvrirait la porte dans l'autre
    // sens : un `.json` décodé depuis base64 deviendrait illisible.
    for (const texte of ["app.json", "App.tsx", "lib/tokens/theme.generated.ts", "index.html"]) {
      expect(estBinaire(texte), `${texte} serait écrit comme un binaire`).toBe(false);
    }
  });

  it("② PERSONNE NE REDÉCIDE — le test d'extension n'existe qu'à un endroit", () => {
    // ── CE CONTRÔLE EST GÉNÉRIQUE, ET C'EST TOUT SON INTÉRÊT.
    //
    // Nommer les neuf écrivains fermerait la porte d'aujourd'hui et laisserait
    // passer le dixième. On cherche le MOTIF dans tout le dépôt.
    const coupables: string[] = [];
    for (const f of fichiersDeCode()) {
      const rel = relative(R, f);
      if (rel === SOURCE_UNIQUE) continue;
      // Les CLIQUETS peuvent nommer les extensions : ils les vérifient.
      if (rel.includes("ep264-")) continue;
      const code = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//gu, "")
        .replace(/^\s*\/\/.*$/gmu, "");
      // ── LE MOTIF A ÉTÉ RESSERRÉ, ET CE N'EST PAS UN AFFAIBLISSEMENT.
      //
      // Première forme : TOUTE mention de `endsWith(".ttf")`. Elle a rougi sur
      // `compile-web.ts`, qui teste l'extension pour RETIRER les faces
      // TrueType de la cible web — rien à voir avec la façon de les écrire.
      // Un cliquet qui accuse un usage légitime finit désarmé.
      //
      // Le défaut est précis : choisir entre `Buffer.from(x, "base64")` et le
      // contenu brut d'après une extension. On cherche donc les deux ENSEMBLE,
      // dans la même instruction — et la mutation M16 (un écrivain qui
      // redécide) le tue toujours.
      for (const ligne of code.split("\n")) {
        const testeExtension = /endsWith\(\s*["'`]\.(png|ttf|otf|woff2?|jpe?g|gif|webp|ico)["'`]\s*\)/u.test(ligne);
        if (testeExtension && ligne.includes("Buffer.from(")) {
          coupables.push(`${rel} — ${ligne.trim().slice(0, 80)}`);
        }
      }
    }
    expect(
      coupables,
      "ces fichiers décident eux-mêmes qu'un chemin est binaire. Un écrivain " +
        "qui décide tout seul est un écrivain qui divergera — et au bout, une " +
        "police écrite en texte qui retombe EN SILENCE sur la police système. " +
        "Passer par `estBinaire` de `fichiers-binaires.ts`.",
    ).toEqual([]);
  });

  it("③ TOUT ÉCRIVAIN DE CARTE DÉCODE — mesuré sur les écritures réelles", () => {
    // ── POURQUOI ON CHERCHE L'ÉCRITURE ET PAS L'IMPORT.
    //
    // Importer `estBinaire` sans l'employer serait vert pour rien. On cherche
    // les `writeFileSync` qui écrivent un contenu de carte, et on exige que
    // chacun passe par la décision.
    const coupables: string[] = [];
    for (const f of fichiersDeCode()) {
      const rel = relative(R, f);
      if (rel.includes("ep264-")) continue;
      const code = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//gu, "")
        .replace(/^\s*\/\/.*$/gmu, "");
      for (const m of code.matchAll(/writeFileSync\(\s*([\w.[\]]+)\s*,\s*(contenu|contents|content)\b/gu)) {
        // L'écriture doit être gardée par `estBinaire` sur la MÊME ligne.
        const ligne = code.slice(code.lastIndexOf("\n", m.index) + 1, code.indexOf("\n", m.index));
        if (!ligne.includes("estBinaire")) coupables.push(`${rel} — ${ligne.trim().slice(0, 80)}`);
      }
    }
    expect(
      coupables,
      "ces écritures posent un contenu de carte sans décoder le binaire : une " +
        "face de police y serait écrite en base64 textuel, donc invalide",
    ).toEqual([]);
  });
});
