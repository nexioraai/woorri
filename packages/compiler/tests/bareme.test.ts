/**
 * LE BARÈME, PROUVÉ CONTRE UN CAHIER DES CHARGES RÉEL.
 *
 * Les sept montants ci-dessous ne sont pas inventés : ils viennent du
 * tableau de la section 1 d'un cahier des charges de suivi de consommation
 * électrique, et sa section 10 en fait des tests OBLIGATOIRES. C'est donc
 * le client qui a écrit ces attentes, pas moi.
 *
 * Et chaque cas est verifie DEUX FOIS : sur la reference, et sur le CODE
 * EMIS reellement evalue. Une reference juste et un code emis faux
 * donnerait une application fausse — c'est exactement le defaut que ce
 * fichier existe pour rendre impossible.
 */
import { describe, expect, it } from "vitest";
import { emettreBaremeTs, evaluerBareme, type Bareme } from "../src/bareme.ts";

/** « ≤ 150 kWh → 85 F ; > 150 kWh → 125 F sur TOUT ; + 402 F de frais ». */
const SNE: Bareme = {
  paliers: [{ jusqua: 150, prixUnitaire: 85 }, { prixUnitaire: 125 }],
  mode: "global",
  fraisFixes: 402,
};

/** Évalue le code ÉMIS, pour prouver qu'il fait la même chose. */
const viaCodeEmis = (b: Bareme, q: number): number => {
  const src = emettreBaremeTs(b, "calculer")
    .replace(/^export function/mu, "function")
    .replace(/: \{ jusqua: number \| null; prixUnitaire: number \}\[\]/u, "")
    .replace(/: number \| null/gu, "")
    .replace(/\(quantite: number\): number/u, "(quantite)")
    .replace(/: number/gu, "");
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return (Function(`${src}\nreturn calculer(${String(q)});`) as () => number)();
};

describe("le tableau du cahier des charges, au franc près", () => {
  const ATTENDU: [number, number][] = [
    [1, 487],
    [30, 2952],
    [149, 13067],
    [150, 13152],
    [151, 19277],
    [400, 50402],
    [1000, 125402],
  ];

  for (const [kwh, montant] of ATTENDU) {
    it(`${String(kwh)} kWh → ${String(montant)} F`, () => {
      expect(evaluerBareme(SNE, kwh)).toBe(montant);
      expect(viaCodeEmis(SNE, kwh)).toBe(montant);
    });
  }

  it("la FRONTIÈRE est la règle, et c'est elle qu'on se trompe", () => {
    // « Il ne faut PAS facturer les 150 premiers à 85 puis le surplus à
    // 125 ». Le mode `par_tranche` donnerait 13 277 au lieu de 19 277 :
    // six mille francs d'ecart sur une seule facture.
    expect(evaluerBareme(SNE, 151)).toBe(19277);
    expect(evaluerBareme({ ...SNE, mode: "par_tranche" }, 151)).toBe(13277);
  });
});

describe("l’autre barème — celui de l’impôt — existe aussi", () => {
  const IMPOT: Bareme = {
    paliers: [
      { jusqua: 100, prixUnitaire: 10 },
      { jusqua: 200, prixUnitaire: 20 },
      { prixUnitaire: 30 },
    ],
    mode: "par_tranche",
    fraisFixes: 0,
  };

  it("chaque tranche à son prix", () => {
    expect(evaluerBareme(IMPOT, 100)).toBe(1000);
    expect(evaluerBareme(IMPOT, 150)).toBe(1000 + 50 * 20);
    expect(evaluerBareme(IMPOT, 250)).toBe(1000 + 2000 + 50 * 30);
  });

  it("le code émis dit la même chose", () => {
    for (const q of [50, 100, 150, 250]) {
      expect(viaCodeEmis(IMPOT, q)).toBe(evaluerBareme(IMPOT, q));
    }
  });
});

describe("ce qui ne doit pas produire de montant absurde", () => {
  it("zéro, négatif ou absurde → seulement les frais fixes", () => {
    // Une facture négative n'existe pas. Signaler l'index incohérent est le
    // travail des anomalies, pas celui du calcul.
    for (const q of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(evaluerBareme(SNE, q)).toBe(402);
      expect(viaCodeEmis(SNE, q)).toBe(402);
    }
  });

  it("les nombres du document se relisent DANS le code émis", () => {
    const src = emettreBaremeTs(SNE, "calculer");
    expect(src).toContain("jusqua: 150");
    expect(src).toContain("prixUnitaire: 85");
    expect(src).toContain("prixUnitaire: 125");
    expect(src).toContain("FRAIS_FIXES = 402");
  });
});
