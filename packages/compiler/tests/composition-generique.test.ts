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
    expect(fil).toContain("<View");
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
    expect(recherche).toContain("<View");
  });

  it("le document RÉEL dougplace compile avec le moteur enrichi, inchangé", () => {
    const doc = JSON.parse(readFileSync(DOUGPLACE, "utf8")) as Record<string, unknown>;
    const { files } = emitProject(doc);
    expect(files.size).toBeGreaterThan(50);
  });
});
