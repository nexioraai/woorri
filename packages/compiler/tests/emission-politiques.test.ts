// ════════════════════════════════════════════════════════════════════
//  LE SQL DES POLITIQUES — DÉTERMINISTE, IDEMPOTENT, ET SANS `using (true)`
//  AILLEURS QUE SUR UNE VITRINE EN LECTURE.
// ════════════════════════════════════════════════════════════════════
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, assertValidAir, derivePlanAcces } from "@deribfy/air-schema";
import { emettreSqlAcces } from "../src/emit-rls.ts";

// Motif maison : la racine se derive du FICHIER, jamais du repertoire
// d'appel — `process.cwd()` change selon qui lance vitest.
const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const lire = (chemin: string) =>
  assertValidAir(
    migrateAirDocument(JSON.parse(readFileSync(join(RACINE, chemin), "utf8")) as Record<string, unknown>),
  );

const GESTION = "slices/gestion/gestion.air.json"; // organisation, gardée par droits
const DOUGPLACE = "slices/dougplace/dougplace.air.json"; // identité + possédées + vitrines

describe("le SQL émis", () => {
  it("gestion : chaque table est protégée, et le prédicat EXIGE de porter le droit", () => {
    const sql = emettreSqlAcces(derivePlanAcces(lire(GESTION)));
    expect(sql).toBeDefined();
    if (sql === undefined) return;
    expect(sql).toContain("enable row level security");
    // FORCE : le propriétaire de la table lui-même est soumis — sans quoi un
    // rôle de service contourne tout en silence.
    expect(sql).toContain("force row level security");
    expect(sql).toContain("air_role_attributions");
    // aucune politique ouverte : ces données sont celles d'une organisation
    expect(sql).not.toMatch(/using \(true\)/u);
    expect(sql).toMatch(/create policy air_\w+_right_\w+_select/u);
  });

  it("dougplace : lecture publique SEULEMENT sur les vitrines, possession ailleurs", () => {
    const plan = derivePlanAcces(lire(DOUGPLACE));
    const sql = emettreSqlAcces(plan);
    expect(sql).toBeDefined();
    if (sql === undefined) return;
    // `using (true)` existe — et UNIQUEMENT pour des `select` de vitrine
    const ouvertes = [...sql.matchAll(/create policy (\w+) on public\.(\w+) for (\w+) using \(true\)/gu)];
    expect(ouvertes.length).toBeGreaterThan(0);
    for (const m of ouvertes) {
      expect(m[3]).toBe("select");
      const table = plan.tables.find((t) => t.table === m[2]);
      expect(table?.portee.kind).toBe("vitrine");
    }
    // et la possession s'écrit en termes de l'identité de session
    expect(sql).toContain("auth.uid()");
  });

  it("idempotent : chaque politique est retirée avant d'être posée", () => {
    const sql = emettreSqlAcces(derivePlanAcces(lire(DOUGPLACE))) ?? "";
    const creations = [...sql.matchAll(/create policy (\w+) on/gu)].map((m) => m[1]);
    for (const nom of creations) {
      expect(sql).toContain(`drop policy if exists ${String(nom)} on`);
    }
    expect(creations.length).toBeGreaterThan(0);
  });

  it("déterministe : même document ⇒ même SQL, octet pour octet", () => {
    const a = emettreSqlAcces(derivePlanAcces(lire(GESTION)));
    const b = emettreSqlAcces(derivePlanAcces(lire(GESTION)));
    expect(a).toBe(b);
  });

  it("les noms de politiques sont uniques — deux politiques ne s'écrasent pas", () => {
    for (const chemin of [GESTION, DOUGPLACE]) {
      const plan = derivePlanAcces(lire(chemin));
      const noms = plan.tables.flatMap((t) => t.politiques.map((p) => p.nom));
      expect(new Set(noms).size).toBe(noms.length);
    }
  });

  it("un document sans rien à protéger n'émet AUCUN script — pas un script vide rassurant", () => {
    const plan = { tables: [] as never[] };
    expect(emettreSqlAcces(plan)).toBeUndefined();
  });

  it("append_only : ni mise à jour ni suppression, par ABSENCE de politique", () => {
    const air = lire(DOUGPLACE);
    const plan = derivePlanAcces(air);
    const ao = plan.tables.filter((t) => t.appendOnly);
    for (const table of ao) {
      expect(table.politiques.some((p) => p.operation === "update")).toBe(false);
      expect(table.politiques.some((p) => p.operation === "delete")).toBe(false);
    }
  });
});
