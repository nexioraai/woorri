// EP-169 — CE QUE LA BASE PORTE SE JUGE DÈS LA BASE.
//
// EP-168 s'est arrêté avant les écrans. Le document émis portait DÉJÀ une
// barre fausse (« Rechercher » au lieu d'« Accueil ») et une capacité de
// paiement sur un domaine qui n'en a pas. Les juges existaient, étaient
// branchés, et n'ont rien dit — appelés seulement sur un document COMPLET.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  jugerBase,
  jugerCapacitesContreIntention,
} from "../../../benchmarks/air-emission/acceptation.mjs";
import { migrerModele, type ModeleMetier } from "../../../benchmarks/air-emission/modele-metier.mjs";

import { requis } from "./helpers.ts";
const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RES = join(R, "benchmarks", "air-emission", "results");

// LE CAS RÉEL, non fabriqué : l'assemblage partiel du run EP-168.
const PARTIEL = JSON.parse(
  readFileSync(join(RES, requis(readdirSync(RES).find((f) => f.includes("marche-immobilier") && f.includes("emission-partielle")), "cheimmobilierf.includesemissionpartielle")), "utf8"),
) as Record<string, unknown>;
const brut = JSON.parse(
  readFileSync(join(RES, requis(readdirSync(RES).find((f) => f.includes("marche-immobilier") && f.includes("modele-p0-t2")), "udesmarcheimmobilierf.includesmodelep0t2")), "utf8"),
) as { modele?: ModeleMetier };
const MODELE = migrerModele(brut.modele ?? brut) as ModeleMetier;
const codes = (d: readonly { code: string }[]): string[] => d.map((x) => x.code);

describe("EP-169 ① · la barre se juge dès la base", () => {
  it("SUR LE DOCUMENT RÉEL D'EP-168 — le verdict manquant est rendu", () => {
    // 0 écran, et pourtant deux diagnostics. 21 minutes et 1,21 $ plus tôt,
    // personne ne les avait.
    expect((PARTIEL.screens as unknown[] | undefined)?.length ?? 0).toBe(0);
    expect(codes(jugerBase(PARTIEL, { ecransDIdentite: [] }))).toContain(
      "PRESENTATION_LIBELLE_PRIMITIF_LIBRE",
    );
  });

  it("MUTATION — une barre dont la première destination n'est pas « Accueil » est refusée", () => {
    const air = structuredClone(PARTIEL) as {
      navigation: { primary?: { destinations: { label?: { locale: string; text: string }[] }[] } };
    };
    const d0 = air.navigation.primary?.destinations[0];
    expect(d0, "fixture sans destination").toBeDefined();
    expect(requis(d0, "d0").label?.[0]?.text).toBe("Rechercher");
    expect(codes(jugerBase(air, { ecransDIdentite: [] }))).toContain(
      "PRESENTATION_LIBELLE_PRIMITIF_LIBRE",
    );
    // Et la BASE VERTE : corrigée, la barre ne produit plus ce diagnostic.
    requis(d0, "d0").label = [{ locale: "fr", text: "Accueil" }];
    expect(codes(jugerBase(air, { ecransDIdentite: [] }))).not.toContain(
      "PRESENTATION_LIBELLE_PRIMITIF_LIBRE",
    );
  });

  it("LES JUGES NE LISENT PAS LES ÉCRANS — c'est ce qui rend le branchement légitime", () => {
    // Mesure de source : si l'un d'eux touchait `air.screens`, le faire
    // tourner sur la base seule rendrait un verdict tronqué passant pour
    // complet. Aucun ne le touche.
    const src = readFileSync(join(R, "packages", "execution-contract", "src", "presentation.ts"), "utf8");
    const bornes = [...src.matchAll(/export function (\w+)/g)].map((m) => [requis(m[1], "m1"), m.index] as const);
    for (const nom of ["jugerPrimitivesDeNavigation", "jugerPositionPrimitives", "jugerLibellesPrimitifs"]) {
      const i = bornes.findIndex(([n]) => n === nom);
      expect(i, nom).toBeGreaterThanOrEqual(0);
      const corps = src.slice(requis(bornes[i], "bornesi")[1], bornes[i + 1]?.[1] ?? src.length);
      expect(corps.includes("air.screens"), `${nom} lit air.screens`).toBe(false);
    }
  });

  it("sans barre primaire, le juge se tait — il n'invente pas un défaut", () => {
    const air = structuredClone(PARTIEL) as { navigation: { primary?: unknown } };
    delete air.navigation.primary;
    expect(jugerBase(air, { ecransDIdentite: [] })).toEqual([]);
  });
});

describe("EP-171 ① · la barre inférieure se juge dès la base", () => {
  it("LE DÉPLACEMENT EST MESURÉ — jugerBase rend les diagnostics d'icône", () => {
    // Le crible d'EP-170 : `jugerBarreInferieure` ne lit QUE `navigation`,
    // émis au segment `base`. Mesuré sur les 11 émissions partielles
    // archivées : 15 diagnostics jamais rendus à personne.
    const partiels = readdirSync(RES).filter((f) => f.includes("emission-partielle"));
    expect(partiels.length, "aucune émission partielle archivée").toBeGreaterThan(5);
    let icones = 0;
    for (const f of partiels) {
      const d = JSON.parse(readFileSync(join(RES, f), "utf8")) as Record<string, unknown>;
      icones += codes(jugerBase(d, { ecransDIdentite: [] })).filter(
        (c) => c === "PRESENTATION_DESTINATION_SANS_ICONE",
      ).length;
    }
    expect(icones, "le juge déplacé ne rend rien").toBeGreaterThan(0);
  });

  it("IL NE LIT AUCUN ÉCRAN — c'est ce qui autorise le déplacement", () => {
    const src = readFileSync(join(R, "packages", "execution-contract", "src", "presentation.ts"), "utf8");
    const bornes = [...src.matchAll(/export function (\w+)/g)].map((m) => [requis(m[1], "m1"), m.index] as const);
    const i = bornes.findIndex(([n]) => n === "jugerBarreInferieure");
    expect(i).toBeGreaterThanOrEqual(0);
    const corps = src.slice(requis(bornes[i], "bornesi")[1], bornes[i + 1]?.[1] ?? src.length);
    expect(corps.includes(".screens"), "jugerBarreInferieure lit les écrans").toBe(false);
    expect(corps.includes("navigation"), "il devrait lire navigation").toBe(true);
  });

  it("sans barre, il se tait — il n'invente pas un défaut d'icône", () => {
    const air = structuredClone(PARTIEL) as { navigation: { primary?: unknown } };
    delete air.navigation.primary;
    expect(codes(jugerBase(air, { ecransDIdentite: [] }))).not.toContain(
      "PRESENTATION_DESTINATION_SANS_ICONE",
    );
  });
});

describe("EP-169 ② · une capacité de paiement exige un geste de paiement", () => {
  it("LE CAS RÉEL — `payments.psp` sur un modèle sans `payer` est REFUSÉ, nommé", () => {
    const d = jugerCapacitesContreIntention(PARTIEL, { modele: MODELE });
    expect(codes(d)).toEqual(["AIR_CAPACITE_SANS_GESTE"]);
    expect(requis(d[0], "d0").path).toContain("payments.psp");
  });

  it("UN MODÈLE QUI PAIE GARDE SA CAPACITÉ — le juge n'est pas un refus systématique", () => {
    const paie = structuredClone(MODELE);
    const p0 = paie.parcours[0];
    expect(p0, "fixture sans parcours").toBeDefined();
    requis(p0, "p0").etapes.push({ concept: requis(paie.concepts[0], "paie.concepts0").id, geste: "payer" });
    expect(jugerCapacitesContreIntention(PARTIEL, { modele: paie })).toEqual([]);
  });

  it("SANS MODÈLE, AUCUN RELÂCHEMENT — le juge n'existait pas, il se tait", () => {
    // Règle d'EP-167 appliquée à l'envers : se taire EST le comportement
    // d'avant. `validateLocal` doit rester capable de juger une archive
    // seule, sans que le modèle lui soit imposé.
    expect(jugerCapacitesContreIntention(PARTIEL, undefined)).toEqual([]);
    expect(jugerCapacitesContreIntention(PARTIEL, {})).toEqual([]);
  });

  it("LES DEUX BORNES SONT DÉRIVÉES — le juge ne cite aucune capacité ni aucun geste hors table", () => {
    const src = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    const bloc = src.slice(
      src.indexOf("export function jugerCapacitesContreIntention"),
      src.indexOf("export function jugerAcceptation"),
    );
    expect(bloc.length).toBeGreaterThan(200);
    const code = bloc.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
    expect(code, "le juge cite payments.psp en dur").not.toContain('"payments.psp"');
    expect(code, "le juge cite payments.iap en dur").not.toContain('"payments.iap"');
    expect(code, "la contrainte doit venir du registre").toContain("commerceConstraint");
  });
});
