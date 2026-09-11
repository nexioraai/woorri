// ÉTAPE ③ (mission Elite A++++, 2026-09-11) — CAPACITÉ → RÔLE → PLACE.
//
// EP-003/EP-008 : la vérité des rôles d'icônes vivait en SIX copies ; la
// zone d'un bloc était une condition inline ; le digest recopiait le
// registre à la main (il annonçait « 7 » blocs pour 8 réels). Ces cliquets
// scellent : UNE source, des dérivations, et toute divergence CASSE ici —
// plus jamais dans une génération payante.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listBlockIds } from "@deribfy/blocks/registry";
import { GLYPHE_PAR_ROLE, ROLES_ICONES } from "@deribfy/primitives/roles-icones";
import { migrateAirDocument, projectAirSchema } from "@deribfy/air-schema";
import { emitProject } from "../src/emit-project.ts";
import { planifierComposition, ZONE_PAR_BLOCK_TYPE } from "../src/plan-composition.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const lireAir = (rel: string) =>
  projectAirSchema.parse(
    migrateAirDocument(
      JSON.parse(readFileSync(join(HERE, "..", "..", "..", rel), "utf8")) as Record<string, unknown>,
    ),
  );

describe("étape ③ — une source, des dérivations sous cliquet", () => {
  it("CLIQUET — le schéma AIR accepte EXACTEMENT les rôles de la source", () => {
    // air-schema ne peut dépendre d'aucun paquet : sa liste reste littérale,
    // ce test la tient collée à la source. Divergence = échec de build.
    const doc = lireAir("slices/dougplace/dougplace.air.json");
    const essai = (icon: string) =>
      projectAirSchema.safeParse({
        ...doc,
        navigation: {
          ...doc.navigation,
          primary: doc.navigation.primary === undefined
            ? undefined
            : {
                destinations: doc.navigation.primary.destinations.map((d, i) =>
                  i === 0 ? { ...d, icon } : d,
                ),
              },
        },
      }).success;
    for (const role of ROLES_ICONES) expect(essai(role), role).toBe(true);
    expect(essai("role_inconnu")).toBe(false);
    expect(essai("home-outline")).toBe(false); // un glyphe brut n'est PAS un rôle
  });

  it("CLIQUET — chaque rôle a son glyphe, la table est fermée", () => {
    expect(Object.keys(GLYPHE_PAR_ROLE)).toEqual([...ROLES_ICONES]);
    for (const glyphe of Object.values(GLYPHE_PAR_ROLE)) {
      expect(glyphe).toMatch(/^[a-z-]+-outline$/);
    }
  });

  it("CLIQUET — la table de PLACEMENT couvre le registre des blocs, exactement", () => {
    expect(Object.keys(ZONE_PAR_BLOCK_TYPE).sort()).toEqual([...listBlockIds()].sort());
  });

  it("le PLAN applique la table : recherche en chrome, le reste en contenu", () => {
    const air = lireAir("slices/marketa/marketa.air.json");
    const plan = planifierComposition(air);
    for (const ecran of plan.ecrans) {
      for (const section of ecran.sections) {
        expect(section.zone).toBe(ZONE_PAR_BLOCK_TYPE[section.blockType] ?? "contenu");
      }
    }
    // Le document réel possède au moins une entrée de recherche en chrome.
    expect(plan.ecrans.some((e) => e.sections.some((x) => x.zone === "chrome"))).toBe(true);
  });

  it("NON-APPARITION — une capacité non déclarée n'apparaît pas", () => {
    const air = lireAir("slices/marketa/marketa.air.json");
    // Sans destination principale : AUCUN écran n'importe PrimaryNav.
    const sansNav = {
      ...air,
      navigation: { ...air.navigation, primary: undefined },
    };
    const { files } = emitProject(sansNav);
    for (const [chemin, contenu] of files) {
      if (chemin.startsWith("screens/") && chemin.endsWith(".tsx")) {
        expect(contenu, chemin).not.toContain("PrimaryNav");
        expect(contenu, chemin).not.toContain("navigation={");
      }
    }
    // Sans search_entry : AUCUNE zone chrome émise. La chirurgie retire le
    // bloc ET tout ce qui le référence (actions, expectedTests) — le
    // fail-closed du lock refuse, à raison, une référence orpheline.
    const retires = new Set(
      air.screens.flatMap((s) =>
        s.blocks.filter((b) => b.blockType === "search_entry").map((b) => b.id),
      ),
    );
    const actionsRetirees = new Set(
      air.actions
        .filter((a) => a.trigger.kind === "ui" && retires.has(a.trigger.blockId))
        .map((a) => a.id),
    );
    const sansRecherche = {
      ...air,
      screens: air.screens.map((s) => ({
        ...s,
        blocks: s.blocks.filter((b) => !retires.has(b.id)),
      })),
      actions: air.actions.filter((a) => !actionsRetirees.has(a.id)),
      expectedTests: air.expectedTests.filter(
        (t) => !retires.has(t.targetId) && !actionsRetirees.has(t.targetId),
      ),
    };
    const emis = emitProject(sansRecherche);
    for (const [chemin, contenu] of emis.files) {
      if (chemin.startsWith("screens/") && chemin.endsWith(".tsx")) {
        expect(contenu, chemin).not.toContain("chrome={");
      }
    }
  });

  it("TRAÇABILITÉ — une décision se suit du document à l'écran émis", () => {
    // search_entry : document (bloc déclaré) → plan (zone chrome) → émission
    // (attribut chrome d'AppShell) — la même décision, trois preuves.
    const air = lireAir("slices/marketa/marketa.air.json");
    const plan = planifierComposition(air);
    const { files } = emitProject(air);
    for (const ecran of plan.ecrans) {
      const chromes = ecran.sections.filter((x) => x.zone === "chrome");
      const source = files.get(`screens/${ecran.screenId}.tsx`) ?? "";
      if (chromes.length === 0) {
        expect(source, ecran.screenId).not.toContain("chrome={");
      } else {
        expect(source, ecran.screenId).toContain("chrome={");
        for (const c of chromes) expect(source).toContain(`blockId="${c.blockId}"`);
      }
    }
  });
});
