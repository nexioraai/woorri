// EP-134 — LA PRISE DE CONTACT, ET LES QUATRE CHEMINS QU'ELLE A RÉVÉLÉS.
//
// La règle 26 du prompt promettait « prise de contact quand le commerce
// fonctionne ainsi » ; la table ne savait pas l'exprimer. En l'exprimant, on
// a découvert que QUATRE tables indexées par geste vivaient côte à côte sans
// se parler — un geste ajouté à l'une restait muet dans les autres. Ces
// tests tiennent le geste ET les quatre chemins.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "@deribfy/capability-registry";
import * as mm from "../../../benchmarks/air-emission/modele-metier.mjs";
import type { ModeleMetier } from "../../../benchmarks/air-emission/modele-metier.d.mts";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");

const modele = (chemin: string): ModeleMetier =>
  mm.migrerModele(JSON.parse(readFileSync(chemin, "utf8"))) as ModeleMetier;

// DEUX TAILLES : une fixture métier versionnée, et un modèle produit par un
// run réel, sensiblement plus gros.
const PETIT = modele(join(R, "slices", "kaviva", "kaviva-modele.json"));
const GRAND = (() => {
  const brut: unknown = JSON.parse(
    readFileSync(
      join(R, "benchmarks", "air-emission", "results",
        "marketplace-africain.2026-09-12T15-27-32-324Z.modele-p0-t1.air.json"),
      "utf8",
    ),
  );
  const enveloppe = brut as { modele?: unknown };
  return mm.migrerModele(enveloppe.modele ?? brut) as ModeleMetier;
})();

const codes = (m: ModeleMetier): string[] =>
  mm.ecransDe(m).diagnostics.map((x) => x.code);
const clone = <T>(x: T): T => structuredClone(x);

describe("EP-134 · base verte, deux tailles", () => {
  it("les deux modèles restent verts après l'ajout du geste", () => {
    for (const [nom, m] of [["petit", PETIT], ["grand", GRAND]] as const) {
      expect(mm.validerModele(m), nom).toEqual([]);
      expect(codes(m), nom).toEqual([]);
    }
  });
});

describe("EP-134 · ① un modèle hors application peut exprimer la prise de contact", () => {
  it("le geste existe, et un parcours peut s'y achever", () => {
    expect(mm.GESTES).toContain("contacter");
    // Sans paiement en ligne, aucun autre geste terminal ne conclut : si
    // celui-ci n'était pas terminal, un tel modèle n'aurait pas de fin.
    expect(mm.GESTES_TERMINAUX).toContain("contacter");
  });

  it("greffé après une élection, sur les deux tailles, le modèle reste vert", () => {
    for (const [nom, base] of [["petit", PETIT], ["grand", GRAND]] as const) {
      const m = clone(base);
      // L'élection peut vivre dans N'IMPORTE quel parcours — la fixture la
      // plus grande n'en a aucune dans le premier.
      const parcours = m.parcours.find((p) => p.etapes.some((e) => e.geste === "choisir"));
      expect(parcours, `${nom} : aucune élection dans la fixture`).toBeDefined();
      const etapes = parcours!.etapes;
      const i = etapes.findIndex((e) => e.geste === "choisir");
      etapes.splice(i + 1, 0, { concept: etapes[i]!.concept, geste: "contacter" });
      expect(mm.validerModele(m), nom).toEqual([]);
      expect(codes(m), nom).toEqual([]);
    }
  });
});

describe("EP-134 · ② le geste dérive sa capacité comme les autres", () => {
  it("la capacité est dérivée de la table, pas d'un cas particulier", () => {
    const m = clone(PETIT);
    const parcours = m.parcours[0]!;
    const i = parcours.etapes.findIndex((e) => e.geste === "choisir");
    parcours.etapes.splice(i + 1, 0, { concept: parcours.etapes[i]!.concept, geste: "contacter" });
    const { capacites } = mm.capacitesDe(m);
    expect(capacites.map((c) => c.capacite)).toContain("external_contact");
  });

  it("toute capacité citée par la table existe au registre", () => {
    const connues = new Set(CAPABILITIES.map((c) => c.id));
    for (const [geste, patron] of Object.entries(mm.TABLE_GESTES)) {
      const c = patron.capacite;
      if (c === null) continue;
      const citees = typeof c === "string" ? [c] : Object.values(c.selonCommerce);
      for (const id of citees) expect(connues.has(id), `${geste} → ${id}`).toBe(true);
    }
  });
});

describe("EP-134 · ③ un contact qui perd l'instance est refusé", () => {
  it("sans source d'identité en amont → DERIVATION_IDENTITE_SANS_SOURCE", () => {
    const m = clone(PETIT);
    const parcours = m.parcours[0]!;
    parcours.etapes[0] = { ...parcours.etapes[0]!, geste: "contacter" };
    expect(codes(m)).toContain("DERIVATION_IDENTITE_SANS_SOURCE");
  });

  it("la surface du contact porte UNE instance, jamais la collection", () => {
    const m = clone(PETIT);
    const parcours = m.parcours[0]!;
    const i = parcours.etapes.findIndex((e) => e.geste === "choisir");
    parcours.etapes.splice(i + 1, 0, { concept: parcours.etapes[i]!.concept, geste: "contacter" });
    const surface = mm.surfacesDe(m).find((s) => s.role === "contact");
    expect(surface?.cardinalite).toBe("instance");
    expect(surface?.identite).toBe("consommee");
    // C'est CE point qui interdit « contacter » ouvrant la liste entière.
    expect(surface?.exclusions).toContain("collection_pleine");
  });

  it("LE CHEMIN VOISIN, révélé et fermé : le retrait aussi est jugé", () => {
    const m = clone(PETIT);
    const parcours = m.parcours[0]!;
    parcours.etapes[0] = { ...parcours.etapes[0]!, geste: "retirer" };
    expect(codes(m)).toContain("DERIVATION_IDENTITE_SANS_SOURCE");
  });
});

describe("EP-134 · ④ la table ne nomme ni canal ni région", () => {
  const MOTS = [
    "tel", "sms", "mail", "whatsapp", "telegram", "signal", "appel", "appeler",
    "telephone", "messagerie", "message", "courriel", "email", "numero",
    "afrique", "africain", "tchad", "sahel", "europe", "france", "usa",
  ];

  it("aucun mot de canal ni de région dans les DONNÉES de la table", () => {
    // Les données, pas les commentaires : un commentaire a le droit
    // d'expliquer pourquoi un canal est exclu — la table, non.
    const serialisee = JSON.stringify(mm.TABLE_GESTES).toLocaleLowerCase();
    for (const mot of MOTS) {
      expect(new RegExp(`\\b${mot}`).test(serialisee), `« ${mot} »`).toBe(false);
    }
  });

  it("le canal est nommé au registre de capacités, et là seulement", () => {
    const contact = CAPABILITIES.find((c) => c.id === "external_contact");
    expect(contact).toBeDefined();
    // La capacité DOIT parler de canaux : c'est son étage.
    expect(contact?.description.toLocaleLowerCase()).toContain("canal");
    // Et ne doit nommer aucun service ni aucune région.
    for (const mot of ["whatsapp", "telegram", "afrique", "tchad"]) {
      expect(JSON.stringify(contact).toLocaleLowerCase()).not.toContain(mot);
    }
  });
});

describe("EP-134 · CLIQUET — une seule table des gestes", () => {
  it("GESTES est exactement les clés de la table (plus deux listes qui divergent)", () => {
    expect(mm.GESTES).toEqual(Object.keys(mm.TABLE_GESTES));
  });

  it("chaque geste porte TOUTES les colonnes — aucune valeur par défaut muette", () => {
    for (const [geste, patron] of Object.entries(mm.TABLE_GESTES)) {
      for (const colonne of ["bloc", "declencheur", "effet", "transport", "terminal", "capacite", "role", "cardinalite", "preuve"]) {
        expect(Object.hasOwn(patron, colonne), `${geste} · ${colonne}`).toBe(true);
      }
      expect(typeof patron.role, `${geste} · role`).toBe("string");
      expect(["instance", "collection", "singleton"], `${geste} · cardinalite`).toContain(patron.cardinalite);
    }
  });

  it("rôles et cardinalités sont DÉRIVÉS, jamais redéclarés", () => {
    const roles = mm.ROLE_PAR_GESTE;
    expect(Object.keys(roles)).toEqual(Object.keys(mm.TABLE_GESTES));
    for (const [geste, patron] of Object.entries(mm.TABLE_GESTES)) {
      expect(roles[geste]).toBe(patron.role);
    }
  });
});
