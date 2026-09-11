// CLIQUET — LE MOTEUR SAIT ASSEMBLER, ET PAS SEULEMENT POUR UNE MARKETPLACE.
//
// Mission composition (2026-09-10). Cause prouvée : un écran à listes était
// un View NON DÉFILANT où chaque liste verticale prenait `fill` — trois
// listes = trois couloirs. L'accueil-fleuve (défilement vertical de rangées
// horizontales + entrée de recherche) était INEXPRIMABLE.
//
// Ces tests compilent TROIS documents d'archétypes DIFFÉRENTS — marketplace,
// réservation, éducation — qui partagent les mêmes capacités génériques :
// rangée horizontale, entrée de recherche, écran qui coule. Aucun des trois
// n'est un gabarit : ils diffèrent par entités, sections et navigation.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emitProject } from "../src/emit-project.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOUGPLACE = join(
  HERE, "..", "..", "..", "slices", "dougplace", "dougplace.air.json",
);

// Chaque archétype DÉRIVE du document réel : mêmes sections d'infrastructure
// (locales, réseau, conformité, design), contenu REMPLACÉ par celui du
// domaine. Rien n'est bricolé hors schéma — le même chemin fail-closed que
// la production juge ces documents.
const BASE = JSON.parse(readFileSync(DOUGPLACE, "utf8")) as Record<string, unknown>;
const LOCALE = ((BASE.app as Record<string, unknown>).locales as { defaultAppLocale: string })
  .defaultAppLocale;

function docArchetype(graine: string, sections: readonly string[]) {
  const L = (t: string) => [{ locale: LOCALE, text: t }];
  const ent = `ent_${graine}`;
  const baseApp = BASE.app as Record<string, unknown>;
  return {
    ...BASE,
    projectId: `prj_${graine}`,
    app: {
      ...baseApp,
      name: graine,
      slug: graine,
      brandIconPngBase64: undefined,
      distribution: undefined,
    },
    compliance: { ...(BASE.compliance as Record<string, unknown>), commerceClass: "none" },
    capabilities: [],
    permissions: [],
    integrations: [],
    relations: [],
    rules: [],
    slots: [],
    expectedTests: [],
    intent: undefined,
    entities: [
      {
        id: ent,
        name: graine,
        fields: [
          { id: `fld_${graine}_nom`, name: "nom", type: "string", required: true },
        ],
      },
    ],
    datasets: [
      { id: `data_${graine}`, entityId: ent, contentHash: "a".repeat(64), rowCount: 6 },
    ],
    screens: [
      {
        id: `scr_${graine}_accueil`,
        title: L("Accueil"),
        blocks: [
          { id: `blk_${graine}_recherche`, blockType: "search_entry",
            props: [{ key: "placeholder", value: "Rechercher…" },
                    { key: "actionId", value: `act_${graine}_chercher` }] },
          ...sections.map((nom) => ({
            id: `blk_${graine}_${nom}`,
            blockType: "list",
            entityId: ent,
            props: [
              { key: "title", value: nom },
              { key: "titleFieldId", value: `fld_${graine}_nom` },
              { key: "layout", value: "row" },
              { key: "loadingTitle", value: "…" },
              { key: "errorTitle", value: "!" },
            ],
          })),
        ],
      },
      {
        id: `scr_${graine}_recherche`,
        title: L("Recherche"),
        blocks: [
          { id: `blk_${graine}_liste`, blockType: "list", entityId: ent,
            props: [
              { key: "titleFieldId", value: `fld_${graine}_nom` },
              { key: "searchFieldId", value: `fld_${graine}_nom` },
              { key: "searchPlaceholder", value: "Rechercher…" },
              { key: "loadingTitle", value: "…" },
              { key: "errorTitle", value: "!" },
            ] },
        ],
      },
    ],
    actions: [
      { id: `act_${graine}_chercher`, name: "chercher",
        trigger: { kind: "ui", blockId: `blk_${graine}_recherche` },
        effect: { kind: "navigate", screenId: `scr_${graine}_recherche` } },
    ],
    navigation: {
      entryScreenId: `scr_${graine}_accueil`,
      routes: [
        { id: `nav_${graine}_accueil`, screenId: `scr_${graine}_accueil` },
        { id: `nav_${graine}_recherche`, screenId: `scr_${graine}_recherche` },
      ],
    },
  };
}

// SEPT archétypes — nombres de sections DIFFÉRENTS, aucun gabarit :
// la composition suit le besoin déclaré, le mécanisme est commun.
const ARCHETYPES = [
  { graine: "marche", sections: ["categories", "selection", "boutiques"] },
  { graine: "resa", sections: ["a_venir", "explorer"] },
  { graine: "cours", sections: ["reprendre", "parcours", "nouveautes"] },
  { graine: "livraison", sections: ["recommander", "autour", "offres", "recents"] },
  { graine: "auto", sections: ["occasions", "neuves"] },
  { graine: "saas", sections: ["taches", "equipes", "rapports"] },
] as const;

describe("généralisation — trois archétypes, mêmes capacités, zéro gabarit", () => {
  for (const a of ARCHETYPES) {
    it(`${a.graine} : accueil-fleuve compilé — écran DÉFILANT, rangées, entrée de recherche`, () => {
      const { files } = emitProject(docArchetype(a.graine, a.sections));
      const ecran = files.get(`screens/scr_${a.graine}_accueil.tsx`) ?? "";
      // L'écran COULE : ScrollView, pas le View fractionné des listes fill.
      expect(ecran).toContain("ScrollView");
      // L'entrée de recherche est ASSEMBLÉE (wrapper émis).
      expect(ecran).toContain("AirSearchEntry");
      // Chaque section du domaine est présente — le nombre varie par
      // archétype : la composition suit le besoin, pas un gabarit.
      for (const nom of a.sections) {
        expect(ecran).toContain(`blk_${a.graine}_${nom}`);
      }
    });
  }

  it("RÉSEAU SOCIAL — le FIL est une liste UNIQUE : fenêtre pleine, pas d'aperçu", () => {
    // Le mécanisme n'est pas un gabarit marketplace déguisé : un archétype
    // dont l'écran VIT par une seule liste (fil, historique) garde la
    // fenêtre virtualisée DET-006 — c'est la MÊME règle, l'autre branche.
    const doc = docArchetype("social", []);
    // le fil : une seule liste verticale sur son écran
    const accueilSocial = doc.screens[0];
    if (accueilSocial === undefined) throw new Error("accueil absent");
    accueilSocial.blocks = [
      { id: "blk_social_fil", blockType: "list", entityId: "ent_social",
        props: [
          { key: "titleFieldId", value: "fld_social_nom" },
          { key: "loadingTitle", value: "…" },
          { key: "errorTitle", value: "!" },
        ] },
    ];
    doc.actions = [];
    const { files } = emitProject(doc);
    const fil = files.get("screens/scr_social_accueil.tsx") ?? "";
    expect(fil).not.toContain("ScrollView");
    // Étape ② — le conteneur d'écran a disparu : la zone contenu d'AppShell
    // EST le cadre de la fenêtre ; la FlatList reste le défileur (DET-006).
    expect(fil).toContain("<AppShell");
  });

  it("ACCUEIL COMPOSÉ — grille + rangées = ScrollView, l'aperçu coule (pas de fenêtre)", () => {
    // Un accueil mêlant une GRILLE verticale et des rangées : l'écran DÉFILE
    // (la grille devient aperçu borné au runtime — décision pure testée dans
    // list-pipeline). C'est la composition de Marketa/Amazon, par MÉCANISME.
    const doc = docArchetype("mixte", ["vedettes"]);
    const accueilMixte = doc.screens[0];
    if (accueilMixte === undefined) throw new Error("accueil absent");
    accueilMixte.blocks.push({
      id: "blk_mixte_grille", blockType: "list", entityId: "ent_mixte",
      props: [
        { key: "title", value: "Grille" },
        { key: "titleFieldId", value: "fld_mixte_nom" },
        { key: "layout", value: "grid" },
        { key: "loadingTitle", value: "…" },
        { key: "errorTitle", value: "!" },
      ],
    });
    const { files } = emitProject(doc);
    const ecran = files.get("screens/scr_mixte_accueil.tsx") ?? "";
    expect(ecran).toContain("ScrollView");
  });

  it("CONTRÔLE NÉGATIF — une liste VERTICALE garde le patron défileur DET-006", () => {
    const doc = docArchetype("controle", ["rangee"]);
    const { files } = emitProject(doc);
    const recherche = files.get("screens/scr_controle_recherche.tsx") ?? "";
    expect(recherche).not.toContain("ScrollView");
    expect(recherche).toContain("<AppShell");
  });

  it("le document RÉEL dougplace compile avec le moteur enrichi, inchangé", () => {
    const doc = JSON.parse(readFileSync(DOUGPLACE, "utf8")) as Record<string, unknown>;
    const { files } = emitProject(doc);
    expect(files.size).toBeGreaterThan(50);
  });
});

describe("le PLAN distingue les archétypes — rôles structurels, zéro gabarit", () => {
  it("fleuve ≠ fenêtre ≠ porte : chaque archétype reçoit SA forme, du même mécanisme", async () => {
    const { planifierComposition } = await import("../src/plan-composition.ts");
    // L'accueil composé d'un marché : FLEUVE qui défile.
    const marche = planifierComposition(
      // le même docArchetype que plus haut — 3 rangées + entrée de recherche
      (await import("@deribfy/air-schema")).projectAirSchema.parse(
        (await import("@deribfy/air-schema")).migrateAirDocument(
          docArchetype("planmarche", ["categories", "selection", "boutiques"]),
        ),
      ),
    );
    const accueilMarche = marche.ecrans.find((e) => e.screenId === "scr_planmarche_accueil");
    expect(accueilMarche?.role).toBe("fleuve");
    expect(accueilMarche?.defile).toBe(true);
    // L'écran de recherche : FENÊTRE — sa liste unique est le défileur.
    const rechercheMarche = marche.ecrans.find((e) => e.screenId === "scr_planmarche_recherche");
    expect(rechercheMarche?.role).toBe("fenetre");
    expect(rechercheMarche?.defile).toBe(false);
  });

  it("les documents RÉELS reçoivent des plans DIFFÉRENTS — pas un moule commun", async () => {
    const { planifierComposition } = await import("../src/plan-composition.ts");
    const { projectAirSchema, migrateAirDocument } = await import("@deribfy/air-schema");
    const lireDoc = (p: string) =>
      projectAirSchema.parse(
        migrateAirDocument(
          JSON.parse(
            readFileSync(join(HERE, "..", "..", "..", p), "utf8"),
          ) as Record<string, unknown>,
        ),
      );
    const marketa = planifierComposition(lireDoc("slices/marketa/marketa.air.json"));
    const bus = planifierComposition(lireDoc("slices/validation-appareil/validation-appareil.air.json"));
    const rolesMarketa = marketa.ecrans.map((e) => e.role);
    const rolesBus = bus.ecrans.map((e) => e.role);
    // Deux apps réelles, deux SIGNATURES de composition distinctes.
    expect(rolesMarketa).not.toEqual(rolesBus);
    // Et chacune contient les rôles que sa nature exige :
    expect(rolesMarketa).toContain("fleuve"); // accueil marchand composé
    expect(rolesMarketa).toContain("porte"); // onboarding
    expect(rolesBus).toContain("fenetre"); // départs = liste-écran
    // Provision : marketa v2 n'exige RIEN ; le bus exige son endpoint.
    expect(marketa.provisionRequise).toEqual([]);
    expect(bus.provisionRequise).toEqual(["www.deribfy.com"]);
  });
});

describe("CHROME PERSISTANT — la recherche appartient au viewport, pas au flux", () => {
  it("A. accueil composé AVEC recherche : search_entry émis HORS du ScrollView, une seule fois", () => {
    const { files } = emitProject(docArchetype("chromea", ["s1", "s2"]));
    const ecran = files.get("screens/scr_chromea_accueil.tsx") ?? "";
    const posChrome = ecran.indexOf("<AirSearchEntry");
    const posScroll = ecran.indexOf("<ScrollView");
    expect(posChrome).toBeGreaterThan(-1);
    expect(posScroll).toBeGreaterThan(-1);
    // AVANT le conteneur défilant : c'est l'ordre de l'arbre qui persiste.
    expect(posChrome).toBeLessThan(posScroll);
    // Une seule barre : pas de doublon dans le flux.
    expect(ecran.match(/<AirSearchEntry/g)?.length).toBe(1);
    // Le CONTENU, lui, défile : les sections sont APRÈS le ScrollView.
    expect(ecran.indexOf("blk_chromea_s1")).toBeGreaterThan(posScroll);
  });

  it("B. écran SANS recherche : aucune barre forcée", () => {
    const doc = docArchetype("chromeb", ["seule"]);
    const accueil = doc.screens[0];
    if (accueil === undefined) throw new Error("accueil absent");
    accueil.blocks = accueil.blocks.filter((b) => b.blockType !== "search_entry");
    doc.actions = [];
    const { files } = emitProject(doc);
    expect(files.get("screens/scr_chromeb_accueil.tsx") ?? "").not.toContain("AirSearchEntry");
  });

  it("D. FIL social : la fenêtre reste la fenêtre, le chrome n'entre pas dans le feed", () => {
    const doc = docArchetype("chromed", []);
    const accueil = doc.screens[0];
    if (accueil === undefined) throw new Error("accueil absent");
    const entreeFil = accueil.blocks[0];
    if (entreeFil === undefined) throw new Error("entrée absente");
    accueil.blocks = [
      entreeFil, // search_entry
      { id: "blk_chromed_fil", blockType: "list", entityId: "ent_chromed",
        props: [
          { key: "titleFieldId", value: "fld_chromed_nom" },
          { key: "loadingTitle", value: "…" },
          { key: "errorTitle", value: "!" },
        ] },
    ];
    const { files } = emitProject(doc);
    const ecran = files.get("screens/scr_chromed_accueil.tsx") ?? "";
    // fenêtre : pas de ScrollView — et la recherche est ÉMISE AVANT la liste
    expect(ecran).not.toContain("ScrollView");
    expect(ecran.indexOf("<AirSearchEntry")).toBeLessThan(ecran.indexOf("blk_chromed_fil"));
  });

  it("E. un écran de FICHE ne reçoit aucune recherche automatique", () => {
    const { files } = emitProject(docArchetype("chromee", ["x"]));
    const recherche = files.get("screens/scr_chromee_recherche.tsx") ?? "";
    expect(recherche).not.toContain("AirSearchEntry");
  });

  it("F/G. recherche VISUELLE : paire déclarée → présente au contrat ; absente → rien", async () => {
    const { rechercheVisuelleComplete } = await import("@deribfy/fidelity");
    const { projectAirSchema, migrateAirDocument } = await import("@deribfy/air-schema");
    const doc = docArchetype("chromef", ["v"]);
    const accueil = doc.screens[0];
    if (accueil === undefined) throw new Error("accueil absent");
    const entree = accueil.blocks[0];
    if (entree === undefined) throw new Error("entrée absente");
    // G. sans déclaration : aucune caméra, gate silencieux.
    expect(rechercheVisuelleComplete(projectAirSchema.parse(migrateAirDocument(doc)))).toEqual([]);
    // F. paire complète : libellé + geste secondaire → contrat porté.
    entree.props = [...entree.props, { key: "visualSearchLabel", value: "Chercher par photo" }];
    (doc.actions as unknown[]).push({
      id: "act_chromef_visuel", name: "recherche par photo",
      trigger: { kind: "ui", blockId: entree.id, role: "secondary" },
      effect: { kind: "navigate", screenId: "scr_chromef_recherche" },
    });
    const complet = projectAirSchema.parse(migrateAirDocument(doc));
    expect(rechercheVisuelleComplete(complet)).toEqual([]);
    const { files } = emitProject(doc);
    expect(files.get("screens/scr_chromef_accueil.data.ts") ?? "").toContain("visualSearchLabel");
    // CONTRÔLE — libellé SANS geste : la paire casse, le gate tire.
    doc.actions = doc.actions.filter((a) => a.id !== "act_chromef_visuel");
    const casse = projectAirSchema.parse(migrateAirDocument(doc));
    expect(rechercheVisuelleComplete(casse).length).toBe(1);
  });
});
