// EP-081 — TRANSITION EXOGÈNE : le hold-out (désormais visible) est LA
// fixture. Vérification rendue AVANT d'étendre : le contrat ne savait pas
// dire (transitions = {vers, geste} strict — 4e application du patron,
// première fois que la réponse est « étendre »). L'exogène nomme sa NATURE
// (enum fermée), O-2 n'est pas abrogé, l'observabilité reste jugée par V4.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ecransDe,
  jugerPlanEcrans,
  NATURES_EXOGENES,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const BRUT = JSON.parse(
  readFileSync(
    join(R, "benchmarks", "air-emission", "results", "v2-holdout-2026-09-12T06-34-05-680Z.sortie.json"),
    "utf8",
  ),
) as { modele?: ModeleMetier };
// la sortie archivée est le modèle NU (l'enveloppe `modele` est un dialecte
// du lanceur emit-v3, absent du tirage hold-out).
const HOLDOUT = (BRUT.modele ?? BRUT) as ModeleMetier;

// BASE VERTE : le modèle du hold-out, l'autonomie EXPRIMÉE au lieu d'être
// domestiquée — l'opération s'exécute par ÉVÉNEMENT EXTERNE (le marché),
// l'état atteint reste VISIBLE (l'historique le consomme), et le parcours
// sans preuve se termine.
interface Transition { vers: string; geste?: string; exogene?: string }
interface Etat { id: string; transitions?: Transition[] }
const etatsDe = (c: { etats?: unknown } | undefined): Etat[] => (c?.etats ?? []) as Etat[];
const verte = (): ModeleMetier => {
  const m = structuredClone(HOLDOUT);
  const operation = m.concepts.find((c) => c.id === "cpt_operation");
  const projetee = etatsDe(operation).find((e) => e.id === "projetee");
  if (projetee) (projetee.transitions) = [{ vers: "executee", exogene: "evenement_externe" }];
  const historique = m.parcours.find((p) => p.id === "par_historique_operations");
  const premiere = historique?.etapes[0];
  if (premiere) premiere.etat = "executee";
  const strategie = m.parcours.find((p) => p.id === "par_strategie_automatique");
  strategie?.etapes.push({ concept: "cpt_actif", geste: "consulter" });
  // la DOMESTICATION disparaît : par_execution_auto (l'utilisateur cherche
  // l'actif, saisit et confirme l'opération) contredisait le besoin — les
  // opérations naissent du système (amorcées) et s'exécutent par l'exogène ;
  // l'utilisateur les OBSERVE (historique filtré, détail).
  m.parcours = m.parcours.filter((p) => p.id !== "par_execution_auto");
  // …et le SYSTÈME cesse d'être un acteur : P0 avait déclaré « act_moteur »
  // accomplissant le parcours domestiqué — un acteur est un UTILISATEUR ;
  // l'autonomie vit dans la transition, pas dans un faux acteur.
  m.acteurs = m.acteurs.filter((a) => a.id !== "act_moteur");
  // les données que « produisait » le faux acteur sont AMORCÉES : le contrat
  // le dit déjà — un attribut sans producteur naît du système (EP-081, même
  // vérification que etat/portée/commerce : pas d'extension ici).
  for (const c of m.concepts) {
    for (const a of c.attributs ?? []) {
      if ((a as { producteur?: string }).producteur === "act_moteur") {
        delete (a as { producteur?: string }).producteur;
      }
    }
  }
  interface Couvert { terme: string; noeuds: string[] }
  for (const c of (m.couverture.couverts as Couvert[])) {
    c.noeuds = c.noeuds.map((n) =>
      n === "par_execution_auto" ? "par_historique_operations" : n === "act_moteur" ? "cpt_operation" : n,
    );
  }
  return m;
};

describe("le hold-out, exprimé — la fixture que le corpus n'avait jamais demandée", () => {
  it("l'archive elle-même (autonomie domestiquée) reste REFUSÉE : parcours sans preuve", () => {
    expect(validerModele(HOLDOUT).map((d) => d.code)).toContain("MODELE_PARCOURS_SANS_PREUVE");
  });
  it("BASE VERTE : P1, plan et juges — un domaine d'agent autonome est désormais exprimable ET vivant", () => {
    const m = verte();
    // EP-139 — cette fixture met la CRÉATION DE COMPTE en parcours principal
    // alors qu'elle porte un parcours de suivi de marché, légitimement
    // public. App Store Review Guidelines 5.1.1(iv) le refuse, et le
    // diagnostic est JUSTE : ce test-ci porte sur l'expressivité du domaine
    // (transitions exogènes), pas sur l'ordre de ses parcours. Il écarte ce
    // diagnostic-là, nommément, et aucun autre.
    expect(
      validerModele(m).filter((d) => d.code !== "MODELE_COEUR_EXIGE_CONNEXION"),
    ).toEqual([]);
    const plan = ecransDe(m);
    expect(plan.diagnostics).toEqual([]);
    expect(jugerPlanEcrans(plan, m)).toEqual([]);
  });
});

describe("mutations isolées (EP-028) — diagnostic nommé, seul", () => {
  it("m1 · l'état atteint par l'exogène n'est plus consommé : V4 le juge (l'arête sans acteur EST jugée)", () => {
    const m = verte();
    // TOUS les consommateurs de l'état disparaissent (l'archive en portait
    // déjà un sur la dernière étape — une mutation qui n'isole pas ne prouve
    // rien, leçon EP-028).
    for (const p2 of m.parcours) {
      for (const e of p2.etapes) {
        if (e.etat === "executee") delete e.etat;
      }
    }
    const codes = validerModele(m).map((d) => d.code);
    expect(codes).toContain("MODELE_ETAT_NON_OBSERVABLE");
  });
  it("m2 · O-2 N'EST PAS abrogé : une transition par geste de LECTURE reste refusée, seule", () => {
    const m = verte();
    const operation = m.concepts.find((c) => c.id === "cpt_operation");
    const projetee = etatsDe(operation).find((e) => e.id === "projetee");
    if (projetee) (projetee.transitions) = [{ vers: "executee", geste: "consulter" }];
    const codes = validerModele(m).map((d) => d.code);
    expect(codes).toContain("MODELE_TRANSITION_DECLENCHEE_PAR_LECTURE");
  });
  it("m3 · une transition par GESTE non représentée reste refusée (l'exogène n'est pas une porte de sortie)", () => {
    const m = verte();
    const operation = m.concepts.find((c) => c.id === "cpt_operation");
    const projetee = etatsDe(operation).find((e) => e.id === "projetee");
    if (projetee) (projetee.transitions) = [{ vers: "executee", geste: "payer" }];
    const codes = validerModele(m).map((d) => d.code);
    expect(codes).toContain("MODELE_TRANSITION_NON_REPRESENTEE");
  });
  it("m4 · la nature est NOMMÉE : un drapeau hors enum est refusé au SCHÉMA", () => {
    const m = verte();
    const operation = m.concepts.find((c) => c.id === "cpt_operation");
    const projetee = etatsDe(operation).find((e) => e.id === "projetee");
    if (projetee) (projetee.transitions) = [{ vers: "executee", exogene: "systeme" }];
    expect(validerModele(m).some((d) => d.code === "MODELE_SCHEMA")).toBe(true);
  });
  it("m5 · geste ET exogene ensemble : refusé au schéma (une transition répond à UNE voie)", () => {
    const m = verte();
    const operation = m.concepts.find((c) => c.id === "cpt_operation");
    const projetee = etatsDe(operation).find((e) => e.id === "projetee");
    if (projetee)
      (projetee.transitions) = [
        { vers: "executee", geste: "confirmer", exogene: "temps" },
      ];
    expect(validerModele(m).some((d) => d.code === "MODELE_SCHEMA")).toBe(true);
  });
  it("les natures exposées sont l'enum fermée du GO", () => {
    expect(NATURES_EXOGENES).toEqual(["temps", "evenement_externe", "condition_donnees"]);
  });
});
