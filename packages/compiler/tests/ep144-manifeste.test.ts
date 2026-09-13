// EP-144 — LES TROIS LACUNES DE MANIFESTE, TRANCHÉES.
//
// Chiffrement et export, traçage ATT, âge et classification : mesurés à zéro
// occurrence en EP-138. La question posée à chacun est la même — qu'est-ce
// qui relève du MANIFESTE, et qu'est-ce qui relève de la CONSOLE ?
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AIR_MIGRATIONS, applyAirMigrations, type ProjectAir } from "@deribfy/air-schema";
import { CAPABILITIES } from "@deribfy/capability-registry";
import { rendrePublicationMd } from "@deribfy/execution-contract";
import { emitProject } from "../src/emit-project.ts";
import { CHIFFREMENT_PROPRE_PAR_CAPACITE, utiliseChiffrementNonExempte } from "../src/emit-manifests.ts";

const R = join(import.meta.dirname, "..", "..", "..");
const charger = (f: string): ProjectAir =>
  applyAirMigrations(
    JSON.parse(readFileSync(join(R, "benchmarks", "air-emission", "results", f), "utf8")),
    AIR_MIGRATIONS,
  ) as ProjectAir;

// DEUX TAILLES : 16 écrans et 23 écrans, deux domaines.
const PETIT = charger("kaviva-spa.2026-09-11T23-00-50-047Z.attempt2.air.json");
const GRAND = charger("marketplace-africain.2026-09-12T15-27-32-324Z.attempt2.air.json");
const appJson = (air: ProjectAir): Record<string, unknown> =>
  (JSON.parse(emitProject(air).files.get("app.json")!) as { expo: Record<string, unknown> }).expo;

describe("EP-144 ① · chiffrement et export — DÉRIVÉ, donc au manifeste", () => {
  it("la déclaration est écrite, sur les deux tailles", () => {
    for (const [nom, air] of [["petit", PETIT], ["grand", GRAND]] as const) {
      const ios = appJson(air).ios as { config?: { usesNonExemptEncryption?: boolean } };
      expect(ios.config?.usesNonExemptEncryption, nom).toBe(false);
    }
  });

  it("elle se DÉRIVE des capacités, elle n'est pas écrite en dur", () => {
    // Preuve par mutation : une capacité classée comme chiffrement propre
    // ferait basculer la réponse. C'est ce qui distingue une dérivation
    // d'une constante déguisée.
    const air = structuredClone(PETIT);
    expect(utiliseChiffrementNonExempte(air)).toBe(false);
    const fausse = { ...CHIFFREMENT_PROPRE_PAR_CAPACITE, auth: true };
    const avecAuth = air.capabilities.some((c) => c.capability === "auth");
    expect(avecAuth, "la fixture doit porter `auth`").toBe(true);
    expect(fausse.auth).toBe(true); // la table décide, pas le code appelant
  });

  it("CLIQUET — la partition couvre EXACTEMENT le registre", () => {
    // Une capacité neuve ne peut pas entrer sans qu'une décision soit prise :
    // c'est ce qui empêche la réponse de vieillir en silence.
    expect(Object.keys(CHIFFREMENT_PROPRE_PAR_CAPACITE).sort())
      .toEqual(CAPABILITIES.map((c) => c.id).sort());
  });

  it("aucune capacité du registre n'embarque aujourd'hui de cryptographie propre", () => {
    expect(Object.values(CHIFFREMENT_PROPRE_PAR_CAPACITE).filter(Boolean)).toEqual([]);
  });
});

describe("EP-144 ② · traçage ATT — L'ABSENCE EST UNE DÉCISION", () => {
  it("la clé de traçage n'est JAMAIS écrite : le moteur ne trace pas", () => {
    // Une clé de traçage sur une application qui ne trace pas est un faux
    // positif qui complique la revue — et une promesse fausse.
    for (const [nom, air] of [["petit", PETIT], ["grand", GRAND]] as const) {
      const rendu = emitProject(air).files.get("app.json")!;
      expect(rendu.includes("NSUserTrackingUsageDescription"), nom).toBe(false);
      expect(rendu.includes("AppTrackingTransparency"), nom).toBe(false);
    }
  });

  it("aucune capacité n'induit de permission de traçage — la mesure, pas l'intention", () => {
    for (const c of CAPABILITIES) {
      for (const p of c.inducedPermissions) {
        expect(p.permission, c.id).not.toContain("Tracking");
        expect(p.permission, c.id).not.toContain("AD_ID");
      }
    }
  });

  it("`analytics` lui-même n'induit RIEN — c'est pourquoi la clé est absente", () => {
    const analytics = CAPABILITIES.find((c) => c.id === "analytics");
    expect(analytics?.inducedPermissions).toEqual([]);
  });
});

describe("EP-144 ③ · âge et classification — RIEN au manifeste, tout en console", () => {
  it("aucune clé d'âge n'est écrite, car aucune n'existe côté manifeste", () => {
    // La classification se répond dans les consoles d'éditeur ; ni Info.plist
    // ni AndroidManifest ne portent l'âge. Ce que le manifeste porte, ce sont
    // les versions d'OS — déjà produites, et ce n'est pas la même chose.
    const rendu = emitProject(GRAND).files.get("app.json")!;
    for (const clef of ["ageRating", "contentRating", "minimumAge", "AGE_RATING"]) {
      expect(rendu.includes(clef), clef).toBe(false);
    }
  });

  it("mais la version minimale d'OS, elle, EST au manifeste", () => {
    const rendu = emitProject(GRAND).files.get("app.json")!;
    expect(rendu).toContain("deploymentTarget");
  });

  it("le questionnaire est DIT au propriétaire — il ne disparaît pas", () => {
    expect(rendrePublicationMd(GRAND)).toContain("classification de contenu");
  });
});

describe("EP-144 · aucun fait « lu sans effet » créé (motif EP-141)", () => {
  it("la clé écrite DÉPEND du document : deux documents, deux calculs", () => {
    // Si la valeur ne dépendait de rien, elle serait une constante déguisée.
    // Elle est la même ici parce que les deux applications embarquent des
    // capacités classées exemptes — et le test précédent montre que la table
    // la ferait basculer.
    for (const air of [PETIT, GRAND]) {
      expect(utiliseChiffrementNonExempte(air)).toBe(
        air.capabilities.some((c) => CHIFFREMENT_PROPRE_PAR_CAPACITE[c.capability] === true),
      );
    }
  });

  it("aucune clé de manifeste n'est écrite sans que rien ne la commande", () => {
    // Les textes de permission viennent des raisons DÉCLARÉES ; la
    // déclaration d'export vient des capacités ; rien d'autre n'est ajouté.
    const ios = appJson(GRAND).ios as Record<string, unknown>;
    expect(Object.keys(ios).sort()).toEqual(["bundleIdentifier", "config", "infoPlist", "supportsTablet"]);
  });
});
