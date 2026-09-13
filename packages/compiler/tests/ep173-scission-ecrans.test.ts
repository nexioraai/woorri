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
  obligationsPrescriptives,
  parcoursParPriorite,
  prescriptionsNavigation,
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
// LE MODÈLE DU RUN EP-174, celui qui porte le cas : deux destinations
// seulement, donc une barre que Material refuse. Prendre « le premier
// immobilier trouvé » ramenait celui d'EP-168, qui en a trois — la fixture
// aurait été muette sur ce que le test doit prouver.
// LE MODÈLE DU RUN EP-174, DÉSIGNÉ PAR SON HORODATAGE ET NON PAR SON RANG.
//
// Il porte le cas : DEUX destinations seulement, donc une barre que Material
// refuse. « Le dernier trouvé » a marché jusqu'au run EP-178, qui en a produit
// un nouveau avec TROIS destinations — et trois tests sont tombés d'un coup.
// UNE FIXTURE QUI DIT « LE DERNIER » CHANGE DE SENS À CHAQUE RUN : elle ne
// désigne pas un cas, elle désigne une date.
const PETIT = charger(
  fichiers.find((f) => f.includes("marche-immobilier") && f.includes("16-26-13"))!,
);
// L-179-B — DÉSIGNÉ PAR SON HORODATAGE, jamais par son rang. `.at(-1)`
// prend le PLUS RÉCENT : il change à chaque run, et la fixture cesse
// silencieusement de porter le cas qu'elle prétend éprouver.
const GRAND = charger(
  fichiers.find((f) => f.includes("marketplace-africain") && f.includes("20-52-53"))!,
);

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

// EP-175 — LES DEUX RACINES D'EP-174.
describe("EP-175 · la barre que le plan ne prescrit pas", () => {
  it("① UN PLAN À MOINS DE 3 DESTINATIONS NE PRESCRIT PLUS DE BARRE", async () => {
    // RACINE MESURÉE : le plan prescrivait `barre: true` avec DEUX
    // destinations, la règle Material en exige TROIS. Le générateur recevait
    // deux exigences incompatibles et a ajouté un écran de flux comme
    // destination — sans lui rendre la barre. D'où le SEUL diagnostic qui
    // séparait le document de la compilation.
    const { DESTINATIONS_MIN } = await import(
      "../../execution-contract/src/presentation.ts"
    );
    const plan = ecransDe(PETIT);
    const avant = prescriptionsNavigation(plan);
    const apres = prescriptionsNavigation(plan, DESTINATIONS_MIN);
    expect(avant.destinations.length, "fixture sans le cas").toBeLessThan(DESTINATIONS_MIN);
    expect(avant.barre, "avant : le plan prescrivait une barre").toBe(true);
    expect(apres.barre, "après : il ne doit plus en prescrire").toBe(false);
  });

  it("UN DOMAINE À ASSEZ DE RACINES GARDE SA BARRE — pas un refus systématique", async () => {
    const { DESTINATIONS_MIN } = await import(
      "../../execution-contract/src/presentation.ts"
    );
    const plan = ecransDe(GRAND);
    const p = prescriptionsNavigation(plan, DESTINATIONS_MIN);
    expect(p.destinations.length).toBeGreaterThanOrEqual(DESTINATIONS_MIN);
    expect(p.barre, "une barre légitime a été retirée").toBe(true);
  });

  it("SANS BORNE, LE PLAN EST INCHANGÉ — l'ignorance ne décide pas", () => {
    for (const M of [PETIT, GRAND]) {
      const plan = ecransDe(M);
      expect(prescriptionsNavigation(plan).barre).toBe(plan.navigation.barre);
    }
  });

  it("LA BORNE N'EST PAS RECOPIÉE — elle est REÇUE", () => {
    // La recopier dans `modele-metier.mjs` serait la onzième occurrence, et
    // lui faire importer une règle de présentation inverserait les couches :
    // ce module n'importe que zod, par construction.
    const src = readFileSync(join(R, "benchmarks", "air-emission", "modele-metier.mjs"), "utf8");
    const bloc = src.slice(
      src.indexOf("export function prescriptionsNavigation"),
      src.indexOf("export function verifierNavigationPrescrite"),
    );
    expect(bloc.length).toBeGreaterThan(200);
    const code = bloc.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(code, "la borne est écrite en dur").not.toMatch(/>=\s*3\b/);
    expect(code).toContain("destinationsMin");
    const imports = src.split("\n").filter((l) => l.startsWith("import "));
    expect(imports.length, "modele-metier a gagné une dépendance").toBe(1);
  });

  it("QUAND LE PLAN NE PRESCRIT PAS DE BARRE, LA RÈGLE LE DIT", async () => {
    // Se taire laissait le générateur en inventer une pour satisfaire la
    // borne Material.
    const { DESTINATIONS_MIN } = await import(
      "../../execution-contract/src/presentation.ts"
    );
    const plan = ecransDe(PETIT);
    const o = String(obligationsPrescriptives("ecrans", PETIT, plan, DESTINATIONS_MIN));
    expect(o).toContain("n'en prescrit AUCUNE");
    expect(o).toContain("N'émets PAS");
    const oGrand = String(obligationsPrescriptives("ecrans", GRAND, ecransDe(GRAND), DESTINATIONS_MIN));
    expect(oGrand, "un domaine à barre doit garder sa règle").toContain("écrans RACINES");
  });

  it("② L'ÉCHELLE DE DÉGRADATION EST PARTAGÉE ENTRE LOTS", () => {
    // MESURÉ sur EP-174 : 4 dégradations devenues 12, chaque lot repayant le
    // même escalier. Les lots portent le MÊME schéma (mêmes `keys`), donc une
    // échelle commune ne peut en dégrader aucun à tort.
    const src = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(src, "pas d'état d'échelle partagé").toContain("const etatEchelle =");
    // Le partage doit passer par un ACCESSEUR : `{...modele}` copierait
    // `levelIndex` par valeur et chaque lot repartirait de zéro.
    expect(src).toMatch(/get levelIndex\(\)\s*\{\s*return etatEchelle\.levelIndex;/);
    expect(src).toMatch(/set levelIndex\(v\)\s*\{\s*etatEchelle\.levelIndex = v;/);
    // Et le lot des surfaces le partage aussi.
    const bloc = src.slice(src.indexOf("eclates.push({"), src.indexOf("return [...PARTS.slice(0, i)"));
    expect(bloc, "le lot des surfaces ne partage pas l'échelle").toContain("etatEchelle.levelIndex");
  });
});
