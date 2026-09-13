// EP-173 — LE SEGMENT `ecrans` SE SCINDE PAR PARCOURS.
//
// MESURÉ (EP-172) : `ecrans` concentre 4 des 11 arrêts, et la cause n'est pas
// sa grammaire mais son VOLUME en un seul appel. Le discriminant n'est pas
// inventé — chaque écran du plan porte `justification: [{parcours, etape}]`.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ecransDe,
  lotsDEcrans,
  migrerModele,
  parcoursParPriorite,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RES = join(R, "benchmarks", "air-emission", "results");

const charger = (f: string): ModeleMetier => {
  const brut = JSON.parse(readFileSync(join(RES, f), "utf8")) as { modele?: ModeleMetier };
  return migrerModele(brut.modele ?? brut) as ModeleMetier;
};
// DEUX TAILLES, comme le protocole l'exige : un modèle récent du domaine neuf
// et un modèle de marché, plus gros.
const fichiers = readdirSync(RES).filter((f) => f.includes("modele-p0"));
const PETIT = charger(fichiers.find((f) => f.includes("marche-immobilier"))!);
const GRAND = charger(fichiers.filter((f) => f.includes("marketplace-africain")).at(-1)!);

describe("EP-173 · la scission par parcours", () => {
  for (const [nom, M] of [["immobilier", PETIT], ["marketplace", GRAND]] as const) {
    const plan = ecransDe(M);
    const lots = lotsDEcrans(M, plan);

    it(`${nom} — LE COMPTE TOTAL EST IDENTIQUE avant et après scission`, () => {
      const total = lots.reduce((n, l) => n + l.ecrans.length, 0);
      expect(total, "des écrans sont apparus ou ont disparu").toBe(plan.ecrans.length);
    });

    it(`${nom} — UN ÉCRAN MULTI-PARCOURS N'EST ÉMIS QU'UNE FOIS`, () => {
      // La mutation qui compte : un doublon serait un défaut PLUS GRAVE que
      // celui qu'on corrige — deux émissions du même identifiant.
      const tous = lots.flatMap((l) => l.ecrans);
      expect(new Set(tous).size, "doublon entre lots").toBe(tous.length);
      // Et la fixture DOIT contenir le cas, sinon le test ne prouve rien.
      const multi = plan.ecrans.filter(
        (e) => new Set((e.justification ?? []).map((j) => j.parcours)).size > 1,
      );
      expect(multi.length, `${nom} : aucun écran multi-parcours, test sans objet`).toBeGreaterThan(0);
    });

    it(`${nom} — AUCUN ÉCRAN N'EST PERDU : chacun se retrouve dans un lot`, () => {
      const tous = new Set(lots.flatMap((l) => l.ecrans));
      for (const e of plan.ecrans) {
        expect(tous.has(e.ecranId), `${e.ecranId} perdu entre deux lots`).toBe(true);
      }
    });

    it(`${nom} — L'AFFECTATION SUIT LA PRIORITÉ, jamais l'ordre d'écriture`, () => {
      const rang = new Map(parcoursParPriorite(M).map((p, i) => [p.id, i]));
      for (const lot of lots) {
        if (!rang.has(lot.parcours)) continue;
        for (const id of lot.ecrans) {
          const ecran = plan.ecrans.find((e) => e.ecranId === id);
          const candidats = [...new Set((ecran?.justification ?? []).map((j) => j.parcours))]
            .filter((p) => rang.has(p));
          if (candidats.length === 0) continue;
          const meilleur = candidats.reduce((a, b) => (rang.get(a)! <= rang.get(b)! ? a : b));
          expect(lot.parcours, `${id} mal affecté`).toBe(meilleur);
        }
      }
    });

    it(`${nom} — LA SCISSION RÉDUIT VRAIMENT : le plus gros lot est plus petit que le tout`, () => {
      // Sans cette mesure, une scission qui produirait UN lot contenant tout
      // passerait tous les tests ci-dessus.
      const plusGros = Math.max(...lots.map((l) => l.ecrans.length));
      expect(lots.length, "aucune scission").toBeGreaterThan(1);
      expect(plusGros, "le plus gros lot vaut le segment entier").toBeLessThan(plan.ecrans.length);
    });

    it(`${nom} — LES LOTS SORTENT DANS L'ORDRE DE PRIORITÉ`, () => {
      const rang = new Map(parcoursParPriorite(M).map((p, i) => [p.id, i]));
      const rangs = lots.map((l) => rang.get(l.parcours) ?? Number.MAX_SAFE_INTEGER);
      expect([...rangs].sort((a, b) => a - b)).toEqual(rangs);
    });
  }

  it("AUCUNE RÉFÉRENCE EN AVANT — un écran ne cite jamais un autre écran", () => {
    // C'est ce qui autorise l'ordre des lots : les navigations vivent dans
    // `actions`, émis APRÈS tous les lots. Vérifié sur un document réel.
    const f = readdirSync(RES).find(
      (x) => x.endsWith(".air.json") && !x.includes("modele") && !x.includes("partielle"),
    );
    const air = JSON.parse(readFileSync(join(RES, f!), "utf8")) as {
      screens?: { id: string }[];
    };
    const ids = (air.screens ?? []).map((s) => s.id);
    expect(ids.length).toBeGreaterThan(1);
    for (const s of air.screens ?? []) {
      const txt = JSON.stringify(s);
      for (const autre of ids) {
        if (autre !== s.id) expect(txt.includes(`"${autre}"`), `${s.id} cite ${autre}`).toBe(false);
      }
    }
  });

  it("LE LOT DES SURFACES EXISTE DANS L'ÉMISSION — sans lui elles disparaîtraient", () => {
    // Les écrans de `purpose` ne sont dans AUCUN plan (EP-165 ③a) : le plan
    // dérive du modèle métier, qui les ignore. `lotsDEcrans` ne peut donc pas
    // les porter — c'est l'émission qui doit leur donner un lot propre.
    for (const M of [PETIT, GRAND]) {
      const plan = ecransDe(M);
      expect(plan.ecrans.every((e) => (e.justification ?? []).length > 0)).toBe(true);
    }
    const src = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(src, "aucun lot de surfaces dans l'émission").toContain('name: "ecrans:surfaces"');
    expect(src, "le lot de surfaces doit être ajouté APRÈS les lots de parcours").toMatch(
      /eclates\.push\(\{[\s\S]{0,400}surfaces: true/,
    );
  });

  it("SANS MODÈLE, L'ÉMISSION N'EST PAS RÉORGANISÉE", () => {
    const src = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    const bloc = src.slice(src.indexOf("function partsPour"), src.indexOf("for (const part of PARTS) {"));
    expect(bloc).toContain("return PARTS");
    expect(bloc, "l'ignorance ne doit pas réorganiser l'émission").toMatch(
      /prescriptif\?\.modele === undefined[\s\S]{0,120}return PARTS/,
    );
  });

  it("UN LOT ACCUMULE — sans quoi chaque lot effacerait le précédent", () => {
    const src = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(src).toContain("part.accumule");
    expect(src, "l'accumulation doit concaténer, pas remplacer").toMatch(
      /assembled\[cle\] = \[\.\.\.\(assembled\[cle\] \?\? \[\]\), \.\.\.\(emis\[cle\] \?\? \[\]\)\]/,
    );
  });
});
