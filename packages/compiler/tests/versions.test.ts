/**
 * UNE RÈGLE QUI CHANGE AVEC LE TEMPS — PROUVÉE SUR L'EXIGENCE RÉELLE.
 *
 * Cahier de référence, section 7 : « ne pas appliquer automatiquement une
 * ancienne mesure à une autre période ». Ces tests tiennent les deux
 * moitiés : la bonne version est choisie, et AUCUNE ne l'est quand la date
 * n'est couverte par rien.
 */
import { describe, expect, it } from "vitest";
import { emettreVersionneTs, evaluerVersionne, versionPour, type Versionne } from "../src/versions.ts";

/** Le tarif change au 1er janvier 2026 : 85/125 F devient 90/130 F. */
const TARIF: Versionne = {
  dateFieldId: "date_releve",
  versions: [
    {
      jusqua: "2026-01-01",
      source: "grille SNE 2025",
      regle: {
        kind: "bareme", fieldId: "kwh",
        paliers: [{ jusqua: 150, prixUnitaire: 85 }, { prixUnitaire: 125 }],
        mode: "par_tranche", fraisFixes: 402,
      },
    },
    {
      depuis: "2026-01-01",
      source: "grille SNE 2026",
      regle: {
        kind: "bareme", fieldId: "kwh",
        paliers: [{ jusqua: 150, prixUnitaire: 90 }, { prixUnitaire: 130 }],
        mode: "par_tranche", fraisFixes: 402,
      },
    },
  ],
};

describe("la bonne version, selon la date de la LIGNE", () => {
  it("une facture de 2025 garde le tarif de 2025", () => {
    // 150 × 85 + 40 × 125 + 402 = 18 152
    expect(evaluerVersionne(TARIF, { date_releve: "2025-12-31", kwh: 190 })).toBe(18152);
  });

  it("une facture de 2026 prend le nouveau — 150 × 90 + 40 × 130 + 402", () => {
    expect(evaluerVersionne(TARIF, { date_releve: "2026-01-01", kwh: 190 })).toBe(13500 + 5200 + 402);
  });

  it("la frontière est EXCLUSIVE : deux versions ne valent jamais le même jour", () => {
    expect(versionPour(TARIF, "2025-12-31")?.source).toBe("grille SNE 2025");
    expect(versionPour(TARIF, "2026-01-01")?.source).toBe("grille SNE 2026");
  });

  it("PAS D’HORLOGE : la même ligne donne toujours le même montant", () => {
    // Avec la date du jour, une facture de l'an dernier changerait de
    // montant à chaque relecture. C'est le défaut que ce choix ferme.
    const ligne = { date_releve: "2025-06-15", kwh: 190 };
    expect(evaluerVersionne(TARIF, ligne)).toBe(evaluerVersionne(TARIF, ligne));
    expect(evaluerVersionne(TARIF, ligne)).toBe(18152);
  });
});

describe("ce qui n’est couvert par AUCUNE version", () => {
  const borne: Versionne = {
    dateFieldId: "d",
    versions: [{ depuis: "2025-01-01", jusqua: "2026-01-01", regle: { kind: "calcul", expression: { kind: "constante", valeur: 7 } } }],
  };

  it("une date hors période rend AUCUNE valeur — jamais un repli", () => {
    // « Ne pas supposer. » Un montant calculé avec le mauvais tarif a
    // l'air juste, et c'est exactement ce qu'on refuse.
    expect(evaluerVersionne(borne, { d: "2024-12-31" })).toBeNull();
    expect(evaluerVersionne(borne, { d: "2026-01-01" })).toBeNull();
    expect(evaluerVersionne(borne, { d: "2025-06-01" })).toBe(7);
  });

  it("une date absente ou illisible rend AUCUNE valeur", () => {
    for (const d of [undefined, null, "", "hier", 42]) {
      expect(evaluerVersionne(borne, { d })).toBeNull();
    }
  });
});

describe("le code émis dit la même chose", () => {
  it("porte les périodes, les sources, et le refus de replier", () => {
    const src = emettreVersionneTs(TARIF, "calculer_montant");
    expect(src).toContain('jour < "2026-01-01"');
    expect(src).toContain('jour >= "2026-01-01"');
    expect(src).toContain("source : grille SNE 2025");
    expect(src).toContain("source : grille SNE 2026");
    // Les deux barèmes sortent, chacun avec ses propres nombres.
    expect(src).toContain("prixUnitaire: 85");
    expect(src).toContain("prixUnitaire: 90");
    expect(src.trimEnd().endsWith("}")).toBe(true);
  });
})
