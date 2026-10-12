/**
 * LES EXPRESSIONS, PROUVÉES SUR LE CAHIER QUI LES A RENDUES NÉCESSAIRES.
 *
 * Ce qui bloquait l'application entière n'était pas exotique : une
 * SOUSTRACTION. Et sur neuf anomalies demandées, une seule était
 * exprimable. Ces tests montrent que la classe entière est couverte —
 * pas un cas particulier de plus.
 */
import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  emettreCalculTs,
  evaluerExpression,
  PRELUDE_EXPRESSION,
  type Expression,
} from "../src/expression.ts";

const champ = (fieldId: string): Expression => ({ kind: "champ", fieldId });
const cte = (valeur: number): Expression => ({ kind: "constante", valeur });
const op = (o: "+" | "-" | "*" | "/", g: Expression, d: Expression): Expression => ({
  kind: "operation", op: o, gauche: g, droite: d,
});

/**
 * ÉVALUE LE CODE ÉMIS — EN L'IMPORTANT VRAIMENT.
 *
 * Il était d'abord décapé de ses types par des expressions régulières :
 * fragile, et ça a casse des la premiere aide ajoutee. On l'ecrit
 * maintenant dans un vrai fichier TypeScript que le lanceur compile —
 * donc on exerce EXACTEMENT ce que le projet livre recevrait, pas une
 * approximation.
 */
let n = 0;
const viaCodeEmis = async (
  e: Expression,
  ligne: Record<string, unknown>,
): Promise<number | null> => {
  const dossier = join(dirname(fileURLToPath(import.meta.url)), ".emis");
  mkdirSync(dossier, { recursive: true });
  const fichier = join(dossier, `calcul-${String(n++)}.generated.ts`);
  writeFileSync(fichier, PRELUDE_EXPRESSION + emettreCalculTs(e, "calculer"));
  const m = (await import(fichier)) as { calculer: (l: Record<string, unknown>) => number | null };
  return m.calculer(ligne);
};

describe("ce qui bloquait tout : une soustraction", () => {
  const conso = op("-", champ("index_nouveau"), champ("index_ancien"));

  it("consommation = nouvel index − ancien index", async () => {
    const ligne = { index_nouveau: 1190, index_ancien: 1000 };
    expect(evaluerExpression(conso, ligne)).toBe(190);
    expect(await viaCodeEmis(conso, ligne)).toBe(190);
  });

  it("un index qui recule donne un écart négatif — l’anomalie devient visible", () => {
    // « Index nouveau inférieur à l'index précédent » : première des neuf
    // anomalies, et elle était inexprimable. Elle se réduit maintenant à
    // une règle « écart ≥ 0 », qui existait déjà.
    expect(evaluerExpression(conso, { index_nouveau: 900, index_ancien: 1000 })).toBe(-100);
  });
});

describe("les comparaisons entre deux champs, enfin possibles", () => {
  it("écart entre montant facturé et montant théorique", async () => {
    const ecart = op("-", champ("montant_sne"), champ("montant_theorique"));
    const ligne = { montant_sne: 19277, montant_theorique: 18152 };
    expect(evaluerExpression(ecart, ligne)).toBe(1125);
    expect(await viaCodeEmis(ecart, ligne)).toBe(1125);
  });

  it("kWh facturés contre la différence des index", () => {
    const e = op("-", champ("kwh_factures"), op("-", champ("idx_fin"), champ("idx_debut")));
    expect(evaluerExpression(e, { kwh_factures: 200, idx_fin: 1190, idx_debut: 1000 })).toBe(10);
  });

  it("une expression composée — énergie + frais", async () => {
    const e = op("+", op("*", champ("kwh"), cte(125)), cte(402));
    const ligne = { kwh: 151 };
    expect(evaluerExpression(e, ligne)).toBe(19277);
    expect(await viaCodeEmis(e, ligne)).toBe(19277);
  });
});

describe("une valeur manquante CONTAMINE — et c’est voulu", () => {
  const conso = op("-", champ("a"), champ("b"));

  it("un champ absent rend null, jamais un chiffre", async () => {
    // Un écart calculé avec un index absent donnerait un chiffre faux qui
    // a l'air juste. C'est pire que pas de chiffre du tout.
    for (const ligne of [{ a: 10 }, { a: 10, b: null }, { a: 10, b: "x" }, {}]) {
      expect(evaluerExpression(conso, ligne as Record<string, number>)).toBeNull();
      expect(await viaCodeEmis(conso, ligne as Record<string, unknown>)).toBeNull();
    }
  });

  it("une division par zéro rend null, PAS l’infini", async () => {
    // L'infini s'affiche, se stocke, et contamine tout ce qu'il touche.
    const d = op("/", champ("a"), champ("b"));
    expect(evaluerExpression(d, { a: 10, b: 0 })).toBeNull();
    expect(await viaCodeEmis(d, { a: 10, b: 0 })).toBeNull();
    expect(evaluerExpression(d, { a: 10, b: 4 })).toBe(2.5);
  });

  it("la contamination traverse les niveaux", async () => {
    const profond = op("+", cte(1), op("*", cte(2), op("-", champ("manquant"), cte(3))));
    expect(evaluerExpression(profond, {})).toBeNull();
    expect(await viaCodeEmis(profond, {})).toBeNull();
  });
});

describe("« 2 % par jour de retard » — l’exemple que le contrat écartait", () => {
  // Cahier d'une tontine : « Pénalité de retard calculée à 2 % par jour de
  // retard, ventilée 70 % au groupe / 30 % au créateur ». Le contrat
  // l'écartait en invoquant une horloge. Or il n'y en a pas : on compte
  // entre DEUX CHAMPS DE LA LIGNE.
  const retard: Expression = { kind: "jours", de: "echeance", a: "paye_le" };
  const penalite = op("*", op("*", champ("cotisation"), cte(0.02)), retard);

  it("trois jours de retard sur 10 000 XAF = 600 XAF", async () => {
    const ligne = { cotisation: 10000, echeance: "2026-09-14", paye_le: "2026-09-17" };
    expect(evaluerExpression(penalite, ligne as never)).toBe(600);
    expect(await viaCodeEmis(penalite, ligne)).toBe(600);
  });

  it("la ventilation 70 / 30 suit", () => {
    const ligne = { cotisation: 10000, echeance: "2026-09-14", paye_le: "2026-09-17" };
    expect(evaluerExpression(op("*", penalite, cte(0.7)), ligne as never)).toBe(420);
    expect(evaluerExpression(op("*", penalite, cte(0.3)), ligne as never)).toBe(180);
  });

  it("un paiement EN AVANCE donne un nombre négatif, pas zéro", () => {
    // Confondre « en avance » et « zéro jour de retard » ferait disparaître
    // l'information. C'est à la règle de décider quoi en faire.
    const ligne = { cotisation: 10000, echeance: "2026-09-14", paye_le: "2026-09-12" };
    expect(evaluerExpression(retard, ligne as never)).toBe(-2);
  });

  it("deux horodatages du MÊME jour donnent zéro", () => {
    // Une pénalité se compte en jours, pas en heures.
    const ligne = { echeance: "2026-09-14T08:00:00Z", paye_le: "2026-09-14T23:59:00Z" };
    expect(evaluerExpression(retard, ligne as never)).toBe(0);
  });

  it("une date absente ou illisible rend AUCUNE valeur", () => {
    for (const paye of [undefined, null, "", "hier", 42]) {
      expect(evaluerExpression(retard, { echeance: "2026-09-14", paye_le: paye } as never)).toBeNull();
    }
  });

  it("PAS D’HORLOGE : la même ligne donne toujours le même nombre", async () => {
    const ligne = { echeance: "2020-01-01", paye_le: "2020-01-11" };
    expect(evaluerExpression(retard, ligne as never)).toBe(10);
    expect(await viaCodeEmis(retard, ligne)).toBe(10);
  });
})
