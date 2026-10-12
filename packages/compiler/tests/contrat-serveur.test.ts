/**
 * LE CONTRAT DU SERVEUR — UNE PROMESSE QUI N'ÉTAIT PAS TENUE.
 *
 * Règle 51 du noyau : « Deribfy n'émet alors AUCUN code serveur, SEULEMENT
 * LE CONTRAT QUE CE SERVEUR DOIT HONORER ». `compileBackend` rendait une
 * carte vide. Le client repartait avec une application qui appelle un
 * serveur, et rien qui dise ce que ce serveur doit faire.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBackend } from "../src/compile-backend.ts";
import { emitProject } from "../src/emit-project.ts";
import type { ProjectAir } from "@deribfy/air-schema";

const DOC = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "slices", "validation-appareil", "validation-appareil.air.json",
);
const reel = (): ProjectAir => JSON.parse(readFileSync(DOC, "utf8")) as ProjectAir;
const avec = (kind: "externe" | undefined): ProjectAir =>
  ({ ...reel(), ...(kind === undefined ? {} : { backend: { kind } }) });

/** Le contrat est livre avec les DOCUMENTS de l'application, pas dans
 *  l'enveloppe du code serveur — celle-ci utilise « carte vide » comme
 *  signal de « rien a compiler », et le portail de compilation le lit. */
const contrat = (air: ProjectAir): string =>
  emitProject(air).files.get("CONTRAT-SERVEUR.md") ?? "";

describe("la promesse est tenue", () => {
  it("un serveur EXTERNE reçoit son contrat", () => {
    expect(contrat(avec("externe")).length).toBeGreaterThan(400);
  });

  it("l’enveloppe du CODE serveur reste VIDE — le portail le lit comme tel", () => {
    // Y glisser un document ferait chercher un projet Java au portail de
    // compilation : 30 serveurs sur 31 cassés, mesuré.
    expect([...compileBackend(avec("externe")).files.keys()]).toEqual([]);
  });

  it("un document SANS backend déclaré le reçoit aussi", () => {
    // Comportement d'avant 1.34.0 : aucun serveur écrit. Mais une
    // application qui appelle un serveur mérite de dire lequel.
    expect(contrat(avec(undefined))).toContain("Contrat du serveur");
  });

  it("AUCUN code serveur n’est émis — c’est la moitié de la promesse", () => {
    const f = [...emitProject(avec("externe")).files.keys()];
    expect(f.some((x) => /\.java$|pom\.xml|build\.gradle/u.test(x))).toBe(false);
  });
});

describe("ce que le contrat DIT au développeur", () => {
  const md = contrat(avec("externe"));

  it("les données, avec ce qui est obligatoire et ce qui est sensible", () => {
    expect(md).toContain("## Les données");
  });

  it("les règles à faire respecter, et POURQUOI côté serveur", () => {
    expect(md).toContain("une vérification côté client ne");
    expect(md).toContain("se contourne");
  });

  it("l’absence de contrôle d’accès se DIT, elle ne se tait pas", () => {
    // Le document de référence n'en déclare pas. Un silence ici serait
    // lu comme « rien à faire » — c'est l'inverse.
    expect(md).toContain("aucun** contrôle d’accès");
    expect(md).toContain("avant la");
  });

  it("ce que le serveur doit garder POUR LUI est nommé", () => {
    // Horloge et secret : le contrat les décrit, il ne les exécute pas.
    expect(md).toContain("horloge");
    expect(md).toContain("secret");
  });

  it("JAMAIS une clé, jamais un identifiant", () => {
    expect(md).not.toMatch(/sk-[a-zA-Z0-9]|password|api[_-]?key\s*[:=]/iu);
  });
});

describe("ce qui se calcule et ne se stocke jamais", () => {
  it("sort en PREMIER quand il y en a — c’est la faute la plus facile", () => {
    const air = reel();
    const e = (air.entities as { fields: unknown[] }[])[0];
    e?.fields.push({
      id: "fld_total", name: "total", required: false, type: "number",
      label: [{ locale: "fr", text: "Total" }],
      derived: { kind: "bareme", fieldId: "fld_depart_places",
        paliers: [{ jusqua: 150, prixUnitaire: 85 }, { prixUnitaire: 125 }],
        mode: "par_tranche", fraisFixes: 402 },
    });
    const md = contrat({ ...air, backend: { kind: "externe" } });
    expect(md).toContain("ne se stocke JAMAIS");
    expect(md).toContain("barème");
    expect(md.indexOf("ne se stocke JAMAIS")).toBeLessThan(md.indexOf("## Les données"));
  });
});
