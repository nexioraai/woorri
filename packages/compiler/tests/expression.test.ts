/**
 * LES EXPRESSIONS, PROUVÉES SUR LE CAHIER QUI LES A RENDUES NÉCESSAIRES.
 *
 * Ce qui bloquait l'application entière n'était pas exotique : une
 * SOUSTRACTION. Et sur neuf anomalies demandées, une seule était
 * exprimable. Ces tests montrent que la classe entière est couverte —
 * pas un cas particulier de plus.
 */
import { describe, expect, it } from "vitest";
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

/** Évalue le code ÉMIS — une référence juste et un code faux donnerait une
 *  application fausse, et c'est le seul défaut qui compte vraiment. */
const viaCodeEmis = (e: Expression, ligne: Record<string, unknown>): number | null => {
  const src = (PRELUDE_EXPRESSION + emettreCalculTs(e, "calculer"))
    .replace(/^export function/mu, "function")
    .replace(/type Nb = number \| null;\n/u, "")
    .replace(/: Nb\b/gu, "")
    .replace(/\(v: unknown\)/u, "(v)")
    .replace(/\(a, b, o: "\+" \| "-" \| "\*"\)/u, "(a, b, o)")
    .replace(/\(ligne: Record<string, unknown>\): number \| null/u, "(ligne)");
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const f = Function(`${src}\nreturn calculer;`) as () => (l: Record<string, unknown>) => number | null;
  return f()(ligne);
};

describe("ce qui bloquait tout : une soustraction", () => {
  const conso = op("-", champ("index_nouveau"), champ("index_ancien"));

  it("consommation = nouvel index − ancien index", () => {
    const ligne = { index_nouveau: 1190, index_ancien: 1000 };
    expect(evaluerExpression(conso, ligne)).toBe(190);
    expect(viaCodeEmis(conso, ligne)).toBe(190);
  });

  it("un index qui recule donne un écart négatif — l’anomalie devient visible", () => {
    // « Index nouveau inférieur à l'index précédent » : première des neuf
    // anomalies, et elle était inexprimable. Elle se réduit maintenant à
    // une règle « écart ≥ 0 », qui existait déjà.
    expect(evaluerExpression(conso, { index_nouveau: 900, index_ancien: 1000 })).toBe(-100);
  });
});

describe("les comparaisons entre deux champs, enfin possibles", () => {
  it("écart entre montant facturé et montant théorique", () => {
    const ecart = op("-", champ("montant_sne"), champ("montant_theorique"));
    const ligne = { montant_sne: 19277, montant_theorique: 18152 };
    expect(evaluerExpression(ecart, ligne)).toBe(1125);
    expect(viaCodeEmis(ecart, ligne)).toBe(1125);
  });

  it("kWh facturés contre la différence des index", () => {
    const e = op("-", champ("kwh_factures"), op("-", champ("idx_fin"), champ("idx_debut")));
    expect(evaluerExpression(e, { kwh_factures: 200, idx_fin: 1190, idx_debut: 1000 })).toBe(10);
  });

  it("une expression composée — énergie + frais", () => {
    const e = op("+", op("*", champ("kwh"), cte(125)), cte(402));
    const ligne = { kwh: 151 };
    expect(evaluerExpression(e, ligne)).toBe(19277);
    expect(viaCodeEmis(e, ligne)).toBe(19277);
  });
});

describe("une valeur manquante CONTAMINE — et c’est voulu", () => {
  const conso = op("-", champ("a"), champ("b"));

  it("un champ absent rend null, jamais un chiffre", () => {
    // Un écart calculé avec un index absent donnerait un chiffre faux qui
    // a l'air juste. C'est pire que pas de chiffre du tout.
    for (const ligne of [{ a: 10 }, { a: 10, b: null }, { a: 10, b: "x" }, {}]) {
      expect(evaluerExpression(conso, ligne as Record<string, number>)).toBeNull();
      expect(viaCodeEmis(conso, ligne as Record<string, unknown>)).toBeNull();
    }
  });

  it("une division par zéro rend null, PAS l’infini", () => {
    // L'infini s'affiche, se stocke, et contamine tout ce qu'il touche.
    const d = op("/", champ("a"), champ("b"));
    expect(evaluerExpression(d, { a: 10, b: 0 })).toBeNull();
    expect(viaCodeEmis(d, { a: 10, b: 0 })).toBeNull();
    expect(evaluerExpression(d, { a: 10, b: 4 })).toBe(2.5);
  });

  it("la contamination traverse les niveaux", () => {
    const profond = op("+", cte(1), op("*", cte(2), op("-", champ("manquant"), cte(3))));
    expect(evaluerExpression(profond, {})).toBeNull();
    expect(viaCodeEmis(profond, {})).toBeNull();
  });
});
