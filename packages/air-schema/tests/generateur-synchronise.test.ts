// CLIQUET — LE GÉNÉRATEUR SUIT LE CONTRAT, OU LA CI CASSE.
//
// Défaut RÉEL (constaté par le propriétaire, 2026-09-09) : le prompt du
// générateur est resté figé au contrat du 2/09 (~1.9) pendant que le schéma
// marchait jusqu'à 1.18. Chaque nouveauté étant OPTIONNELLE, rien ne refusait
// rien — le générateur ne demandait simplement jamais barre-compat, libellés,
// feuilles, accueil — et chaque application générée naissait EN DESSOUS du
// niveau que le moteur sait rendre. Deux semaines de dérive silencieuse.
//
// La règle : toute avancée d'AIR_SCHEMA_VERSION CASSE ce test tant que le
// prompt n'a pas été resynchronisé et son CONTRAT_CIBLE monté — consciemment.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AIR_SCHEMA_VERSION } from "../src/air.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATEUR = join(HERE, "..", "..", "..", "benchmarks", "air-emission", "emit-v3.mjs");

const source = readFileSync(GENERATEUR, "utf8");
const cible = /export const CONTRAT_CIBLE = "([^"]+)";/.exec(source)?.[1];

describe("cliquet — générateur synchronisé sur le contrat", () => {
  it("le prompt déclare un contrat cible", () => {
    expect(cible).toBeDefined();
  });

  it("le contrat cible du générateur EST la version courante du schéma", () => {
    // Si ce test casse : le schéma a avancé. La réponse N'EST PAS de monter
    // cette constante — c'est de RESYNCHRONISER le prompt (règles, registre
    // des blocs, capacités) puis de monter CONTRAT_CIBLE dans le même geste.
    expect(cible).toBe(AIR_SCHEMA_VERSION);
  });

  it("le prompt UTILISE la constante — pas une version en dur oubliable", () => {
    expect(source).toContain('airSchemaVersion = "${CONTRAT_CIBLE}"');
    // CONTRÔLE NÉGATIF : plus aucune version figée dans la règle 10.
    expect(source).not.toContain('airSchemaVersion = "1.6.0"');
  });

  it("les capacités de la refonte sont ENSEIGNÉES au générateur", () => {
    // Sonde par MARQUEURS distinctifs de chaque lot — pas par numéro de règle.
    for (const marqueur of [
      "enumLabels",            // 1.10 — libellés humains
      "sensitive: true",       // 1.12 — secrets couplés
      'instanceFrom: "session"', // 1.13 — la ligne de la personne connectée
      "session_pending_confirmation", // 1.14 — état d'attente
      "showsPrimaryNav: false",  // 1.15 — accueil sans barre
      "showsScreenTitle",        // 1.16 — une seule identité
      'presentation: "sheet"',   // 1.17 — feuilles
      "dismissLabel",            // 1.18 — le mot de la fermeture
      "brandIconPngBase64",      // 1.17 — la marque vient du pipeline, JAMAIS inventée
      "spacer",                  // composition d'accueil
      "sessionEtablissable",     // l'auth est réelle — règle 17 amendée
      "demoValues",              // 1.20 — le document déclare son contenu de démo
      'layout: "grid"',          // 1.20 — cartes de catalogue sur deux colonnes
      "picsum.photos",           // images de démo RÉELLES, domaine déclaré
      "L'ACCUEIL MONTRE LE PRODUIT", // l'accueil porte la marchandise
    ]) {
      expect(source, marqueur).toContain(marqueur);
    }
  });
});
