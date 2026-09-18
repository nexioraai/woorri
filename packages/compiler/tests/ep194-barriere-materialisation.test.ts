// EP-194 ② — ON NE MATÉRIALISE PAS UN DOCUMENT QUE LES JUGES ONT REFUSÉ.
//
// DÉFAUT DE MA PROPRE MAIN. Le run EP-193 a rendu `valid=false` —
// `AIR_CIBLE_IDENTITE_PERDUE` ×3 entre autres. J'ai néanmoins appelé
// `compileProject` DIRECTEMENT, écrit 91 fichiers et lancé Expo. Youssouf a
// inspecté une application que le moteur avait REJETÉE, et les deux défauts
// qu'il y a trouvés ÉTAIENT DÉJÀ DIAGNOSTIQUÉS : le bouton de contact qui
// perd l'identité EST ce que les trois diagnostics disaient.
//
// LA RACINE N'EST PAS UN JUGE MANQUANT — le juge existait et il a parlé.
// La racine est qu'aucune fonction de matérialisation n'existait : j'ai écrit
// la mienne à la volée, et rien ne m'a arrêté. Une barrière qu'on contourne
// en trois lignes n'est pas une barrière.
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error — module JS du banc d'essai, sans déclaration de types :
// la barrière vit auprès des juges qu'elle appelle, et ceux-ci sont en .mjs.
import { materialiser } from "../../../benchmarks/air-emission/materialiser.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..");
const BENCH = join(RACINE, "benchmarks", "air-emission");
const RESULTS = join(BENCH, "results");

/** DEUX TAILLES, désignées par leur HORODATAGE — jamais « le dernier » (L-179-B). */
const REFUSE = "marche-immobilier.2026-09-17T22-54-01-142Z.attempt2.air.json";

const charger = (nom: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(RESULTS, nom), "utf8")) as Record<string, unknown>;

const dansUnDossierNeuf = <T>(f: (dest: string) => T): T => {
  const dest = mkdtempSync(join(tmpdir(), "ep194-"));
  try {
    return f(dest);
  } finally {
    rmSync(dest, { recursive: true, force: true });
  }
};

describe("EP-194 ② · la barrière de matérialisation", () => {
  it("UN DOCUMENT REFUSÉ N'ÉCRIT RIEN — pas un seul fichier", () => {
    // LE DÉFAUT QUE CE TEST GARDE : ce document EXACT a produit 91 fichiers
    // et tourné sur l'appareil de Youssouf, alors que les juges le refusaient.
    const doc = charger(REFUSE);
    dansUnDossierNeuf((dest) => {
      const r = materialiser(doc, dest) as {
        refus: boolean;
        ecrits: number;
        diagnostics: readonly { code?: string }[];
      };
      expect(r.refus, "un document refusé a été matérialisé").toBe(true);
      expect(r.ecrits, "des fichiers ont été écrits malgré le refus").toBe(0);
      expect(existsSync(dest) ? readdirSync(dest) : []).toEqual([]);
      expect(r.diagnostics.length).toBeGreaterThan(0);
    });
  });

  it("ET ELLE NOMME LE DÉFAUT VU À L'ÉCRAN — l'identité perdue du bouton", () => {
    // Youssouf a trouvé « Contacter le vendeur » qui mène au compte du
    // VISITEUR. Le juge le disait déjà : l'instance pressée est perdue.
    const doc = charger(REFUSE);
    dansUnDossierNeuf((dest) => {
      const r = materialiser(doc, dest) as { diagnostics: readonly { code?: string }[] };
      expect(r.diagnostics.map((d) => d.code)).toContain("AIR_CIBLE_IDENTITE_PERDUE");
    });
  });

  it("LA BARRIÈRE REFUSE DE JUGER PLUTÔT QUE DE JUGER MAL", () => {
    // MON PROPRE DÉFAUT, ATTRAPÉ PAR LA SONDE AVANT LIVRAISON :
    // `validateLocal` rend {air, diagnostics}, un OBJET. Ma première version
    // lisait `.length` dessus — `undefined > 0` est FAUX — et la barrière
    // laissait TOUT passer en écrivant 91 fichiers. Un cliquet creux
    // (EP-165 ③c). Si la forme du verdict change, la barrière JETTE au lieu
    // de laisser filer.
    const src = readFileSync(join(BENCH, "materialiser.mjs"), "utf8");
    expect(src).toContain("Array.isArray(diagnostics)");
    expect(src, "la barrière lit encore le verdict comme un tableau").not.toMatch(
      /const diagnostics = acceptation\.validateLocal/,
    );
  });

  it("AUCUN IDENTIFIANT D'UN RUN N'EST NOMMÉ DANS LA BARRIÈRE (EP-100)", () => {
    // La barrière vaut pour tout domaine : elle ne connaît ni « bien », ni
    // « annonce », ni un `scr_*` de ce run.
    const src = readFileSync(join(BENCH, "materialiser.mjs"), "utf8");
    const code = src
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("//"))
      .join("\n");
    expect(code).not.toMatch(/\b(scr_|fld_|ent_|cpt_|act_)/);
    expect(code).not.toMatch(/immobili|annonce|vendeur/i);
  });
});
