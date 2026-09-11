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
import { z } from "zod";
import {
  GESTES,
  migrerModele,
  modeleMetierSchema,
  NATURES_ATTRIBUT,
  RAISONS_NON_RETENUE,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const zToJson = (): unknown =>
  z.toJSONSchema(modeleMetierSchema as never, { target: "draft-2020-12" });

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const FIXTURE = migrerModele(
  JSON.parse(readFileSync(join(R, "slices", "kaviva", "kaviva-modele.json"), "utf8")),
) as ModeleMetier;

// HASH FIGÉ (consigné au registre EP-031) — édition = échec visible.
// RE-SCELLEMENT CONSCIENT (post-série, D6 O-1) : le glossaire temporel
// entre au prompt — v1 98014b65… reste l'estampille de la mesure T2
// (EP-032) ; v2 est le prompt des exécutions FUTURES.
const HASH_PROMPT_FIGE = "7ece34cbabc048c6bf38b3d4632cb8c87d0757edcc58c56a0111a2336868643d";

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

  it("§2 post-matrice — la règle O-2 du prompt est DÉRIVÉE de la table des gestes", async () => {
    const { TABLE_GESTES } = await import("../../../benchmarks/air-emission/modele-metier.mjs");
    const mutants = Object.entries(TABLE_GESTES)
      .filter(([, v]) => (v as { effet: string | null }).effet === "mutation")
      .map(([k]) => k);
    expect(mutants.length).toBeGreaterThan(2);
    expect(PROMPT_P0).toContain("gestes mutants (dérivés de la table) : " + mutants.join(", "));
    expect(PROMPT_P0).toContain("ne transitent jamais un état");
  });

  it("le prompt interpole le CONTRAT (une source) : gestes, raisons, natures", () => {
    for (const geste of GESTES) expect(PROMPT_P0).toContain(geste);
    for (const raison of RAISONS_NON_RETENUE) expect(PROMPT_P0).toContain(raison);
    for (const nature of NATURES_ATTRIBUT) expect(PROMPT_P0).toContain(nature);
    expect(PROMPT_P0).toContain("ambigu » ne classe pas : il BLOQUE");
  });

  // V-C — le scan est BORNÉ : normalisation (NFD, minuscules) puis détection
  // au DÉBUT DE MOT avec suffixe morphologique libre — « réservations »,
  // « hôtelière », « livraisons » sont détectés comme leur forme de base ;
  // « besoin » ne matche toujours pas « soin » (frontière de début de mot).
  const normaliserScan = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const TERMES_INTERDITS = [
    "marketplace", "restaurant", "boutique", "social", "education",
    "livraison", "automobile", "saas", "hotel", "immobilier", "reservation",
    "kaviva", "dougplace", "marketa", "soin", "creneau", "rendez-vous",
  ];
  const fuiteDetectee = (texte: string, terme: string): boolean => {
    const base = normaliserScan(terme);
    return new RegExp(`(^|[^a-z-])${base}[a-z]*`).test(normaliserScan(texte));
  };

  it("V-C · SCAN ANTI-SECTEUR/ANTI-FUITE sur le prompt (normalisé, morphologique)", () => {
    for (const interdit of TERMES_INTERDITS) {
      expect(fuiteDetectee(PROMPT_P0, interdit), `fuite : « ${interdit} »`).toBe(false);
    }
  });

  it("V-C · CONTRÔLES NÉGATIFS — les variantes morphologiques SONT détectées", () => {
    expect(fuiteDetectee("gérer les réservations du salon", "reservation")).toBe(true);
    expect(fuiteDetectee("une offre hôtelière complète", "hotel")).toBe(true);
    expect(fuiteDetectee("suivre les livraisons", "livraison")).toBe(true);
    expect(fuiteDetectee("les soins du visage", "soin")).toBe(true);
    expect(fuiteDetectee("choisir des créneaux", "creneau")).toBe(true);
    // et les faux positifs d'hier restent exclus :
    expect(fuiteDetectee("le besoin du client", "soin")).toBe(false);
    expect(fuiteDetectee("association de quartier", "social")).toBe(false);
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

  it("V-A · CLIQUET — l'écart contrat/grammaire est EXACTEMENT énuméré", () => {
    // Le clamp relâche la grammaire ; chaque relâchement DOIT être listé ici
    // et refermé par un test de refus P1 (ci-dessous). Une contrainte min(N)
    // ajoutée au contrat sans sa paire de tests fera échouer ce cliquet.
    const brut = zToJson();
    const clampe = grammaireP0();
    const ecarts: string[] = [];
    const marcher = (a: unknown, b: unknown, chemin: string) => {
      if (a === null || typeof a !== "object") return;
      for (const k of Object.keys(a)) {
        const av = (a as Record<string, unknown>)[k];
        const bv = (b as Record<string, unknown> | undefined)?.[k];
        if (k === "minItems" && av !== bv) ecarts.push(`${chemin}.minItems ${String(av)}→${String(bv)}`);
        else if (["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"].includes(k) && bv === undefined)
          ecarts.push(`${chemin}.${k} ${String(av)}→retiré`);
        else if (typeof av === "object") marcher(av, bv, `${chemin}.${k}`);
      }
    };
    marcher(brut, clampe, "$");
    expect(ecarts.sort()).toEqual([
      // EP-033-ter — l'API refuse les bornes numériques sur les entiers :
      // retirées de la GRAMMAIRE, tenues par le CONTRAT (refus P1 ci-dessous).
      // (les maximum MAX_SAFE_INTEGER viennent de z.int() lui-même — retirés
      // au même titre, refermés par le même schéma strict.)
      "$.properties.concepts.items.properties.attributs.items.properties.cardinalite.maximum 9007199254740991→retiré",
      "$.properties.concepts.items.properties.attributs.items.properties.cardinalite.minimum 1→retiré",
      "$.properties.parcours.items.properties.etapes.minItems 2→1",
      "$.properties.parcours.items.properties.priorite.maximum 9007199254740991→retiré",
      "$.properties.parcours.items.properties.priorite.minimum 0→retiré",
    ]);
  });

  it("V-A · REFUS — une sortie conforme à la grammaire mais violant le contrat (1 étape) est REFUSÉE par P1", () => {
    const sortie = structuredClone(FIXTURE);
    const p0 = sortie.parcours[0];
    if (p0) p0.etapes = p0.etapes.slice(0, 1); // admis par la grammaire clampée (minItems 1)
    const verdict = jugerSortieP0(JSON.stringify(sortie), "brief");
    expect(verdict.ok).toBe(false);
    expect(verdict.modele).toBeUndefined();
    const schema = verdict.diagnostics.find((d) => d.code === "MODELE_SCHEMA");
    expect(schema?.path).toContain("etapes");
  });

  it("V-A · REFUS — une cardinalite hors borne (admise par la grammaire) est REFUSÉE par P1", () => {
    const sortie = structuredClone(FIXTURE);
    const soin = sortie.concepts.find((c) => c.id === "cpt_soin");
    if (soin?.attributs?.[0]) soin.attributs[0].cardinalite = 0;
    const verdict = jugerSortieP0(JSON.stringify(sortie), "brief");
    expect(verdict.ok).toBe(false);
    expect(verdict.diagnostics.some((d) => d.code === "MODELE_SCHEMA" && d.path.includes("cardinalite"))).toBe(true);
  });

  it("la requête assemble système + brief + grammaire — sans rien exécuter", () => {
    const req = construireRequeteP0("un brief");
    expect(req.system).toBe(PROMPT_P0);
    expect(req.user).toContain("un brief");
    expect(req.grammaire).toBeDefined();
  });
});
