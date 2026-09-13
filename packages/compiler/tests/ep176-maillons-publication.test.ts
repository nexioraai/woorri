// EP-176 — LES QUATRE MAILLONS ENTRE « LE DOCUMENT COMPILE » ET « L'APP SERT ».
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { jugerCapacitesSansIntegration } from "../../../benchmarks/air-emission/acceptation.mjs";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RES = join(R, "benchmarks", "air-emission", "results");
const DOC = JSON.parse(
  readFileSync(
    join(RES, readdirSync(RES).find((f) => f.includes("marche-immobilier") && f.includes("attempt2"))!),
    "utf8",
  ),
) as Record<string, any>;
const codes = (d: readonly { code: string }[]): string[] => d.map((x) => x.code);

describe("EP-176 ① · une capacité de service désigne son intégration", () => {
  it("LE CAS RÉEL — `auth` déclarée, aucune intégration ne la porte : REFUSÉ", () => {
    // MESURÉ sur EP-174 : les TROIS intégrations avaient `capability` absent,
    // et le compilateur n'émet le client d'authentification que si une
    // intégration porte `capability === "auth"`. Le code existait, sa
    // condition ne se déclenchait jamais.
    expect((DOC.integrations ?? []).every((i: { capability?: string }) => i.capability === undefined)).toBe(true);
    expect(codes(jugerCapacitesSansIntegration(DOC))).toEqual(["AIR_CAPACITE_SERVICE_SANS_INTEGRATION"]);
  });

  it("LE LIEN POSÉ, LE JUGE SE TAIT", () => {
    const lie = structuredClone(DOC);
    lie.integrations[0].capability = "auth";
    expect(jugerCapacitesSansIntegration(lie)).toEqual([]);
  });

  it("UNE CAPACITÉ D'APPAREIL N'EXIGE AUCUNE INTÉGRATION — pas un refus systématique", () => {
    // `external_contact` et `media_upload` sont déclarées sur ce document et
    // ne produisent aucun diagnostic : seules les capacités de SERVICE en
    // exigent une.
    expect((DOC.capabilities ?? []).length).toBeGreaterThan(1);
    expect(jugerCapacitesSansIntegration(DOC)).toHaveLength(1);
  });

  it("LA RÈGLE EST DÉRIVÉE DU REGISTRE — aucune capacité citée en dur", async () => {
    const src = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    const bloc = src.slice(
      src.indexOf("export function jugerCapacitesSansIntegration"),
      src.indexOf("export function jugerAcceptation"),
    );
    const code = bloc.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
    expect(code, "capacité citée en dur").not.toMatch(/"(auth|analytics)"/);
    expect(code).toContain("provider_service");
  });

  it("ET LA RÈGLE EST TRANSMISE — le moteur dit ce qu'il exige (EP-122)", () => {
    // La racine était la TRANSMISSION : le prompt mentionnait `capability`
    // treize fois, toutes pour `actions.effect.capability`.
    const src = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(src).toContain("17bis. UNE CAPACITÉ DE SERVICE DÉSIGNE SON INTÉGRATION");
    expect(src, "la liste doit être dérivée du registre").toContain("capacitesDeService()");
    const helper = src.slice(src.indexOf("function capacitesDeService"), src.indexOf("function capacitesDeService") + 400);
    expect(helper).toContain("provider_service");
    expect(helper, "capacité citée en dur dans le prompt").not.toMatch(/"auth"/);
  });
});

describe("EP-176 ② · l'icône est écrite en OCTETS", () => {
  it("le compilateur ne met plus de base64 dans la carte de TEXTE", () => {
    const src = readFileSync(join(R, "packages", "compiler", "src", "emit-project.ts"), "utf8");
    expect(src, "le base64 est encore écrit comme texte").not.toContain(
      'files.set("assets/marque.png", air.app.brandIconPngBase64)',
    );
    expect(src).toContain('binaries.set("assets/marque.png", decodeBase64(');
  });

  it("LA BRANCHE EST ENFIN EXÉCUTÉE — et elle rend de VRAIS octets", async () => {
    // Elle n'avait JAMAIS tourné : aucun document n'a jamais porté
    // `brandIconPngBase64`. On la fait tourner pour de bon, sur un PNG 1×1
    // réel, et on vérifie la SIGNATURE — 0x89 'P' 'N' 'G'. Lire la source
    // n'aurait prouvé que l'intention.
    const { emitProject } = await import("../src/emit-project.ts");
    const PNG_1x1 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const avec = structuredClone(DOC) as {
      app: { brandIconPngBase64?: string };
      screens: { id: string; showsPrimaryNav?: boolean }[];
      navigation: { primary?: { destinations: { routeId: string }[] }; routes: { id: string; screenId: string }[] };
    };
    avec.app.brandIconPngBase64 = PNG_1x1;
    // Le document d'EP-174 porte encore son diagnostic bloquant
    // (`AIR_NAV_DESTINATION_SANS_BARRE`) : une destination de la barre qui la
    // masque. On le lève ICI pour exercer la branche de l'icône — on ne le
    // masque pas, il est traité en EP-175 ① à la source, dans le PLAN.
    const cibles = new Set(
      (avec.navigation.primary?.destinations ?? []).map(
        (d) => avec.navigation.routes.find((r) => r.id === d.routeId)?.screenId,
      ),
    );
    for (const e of avec.screens) if (cibles.has(e.id)) delete e.showsPrimaryNav;
    const emis = emitProject(avec);
    const octets = emis.binaries.get("assets/marque.png");
    expect(octets, "la marque n'a pas été émise").toBeDefined();
    expect([...octets!.slice(0, 4)], "signature PNG non restituée").toEqual([0x89, 0x50, 0x4e, 0x47]);
    // Et surtout : elle n'est PLUS dans la carte de texte.
    expect(emis.files.has("assets/marque.png"), "l'image est encore du texte").toBe(false);
  });

  it("LES OCTETS VOYAGENT — `EmittedProject` les expose", () => {
    const src = readFileSync(join(R, "packages", "compiler", "src", "emit-project.ts"), "utf8");
    expect(src).toContain("binaries: ReadonlyMap<string, Uint8Array>");
    expect(src).toContain("return { lock, files, binaries };");
  });

  it("LE VRAI SUJET — combien de branches du compilateur n'ont jamais tourné", () => {
    // Le cliquet qu'EP-161 a posé sur les JUGES, porté aux BRANCHES : un champ
    // OPTIONNEL du contrat que le compilateur consomme, et qu'AUCUN document
    // ne porte, est une branche jamais éprouvée. MESURÉ : 2 sur 25 — et
    // l'une des deux était cassée depuis toujours.
    const air = readFileSync(join(R, "packages", "air-schema", "src", "air.ts"), "utf8");
    const optionnels = [...new Set([...air.matchAll(/^\s{2,}(\w+):\s*[^\n]*\.optional\(\)/gm)].map((m) => m[1]!))];
    const compilo =
      readFileSync(join(R, "packages", "compiler", "src", "emit-project.ts"), "utf8") +
      readFileSync(join(R, "packages", "compiler", "src", "emit-manifests.ts"), "utf8");
    const consommes = optionnels.filter((c) => new RegExp(`\\.${c}\\b`).test(compilo));
    const docs = readdirSync(RES)
      .filter((f) => f.endsWith(".air.json") && !f.includes("modele"))
      .map((f) => readFileSync(join(RES, f), "utf8"));
    const jamais = consommes.filter((c) => !docs.some((d) => d.includes(`"${c}"`)));
    expect(consommes.length, "le crible ne voit rien").toBeGreaterThan(10);
    // Le compte est CONSIGNÉ, pas figé : il doit rester petit et connu.
    expect(jamais.sort()).toEqual(["brandIconPngBase64", "overrides"]);
  });
});

describe("EP-176 ③ · les captures au format Apple", () => {
  it("la taille actuelle N'EST PAS déposable, et le cliquet le dit", async () => {
    const { tailleDeposable, TAILLES_FICHE_APPLE } = await import("../../oracle/src/e2e-flows.ts");
    // MESURÉ sur les deux PNG réels du dépôt : 1206×2622, un iPhone 6,1".
    expect(tailleDeposable(1206, 2622), "1206×2622 accepté à tort").toBe(false);
    expect(tailleDeposable(1320, 2868)).toBe(true);
    expect(TAILLES_FICHE_APPLE.filter((t) => t.requis).length).toBeGreaterThan(0);
  });

  it("CHAQUE TAILLE NOMME SON SIMULATEUR — ce n'est pas un redimensionnement", async () => {
    // Redimensionner 6,1 → 6,9 étirerait des pixels, et Apple refuse les
    // images upscalées. C'est le bon APPAREIL qu'il faut, pas un filtre.
    const { TAILLES_FICHE_APPLE } = await import("../../oracle/src/e2e-flows.ts");
    for (const t of TAILLES_FICHE_APPLE) {
      expect(t.simulateur, `${t.largeur}×${t.hauteur} sans simulateur`).toMatch(/^iPhone /);
      expect(t.hauteur).toBeGreaterThan(t.largeur);
    }
  });
});

describe("EP-176 ④ · eas.json", () => {
  it("le compilateur l'émet, à côté d'app.json", () => {
    const src = readFileSync(join(R, "packages", "compiler", "src", "emit-project.ts"), "utf8");
    expect(src).toContain('files.set(\n    "eas.json"');
    expect(src.indexOf('files.set("app.json"')).toBeLessThan(src.indexOf('"eas.json"'));
  });

  it("IL NE PORTE NI SECRET NI COMPTE — c'est ce qui le rend émettable", () => {
    // Le contrat interdit les secrets (non-négociable #13) et le propriétaire
    // seul possède les comptes. `eas submit` les lira depuis son profil.
    const src = readFileSync(join(R, "packages", "compiler", "src", "emit-project.ts"), "utf8");
    const bloc = src.slice(src.indexOf('"eas.json"'), src.indexOf('"eas.json"') + 1200);
    for (const interdit of ["appleId", "ascAppId", "appleTeamId", "serviceAccountKeyPath"]) {
      expect(bloc, `eas.json porte ${interdit}`).not.toContain(interdit);
    }
    expect(bloc, "les profils simulateur doivent exister").toContain("simulator: true");
  });
});
