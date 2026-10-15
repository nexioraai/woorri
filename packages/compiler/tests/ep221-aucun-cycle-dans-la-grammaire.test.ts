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

  it("la masse d'une passe est BORNÉE : un dernier barreau la libère", () => {
    // ── CE QUI A IMPOSÉ CE CONTRÔLE, ET IL A COÛTÉ UNE GÉNÉRATION.
    //
    // Les cycles réparés, `entites` restait refusée : « The compiled grammar
    // is too large ». La sonde a essayé les CINQ barreaux — tous refusés, y
    // compris le plus petit à 7 670 octets.
    //
    // Mesure : UNE union pesait 5 883 octets sur 9 326, soit 63 % — celle de
    // `derived`. Le dernier barreau la rend libre, et la passe tombe sous la
    // seule taille connue comme acceptée (5 168, le socle).
    //
    // Ce contrôle ne fige pas un nombre : il exige que la passe la plus
    // lourde du contrat ait un barreau ACCESSIBLE. Un contrat qui grossirait
    // demain sans que l'échelle suive serait attrapé ici.
    const ladder = makeLevels(grammaireDe(["entities"]), CONTRAINTES_GRAMMAIRE);
    const plusPetit = Math.min(
      ...ladder.map((n) => JSON.stringify(n.schema).length),
    );
    // 5 168 : la seule taille MESURÉE comme acceptée par le service (socle,
    // neuf sections acquises en production). Pas une estimation.
    expect(
      plusPetit,
      `le barreau le plus bas de « entites » pèse ${String(plusPetit)} o — ` +
        "au-dessus de la seule taille connue comme acceptée",
    ).toBeLessThan(5168);
  });

  it("libérer une union ne touche QUE les passes qui en ont une lourde", () => {
    // `actions` porte une union de 2 796 octets et PASSE déjà. La dégrader
    // serait abîmer ce qui marche — le seuil est mesuré pour l'épargner.
    for (const [passe, cles] of Object.entries(PASSES)) {
      if (passe === "entites") continue;
      const ladder = makeLevels(grammaireDe(cles), CONTRAINTES_GRAMMAIRE);
      expect(ladder, `« ${passe} » a gagné un barreau sans raison`).toHaveLength(3);
    }
  });

  it("TOUT objet, à TOUT barreau, déclare `additionalProperties`", () => {
    // ── CE QUI A IMPOSÉ CE CONTRÔLE, ET IL A COÛTÉ UN ALLER-RETOUR.
    //
    // MESURE EN PRODUCTION (2026-10-15) : le barreau le plus bas était refusé
    //   « output_config.format.schema: For 'object' type,
    //     'additionalProperties' must be explicitly [...] »
    // parce que je l'avais fabriqué à la main — `{ type: "object" }` — là où
    // tout le reste vient de zod, qui la pose toujours.
    //
    // Les schémas VENUS du contrat portent cette clé par construction. Seuls
    // ceux que l'échelle FABRIQUE peuvent l'oublier, et c'est exactement ce
    // qui est arrivé. Ce contrôle garde les deux.
    const sansCle = (n: unknown, out: string[] = []): string[] => {
      if (Array.isArray(n)) {
        n.forEach((x) => sansCle(x, out));
        return out;
      }
      if (n !== null && typeof n === "object") {
        const o = n as Record<string, unknown>;
        if (o.type === "object" && o.additionalProperties === undefined) {
          out.push(JSON.stringify(o).slice(0, 80));
        }
        Object.values(o).forEach((v) => sansCle(v, out));
      }
      return out;
    };
    const fautes: string[] = [];
    for (const [passe, cles] of Object.entries(PASSES)) {
      for (const niveau of degradationsPourEchelle(grammaireDe(cles))) {
        for (const f of sansCle(niveau.schema)) {
          fautes.push(`${passe}/${niveau.name} — ${f}`);
        }
      }
    }
    expect(
      fautes,
      `le service refuse un objet sans \`additionalProperties\` : ${fautes.slice(0, 3).join(" · ")}`,
    ).toEqual([]);
  });

  it("une propriété retirée n'est plus EXIGÉE", () => {
    // Un schéma qui réclame ce qu'il n'autorise pas ne se satisfait jamais :
    // le modèle ne pourrait produire aucune sortie valide, et on le
    // découvrirait en 400 après avoir payé l'appel.
    const coherent = (n: unknown): boolean => {
      if (Array.isArray(n)) return n.every(coherent);
      if (n === null || typeof n !== "object") return true;
      const o = n as { properties?: Record<string, unknown>; required?: unknown };
      if (Array.isArray(o.required) && o.properties !== undefined) {
        const connues = Object.keys(o.properties);
        if (!o.required.every((r) => connues.includes(String(r)))) return false;
      }
      return Object.values(o).every(coherent);
    };
    for (const [passe, cles] of Object.entries(PASSES)) {
      for (const niveau of degradationsPourEchelle(grammaireDe(cles))) {
        expect(
          coherent(niveau.schema),
          `${passe}/${niveau.name} exige une propriété qu'il n'autorise pas`,
        ).toBe(true);
      }
    }
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
