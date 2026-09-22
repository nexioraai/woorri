// EP-154 — LES GENRES CONDITIONNELS, ENFIN TRANSMIS.
//
// EP-152 a mesuré `PRESENTATION_DIVULGATION_ABSENTE` sur une génération
// réelle : une intégration partageait des données, aucun écran ne le disait.
// La cause n'était pas le générateur — la règle 41 interpolait le RÉSULTAT de
// la condition pour un cas particulier, jamais la condition elle-même.
//
// NEUVIÈME OCCURRENCE, TROISIÈME CONSÉCUTIVE.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GENRES_HORS_COMPTE,
  SURFACES_DE_COMPTE,
  surfacesAttendues,
} from "@deribfy/execution-contract";

const R = join(import.meta.dirname, "..", "..", "..");
const SOURCE = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");

function digest(): string {
  const debut = SOURCE.indexOf("function surfacesDigest()");
  const corps = SOURCE.slice(debut, SOURCE.indexOf("\n}", debut) + 2);
  // Le module ne peut pas être IMPORTÉ : son chargement lance une campagne
  // payante. On extrait donc le corps de la fonction et on l'évalue seul.
  // Exception nommée ICI, au site exact — la règle reste armée ailleurs.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const f = new Function("presentation", `${corps}; return surfacesDigest();`) as (
    p: unknown,
  ) => string;
  return f({ SURFACES_DE_COMPTE, GENRES_HORS_COMPTE });
}

describe("EP-154 · le prompt énonce la RÈGLE, pas son résultat", () => {
  const d = digest();

  it("CHAQUE genre du contrat y figure — y compris ceux liés au partage", () => {
    for (const genre of Object.keys(SURFACES_DE_COMPTE)) expect(d, genre).toContain(genre);
    for (const genre of GENRES_HORS_COMPTE) expect(d, genre).toContain(genre);
  });

  it("les genres du PARTAGE sont dits — c'est ce qui manquait, et qui a coûté un rouge", () => {
    expect(d).toContain("privacy_consent");
    expect(d).toContain("consent_withdraw");
    expect(d).toMatch(/partage des données avec un tiers/);
  });

  it("chaque genre porte SA condition, et les trois conditions existent", () => {
    expect(d).toContain("TOUJOURS");
    expect(d).toContain("SI l'application a des comptes");
    expect(d).toContain("SI l'application partage des données");
  });

  it("le fondement est dit : obligation citée, ou décision produit", () => {
    expect(d).toMatch(/OBLIGATION : App Store Review Guidelines 5\.1\.1\(i\)/);
    expect(d).toContain("décision produit");
  });

  it("le prompt n'écrit plus AUCUN genre à la main", () => {
    // EP-155 — la règle tient sur PLUSIEURS lignes depuis que l'interpolation
    // a sa propre ligne : on délimite par la règle suivante, pas par un
    // retour à la ligne.
    const debut = SOURCE.indexOf("41. SURFACES DE L'APPLICATION");
    const regle = SOURCE.slice(debut, SOURCE.indexOf("\n42.", debut));
    expect(regle).toContain("${surfacesDigest()}");
    for (const genre of Object.keys(SURFACES_DE_COMPTE)) {
      expect(regle.includes(`\`${genre}\``), `${genre} écrit à la main`).toBe(false);
    }
  });

  it("la PLACE de la divulgation est dite, avec sa source", () => {
    const d2 = SOURCE.indexOf("41. SURFACES DE L'APPLICATION");
    const regle = SOURCE.slice(d2, SOURCE.indexOf("\n42.", d2));
    expect(regle).toContain("normal usage of the app");
    expect(regle).toContain("écran d'ENTRÉE");
  });
});

describe("EP-154 · la contradiction d'EP-147 est levée", () => {
  it("`consent_withdraw` vit DANS le compte — il ne figure plus hors compte", () => {
    // EP-147 l'avait mis dans les DEUX listes : exigé par `surfacesAttendues`,
    // puis SAUTÉ par le juge de l'espace compte, donc jamais réclamé. Le test
    // d'alors vérifiait la première et pas le second — il passait à tort.
    expect(GENRES_HORS_COMPTE).not.toContain("consent_withdraw");
    expect(surfacesAttendues(false, true)).toContain("consent_withdraw");
  });

  it("seule la DIVULGATION reste hors du compte, et c'est imposé", () => {
    expect(GENRES_HORS_COMPTE).toEqual(["privacy_consent"]);
  });

  it("sans partage, aucune surface conditionnelle n'est exigée", () => {
    expect(surfacesAttendues(false, false)).not.toContain("consent_withdraw");
    expect(surfacesAttendues(true, false)).not.toContain("consent_withdraw");
  });

  it("avec partage, les DEUX sont exigées — divulgation et révocation", () => {
    expect(surfacesAttendues(false, true)).toContain("consent_withdraw");
    expect([...GENRES_HORS_COMPTE]).toContain("privacy_consent");
  });
});
