// ============================================================
// LA MINE EP-175 ① / EP-182 ③, REFERMÉE — PAS CONTOURNÉE.
//
// MESURÉ (ligne c29bd806, ~16 $ par cycle) : le plan prescrivait DEUX
// destinations (liste close) quand le schéma AIR en exige TROIS dès que la
// barre existe — un jeu IMPOSSIBLE que le générateur a payé en oscillant.
// L'arbitrage du 2026-10-10 : le plan ÉLIT une racine de LECTURE quand les
// publiques manquent, et si même l'élection n'atteint pas la borne, LA
// BARRE N'EXISTE PAS. Invariant : jamais barre:true sous la borne.
// ============================================================
import { describe, expect, it } from "vitest";
import * as derivationsModele from "../../../benchmarks/air-emission/modele-metier.mjs";
import type { ModeleMetier } from "../../../benchmarks/air-emission/modele-metier.mjs";

// La forme exacte du défaut : dépenses — 2 racines publiques (entrée + compte).
const DEUX_RACINES: ModeleMetier = {
  version: "modele-metier/1.2.0",
  acteurs: [{ id: "act_moi", nom: "Moi" }],
  concepts: [
    { id: "ent_depense", nom: "Dépense", donnees: true, attributs: [
      { id: "att_libelle", nature: "texte", requis: true },
      { id: "att_montant", nature: "nombre", requis: true },
    ] },
    { id: "ent_compte", nom: "Compte", donnees: true, attributs: [
      { id: "att_email", nature: "texte", requis: true },
    ] },
  ],
  relations: [],
  parcours: [
    { id: "par_noter", besoin: "noter une dépense", acteur: "act_moi", etapes: [
      { concept: "ent_depense", geste: "saisir" },
      { concept: "ent_depense", geste: "confirmer" },
    ] },
    { id: "par_connexion", besoin: "retrouver mes dépenses", acteur: "act_moi", etapes: [
      { concept: "ent_compte", geste: "s_identifier" },
      { concept: "ent_depense", geste: "consulter_historique" },
    ] },
  ],
  couverture: { couverts: [
    { terme: "dépenses", noeuds: ["ent_depense"] },
    { terme: "compte", noeuds: ["ent_compte"] },
  ], nonRetenus: [] },
} as unknown as ModeleMetier;

describe("l'élection de la racine manquante", () => {
  it("SANS borne, rien ne change — aucun appelant existant n'est touché", () => {
    const plan = derivationsModele.ecransDe(DEUX_RACINES);
    expect(plan.navigation.barre).toBe(true);
    expect(plan.navigation.destinations.length).toBeLessThan(3);
  });

  it("avec la borne, le plan élit une racine de LECTURE — l'historique, troisième onglet", () => {
    const sans = derivationsModele.ecransDe(DEUX_RACINES).navigation.destinations;
    const plan = derivationsModele.ecransDe(DEUX_RACINES, { destinationsMin: 3 });
    expect(plan.navigation.barre).toBe(true);
    expect(plan.navigation.destinations.length).toBe(3);
    // l'élu est NOUVEAU (pas une racine publique existante) et c'est l'écran
    // du geste de lecture du domaine — « consulter l'historique »
    const elu = plan.navigation.destinations.find((d) => !sans.includes(d));
    expect(elu).toBeDefined();
    expect(String(elu)).toContain("histor");
  });

  it("INVARIANT — jamais barre:true sous la borne : un modèle sans racine de lecture perd sa barre", () => {
    const minuscule = JSON.parse(JSON.stringify(DEUX_RACINES)) as ModeleMetier;
    (minuscule as unknown as { parcours: unknown[] }).parcours = [
      { id: "par_noter", besoin: "noter", acteur: "act_moi", etapes: [
        { concept: "ent_depense", geste: "saisir" },
        { concept: "ent_depense", geste: "confirmer" },
      ] },
    ];
    const plan = derivationsModele.ecransDe(minuscule, { destinationsMin: 3 });
    expect(plan.navigation.barre && plan.navigation.destinations.length < 3).toBe(false);
  });
});

describe("reparerNavigation — la navigation se dérive, le modèle ne recopie plus", () => {
  const plan = derivationsModele.ecransDe(DEUX_RACINES, { destinationsMin: 3 });
  const cibles = plan.navigation.destinations.map((d) => derivationsModele.ecranAirDe(d));
  const [cible0, cible1] = [cibles[0] ?? "", cibles[1] ?? ""];
  interface NavReparee {
    navigation: {
      routes: { id: string; screenId: string }[];
      primary?: { destinations: { order: number; label: { text: string }[]; routeId: string }[] };
    };
  }
  const document = {
    screens: cibles.map((id) => ({ id, title: `Écran ${id}`, blocks: [] })),
    navigation: {
      routes: [cible0, cible1].map((id) => ({ id: `nav_${id.replace(/^scr_/u, "")}`, screenId: id })),
      primary: { destinations: [
        { icon: "accueil", label: [{ text: "Aujourd'hui", locale: "fr" }], order: 0, routeId: `nav_${cible0.replace(/^scr_/u, "")}` },
        { icon: "compte", label: [{ text: "Compte", locale: "fr" }], order: 1, routeId: `nav_${cible1.replace(/^scr_/u, "")}` },
      ] },
    },
  };

  it("deux destinations deviennent trois, routes créées, labels existants CONSERVÉS", () => {
    const r = derivationsModele.reparerNavigation(document, plan);
    expect(r.change).toBe(true);
    const nav = (r.document as unknown as NavReparee).navigation;
    const dests = nav.primary?.destinations ?? [];
    expect(dests.length).toBe(3);
    expect(dests[0]?.label[0]?.text).toBe("Aujourd'hui");
    expect(dests[1]?.label[0]?.text).toBe("Compte");
    expect(nav.routes.length).toBe(3);
    expect(dests.map((d) => d.order)).toEqual([0, 1, 2]);
  });

  it("idempotente — le deuxième passage ne change RIEN", () => {
    const r1 = derivationsModele.reparerNavigation(document, plan);
    const r2 = derivationsModele.reparerNavigation(r1.document, plan);
    expect(r2.change).toBe(false);
  });

  it("quand le plan ne prescrit PAS de barre, primary est retiré — jamais un jeu impossible", () => {
    const sansBarre = JSON.parse(JSON.stringify(plan)) as typeof plan;
    (sansBarre.navigation as { barre: boolean }).barre = false;
    const r = derivationsModele.reparerNavigation(document, sansBarre);
    expect(r.change).toBe(true);
    expect((r.document as unknown as NavReparee).navigation.primary).toBeUndefined();
  });
});
