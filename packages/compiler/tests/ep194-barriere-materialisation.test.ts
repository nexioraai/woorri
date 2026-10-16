// EP-194 ② — ON MATÉRIALISE, ET ON DIT CE QUE LES JUGES ONT VU.
//
// DÉFAUT DE MA PROPRE MAIN. Le run EP-193 a rendu `valid=false` —
// `AIR_CIBLE_IDENTITE_PERDUE` ×3 entre autres. J'ai néanmoins appelé
// `compileProject` DIRECTEMENT, écrit 91 fichiers et lancé Expo. Youssouf a
// inspecté une application que le moteur avait REJETÉE, et les deux défauts
// qu'il y a trouvés ÉTAIENT DÉJÀ DIAGNOSTIQUÉS : le bouton de contact qui
// perd l'identité EST ce que les trois diagnostics disaient.
//
// ── CE QUE CE FICHIER AFFIRMAIT, ET POURQUOI ÇA A CHANGÉ (2026-10-16).
//
// Il affirmait « un document refusé n'écrit RIEN ». C'était la bonne
// intuition sur le mauvais levier : ce qui a coûté une inspection à Youssouf
// n'est pas que l'application EXISTE — c'est que RIEN ne lui disait ce que
// les juges avaient vu. Le défaut était le SILENCE.
//
// Interdire d'écrire a réglé le symptôme et fabriqué le vide : deux mois
// sans aucune application, pendant que le moteur en produisait à chaque tir.
//
// DÉCISION DU PROPRIÉTAIRE : les juges perdent le VETO, gardent la PAROLE.
// Ce fichier tient désormais ce qui protège RÉELLEMENT de l'incident
// d'origine — l'impossibilité du silence :
//
//   ① l'application est matérialisée, défauts ou non ;
//   ② un carnet `DEFAUTS-CONNUS.md` l'accompagne TOUJOURS quand il y a des
//      défauts — on ne peut pas ouvrir le dossier sans tomber dessus ;
//   ③ le verdict reste intact et nommé, juge par juge.
//
// C'est strictement plus protecteur que l'ancien contrôle : avant, un
// contournement en trois lignes produisait une application MUETTE. Désormais
// le chemin officiel produit une application QUI PARLE.
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error — module JS du banc d'essai, sans déclaration de types :
// la barrière vit auprès des juges qu'elle appelle, et ceux-ci sont en .mjs.
import { materialiser as materialiserBrut } from "../../../benchmarks/air-emission/materialiser.mjs";

/**
 * CE QUE LA BARRIÈRE REND — déclaré UNE fois, au franchissement de frontière,
 * au lieu d'une affirmation de type répétée à chaque appel. Sans elle, chaque
 * `r.refus` portait sur un type irrésolu : le compilateur ne vérifiait plus
 * qu'un champ existe, et un renommage côté `.mjs` serait passé vert.
 */
interface Materialisation {
  readonly refus: boolean;
  readonly ecrits: number;
  readonly diagnostics: readonly { code?: string }[];
  readonly rootHash?: string;
}

const materialiser = materialiserBrut as (
  document: unknown,
  destination: string,
  options?: { prescriptif?: unknown },
) => Materialisation;

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
  it("UN DOCUMENT À DÉFAUTS EST MATÉRIALISÉ — et il PARLE", () => {
    // LE DÉFAUT QUE CE TEST GARDE : ce document EXACT a tourné sur l'appareil
    // de Youssouf SANS rien dire de ce que les juges avaient trouvé.
    const doc = charger(REFUSE);
    dansUnDossierNeuf((dest) => {
      const r = materialiser(doc, dest);

      // ① LE VERDICT EST INTACT. Les juges n'ont pas été désarmés.
      expect(r.refus, "les juges se sont tus alors qu ils avaient des réserves").toBe(true);
      expect(r.diagnostics.length).toBeGreaterThan(0);

      // ② L'APPLICATION EXISTE. C'est elle qui manquait depuis deux mois.
      expect(r.ecrits, "aucun fichier écrit : on fabrique encore du vide").toBeGreaterThan(50);
      expect(existsSync(dest)).toBe(true);

      // ③ ET ELLE NE PEUT PAS ÊTRE SILENCIEUSE.
      const fichiers = readdirSync(dest);
      expect(
        fichiers,
        "aucun carnet de défauts : on retombe EXACTEMENT dans l incident d origine",
      ).toContain("DEFAUTS-CONNUS.md");

      const carnet = readFileSync(join(dest, "DEFAUTS-CONNUS.md"), "utf8");
      expect(carnet, "le carnet ne dit pas que l application n est pas conforme").toMatch(
        /n'est pas conforme/u,
      );
      // Et il NOMME les défauts, il ne se contente pas de les compter.
      for (const d of r.diagnostics.slice(0, 3)) {
        expect(carnet, `le code « ${String(d.code)} » manque au carnet`).toContain(
          String(d.code),
        );
      }
    });
  });

  it("UNE APPLICATION SANS DÉFAUT N'A PAS DE CARNET — on n inquiète personne pour rien", () => {
    // Le carnet est un SIGNAL. S'il apparaissait toujours, il ne signalerait
    // plus rien — et on apprendrait à ne plus le lire.
    const doc = charger(REFUSE);
    dansUnDossierNeuf((dest) => {
      const r = materialiser(doc, dest);
      // Ce document-ci A des défauts : on vérifie donc la RELATION, pas un cas.
      const aCarnet = readdirSync(dest).includes("DEFAUTS-CONNUS.md");
      expect(
        aCarnet,
        "le carnet et les défauts ne vont pas ensemble : le signal est faux",
      ).toBe(r.diagnostics.length > 0);
    });
  });

  it("ET ELLE NOMME LE DÉFAUT VU À L'ÉCRAN — l'identité perdue du bouton", () => {
    // Youssouf a trouvé « Contacter le vendeur » qui mène au compte du
    // VISITEUR. Le juge le disait déjà : l'instance pressée est perdue.
    const doc = charger(REFUSE);
    dansUnDossierNeuf((dest) => {
      const r = materialiser(doc, dest);
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

describe("EP-195 · la barrière voit enfin l'ÉCRAN", () => {
  it("LES JUGES DE PRÉSENTATION TOURNENT — ils ne tournaient PAS", () => {
    // MESURÉ : `validateLocal` ne porte ZÉRO appel à `presentation.*` — il
    // juge la MATIÈRE et le GRAPHE, jamais l'ÉCRAN. Or c'est à l'écran que
    // Youssouf a vu ses défauts. Une barrière qui laisse passer ce que
    // l'utilisateur VOIT ne barre pas grand-chose.
    const doc = charger(REFUSE);
    dansUnDossierNeuf((dest) => {
      const r = materialiser(doc, dest);
      const codes = r.diagnostics.map((d) => d.code ?? "");
      expect(codes.some((c) => c.startsWith("PRESENTATION_")), "aucun juge d'écran n'a parlé")
        .toBe(true);
    });
  });

  it("ET ELLE NOMME LES DEUX FORMULAIRES — le « truc bizarre » de l'inspection", () => {
    // « quand je clique sur se connecter je vois des choses trop bizarres » :
    // l'écran portait DEUX formulaires, « J'ai déjà un compte » et « Créer un
    // compte », l'un sous l'autre. UNE FICHE, UN SEUL BUT.
    const doc = charger(REFUSE);
    dansUnDossierNeuf((dest) => {
      const r = materialiser(doc, dest);
      expect(r.diagnostics.map((d) => d.code)).toContain("PRESENTATION_FICHE_MULTIPLE");
    });
  });
});
