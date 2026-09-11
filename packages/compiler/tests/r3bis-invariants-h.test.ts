// R3-BIS (verdict R3, 2026-09-11) — LES QUATRE INVARIANTS DE H MANQUANTS.
// Chaque invariant : mutation isolée OU impossibilité par construction
// (démontrée, pas affirmée). 0 $.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ecransDe,
  jugerPlanEcrans,
  migrerModele,
  surfacesDe,
  validerModele,
  type ModeleMetier,
  type PlanEcrans,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const KAVIVA = migrerModele(
  JSON.parse(readFileSync(join(R, "slices", "kaviva", "kaviva-modele.json"), "utf8")),
) as ModeleMetier;

describe("V1 — matérialisation : IMPOSSIBILITÉ PAR CONSTRUCTION + juge", () => {
  it("PREUVE DE CONSTRUCTION — toute étape de tout parcours est matérialisée (kaviva + cas sans découverte)", () => {
    // kaviva : couverture totale.
    for (const modele of [KAVIVA]) {
      const plan = ecransDe(modele);
      expect(jugerPlanEcrans(plan, modele).filter((x) => x.code === "DERIVATION_ETAPE_SANS_ECRAN")).toEqual([]);
    }
    // CAS LIMITE trouvé pendant la passe : un premier parcours qui NE
    // commence PAS par une découverte laissait le chrome SANS écran hôte —
    // corrigé (l'entrée est créée pour l'héberger), prouvé ici.
    const sansDecouverte: ModeleMetier = {
      version: "modele-metier/1.1.0",
      couverture: { couverts: [{ terme: "objets", noeuds: ["cpt_objet"] }], nonRetenus: [] },
      acteurs: [{ id: "act_a", nom: "A" }],
      concepts: [{ id: "cpt_objet", nom: "Objet", donnees: true }],
      relations: [],
      parcours: [{
        id: "par_direct", besoin: "chercher directement", acteur: "act_a",
        etapes: [
          { concept: "cpt_objet", geste: "chercher" },
          { concept: "cpt_objet", geste: "consulter" },
        ],
      }],
    };
    expect(validerModele(sansDecouverte)).toEqual([]);
    const plan = ecransDe(sansDecouverte);
    expect(jugerPlanEcrans(plan, sansDecouverte).filter((x) => x.code === "DERIVATION_ETAPE_SANS_ECRAN")).toEqual([]);
    expect(plan.ecrans.some((e) => e.ecranId === "ecr_entree")).toBe(true);
  });

  it("MUTATION V1 — retirer un écran du plan : DERIVATION_ETAPE_SANS_ECRAN, seul", () => {
    const plan = ecransDe(KAVIVA);
    const cible = plan.ecrans.find((e) => e.ecranId !== "ecr_entree");
    const ampute: PlanEcrans = {
      ...plan,
      ecrans: plan.ecrans.filter((e) => e.ecranId !== cible?.ecranId),
      navigation: {
        ...plan.navigation,
        destinations: plan.navigation.destinations.filter((dst) => dst !== cible?.ecranId),
        arcs: plan.navigation.arcs.filter((a) => a.de !== cible?.ecranId && a.vers !== cible?.ecranId),
      },
    };
    const codes = jugerPlanEcrans(ampute, KAVIVA).map((x) => x.code);
    expect(codes).toContain("DERIVATION_ETAPE_SANS_ECRAN");
    expect(codes).not.toContain("DERIVATION_TRAVERSEE_ACTEUR");
  });
});

describe("V2 — traversabilité PAR ACTEUR", () => {
  const DEUX_ACTEURS: ModeleMetier = {
    version: "modele-metier/1.1.0",
    couverture: {
      couverts: [
        { terme: "objets", noeuds: ["cpt_objet"] },
        { terme: "rapports", noeuds: ["cpt_rapport"] },
      ],
      nonRetenus: [],
    },
    acteurs: [{ id: "act_client", nom: "Client" }, { id: "act_gerant", nom: "Gérant" }],
    concepts: [
      { id: "cpt_objet", nom: "Objet", donnees: true },
      { id: "cpt_rapport", nom: "Rapport", donnees: true },
    ],
    relations: [],
    parcours: [
      { id: "par_client", besoin: "voir les objets", acteur: "act_client",
        etapes: [
          { concept: "cpt_objet", geste: "decouvrir" },
          { concept: "cpt_objet", geste: "consulter" },
        ] },
      { id: "par_gerant", besoin: "saisir les rapports", acteur: "act_gerant",
        etapes: [
          { concept: "cpt_rapport", geste: "saisir" },
          { concept: "cpt_rapport", geste: "confirmer" },
        ] },
    ],
  };
  it("base VERTE : deux acteurs, écrans séparés — aucun mélange", () => {
    expect(validerModele(DEUX_ACTEURS)).toEqual([]);
    const plan = ecransDe(DEUX_ACTEURS);
    expect(plan.diagnostics).toEqual([]);
    expect(jugerPlanEcrans(plan, DEUX_ACTEURS)).toEqual([]);
  });
  it("MUTATION V2 — déplacer une étape du gérant sur l'écran du client : DERIVATION_TRAVERSEE_ACTEUR, seul", () => {
    const plan = ecransDe(DEUX_ACTEURS);
    const ecranClient = plan.ecrans.find((e) =>
      e.justification.some((j) => j.parcours === "par_client"),
    );
    const ecranGerant = plan.ecrans.find((e) =>
      e.justification.some((j) => j.parcours === "par_gerant"),
    );
    expect(ecranClient && ecranGerant).toBeTruthy();
    const mute: PlanEcrans = {
      ...plan,
      ecrans: plan.ecrans
        .filter((e) => e.ecranId !== ecranGerant?.ecranId)
        .map((e) =>
          e.ecranId === ecranClient?.ecranId
            ? {
                ...e,
                surfaces: [...e.surfaces, ...(ecranGerant?.surfaces ?? [])],
                justification: [...e.justification, ...(ecranGerant?.justification ?? [])],
              }
            : e,
        ),
      navigation: {
        ...plan.navigation,
        destinations: plan.navigation.destinations.map((dst) =>
          dst === ecranGerant?.ecranId ? (ecranClient?.ecranId ?? dst) : dst,
        ),
        arcs: plan.navigation.arcs.map((a) => ({
          ...a,
          de: a.de === ecranGerant?.ecranId ? ecranClient?.ecranId : a.de,
          vers: a.vers === ecranGerant?.ecranId ? ecranClient?.ecranId : a.vers,
        })),
      },
    };
    const codes = jugerPlanEcrans(mute, DEUX_ACTEURS).map((x) => x.code);
    expect(codes).toContain("DERIVATION_TRAVERSEE_ACTEUR");
    expect(codes).not.toContain("DERIVATION_ETAPE_SANS_ECRAN");
  });
});

describe("V3 — approvisionnement/état vide (F7) porté par la SURFACE", () => {
  it("collection vidable ⇒ videObligatoire VOYAGE avec la surface ; mutation : sans retirer, il tombe", () => {
    const base: ModeleMetier = {
      version: "modele-metier/1.1.0",
      couverture: { couverts: [{ terme: "favoris", noeuds: ["cpt_favori"] }], nonRetenus: [] },
      acteurs: [{ id: "act_a", nom: "A" }],
      concepts: [{ id: "cpt_favori", nom: "Favori", donnees: true }],
      relations: [],
      parcours: [{
        id: "par_gerer", besoin: "gérer ses favoris", acteur: "act_a",
        etapes: [
          { concept: "cpt_favori", geste: "decouvrir" },
          { concept: "cpt_favori", geste: "retirer" },
          { concept: "cpt_favori", geste: "consulter_historique" },
        ],
      }],
    };
    expect(validerModele(base)).toEqual([]);
    const surfaces = surfacesDe(base);
    const collections = surfaces.filter((s) => s.cardinalite === "collection");
    expect(collections.length).toBeGreaterThan(0);
    for (const c of collections) expect(c.videObligatoire, c.surfaceId).toBe(true);
    // MUTATION isolée : retirer l'étape `retirer` (amorcée, non vidable).
    const mute = structuredClone(base);
    const p0 = mute.parcours[0];
    if (p0) p0.etapes = p0.etapes.filter((e) => e.geste !== "retirer");
    expect(validerModele(mute)).toEqual([]);
    for (const c of surfacesDe(mute).filter((s) => s.cardinalite === "collection")) {
      expect(c.videObligatoire, c.surfaceId).toBe(false);
    }
  });
});

describe("V4 — observabilité des ÉTATS atteints", () => {
  it("MUTATION V4 — « annulé » atteint par transition mais distingué par AUCUNE surface : MODELE_ETAT_NON_OBSERVABLE, seul", () => {
    const m = structuredClone(KAVIVA);
    const rdv = m.concepts.find((c) => c.id === "cpt_rendez_vous");
    expect(rdv?.etats).toBeDefined();
    if (rdv?.etats !== undefined) {
      // annule : CIBLE d'une transition (a_venir --retirer--> annule),
      // transition REPRÉSENTÉE (étape retirer ajoutée), mais AUCUNE étape
      // ne consomme etat=annule — atteint et invisible.
      rdv.etats = [
        { id: "a_venir", transitions: [{ vers: "annule", geste: "retirer" }] },
        { id: "passe" },
        { id: "annule" },
      ] as never;
    }
    const retrouver = m.parcours.find((p) => p.id === "par_retrouver");
    retrouver?.etapes.unshift({ concept: "cpt_rendez_vous", geste: "retirer" });
    const codes = validerModele(m).map((x) => x.code);
    expect(codes).toContain("MODELE_ETAT_NON_OBSERVABLE");
    expect(codes).not.toContain("MODELE_ETAT_INATTEIGNABLE");
    expect(codes).not.toContain("MODELE_TRANSITION_NON_REPRESENTEE");
    expect(codes).not.toContain("MODELE_TRANSITION_INCONNUE");
    // CONTRÔLE : consommer l'état (historique filtré annule) rend le modèle VERT.
    const repare = structuredClone(m);
    const r2 = repare.parcours.find((p) => p.id === "par_retrouver");
    r2?.etapes.push({ concept: "cpt_rendez_vous", geste: "consulter_historique", etat: "annule" });
    expect(validerModele(repare)).toEqual([]);
  });
});
