// CLIQUET — UNE DESTINATION PRINCIPALE EST UNE RACINE, PAS UNE ÉTAPE.
//
// Défaut RÉEL, vu à l'écran sur Galaxy A17 : toucher « Départs », « Réserver »
// ou « Compte » faisait apparaître une FLÈCHE DE RETOUR en haut à gauche, et
// cette flèche faisait défiler les quatre pages principales à l'envers. Cause :
// `navigate` EMPILE quand la cible n'est pas déjà dans la pile — la barre du bas
// construisait donc un historique là où l'utilisateur attend une bascule.
//
// Trois faits sont verrouillés ici, chacun avec son contrôle négatif :
//   1. le module de navigation ÉMIS déclare exactement les racines du document ;
//   2. le runtime ÉMIS ne navigue plus jamais en direct — tout passe par la règle ;
//   3. la règle elle-même remplace la pile pour une racine, et seulement pour elle.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emitProject } from "../src/emit-project.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
import { EMBEDDED_ASSETS } from "../src/embedded-assets.generated.ts";
import {
  allerVers,
  declarerRacines,
  estRacine,
  reinitialiserRacines,
} from "../runtime/racines-navigation.ts";

// Document RÉEL, pris TEL QUEL : celui de l'application posée sur l'appareil,
// donc celui où le défaut a été constaté. Aucun document bricolé pour le test —
// un bricolage ne prouverait que le comportement du bricolage. Le corpus gelé
// v2 ne convient pas : AUCUN de ses douze documents ne déclare de barre de
// navigation principale (vérifié, ils précèdent 1.8.0).
const DOC_APPAREIL = join(
  HERE,
  "..",
  "..",
  "..",
  "slices",
  "validation-appareil",
  "validation-appareil.air.json",
);
const doc = JSON.parse(readFileSync(DOC_APPAREIL, "utf8")) as {
  navigation: {
    routes: { id: string; screenId: string }[];
    primary?: { destinations: { routeId: string }[] };
  };
};

const ecranDe = (routeId: string): string =>
  doc.navigation.routes.find((r) => r.id === routeId)?.screenId ?? "";
const racinesAttendues = (doc.navigation.primary?.destinations ?? [])
  .map((d) => ecranDe(d.routeId))
  .sort();
// Un écran du document qui n'est PAS une destination principale : c'est lui qui
// doit rester absent de la déclaration.
const ecranOrdinaire =
  doc.navigation.routes.map((r) => r.screenId).find((id) => !racinesAttendues.includes(id)) ?? "";

const declarationDe = (source: string): string[] =>
  JSON.parse(/declarerRacines\((\[[^\]]*\])\)/.exec(source)?.[1] ?? "[]") as string[];

const emis = (): string => emitProject(doc).files.get("navigation.tsx") ?? "";

describe("cliquet — les racines déclarées, et elles seules", () => {
  it("le document du corpus fournit bien de quoi discriminer", () => {
    expect(racinesAttendues.length).toBeGreaterThan(0);
    expect(ecranOrdinaire).not.toBe("");
  });

  it("le module de navigation émis DÉCLARE les écrans des destinations principales", () => {
    expect(declarationDe(emis())).toEqual(racinesAttendues);
  });

  it("CONTRÔLE NÉGATIF — un écran SANS destination principale n'est pas déclaré racine", () => {
    // Sans lui, une sonde qui déclarerait TOUS les écrans passerait pour une preuve.
    expect(declarationDe(emis())).not.toContain(ecranOrdinaire);
  });

  it("CONTRÔLE NÉGATIF — sans barre déclarée, aucune racine n'est inventée", () => {
    const sansBarre = { ...doc, navigation: { ...doc.navigation } };
    delete sansBarre.navigation.primary;
    const nav = emitProject(sansBarre).files.get("navigation.tsx") ?? "";
    expect(declarationDe(nav)).toEqual([]);
    expect(nav).toContain("declarerRacines([])");
  });
});

describe("cliquet — le runtime émis ne navigue plus en direct", () => {
  // Ce qui compte est ce qui PART sur l'appareil : on lit les copies embarquées,
  // pas les sources du dépôt.
  const cibles = ["lib/runtime/air-runtime.tsx", "lib/runtime/primary-nav.tsx"] as const;

  for (const cible of cibles) {
    it(`${cible} passe par allerVers, jamais par navigation.navigate`, () => {
      const source = EMBEDDED_ASSETS[cible] ?? "";
      expect(source.length).toBeGreaterThan(0);
      // Aucun appel direct : ni `navigation.navigate(`, ni le transtypage
      // `navigation.navigate as ...` utilisé auparavant pour contourner les types.
      expect(source).not.toContain("navigation.navigate");
      expect(source).toContain("allerVers(navigation");
    });
  }

  it("CONTRÔLE NÉGATIF — la sonde VOIT un appel direct", () => {
    const faux = 'const f = () => { (navigation.navigate as (n: string) => void)("x"); };';
    expect(faux).toContain("navigation.navigate");
  });

  it("la règle est bien EMBARQUÉE dans le projet généré", () => {
    expect(EMBEDDED_ASSETS["lib/runtime/racines-navigation.ts"] ?? "").toContain(
      "export function allerVers",
    );
  });
});

describe("cliquet — la règle remplace la pile pour une racine, et seulement pour elle", () => {
  const espion = () => {
    const vus: string[] = [];
    return {
      vus,
      navigate: (name: string, params?: Record<string, unknown>) =>
        vus.push(`navigate:${name}:${JSON.stringify(params ?? null)}`),
      reset: (state: { index: number; routes: readonly { name: string }[] }) =>
        vus.push(`reset:${state.routes.map((r) => r.name).join(",")}:${state.index}`),
    };
  };

  it("une RACINE : la pile devient cette seule racine", () => {
    reinitialiserRacines();
    declarerRacines(["scr_racine"]);
    const nav = espion();
    allerVers(nav, "scr_racine");
    // index 0 et une seule route : il n'existe plus rien derrière, donc plus
    // aucune flèche de retour à dessiner.
    expect(nav.vus).toEqual(["reset:scr_racine:0"]);
  });

  it("CONTRÔLE NÉGATIF — un écran ORDINAIRE s'empile toujours", () => {
    reinitialiserRacines();
    declarerRacines(["scr_racine"]);
    const nav = espion();
    allerVers(nav, "scr_fiche", { itemId: "42" });
    // Une fiche GARDE sa flèche de retour : là, revenir a un sens.
    expect(nav.vus).toEqual(['navigate:scr_fiche:{"itemId":"42"}']);
  });

  it("CONTRÔLE NÉGATIF — sans déclaration, plus RIEN n'est une racine", () => {
    reinitialiserRacines();
    expect(estRacine("scr_racine")).toBe(false);
    const nav = espion();
    allerVers(nav, "scr_racine");
    expect(nav.vus).toEqual(["navigate:scr_racine:null"]);
  });

  it("les paramètres de route SURVIVENT au remplacement de pile", () => {
    reinitialiserRacines();
    declarerRacines(["scr_racine"]);
    const recu: unknown[] = [];
    allerVers(
      {
        navigate: () => undefined,
        reset: (s: { routes: readonly { params?: Record<string, unknown> }[] }) =>
          recu.push(s.routes[0]?.params),
      },
      "scr_racine",
      { itemId: "7" },
    );
    expect(recu).toEqual([{ itemId: "7" }]);
    reinitialiserRacines();
  });
});
