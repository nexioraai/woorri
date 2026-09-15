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
  etapesFusionnables,
  surfacesDe,
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
describe("EP-182 ③ · la barre existe toujours, et le réservé n'y est pas", () => {
  // RÉVISION CONSCIENTE D'EP-175 ①. Cette passe faisait dépendre l'existence
  // de la barre de la borne Material (3 à 5 destinations). MESURÉ après que
  // les racines réservées en soient sorties : 26 modèles sur 39 ont moins de
  // TROIS destinations publiques. Appliquer la borne les priverait tous de
  // barre, donc d'« Accueil » et de « Compte » — que toute application doit
  // porter. La règle de produit prime ; la borne jugera le CONTENU.
  it("TOUTE APPLICATION A UNE BARRE — Accueil et Compte sont dus", () => {
    for (const M of [PETIT, GRAND]) {
      expect(ecransDe(M).navigation.barre, "une application sans barre").toBe(true);
    }
  });

  it("UNE ACTION RÉSERVÉE QUITTE LA BARRE — mesuré sur le cas de Youssouf", () => {
    // « Publier » est une action d'annonceur : elle ne concerne pas les
    // visiteurs et vit dans l'espace compte.
    const plan = ecransDe(PETIT);
    expect(plan.navigation.racinesReservees.length, "rien n'a été réservé").toBeGreaterThan(0);
    for (const e of plan.navigation.racinesReservees) {
      expect(plan.navigation.destinations, `${e} occupe encore la barre`).not.toContain(e);
    }
  });

  it("LE DISCRIMINANT EST L'ACTEUR — aucun nom de parcours, aucun geste cité", () => {
    const src = readFileSync(join(R, "benchmarks", "air-emission", "modele-metier.mjs"), "utf8");
    const bloc = src.slice(
      src.indexOf("EP-182 ③ — UNE ACTION RÉSERVÉE"),
      src.indexOf("const barre = true"),
    );
    const code = bloc.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(code).toContain("acteurPublic");
    for (const nom of ["publier", "saisir", "annonceur", "vendeur"]) {
      expect(code, `le discriminant cite ${nom}`).not.toContain(`"${nom}`);
    }
  });

  it("L'IGNORANCE NE RÉSERVE RIEN — sans acteur déclaré, tout reste public", () => {
    const sansActeur = structuredClone(PETIT) as ModeleMetier;
    for (const p of sansActeur.parcours) delete (p as { acteur?: string }).acteur;
    expect(ecransDe(sansActeur).navigation.racinesReservees).toEqual([]);
  });

  it("UN DOMAINE À UN SEUL ACTEUR NE RÉSERVE RIEN", () => {
    // Kaviva n'a qu'un acteur : rien ne doit quitter sa barre.
    const kaviva = charger(
      readdirSync(RES).find((f) => f.includes("kaviva") && f.includes("23-00-50") && f.includes("modele-p0"))!,
    );
    expect(ecransDe(kaviva).navigation.racinesReservees).toEqual([]);
  });
});

describe("EP-182 · le plan compose, il ne sérialise plus", () => {
  it("LE CAS MESURÉ — `saisir critères` puis `chercher annonces` ne font qu'UN écran", () => {
    const f = etapesFusionnables(PETIT);
    expect(f.length, "la paire n'est plus reconnue").toBe(1);
    expect(f[0]!.filtre.geste).toBe("saisir");
    expect(f[0]!.collection.geste).toBe("chercher");
    // Et le plan le RÉALISE : le filtre vit sur l'entrée, au-dessus.
    const plan = ecransDe(PETIT);
    const entree = plan.ecrans.find((e) => e.ecranId === "ecr_entree");
    expect(entree, "aucune entrée").toBeDefined();
    expect(entree!.surfaces.length, "le filtre n'a pas rejoint l'entrée").toBeGreaterThan(1);
    expect(entree!.surfaces[0], "le filtre doit être AU-DESSUS").toContain("saisir");
    // Il n'a plus d'écran à lui.
    expect(plan.ecrans.some((e) => e.ecranId === "ecr_cpt_recherche_saisir")).toBe(false);
  });

  it("LE DISCRIMINANT NE CITE AUCUNE PAIRE DE GESTES — il vient de la TABLE", () => {
    const src = readFileSync(join(R, "benchmarks", "air-emission", "modele-metier.mjs"), "utf8");
    const bloc = src.slice(
      src.indexOf("export function etapesFusionnables"),
      src.indexOf("export function lotsDEcrans"),
    );
    const code = bloc.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    for (const geste of ["saisir", "chercher", "payer", "decouvrir"]) {
      expect(code, `le discriminant cite ${geste}`).not.toContain(`"${geste}"`);
    }
    for (const critere of ["transport", "cardinalite", "effet"]) {
      expect(code, `critère absent : ${critere}`).toContain(critere);
    }
  });

  it("IL NE FUSIONNE PAS CE QUI N'A PAS À L'ÊTRE — deux tailles", () => {
    // Kaviva n'a AUCUNE paire de cette forme : son parcours commence par une
    // découverte, pas par un formulaire. Le plan doit rester identique.
    expect(etapesFusionnables(GRAND).every((f) => f.filtre.concept !== f.collection.concept)).toBe(true);
    const kaviva = charger(
      readdirSync(RES).find((f) => f.includes("kaviva") && f.includes("23-00-50") && f.includes("modele-p0"))!,
    );
    expect(etapesFusionnables(kaviva), "Kaviva ne doit rien fusionner").toEqual([]);
  });

  it("LE FAUX POSITIF EST FERMÉ — `saisir X` puis `payer X` n'est pas un filtre", () => {
    // Mesuré avant la condition : `saisir cpt_mise_en_avant → payer
    // cpt_mise_en_avant` était fusionné. Payer MUTE et porte le MÊME concept.
    for (const M of [PETIT, GRAND]) {
      for (const f of etapesFusionnables(M)) {
        expect(f.filtre.concept, "même concept fusionné").not.toBe(f.collection.concept);
      }
    }
  });

  it("AUCUN ÉCRAN PERDU — le compte total ne peut que DIMINUER, jamais manquer", () => {
    // Une fusion retire un écran ; elle ne doit retirer AUCUNE surface.
    for (const M of [PETIT, GRAND]) {
      const plan = ecransDe(M);
      const posees = new Set(plan.ecrans.flatMap((e) => e.surfaces));
      for (const sf of surfacesDe(M)) {
        expect(posees.has(sf.surfaceId), `surface perdue : ${sf.surfaceId}`).toBe(true);
      }
    }
  });
});
