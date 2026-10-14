// EP-221 — AUCUNE GRAMMAIRE ENVOYÉE AU SERVICE NE SE CITE ELLE-MÊME.
//
// ── CE QUI A IMPOSÉ CE CLIQUET, ET IL A COÛTÉ UNE GÉNÉRATION ENTIÈRE.
//
// 2026-10-14, génération réelle du propriétaire, refusée en 400 :
//
//   « output_config.format.schema: Invalid schema: Circular reference
//     detected in schema definition »
//
// Le contrat dit « une opération, c'est deux expressions ». C'est une
// récursion parfaitement légitime — et le service de sorties structurées la
// refuse, à TOUS les niveaux de dégradation.
//
// ── POURQUOI PERSONNE NE L'AVAIT VU.
//
// L'écart existait depuis que les expressions sont entrées au contrat. Entre
// cette date et ce jour, AUCUNE génération n'avait tourné. Le défaut était
// écrit, jamais exercé — la famille de défauts la plus chère de ce dépôt,
// parce qu'elle ne se découvre qu'en payant.
//
// ── CE QUE CE CLIQUET VÉRIFIE, ET POURQUOI C'EST LE BON ENDROIT.
//
// Il ne mesure pas la correction : il mesure la PROPRIÉTÉ que le service
// exige. Toute passe, à tout barreau de son échelle, doit être sans cycle.
// Un contrat qui ajouterait demain une seconde récursion — une condition
// imbriquée, un bloc qui contient des blocs — serait attrapé ici, sans que
// personne pense à revenir.
//
// Les passes sont DÉRIVÉES du contrat, jamais recopiées : une passe ajoutée
// au moteur entre dans ce contrôle toute seule.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { projectAirSchema } from "@deribfy/air-schema";
import {
  definitionsCycliques,
  deroulerCycles,
  makeLevels,
} from "../../../benchmarks/air-emission/schema-levels.mjs";
import {
  CONTRAINTES_GRAMMAIRE,
  degradationsPourEchelle,
} from "../../../benchmarks/air-emission/adaptateur-anthropic.mjs";

/** Les découpes de passes du moteur, telles que `emission-coeur` les déclare. */
const PASSES: Readonly<Record<string, readonly string[]>> = {
  socle: [
    "app",
    "projectId",
    "airSchemaVersion",
    "design",
    "network",
    "native",
    "compliance",
    "backend",
    "navigation",
  ],
  entites: ["entities"],
  donnees: ["relations", "datasets", "rules", "slots"],
  capacites: ["capabilities", "permissions", "access"],
  ecrans: ["screens"],
  actions: ["actions"],
  cablage: ["expectedTests", "integrations"],
  intention: ["intent"],
};

const grammaireDe = (cles: readonly string[]): unknown =>
  z.toJSONSchema(
    projectAirSchema.pick(Object.fromEntries(cles.map((k) => [k, true])) as never),
    { target: "draft-2020-12" },
  );

/** Une définition qui se cite elle-même, où qu'elle soit dans l'arbre. */
const porteUnCycle = (schema: unknown): boolean => definitionsCycliques(schema).length > 0;

describe("EP-221 · aucune grammaire envoyée au service ne se cite elle-même", () => {
  it("TOUTE passe, à TOUT barreau de son échelle, est sans cycle", () => {
    const fautes: string[] = [];
    for (const [passe, cles] of Object.entries(PASSES)) {
      for (const niveau of degradationsPourEchelle(grammaireDe(cles))) {
        if (porteUnCycle(niveau.schema)) {
          fautes.push(`${passe} · barreau « ${niveau.name} »`);
        }
      }
    }
    expect(
      fautes,
      `grammaires circulaires — le service les refuse en 400 : ${fautes.join(", ")}`,
    ).toEqual([]);
  });

  it("le contrat, LUI, garde le droit d'être récursif", () => {
    // La frontière d'EP-049, et elle compte : aplatir la récursion dans
    // `air.ts` mutilerait le format pour satisfaire un fournisseur. Le cycle
    // DOIT exister côté contrat, et disparaître côté dialecte.
    expect(porteUnCycle(grammaireDe(["entities"]))).toBe(true);
  });

  it("l'écart est DÉCLARÉ, pas découvert appel après appel", () => {
    // Même règle qu'EP-151 : ce que le dialecte refuse se déclare une fois.
    expect(CONTRAINTES_GRAMMAIRE.referencesCirculairesSupportees).toBe(false);
  });

  it("dérouler ACCEPTE exactement la profondeur demandée, et pas une de plus", () => {
    // La propriété qui compte vraiment : le déroulage n'est fidèle que s'il
    // accepte p0..pN et refuse p(N+1). Vérifié ici sur la STRUCTURE — le
    // niveau le plus profond ne doit plus porter de branche récursive.
    const profond = (n: unknown, d = 0): number => {
      if (Array.isArray(n)) return n.reduce<number>((a, x) => Math.max(a, profond(x, d)), d);
      if (n !== null && typeof n === "object") {
        const o = n as Record<string, unknown>;
        const props = o.properties as { kind?: { const?: unknown } } | undefined;
        const estOperation = props?.kind?.const === "operation";
        return Object.values(o).reduce<number>(
          (a, v) => Math.max(a, profond(v, d + (estOperation ? 1 : 0))),
          d + (estOperation ? 1 : 0),
        );
      }
      return d;
    };
    const brut = grammaireDe(["entities"]);
    for (const p of [0, 1, 2, 3]) {
      const deroule = deroulerCycles(brut, p);
      expect(porteUnCycle(deroule), `profondeur ${String(p)}`).toBe(false);
      // `operation` apparaît exactement p fois imbriquées — le dernier niveau
      // n'en porte plus, c'est ce qui clôt le déroulage.
      expect(profond(deroule), `profondeur ${String(p)}`).toBe(p);
    }
  });

  it("dérouler REFUSE une récursion qu'on ne peut pas clore", () => {
    // Contrôle négatif : une définition qui se cite elle-même SANS branche
    // terminale ne peut pas être déroulée — la clore produirait un schéma que
    // rien ne satisfait. On lève plutôt que d'émettre l'impossible, parce
    // qu'un schéma impossible se découvre en 400, loin d'ici, et coûte un
    // appel.
    const impossible = {
      $defs: {
        boucle: {
          oneOf: [
            { type: "object", properties: { a: { $ref: "#/$defs/boucle" } } },
            { type: "object", properties: { b: { $ref: "#/$defs/boucle" } } },
          ],
        },
      },
      $ref: "#/$defs/boucle",
    };
    expect(() => deroulerCycles(impossible, 2)).toThrow(/AUCUNE branche non recursive/u);
  });

  it("une échelle SANS cycle ne gagne aucun barreau", () => {
    // Les barreaux de profondeur coûtent une sonde chacun. Les ajouter à une
    // passe qui n'a pas de cycle donnait deux barreaux IDENTIQUES — mesuré et
    // corrigé le jour même.
    const sansCycle = makeLevels(grammaireDe(["screens"]), CONTRAINTES_GRAMMAIRE);
    const tailles = sansCycle.map((n) => JSON.stringify(n.schema).length);
    expect(sansCycle).toHaveLength(3);
    expect(new Set(tailles).size, "deux barreaux identiques gaspillent une sonde").toBe(
      tailles.length,
    );
  });
});
