// INTÉGRATION MINIMALE P0 (arbitrage post-R3, 2026-09-11) — l'instrument
// du dry-run, SANS exécution (EXECUTION_P0 = 0, prouvé : aucun SDK, rien
// de branché). Le hash du prompt est FIGÉ ici — toute édition devient
// visible, c'est ce qui rend opposable « un FAIL est une information sur
// le contrat, jamais une retouche de prompt ».
import { createHash } from "node:crypto";
import { SOURCE_GENERATEUR } from "./source-generateur.ts";
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
// RE-SCELLEMENT CONSCIENT (post-série, D6 O-1) : le glossaire temporel
// entre au prompt — v1 98014b65… reste l'estampille de la mesure T2
// (EP-032) ; v2 est le prompt des exécutions FUTURES.
//
// RE-SCELLEMENT CONSCIENT v3 (EP-222, 2026-10-15) — v2 76e75ecb… reste
// l'estampille des mesures antérieures. MOTIF, et il est mesuré, pas
// supposé : tir réel `app_generations` b3a37d92, trois refus P0 pour
// 2,4386 $ et rien de produit. Deux juges exigeaient des règles que ce
// prompt n'énonçait JAMAIS — le mot « confirmer » n'y apparaissait pas
// une seule fois, et l'observabilité d'un état n'était exigée que dans
// le point « transition exogène » alors que le juge la veut pour TOUT
// état atteint, geste mutant compris. Le modèle les apprenait par le
// reproche, c'est-à-dire APRÈS un refus payé.
//
// AUCUN JUGE N'A BOUGÉ. Ce qui change est l'enseignement, et c'est bien
// « une information sur le contrat, jamais une retouche de prompt » :
// le contrat disait une chose que le prompt taisait. EP-222 verrouille
// désormais l'accord prose/table — si la table des gestes gagne une
// écriture et que le prompt l'oublie, le cliquet rougit avant le tir.
//
// RE-SCELLEMENT CONSCIENT v4 (EP-231, 2026-10-15) — v3 429a3aff… reste
// l'estampille des mesures de la journee. MOTIF, paye et mesure : le tir
// de 19:10 a refuse au tirage 1 sur `DERIVATION_TRAVERSEE_ACTEUR`, pour
// 0,8397 $, avec ce detail — « ecrans[ecr_entree] : ecran traverse par 2
// acteurs avec surface NON publique ». La regle existait dans le juge et
// se derive de `porteeDe` ; l'invite ne la prononcait NULLE PART. Meme
// famille qu'EP-222 : un juge qui punit ce que la prose n'enseigne pas.
//
// AUCUN JUGE N'A BOUGE. Seul l'enseignement change.
const HASH_PROMPT_FIGE = "5ee9dad3d36a55c977229716cc9f4cd2a03456713313a34cd365c3cf940c1bc8";

describe("intégration minimale P0 — l'instrument, pas l'exécution", () => {
  it("CLIQUET — le hash du prompt est figé", () => {
    expect(createHash("sha256").update(PROMPT_P0).digest("hex")).toBe(HASH_PROMPT_FIGE);
  });

  it("EP-051 · la grammaire du CONTRAT est CANONIQUE — le dialecte n'y a pas fui", () => {
    const source = readFileSync(join(R, "benchmarks", "air-emission", "passe0.mjs"), "utf8");
    expect(source).toContain("z.toJSONSchema(modeleMetierSchema");
    // PREUVE D'IMPOSSIBILITÉ (forme R2) : plus AUCUNE transformation de
    // dialecte dans le module contrat — et la grammaire porte encore ses
    // contraintes PLEINES (min(2) présent, bornes numériques présentes).
    expect(source.includes("clampMinItems")).toBe(false);
    expect(source.includes("stripKeys")).toBe(false);
    const json = JSON.stringify(grammaireP0());
    expect(json).toContain('"couverture"');
    expect(json).toContain('"minItems":2');
    expect(json).toContain('"minimum"');
  });

  it("EP-051 · l'ADAPTATEUR dégrade et DÉCLARE — écarts déclarés ≡ mesurés ≡ épinglés", async () => {
    const adaptateur = await import("../../../benchmarks/air-emission/adaptateur-anthropic.mjs");
    const { grammaire, ecarts } = adaptateur.degraderGrammaire(grammaireP0());
    const json = JSON.stringify(grammaire);
    const minItems = [...json.matchAll(/"minItems":(\d+)/g)].map((x) => Number(x[1]));
    for (const v of minItems) expect(v).toBeLessThanOrEqual(1);
    expect(json.includes('"minimum"')).toBe(false);
    expect(ecarts).toEqual([
      "$.properties.concepts.items.properties.attributs.items.properties.cardinalite.maximum 9007199254740991→retiré",
      "$.properties.concepts.items.properties.attributs.items.properties.cardinalite.minimum 1→retiré",
      "$.properties.parcours.items.properties.etapes.minItems 2→1",
      "$.properties.parcours.items.properties.priorite.maximum 9007199254740991→retiré",
      "$.properties.parcours.items.properties.priorite.minimum 0→retiré",
    ]);
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

  it("passe0 reste PUR (aucun SDK) ; son branchement campagne est FAIL-CLOSED", () => {
    // ÉDITION CONSCIENTE (R5, EP-055/EP-027a) : l'invariant « rien n'est
    // branché » valait pour la passe INSTRUMENT — R5 ordonne le câblage.
    // Ce qui reste invariant : passe0 ne touche AUCUN SDK/réseau (le
    // dialecte vit dans l'adaptateur), et le branchement s'arrête AVANT
    // les passes AIR sur refus de P1 (testé aussi dans r5-prescriptions).
    const source = readFileSync(join(R, "benchmarks", "air-emission", "passe0.mjs"), "utf8");
    for (const interdit of ["anthropic", "Anthropic", "fetch(", "node:http", "@anthropic"]) {
      expect(source.includes(interdit), interdit).toBe(false);
    }
    const emitV3 = SOURCE_GENERATEUR;
    expect(emitV3).toContain("intention arrêtée AVANT les passes AIR");
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
    // §2 — la TRONCATURE est DISTINCTE du JSON malformé : signal neutre,
    // prioritaire (même un JSON valide-par-chance coupé est un artefact).
    const tronquee = jugerSortieP0(JSON.stringify(structuredClone(FIXTURE)), "brief", { tronquee: true });
    expect(tronquee.ok).toBe(false);
    expect(tronquee.diagnostics[0]?.code).toBe("P0_SORTIE_TRONQUEE");
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
