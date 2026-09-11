// INTÉGRATION MINIMALE P0 (arbitrage post-R3, 2026-09-11) — l'instrument
// du dry-run, SANS exécution (EXECUTION_P0 = 0, prouvé : aucun SDK, rien
// de branché). Le hash du prompt est FIGÉ ici — toute édition devient
// visible, c'est ce qui rend opposable « un FAIL est une information sur
// le contrat, jamais une retouche de prompt ».
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  construireRequeteP0,
  critereDryRunKaviva,
  grammaireP0,
  jugerSortieP0,
  PROMPT_P0,
} from "../../../benchmarks/air-emission/passe0.mjs";
import {
  GESTES,
  migrerModele,
  NATURES_ATTRIBUT,
  RAISONS_NON_RETENUE,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const FIXTURE = migrerModele(
  JSON.parse(readFileSync(join(R, "slices", "kaviva", "kaviva-modele.json"), "utf8")),
) as ModeleMetier;

// HASH FIGÉ (consigné au registre EP-031) — édition = échec visible.
const HASH_PROMPT_FIGE = "98014b65bf4a19385bcb1612c4e8178afed9a458fb7479863b8859b6cbab8428";

describe("intégration minimale P0 — l'instrument, pas l'exécution", () => {
  it("CLIQUET — le hash du prompt est figé", () => {
    expect(createHash("sha256").update(PROMPT_P0).digest("hex")).toBe(HASH_PROMPT_FIGE);
  });

  it("la grammaire est DÉRIVÉE du contrat (pas dupliquée) et acceptable par l'API", () => {
    const source = readFileSync(join(R, "benchmarks", "air-emission", "passe0.mjs"), "utf8");
    expect(source).toContain("z.toJSONSchema(modeleMetierSchema");
    expect(source).toContain("clampMinItems");
    const g = grammaireP0();
    const json = JSON.stringify(g);
    // couverture est EXIGÉE par la grammaire ; aucun minItems > 1 (EP-021).
    expect(json).toContain('"couverture"');
    const minItems = [...json.matchAll(/"minItems":(\d+)/g)].map((m) => Number(m[1]));
    expect(minItems.length).toBeGreaterThan(0);
    for (const v of minItems) expect(v).toBeLessThanOrEqual(1);
    expect(json.includes("maxItems")).toBe(false);
  });

  it("le prompt interpole le CONTRAT (une source) : gestes, raisons, natures", () => {
    for (const geste of GESTES) expect(PROMPT_P0).toContain(geste);
    for (const raison of RAISONS_NON_RETENUE) expect(PROMPT_P0).toContain(raison);
    for (const nature of NATURES_ATTRIBUT) expect(PROMPT_P0).toContain(nature);
    expect(PROMPT_P0).toContain("ambigu » ne classe pas : il BLOQUE");
  });

  it("SCAN ANTI-SECTEUR sur le prompt + AUCUN nom d'app (la fixture n'a pas fui)", () => {
    const bas = PROMPT_P0.toLowerCase();
    for (const interdit of [
      "marketplace", "restaurant", "boutique", "social", "education", "éducation",
      "livraison", "automobile", "saas", "hotel", "hôtel", "immobilier",
      "réservation", "reservation",
      "kaviva", "dougplace", "marketa", "soin", "créneau", "creneau", "rendez-vous",
    ]) {
      // MOTS ENTIERS : « besoin » contient « soin » — un scan par sous-chaîne
      // produirait de faux positifs, pas des preuves.
      const motEntier = new RegExp(`(^|[^\\p{L}-])${interdit}($|[^\\p{L}-])`, "u");
      expect(motEntier.test(bas), `fuite : « ${interdit} »`).toBe(false);
    }
  });

  it("RIEN N'EST BRANCHÉ : emit-v3 n'importe pas passe0 ; passe0 n'importe aucun SDK", () => {
    const emitV3 = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(emitV3.includes("passe0")).toBe(false);
    const source = readFileSync(join(R, "benchmarks", "air-emission", "passe0.mjs"), "utf8");
    for (const interdit of ["anthropic", "Anthropic", "fetch(", "node:http"]) {
      expect(source.includes(interdit), interdit).toBe(false);
    }
  });

  it("FAIL-CLOSED — sortie sans couverture : REFUSÉE, jamais complétée par défaut", () => {
    const sans = { ...structuredClone(FIXTURE) } as Record<string, unknown>;
    delete sans.couverture;
    const verdict = jugerSortieP0(JSON.stringify(sans), "brief quelconque");
    expect(verdict.ok).toBe(false);
    expect(verdict.modele).toBeUndefined();
    expect(verdict.diagnostics.length).toBeGreaterThan(0);
    const nonJson = jugerSortieP0("pas du json", "brief");
    expect(nonJson.ok).toBe(false);
    expect(nonJson.diagnostics[0]?.code).toBe("P0_SORTIE_NON_JSON");
  });

  it("CRITÈRE 2.1 CALIBRÉ — la fixture manuelle PASSE (structurel, pas nominal) ; mutations : échec", () => {
    const calibrage = critereDryRunKaviva(FIXTURE);
    expect(calibrage.pass, JSON.stringify(calibrage.trouves)).toBe(true);
    // (ii) sans intervalle : la ressource temporelle disparaît.
    const sansIntervalle = structuredClone(FIXTURE);
    for (const c of sansIntervalle.concepts) {
      c.attributs = (c.attributs ?? []).map((a) =>
        a.nature === "intervalle" ? { ...a, nature: "date" as const } : a,
      );
    }
    expect(critereDryRunKaviva(sansIntervalle).pass).toBe(false);
    // (iii) sans états : l'engagement disparaît.
    const sansEtats = structuredClone(FIXTURE);
    for (const c of sansEtats.concepts) delete c.etats;
    expect(critereDryRunKaviva(sansEtats).pass).toBe(false);
  });

  it("OBSERVATION 2.3 — enregistrée, non jugée : le déversement se MESURE", () => {
    const brief = "les personnes veulent parcourir des objets et retrouver leurs dossiers";
    const sortie = structuredClone(FIXTURE);
    const verdictPropre = jugerSortieP0(JSON.stringify(sortie), brief);
    expect(verdictPropre.observation).toBeDefined();
    // Déversement : tout l'inventaire poussé en nonRetenus.
    const deverse = structuredClone(FIXTURE);
    deverse.couverture.nonRetenus = [
      { terme: "parcourir des objets et retrouver leurs dossiers personnes", raison: "hors_perimetre_mobile" },
    ];
    const verdictDeverse = jugerSortieP0(JSON.stringify(deverse), brief);
    expect(verdictDeverse.observation).toBeDefined();
    const a = verdictPropre.observation?.partInventaireEnNonRetenus ?? 0;
    const b = verdictDeverse.observation?.partInventaireEnNonRetenus ?? 0;
    expect(b).toBeGreaterThan(a);
    // et le PASS/FAIL n'en dépend PAS (non jugée) :
    expect(verdictDeverse.ok).toBe(verdictPropre.ok);
  });

  it("la requête assemble système + brief + grammaire — sans rien exécuter", () => {
    const req = construireRequeteP0("un brief");
    expect(req.system).toBe(PROMPT_P0);
    expect(req.user).toContain("un brief");
    expect(req.grammaire).toBeDefined();
  });
});
