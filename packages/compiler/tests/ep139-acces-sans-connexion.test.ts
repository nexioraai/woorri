// EP-139 — L'APPLICATION DOIT ÊTRE UTILISABLE SANS CONNEXION.
//
// App Store Review Guidelines 5.1.1(iv) : « you must provide access without a
// login or via another mechanism ». Une application qui l'ignore est
// REFUSABLE AU MAGASIN — ce n'est pas un avis de conception.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as mm from "../../../benchmarks/air-emission/modele-metier.mjs";
import type { ModeleMetier } from "../../../benchmarks/air-emission/modele-metier.d.mts";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const RES = join(R, "benchmarks", "air-emission", "results");

const charger = (chemin: string): ModeleMetier => {
  const brut = JSON.parse(readFileSync(chemin, "utf8")) as { modele?: unknown };
  return mm.migrerModele(brut.modele ?? brut) as ModeleMetier;
};

// DEUX TAILLES : la fixture métier versionnée (3 parcours) et un modèle de
// run réel (5 parcours).
const PETIT = charger(join(R, "slices", "kaviva", "kaviva-modele.json"));
const GRAND = charger(join(RES, "marketplace-africain.2026-09-12T15-27-32-324Z.modele-p0-t1.air.json"));
const codes = (m: ModeleMetier): string[] =>
  mm.jugerAccesSansConnexion(m).map((x) => x.code);
const clone = (m: ModeleMetier): ModeleMetier => structuredClone(m);

describe("EP-139 · ① un cœur ouvert passe", () => {
  it("la fixture dont le parcours principal montre avant de demander est VERTE", () => {
    expect(codes(PETIT)).toEqual([]);
  });

  it("montrer PUIS demander un compte est conforme — c'est ce qu'Apple demande", () => {
    // Fixture réelle : on parcourt, on choisit, et seule l'action finale
    // exige un compte. L'ACCÈS est fourni.
    const f = readdirSync(RES).find((x) => x.includes("16-30-59-387Z") && x.includes("modele"));
    expect(f, "fixture absente").toBeDefined();
    const t3 = charger(join(RES, f!));
    const principal = mm.parcoursParPriorite(t3)[0]!;
    expect(principal.etapes.some((e) => (e.preconditions ?? []).length > 0)).toBe(true);
    expect(codes(t3)).toEqual([]);
  });
});

describe("EP-139 · ② un cœur fermé est refusé, en citant la source", () => {
  it("le modèle de run dont le parcours principal commence par s_identifier est ROUGE", () => {
    // CAS RÉEL, non fabriqué : ce document a été produit par une campagne.
    const principal = mm.parcoursParPriorite(GRAND)[0]!;
    expect(principal.etapes[0]!.geste).toBe("s_identifier");
    const f = mm.jugerAccesSansConnexion(GRAND);
    expect(f.map((x) => x.code)).toEqual(["MODELE_COEUR_EXIGE_CONNEXION"]);
    expect(f[0]!.message).toContain("5.1.1(iv)");
    expect(f[0]!.message).toContain("refusable au magasin");
  });

  it("fermer le cœur d'un modèle vert le fait basculer", () => {
    const m = clone(PETIT);
    const principal = mm.parcoursParPriorite(m)[0]!;
    principal.etapes.unshift({ concept: principal.etapes[0]!.concept, geste: "s_identifier" });
    expect(codes(m)).toEqual(["MODELE_COEUR_EXIGE_CONNEXION"]);
  });

  it("LE CHEMIN DISCRET — une précondition d'identité en tête ferme aussi", () => {
    // Sans cela, il suffirait d'exiger « compte actif » à la première étape
    // pour murer l'application sans jamais écrire `s_identifier`.
    const m = clone(PETIT);
    const identite = m.concepts.map((c) => c.id).find((id) => mm.estConceptIdentite(m, id));
    expect(identite).toBeDefined();
    const principal = mm.parcoursParPriorite(m)[0]!;
    principal.etapes[0] = {
      ...principal.etapes[0]!,
      preconditions: [{ concept: identite!, etat: "actif" }],
    };
    expect(codes(m)).toEqual(["MODELE_COEUR_EXIGE_CONNEXION"]);
  });

  it("LE CHEMIN PAR L'ORDRE — la priorité désigne le cœur, pas l'index", () => {
    // Sans cela, un générateur mettrait le parcours fermé en tête du tableau
    // et lui donnerait une priorité basse pour échapper au juge.
    const m = clone(GRAND);
    const ferme = mm.parcoursParPriorite(m)[0]!;
    const ouvert = m.parcours.find((p) => !mm.parcoursFerme(m, p))!;
    ferme.priorite = 99;
    ouvert.priorite = 0;
    expect(mm.parcoursParPriorite(m)[0]!.id).toBe(ouvert.id);
    expect(codes(m)).toEqual([]);
  });
});

describe("EP-139 · ③ le cas légitime passe — constaté, jamais déclaré", () => {
  it("une application qui ne sait RIEN ouvrir a le droit de tout fermer", () => {
    // Apple excuse l'app dont la fonction même exige un compte. Le fait
    // structurel : AUCUN parcours n'est praticable sans compte. Une banque
    // est dans ce cas ; un marché qui porte un catalogue ne l'est pas.
    const m = clone(PETIT);
    for (const p of m.parcours) {
      if (!mm.parcoursFerme(m, p)) {
        p.etapes.unshift({ concept: p.etapes[0]!.concept, geste: "s_identifier" });
      }
    }
    expect(m.parcours.every((p) => mm.parcoursFerme(m, p))).toBe(true);
    expect(codes(m)).toEqual([]);
  });

  it("la légitimité n'est PAS un booléen que le générateur pourrait cocher", () => {
    // Elle ne se déclare nulle part : aucun champ du contrat ne l'exprime.
    const source = readFileSync(join(R, "benchmarks", "air-emission", "modele-metier.mjs"), "utf8");
    expect(source).not.toMatch(/connexionLegitime|loginRequis|exigeCompte/);
  });
});

describe("EP-139 · ④ aucun juge existant ne bouge", () => {
  it("les deux modèles ne gagnent AUCUN autre diagnostic", () => {
    for (const [nom, m] of [["petit", PETIT], ["grand", GRAND]] as const) {
      const autres = (mm.validerModele(m) as { code: string }[])
        .map((x) => x.code)
        .filter((c) => c !== "MODELE_COEUR_EXIGE_CONNEXION");
      expect(autres, nom).toEqual([]);
    }
  });

  it("le diagnostic est CLASSÉ — sans quoi il ne pourrait pas être émis", () => {
    const table = mm.DIAGNOSTICS as Record<string, { classe: string }>;
    // Faute de production : le générateur réordonne ou ouvre. L'humain n'a
    // rien à répondre — lui poser la question serait lui faire porter une
    // erreur de machine.
    expect(table.MODELE_COEUR_EXIGE_CONNEXION?.classe).toBe("faute_de_production");
  });
});
