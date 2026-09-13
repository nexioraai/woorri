// EP-140 — LE PARCOURS EN SESSION.
//
// EP-139 comptait comme « ouverts » des parcours qui supposent l'utilisateur
// connecté sans le dire : la légitimité était sous-estimée, et une
// application réellement toute personnelle pouvait être refusée à tort.
//
// LE CONTRAT SAVAIT DÉJÀ, DE DEUX FAÇONS — et aucune n'est une déclaration.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as mm from "../../../benchmarks/air-emission/modele-metier.mjs";
import type { ModeleMetier, Parcours } from "../../../benchmarks/air-emission/modele-metier.d.mts";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const RES = join(R, "benchmarks", "air-emission", "results");
const charger = (chemin: string): ModeleMetier => {
  const brut = JSON.parse(readFileSync(chemin, "utf8")) as { modele?: unknown };
  return mm.migrerModele(brut.modele ?? brut) as ModeleMetier;
};

// DEUX TAILLES : fixture métier (3 parcours) et modèle de run (5 parcours).
const PETIT = charger(join(R, "slices", "kaviva", "kaviva-modele.json"));
const GRAND = charger(join(RES, "marketplace-africain.2026-09-12T15-27-32-324Z.modele-p0-t1.air.json"));
const SESSION = charger(join(RES, "v2-holdout-2026-09-12T06-34-05-680Z.sortie.json"));
const ouverts = (m: ModeleMetier): string[] =>
  m.parcours.filter((p: Parcours) => !mm.parcoursFerme(m, p)).map((p: Parcours) => p.id);

describe("EP-140 · ① les parcours en session sont reconnus", () => {
  it("un parcours de portée « acteur » dès sa première étape exige la session", () => {
    // « retrouver SES rendez-vous » ne montre rien tant qu'on ignore qui
    // demande — la portée le dit, aucune déclaration n'est nécessaire.
    const p = PETIT.parcours.find((x: Parcours) => mm.porteeDe(PETIT, x, 0).startsWith("acteur:"));
    expect(p, "aucun parcours de portée acteur dans la fixture").toBeDefined();
    expect(mm.parcoursFerme(PETIT, p!)).toBe(true);
  });

  it("un concept DÉCLARÉ relié à l'identité exige la session, même produit par un autre", () => {
    // LE CAS QUI A MOTIVÉ LA PASSE : un portefeuille APPARTIENT à une
    // personne mais est PRODUIT par un moteur automatique. La portée ne le
    // voyait pas ; la relation déclarée, si.
    const identite = SESSION.concepts.map((c) => c.id).filter((id) => mm.estConceptIdentite(SESSION, id));
    expect(identite.length).toBeGreaterThan(0);
    const possedes = SESSION.concepts
      .filter((c) => identite.some((i) => mm.conceptsRelies(SESSION, c.id, i)))
      .map((c) => c.id);
    expect(possedes.length).toBeGreaterThan(0);
    for (const p of SESSION.parcours as Parcours[]) {
      if (!possedes.includes(p.etapes[0]!.concept)) continue;
      expect(mm.parcoursFerme(SESSION, p), p.id).toBe(true);
    }
  });

  it("la légitimité du modèle de session est RÉÉVALUÉE : de cinq « ouverts » à un", () => {
    // Quatre parcours étaient comptés ouverts à tort. Il en reste UN : celui
    // qui montre des données publiques. Le refus se maintient, et il est
    // juste — mais il ne repose plus sur une erreur de comptage.
    expect(ouverts(SESSION)).toEqual(["par_suivi_marche"]);
  });
});

describe("EP-140 · ② le marketplace reste refusé — son catalogue est bien ouvert", () => {
  it("les parcours d'achat ne touchent aucun concept relié à l'identité", () => {
    const identite = GRAND.concepts.map((c) => c.id).filter((id) => mm.estConceptIdentite(GRAND, id));
    for (const id of ouverts(GRAND)) {
      const p = GRAND.parcours.find((x: Parcours) => x.id === id)!;
      const premier = p.etapes[0]!.concept;
      expect(identite.some((i) => i === premier || mm.conceptsRelies(GRAND, premier, i)), id).toBe(false);
    }
  });

  it("le refus est MAINTENU : un catalogue public et un compte exigé d'abord", () => {
    expect(mm.jugerAccesSansConnexion(GRAND).map((x) => x.code))
      .toEqual(["MODELE_COEUR_EXIGE_CONNEXION"]);
    expect(ouverts(GRAND).length).toBeGreaterThan(0);
  });
});

describe("EP-140 · ③ « montrer puis demander » reste vert", () => {
  it("la fixture qui expose avant d'exiger n'est pas touchée", () => {
    const f = readdirSync(RES).find((x) => x.includes("16-30-59-387Z") && x.includes("modele"));
    const t3 = charger(join(RES, f!));
    expect(mm.jugerAccesSansConnexion(t3)).toEqual([]);
  });

  it("la fixture métier reste verte, avec son parcours d'accueil ouvert", () => {
    expect(mm.jugerAccesSansConnexion(PETIT)).toEqual([]);
    expect(ouverts(PETIT).length).toBeGreaterThan(0);
  });
});

describe("EP-140 · ④ aucun champ déclaratif — CLIQUET", () => {
  const SOURCE = readFileSync(join(R, "benchmarks", "air-emission", "modele-metier.mjs"), "utf8");

  it("la session ne se DÉCLARE nulle part : elle se constate", () => {
    // Un champ que le générateur cocherait serait une porte de sortie — il
    // suffirait de le mettre à `true` pour échapper au juge.
    for (const piege of [
      "enSession", "requiertSession", "sessionRequise", "authRequise",
      "connexionRequise", "prive:", "estPrive",
    ]) {
      expect(SOURCE.includes(piege), `« ${piege} »`).toBe(false);
    }
  });

  it("le schéma du parcours ne gagne AUCUN champ", () => {
    const schema = mm.modeleMetierSchema as {
      shape: { parcours: { element: { shape: Record<string, unknown> } } };
    };
    expect(Object.keys(schema.shape.parcours.element.shape).sort())
      .toEqual(["acteur", "besoin", "etapes", "id", "priorite"]);
  });

  it("la reconnaissance NE passe QUE par deux constats, tous deux dérivés", () => {
    // Si un troisième chemin apparaissait, il devrait être ajouté ici
    // consciemment — c'est ce qui empêche une porte de s'ouvrir en silence.
    const corps = SOURCE.slice(SOURCE.indexOf("export function parcoursFerme"));
    const fin = corps.indexOf("\n}");
    expect(corps.slice(0, fin)).toContain('porteeDe(modele, parcours, index).startsWith("acteur:")');
    expect(corps.slice(0, fin)).toContain("estConceptIdentite(modele, c.id) && conceptsRelies");
  });
});
