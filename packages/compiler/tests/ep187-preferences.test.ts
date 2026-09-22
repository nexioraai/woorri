// EP-187 — DEUX TEXTES, DEUX DESTINATAIRES.
//
// Objection de Youssouf : « on ne peut pas tout figer, les besoins des
// utilisateurs on ne les connaît même pas ». Si chaque demande d'un client
// exige une passe du moteur, Deribfy ne sert à rien.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { requis } from "./helpers.ts";
const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const EMIT = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
const P0 = readFileSync(join(R, "benchmarks", "air-emission", "passe0.mjs"), "utf8");

describe("EP-187 · le canal des préférences", () => {
  it("UN SEUL SITE pose le contexte client — les trois chemins le partagent", () => {
    // Sans cela, une préférence vaudrait à l'émission et pas à la réparation.
    expect(EMIT).toContain("function contexteClient(intention)");
    // 3 APPELS + 1 définition = 4 occurrences. Compter 3 aurait laissé
    // croire qu'un appel manquait.
    expect((EMIT.match(/contexteClient\(intention\)/g) ?? []).length).toBe(4);
    expect(EMIT, "un site pose encore la demande en dur").not.toMatch(
      /`DEMANDE DU CLIENT :\\n\$\{intention\.text\}`,/,
    );
  });

  it("SANS PRÉFÉRENCES, RIEN NE CHANGE — le contexte est celui d'avant", () => {
    const bloc = EMIT.slice(EMIT.indexOf("function contexteClient"), EMIT.indexOf("async function emitSections"));
    expect(bloc).toMatch(/if \(intention\.preferences === undefined\) return demande;/);
  });

  it("LES PRÉFÉRENCES NE VONT JAMAIS À P0 — sa garde métier reste intacte", () => {
    // P0 écrit le MODÈLE et refuse mécaniquement les décisions d'écran.
    // Une préférence qui y entrerait serait rejetée, et la séparation
    // métier/présentation s'effondrerait.
    expect(P0, "P0 a gagné un canal de préférences").not.toContain("preferences");
    expect(P0, "la garde métier a disparu").toContain("DÉCISIONS INTERDITES");
  });

  it("UNE RÈGLE DU MOTEUR PRIME SUR UNE PRÉFÉRENCE — c'est ce qui évite le rejet", () => {
    // Accueil, Compte, les surfaces légales, Material : imposés de
    // l'extérieur, non négociables par le client.
    const bloc = EMIT.slice(EMIT.indexOf("function contexteClient"), EMIT.indexOf("async function emitSections"));
    expect(bloc).toContain("SUIS LA RÈGLE");
    expect(bloc).toContain("ne se négocient pas");
    expect(bloc, "aucun compromis ne doit être autorisé").toContain("n'invente aucun");
  });

  it("LA RÉSERVE EST ÉCRITE — un texte libre n'est pas vérifiable", () => {
    // Aucun juge ne sait lire une phrase et compter. Le dire dans le code
    // évite qu'on croie plus tard que les préférences sont garanties.
    // La phrase est coupée par le retour à la ligne du commentaire : on
    // cherche les deux moitiés, pas une chaîne continue.
    expect(EMIT).toContain("n'est PAS vérifiable");
    expect(EMIT).toContain("Aucun juge ne sait lire une phrase et compter");
  });

  it("LA PREMIÈRE PRÉFÉRENCE RÉELLE EST POSÉE, et elle est du DOMAINE DE L'ÉCRAN", async () => {
    const { INTENTIONS } = await import("../../../benchmarks/air-emission/intentions.mjs");
    const x = (INTENTIONS as { slug: string; text: string; preferences?: string }[]).find(
      (i) => i.slug === "marketplace-boutiques",
    );
    expect(x, "intention absente").toBeDefined();
    expect(requis(x, "x").preferences, "aucune préférence").toBeDefined();
    expect(requis(requis(x, "x").preferences, "requisxx.preferences")).toContain("QUATRE");
    // Et elle n'est PAS dans le brief : le brief reste du métier.
    expect(requis(x, "x").text, "une décision d'écran a fui dans le brief").not.toMatch(/QUATRE|quatre produits/);
  });
});
