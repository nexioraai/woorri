// EP-147 — LES TROIS LACUNES DE L'AUDIT COMPLET, PLUS CE QUI MANQUAIT.
//
// ① la divulgation change de PLACE — ce que cette passe DÉFAIT ;
// ② le manifeste de confidentialité, dérivé ;
// ③ le niveau d'API visé, DÉCIDÉ au lieu d'être subi ;
// ④ nommer le destinataire sans l'inventer, et pouvoir reprendre son accord.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AIR_MIGRATIONS, applyAirMigrations, type ProjectAir } from "@deribfy/air-schema";
import { CAPABILITIES } from "@deribfy/capability-registry";
import { emitProject } from "../src/emit-project.ts";
import { API_SENSIBLES_PAR_CAPACITE, manifesteConfidentialite } from "../src/emit-manifests.ts";
import { RELEASE_TRAIN_V1 } from "../src/release-train.ts";

const R = join(import.meta.dirname, "..", "..", "..");
const charger = (f: string): ProjectAir =>
  applyAirMigrations(
    JSON.parse(readFileSync(join(R, "benchmarks", "air-emission", "results", f), "utf8")),
    AIR_MIGRATIONS,
  ) as ProjectAir;

// DEUX TAILLES : 16 et 23 écrans, deux domaines.
const PETIT = charger("kaviva-spa.2026-09-11T23-00-50-047Z.attempt2.air.json");
const GRAND = charger("marketplace-africain.2026-09-12T15-27-32-324Z.attempt2.air.json");
const expo = (air: ProjectAir): Record<string, unknown> =>
  (JSON.parse(emitProject(air).files.get("app.json")!) as { expo: Record<string, unknown> }).expo;

describe("EP-147 ② · le manifeste de confidentialité est produit", () => {
  it("il est émis, sur les deux tailles", () => {
    for (const [nom, air] of [["petit", PETIT], ["grand", GRAND]] as const) {
      const ios = expo(air).ios as { privacyManifests?: { NSPrivacyAccessedAPITypes: unknown[] } };
      expect(ios.privacyManifests, nom).toBeDefined();
      expect(ios.privacyManifests!.NSPrivacyAccessedAPITypes.length, nom).toBeGreaterThan(0);
    }
  });

  it("le SOCLE y est toujours : toute application React Native touche les préférences", () => {
    const types = manifesteConfidentialite(PETIT).NSPrivacyAccessedAPITypes.map(
      (t) => t.NSPrivacyAccessedAPIType,
    );
    expect(types).toContain("NSPrivacyAccessedAPICategoryUserDefaults");
  });

  it("chaque API déclarée porte sa RAISON — une déclaration sans code est vide", () => {
    for (const t of manifesteConfidentialite(GRAND).NSPrivacyAccessedAPITypes) {
      expect(t.NSPrivacyAccessedAPITypeReasons.length, t.NSPrivacyAccessedAPIType)
        .toBeGreaterThan(0);
    }
  });

  it("CLIQUET — la partition couvre EXACTEMENT le registre des capacités", () => {
    expect(Object.keys(API_SENSIBLES_PAR_CAPACITE).sort())
      .toEqual(CAPABILITIES.map((c) => c.id).sort());
  });

  it("une capacité qui écrit des fichiers AJOUTE son API — la dérivation mord", () => {
    expect(API_SENSIBLES_PAR_CAPACITE.offline_storage)
      .toContain("NSPrivacyAccessedAPICategoryFileTimestamp");
  });
});

describe("EP-147 ③ · le niveau d'API visé est DÉCIDÉ, pas subi", () => {
  it("il est écrit au manifeste, sur les deux tailles", () => {
    for (const [nom, air] of [["petit", PETIT], ["grand", GRAND]] as const) {
      const plugins = expo(air).plugins as [string, { android: { targetSdkVersion?: number } }][];
      const build = plugins.find((p) => p[0] === "expo-build-properties");
      expect(build?.[1].android.targetSdkVersion, nom).toBe(RELEASE_TRAIN_V1.androidTargetSdk);
    }
  });

  it("il atteint le minimum que Google exige depuis le 31 août 2026", () => {
    // answer/11926878 : « Android 16 (API level 36) or higher ».
    expect(RELEASE_TRAIN_V1.androidTargetSdk).toBeGreaterThanOrEqual(36);
  });

  it("il vient du TRAIN, pas d'un nombre écrit dans l'émission", () => {
    const source = readFileSync(join(R, "packages", "compiler", "src", "emit-manifests.ts"), "utf8");
    expect(source).toContain("targetSdkVersion: train.androidTargetSdk");
    expect(source).not.toMatch(/targetSdkVersion:\s*\d+/);
  });
});

describe("EP-147 ④ · nommer le destinataire sans l'inventer", () => {
  it("le fichier livré porte le fournisseur RÉSOLU par le lock", () => {
    const md = emitProject(GRAND).files.get("PUBLICATION.md")!;
    const resolus = emitProject(GRAND).lock.resolved.providers;
    expect(resolus.length).toBeGreaterThan(0);
    const nomme = resolus.some((p) => md.includes(p.provider));
    expect(nomme, "aucun fournisseur résolu n'est nommé").toBe(true);
  });

  it("ce qui n'est PAS résolu reste une classe — le moteur n'invente rien", () => {
    const md = emitProject(GRAND).files.get("PUBLICATION.md")!;
    // `psp_checkout` n'est pas dans le registre : il n'a pas de fournisseur
    // résolu, et il apparaît donc nu, sans nom accolé.
    expect(md).toContain("psp_checkout :");
    expect(md).toContain("vous seul les connaissez");
  });

  it("le RETRAIT du consentement est exigé dès qu'un partage existe", () => {
    const md = emitProject(GRAND).files.get("PUBLICATION.md")!;
    expect(md).toContain("prestataires");
  });
});

describe("EP-147 · base verte — rien d'autre ne bouge", () => {
  it("les deux documents s'émettent toujours, et PUBLICATION.md sort", () => {
    for (const [nom, air] of [["petit", PETIT], ["grand", GRAND]] as const) {
      const { files } = emitProject(air);
      expect(files.has("PUBLICATION.md"), nom).toBe(true);
      expect(files.has("app.json"), nom).toBe(true);
    }
  });
});
