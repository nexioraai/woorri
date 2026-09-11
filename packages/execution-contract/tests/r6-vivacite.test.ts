// R6 (EP-062) — PREUVES DU JUGE UNIFIÉ DE VIVACITÉ.
//
// LA preuve qui compte : le run archivé de la campagne EP-061 (attempt2,
// scellé par son nom de run) re-jugé par R6 rend ROUGE sur les SIX défauts
// consignés — s'il rendait vert, R6 ne jugerait rien. Puis chaque juge est
// prouvé par MUTATION ISOLÉE sur BASE VERTE (EP-028), diagnostic nommé exact.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EXECUTION_ENVELOPE_V1 } from "../src/envelope.ts";
import { jugerAttestations, jugerVivacite } from "../src/vivacite.ts";
// Le plan P2d vit dans le contrat modèle-métier : les arcs prescrits du run
// sont DÉRIVÉS du modèle P0 archivé, jamais recopiés à la main.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — module .mjs du banc, typé par son ombre .d.mts
import { ecranAirDe, ecransDe } from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const RESULTS = join(R, "benchmarks", "air-emission", "results");
const RUN = "kaviva-spa.2026-09-11T14-40-13-653Z";

type AirDoc = Parameters<typeof jugerVivacite>[0];
const lireAir = (): AirDoc =>
  JSON.parse(readFileSync(join(RESULTS, `${RUN}.attempt2.air.json`), "utf8")) as AirDoc;
const MODELE = JSON.parse(
  readFileSync(join(RESULTS, `${RUN}.modele-p0.air.json`), "utf8"),
) as never;
const JOURNAL = JSON.parse(
  readFileSync(join(RESULTS, `campagne-v2-2026-09-11T14-40-13-653Z.jsonl`), "utf8"),
) as { roundTrip?: unknown };

const ARCS = (ecransDe(MODELE).navigation.arcs as { de: string; vers: string }[]).map((a) => ({
  de: ecranAirDe(a.de),
  vers: ecranAirDe(a.vers),
}));
const OPTIONS = { arcsPrescrits: ARCS, commerceAttendu: "physical_or_offapp" };
const juger = (air: AirDoc) => jugerVivacite(air, EXECUTION_ENVELOPE_V1, OPTIONS);
const codesDe = (air: AirDoc) => juger(air).map((f) => f.code);

describe("LA preuve — le run archivé re-jugé par R6 rend ROUGE sur les six défauts", () => {
  const findings = juger(lireAir());
  const codes = findings.map((f) => f.code);
  const paths = (code: string) => findings.filter((f) => f.code === code).map((f) => f.path);

  it("① l'écran mort est NOMMÉ, et sa cause (déclencheurs data) avec lui", () => {
    expect(paths("VIVACITE_ECRAN_INATTEIGNABLE")).toEqual(["screens[scr_cpt_compte_confirmer]"]);
    expect(paths("VIVACITE_DECLENCHEUR_HORS_ENVELOPPE").sort()).toEqual([
      "actions[act_compte_creation_confirmee]",
      "actions[act_creneau_vide_vers_soins]",
      "actions[act_soins_vide_vers_accueil]",
    ]);
  });
  it("② les deux contrôles morts (empty_state) sont refusés", () => {
    expect(paths("VIVACITE_CONTROLE_MORT").sort()).toEqual([
      "screens[scr_cpt_creneau_choisir].blocks[blk_creneau_vide]",
      "screens[scr_cpt_soin_choisir].blocks[blk_soins_vide]",
    ]);
  });
  it("③ thenScreenId et les clés fantômes de TOUTE la surface auth : 9 params morts", () => {
    const morts = paths("VIVACITE_PARAM_CAPABILITY_NON_CONSOMME");
    expect(morts).toHaveLength(9);
    expect(morts).toContain("actions[act_compte_creer].params[thenScreenId]");
    expect(morts).toContain("actions[act_compte_creer].params[identifierFieldId]");
  });
  it("④ les 11 références brutes affichées sont refusées", () => {
    expect(paths("VIVACITE_REFERENCE_BRUTE_AFFICHEE")).toHaveLength(11);
  });
  it("⑤ l'arc prescrit saisir→confirmer n'est satisfait par AUCUNE arête exécutable — et la navigation post-connexion non plus (8 arcs)", () => {
    const arcs = paths("VIVACITE_ARC_PRESCRIT_INEXECUTABLE");
    expect(arcs).toHaveLength(8);
    expect(arcs).toContain("navigation[scr_cpt_compte_saisir->scr_cpt_compte_confirmer]");
    expect(arcs).toContain("navigation[scr_cpt_compte_s_identifier->scr_cpt_rendez_vous_consulter_historique]");
  });
  it("⑥ commerce émis ≠ commerce attendu : Conformance ROUGE", () => {
    expect(paths("CONFORMANCE_COMMERCE_DIVERGENT")).toEqual(["compliance.commerceClass"]);
  });
  it("⑦ le round-trip jamais appelé du run est NOMMÉ, pas compté 0/1", () => {
    const executes = new Set<string>(JOURNAL.roundTrip !== undefined ? ["round-trip"] : []);
    const f = jugerAttestations(["round-trip"], executes);
    expect(f.map((x) => x.code)).toEqual(["INSTRUMENT_NON_EXECUTE"]);
  });
  it("rien d'autre : les codes rendus sont exactement les familles nommées", () => {
    expect([...new Set(codes)].sort()).toEqual([
      "CONFORMANCE_COMMERCE_DIVERGENT",
      "VIVACITE_ARC_PRESCRIT_INEXECUTABLE",
      "VIVACITE_CONTROLE_MORT",
      "VIVACITE_DECLENCHEUR_HORS_ENVELOPPE",
      "VIVACITE_ECRAN_INATTEIGNABLE",
      "VIVACITE_PARAM_CAPABILITY_NON_CONSOMME",
      "VIVACITE_REFERENCE_BRUTE_AFFICHEE",
    ]);
  });
});

// ── BASE VERTE (EP-028) : le run archivé, TRANSFORMÉ pour satisfaire chaque
// juge — fixture de test, PAS une correction du générateur (EP-062 : hors
// périmètre ; les corrections viendront sur GO séparé).
interface Mutable {
  actions: {
    id: string;
    trigger: Record<string, unknown>;
    effect: { kind: string; params?: { key: string; value: unknown }[] } & Record<string, unknown>;
  }[];
  screens: { id: string; blocks: { id: string; entityId?: string; props?: { key: string; value: unknown }[] }[] }[];
  entities: { id: string; fields: { id: string; type: string }[] }[];
  compliance: { commerceClass: string };
};

function baseVerte(): AirDoc {
  const air = lireAir() as unknown as Mutable;
  // ① déclencheurs data → mécanismes d'activation réels.
  for (const a of air.actions) {
    if (a.trigger.kind !== "data") continue;
    const bloc = air.screens
      .flatMap((s) => s.blocks)
      .find((b) => (b.props ?? []).some((p) => p.key === "actionId" && p.value === a.id));
    a.trigger =
      bloc !== undefined
        ? { kind: "ui", blockId: bloc.id }
        : { kind: "lifecycle", event: "screen_open", screenId: "scr_cpt_compte_saisir" };
  }
  // ② params auth → les clés CONSOMMÉES, rien d'autre.
  for (const a of air.actions) {
    if (a.effect.kind !== "capability") continue;
    const conserves = (a.effect.params ?? []).filter((p) =>
      ["identifiantFieldId", "motDePasseFieldId"].includes(p.key),
    );
    const identifiant = (a.effect.params ?? []).find((p) => p.key === "identifierFieldId");
    const motDePasse = (a.effect.params ?? []).find((p) => p.key === "passwordFieldId");
    a.effect.params = [
      ...conserves,
      ...(identifiant ? [{ key: "identifiantFieldId", value: identifiant.value }] : []),
      ...(motDePasse ? [{ key: "motDePasseFieldId", value: motDePasse.value }] : []),
    ];
  }
  // ③ références brutes → un champ NON-référence de la même entité.
  for (const s of air.screens) {
    for (const b of s.blocks) {
      const entite = air.entities.find((e) => e.id === b.entityId);
      if (entite === undefined) continue;
      const refs = new Set(entite.fields.filter((f) => f.type === "reference").map((f) => f.id));
      const sain = entite.fields.find((f) => f.type !== "reference");
      for (const p of b.props ?? []) {
        if (p.key.endsWith("FieldId") && refs.has(String(p.value)) && sain !== undefined) {
          p.value = sain.id;
        }
        // `fieldIds` d'un form : LISTE de champs — les références en sortent.
        if (Array.isArray(p.value)) {
          p.value = p.value.filter((v) => !refs.has(String(v)));
        }
      }
    }
  }
  // ④ conformance.
  air.compliance.commerceClass = "physical_or_offapp";
  // ⑤ chaque arc prescrit encore insatisfait reçoit une arête exécutable.
  const reste = jugerVivacite(air as unknown as AirDoc, EXECUTION_ENVELOPE_V1, OPTIONS).filter(
    (f) => f.code === "VIVACITE_ARC_PRESCRIT_INEXECUTABLE",
  );
  let n = 0;
  for (const f of reste) {
    const m = /navigation\[(.+)->(.+)\]/.exec(f.path);
    if (m === null) continue;
    air.actions.push({
      id: `act_verte_${n++}`,
      trigger: { kind: "lifecycle", event: "screen_open", screenId: m[1] },
      effect: { kind: "navigate", screenId: m[2] },
    });
  }
  return air as unknown as AirDoc;
}

describe("BASE VERTE puis mutations isolées — chaque juge, son diagnostic, seul", () => {
  it("la base transformée est VERTE (tous les juges satisfaits)", () => {
    expect(juger(baseVerte())).toEqual([]);
  });

  it("m1 · un déclencheur data ré-introduit : DECLENCHEUR_HORS_ENVELOPPE, seul", () => {
    const air = baseVerte() as unknown as Mutable;
    air.actions.push({
      id: "act_mutation_data",
      trigger: { kind: "data", entityId: "ent_soin", event: "created" },
      effect: { kind: "navigate", screenId: "scr_cpt_soin_choisir" },
    });
    expect([...new Set(codesDe(air as unknown as AirDoc))]).toEqual([
      "VIVACITE_DECLENCHEUR_HORS_ENVELOPPE",
    ]);
  });

  it("m2 · toutes les arêtes vers un écran retirées : ECRAN_INATTEIGNABLE, seul", () => {
    const air = baseVerte() as unknown as Mutable;
    air.actions = air.actions.filter(
      (a) => a.effect.screenId !== "scr_cpt_compte_confirmer",
    );
    const codes = jugerVivacite(air as unknown as AirDoc, EXECUTION_ENVELOPE_V1, {
      commerceAttendu: "physical_or_offapp",
    }).map((f) => f.code);
    expect([...new Set(codes)]).toEqual(["VIVACITE_ECRAN_INATTEIGNABLE"]);
  });

  it("m3 · l'arête déplacée hors de l'origine prescrite : ARC_PRESCRIT_INEXECUTABLE, seul", () => {
    const air = baseVerte() as unknown as Mutable;
    for (const a of air.actions) {
      if (a.effect.screenId === "scr_cpt_compte_confirmer" && a.trigger.kind === "lifecycle") {
        a.trigger = { ...a.trigger, screenId: "scr_entree" };
      }
    }
    expect([...new Set(codesDe(air as unknown as AirDoc))]).toEqual([
      "VIVACITE_ARC_PRESCRIT_INEXECUTABLE",
    ]);
  });

  it("m4 · l'effet d'un contrôle câblé rendu inexécutable : CONTROLE_MORT, seul", () => {
    const air = baseVerte() as unknown as Mutable;
    const action = air.actions.find((a) => a.id === "act_soins_vide_vers_accueil");
    expect(action).toBeDefined();
    if (action) action.effect = { kind: "slot" };
    expect([...new Set(codesDe(air as unknown as AirDoc))]).toEqual(["VIVACITE_CONTROLE_MORT"]);
  });

  it("m5 · une clé de param fantôme ré-introduite : PARAM_CAPABILITY_NON_CONSOMME, seul", () => {
    const air = baseVerte() as unknown as Mutable;
    const action = air.actions.find((a) => a.id === "act_compte_se_connecter");
    expect(action).toBeDefined();
    const p = action?.effect.params?.find((x) => x.key === "identifiantFieldId");
    if (p) p.key = "identifierFieldId";
    expect([...new Set(codesDe(air as unknown as AirDoc))]).toEqual([
      "VIVACITE_PARAM_CAPABILITY_NON_CONSOMME",
    ]);
  });

  it("m6 · une référence remise à l'affichage : REFERENCE_BRUTE_AFFICHEE, seule", () => {
    const air = baseVerte() as unknown as Mutable;
    const bloc = air.screens
      .flatMap((s) => s.blocks)
      .find((b) => b.id === "blk_rdv_passes_liste");
    expect(bloc).toBeDefined();
    const entite = air.entities.find((e) => e.id === bloc?.entityId);
    const ref = entite?.fields.find((f) => f.type === "reference");
    const prop = bloc?.props?.find((p) => p.key === "titleFieldId");
    if (prop && ref) prop.value = ref.id;
    expect([...new Set(codesDe(air as unknown as AirDoc))]).toEqual([
      "VIVACITE_REFERENCE_BRUTE_AFFICHEE",
    ]);
  });

  it("m7 · commerce émis divergent : CONFORMANCE_COMMERCE_DIVERGENT, seul", () => {
    const air = baseVerte() as unknown as Mutable;
    air.compliance.commerceClass = "none";
    expect([...new Set(codesDe(air as unknown as AirDoc))]).toEqual([
      "CONFORMANCE_COMMERCE_DIVERGENT",
    ]);
  });

  it("m8 · attestation absente : INSTRUMENT_NON_EXECUTE ; présente : rien", () => {
    expect(jugerAttestations(["round-trip"], new Set()).map((f) => f.code)).toEqual([
      "INSTRUMENT_NON_EXECUTE",
    ]);
    expect(jugerAttestations(["round-trip"], new Set(["round-trip"]))).toEqual([]);
  });

  it("dérivation, pas liste : rétrécir l'enveloppe déplace le juge (leçon EP-059)", () => {
    const air = baseVerte();
    const sansLifecycle = { ...EXECUTION_ENVELOPE_V1, triggers: ["ui" as const] };
    const codes = jugerVivacite(air, sansLifecycle, {}).map((f) => f.code);
    expect(codes).toContain("VIVACITE_DECLENCHEUR_HORS_ENVELOPPE");
  });
});

describe("branchement — un juge hors acceptation ne juge pas", () => {
  const emitV3 = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
  it("jugerAcceptation tourne aux DEUX attempts, et consomme jugerVivacite", () => {
    // Les CONSOMMATIONS (spread dans les diagnostics), pas la définition.
    const appels = emitV3.match(/\.\.\.jugerAcceptation\(air, prescriptif, intention\)/g) ?? [];
    expect(appels.length).toBe(2);
    expect(emitV3).toContain("vivacite.jugerVivacite(");
  });
  it("le BILAN ne rend AUCUN chiffre pour un instrument non exécuté", () => {
    expect(emitV3).toContain("round-trip NON EXÉCUTÉ (instrument débranché — EP-061f)");
    expect(emitV3).not.toContain("${rtValid}/${valid}");
  });
});
