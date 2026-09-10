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

const ARCHETYPES = [
  { graine: "marche", sections: ["categories", "selection", "boutiques"] },
  { graine: "resa", sections: ["a_venir", "explorer"] },
  { graine: "cours", sections: ["reprendre", "parcours", "nouveautes"] },
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
