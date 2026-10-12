/**
 * LE SERVEUR NODE / FASTIFY — LE JUMEAU DU SPRING.
 *
 * Mesure qui a commandé ce lot : sur le MÊME document, un client Java
 * recevait 19 fichiers et 1 016 lignes ; un client Node recevait un
 * document à lire et écrivait les 1 016 lignes lui-même. Ce n'était pas le
 * même service.
 *
 * Ces preuves tiennent les TROIS REFUS que le contrat impose. Ils doivent
 * être DANS LE CODE ÉMIS, pas dans un commentaire — un refus commenté ne
 * refuse rien.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBackend } from "../src/compile-backend.ts";
import type { ProjectAir } from "@deribfy/air-schema";

const DOC = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "slices", "tontine", "tontine.air.json",
);
const air = (): ProjectAir =>
  ({
    ...(JSON.parse(readFileSync(DOC, "utf8")) as ProjectAir),
    backend: { kind: "genere", stack: "fastify" },
  });

const sortie = (): Map<string, string> => new Map(compileBackend(air()).files);
const tout = (): string => [...sortie().values()].join("\n");

describe("le document choisit la pile, pas le moteur", () => {
  it("`fastify` émet du TypeScript, et AUCUN Java", () => {
    const f = [...sortie().keys()];
    expect(f).toContain("src/serveur.ts");
    expect(f.some((x) => /\.java$|pom\.xml/u.test(x))).toBe(false);
  });

  it("`spring_boot` émet toujours du Java — rien n’a été remplacé", () => {
    const java = compileBackend({ ...air(), backend: { kind: "genere", stack: "spring_boot" } });
    expect([...java.files.keys()].some((x) => x.endsWith(".java"))).toBe(true);
  });

  it("un projet complet, pas des morceaux", () => {
    const f = [...sortie().keys()];
    for (const attendu of ["package.json", "tsconfig.json", "src/serveur.ts"]) {
      expect(f, attendu).toContain(attendu);
    }
    // Par entité : un modèle, un dépôt, des routes.
    const n = air().entities.length;
    expect(f.filter((x) => x.startsWith("src/modele/"))).toHaveLength(n);
    expect(f.filter((x) => x.startsWith("src/depot/"))).toHaveLength(n);
    expect(f.filter((x) => x.startsWith("src/api/") && x !== "src/api/regles-metier.ts")).toHaveLength(n);
  });
});

describe("les refus sont DANS le code, pas en commentaire", () => {
  // Les routes d'un journal EXISTENT et refusent, au lieu d'être absentes.
  // Une route absente répond 404 — « cette adresse n'existe pas » — ce qui
  // est faux : l'adresse existe, c'est le geste qui est interdit. Et c'est
  // le refus que prononce déjà la pile Java : un même document ne doit pas
  // vouloir dire deux choses selon le serveur qu'on en tire.
  it("une entité JOURNAL refuse la réécriture et l’effacement, en le disant", () => {
    const journaux = air().entities.filter((e) => e.appendOnly === true);
    expect(journaux.length, "le document de référence doit porter un journal").toBeGreaterThan(0);
    for (const e of journaux) {
      const src = sortie().get(`src/api/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      expect(src, e.id).toContain("AIR_JOURNAL_REECRITURE");
      expect(src, e.id).toContain("AIR_JOURNAL_SUPPRESSION");
      // Le refus doit être rendu, pas seulement nommé dans un commentaire.
      expect(src, e.id).toContain("rep.code(409)");
      // …et aucune route ne doit MODIFIER pour de vrai.
      expect(src, e.id).not.toContain("depot.modifier");
      expect(src, e.id).not.toContain("depot.supprimer");
    }
  });

  // Une transition non déclarée se refuse sur le SERVEUR. L'écran n'affiche
  // pas les boutons impossibles, mais la route s'appelle directement.
  it("une transition non déclarée est refusée côté serveur", () => {
    const s = sortie();
    let mesures = 0;
    for (const e of air().entities) {
      if (e.appendOnly === true) continue;
      const etats = e.fields.filter((f) => f.transitions !== undefined);
      if (etats.length === 0) continue;
      mesures += 1;
      const src = s.get(`src/api/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      expect(src, e.id).toContain("AIR_TRANSITION_INTERDITE");
      for (const f of etats) {
        for (const t of f.transitions ?? []) {
          expect(src, `${e.id}.${f.id}`).toContain(`${t.from}>${t.to}`);
        }
      }
    }
    expect(mesures, "le document de référence doit porter des transitions").toBeGreaterThan(0);
  });

  // Un `count`/`sum` traverse une relation : la requête dépend de la base
  // réelle. Rendre 0 serait le pire choix — une cagnotte à zéro ressemble à
  // une cagnotte vide. La fonction lève, et nomme le champ.
  it("un calcul qui demande la base LÈVE au lieu de rendre zéro", () => {
    const enBase = air().entities.flatMap((e) =>
      e.fields.filter((f) => f.derived?.kind === "count" || f.derived?.kind === "sum"),
    );
    if (enBase.length === 0) return;
    const src = sortie().get("src/calcul/en-base.ts") ?? "";
    for (const f of enBase) expect(src, f.id).toContain(`AIR_CALCUL_A_ECRIRE:${f.id}`);
    expect(src).not.toContain("return 0");
  });

  it("un champ SENSIBLE ne sort d’aucune lecture", () => {
    const s = sortie();
    for (const e of air().entities) {
      const sensibles = e.fields.filter((f) => f.sensitive === true);
      if (sensibles.length === 0) continue;
      const depot = s.get(`src/depot/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      const lues = /COLONNES_LUES = (\[[^\]]*\])/u.exec(depot)?.[1] ?? "[]";
      for (const f of sensibles) {
        expect(lues, `${e.id}.${f.id}`).not.toContain(f.id.replace(/^fld_/u, ""));
      }
    }
  });

  it("un champ CALCULÉ est absent du modèle — il ne se stocke jamais", () => {
    const s = sortie();
    for (const e of air().entities) {
      const calcules = e.fields.filter((f) => f.derived !== undefined);
      if (calcules.length === 0) continue;
      const modele = s.get(`src/modele/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      const corps = modele.slice(0, modele.indexOf("}"));
      for (const f of calcules) {
        expect(corps, `${e.id}.${f.id}`).not.toContain(`${f.id.replace(/^fld_/u, "")}:`);
      }
    }
  });
});

describe("ce qui dépend de la base ne se devine pas", () => {
  it("les trous portent un code repérable, pas un silence", () => {
    expect(tout()).toContain("AIR_DEPOT_A_ECRIRE");
  });

  it("aucun secret, aucune clé dans le code émis", () => {
    expect(tout()).not.toMatch(/password[ \t]*[:=][ \t]*["']?[A-Za-z0-9]{3,}/u);
    expect(tout()).not.toMatch(/sk-[A-Za-z0-9]{8,}/u);
  });
});
