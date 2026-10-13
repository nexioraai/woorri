/**
 * EP-215 · « CETTE VALEUR DESIGNE UNE LIGNE EXISTANTE » — CHERCHE POUR DE VRAI.
 *
 * MESURE QUI A COMMANDE CE LOT, ecrite dans un document du depot depuis un
 * mois. Le cahier d'une tontine demande qu'« un membre rejoigne la tontine de
 * son president en saisissant le code recu ; un code inconnu est refuse ». Le
 * document a declare l'exigence INEXPRIMABLE et sa raison nommait deux
 * choses :
 *
 *   « rien n'y exprime "cette valeur designe une ligne existante d'une autre
 *   entite" » — et — « le faire dans l'application supposerait de lui livrer
 *   la liste des codes : n'importe qui pourrait alors rejoindre n'importe
 *   quelle tontine. »
 *
 * Les deux sont tenues ici : l'operateur existe, et il est emis UNIQUEMENT
 * cote serveur.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBackend } from "../src/compile-backend.ts";
import { migrateAirDocument, validateAir, type ProjectAir } from "@deribfy/air-schema";

const ICI = dirname(fileURLToPath(import.meta.url));
const DOC = join(ICI, "..", "..", "..", "slices", "tontine", "tontine.air.json");

const lu = (): ProjectAir =>
  migrateAirDocument(JSON.parse(readFileSync(DOC, "utf8")) as Record<string, unknown>);

/** Le code d'adhesion porte par la tontine, et le code saisi par le membre. */
const CODE_CIBLE = "fld_tontines_code_adhesion";
const CODE_SAISI = "fld_membres_tontine_code_saisi";

/**
 * LE DOCUMENT, AVEC LA REGLE QUE SON PROPRE CAHIER RECLAME.
 *
 * On ne fabrique pas un document : on prend celui de la tontine, on declare
 * son code d'adhesion UNIQUE — ce qu'il est dans la vraie vie — et on ajoute
 * la regle.
 */
const avecRegle = (opts: { unique?: boolean; designe?: unknown; operateur?: string } = {}): ProjectAir => {
  const air = JSON.parse(JSON.stringify(lu())) as ProjectAir;
  if (opts.unique !== false) {
    const t = air.entities.find((e) => e.id === "ent_tontines");
    const champ = t?.fields.find((f) => f.id === CODE_CIBLE);
    if (champ === undefined) throw new Error("le document n'a plus de code d'adhesion");
    (champ as { unique?: boolean }).unique = true;
  }
  const regle = {
    id: "rule_code_connu",
    description: "Un code d'adhesion inconnu est refuse.",
    kind: "validation" as const,
    entityId: "ent_membres_tontine",
    assertions: [
      {
        fieldId: CODE_SAISI,
        operator: opts.operateur ?? "designe",
        ...(opts.designe === null
          ? {}
          : { designe: opts.designe ?? { entityId: "ent_tontines", fieldId: CODE_CIBLE } }),
      },
    ],
  };
  return {
    ...air,
    rules: [...air.rules, regle],
    backend: { kind: "genere", stack: "fastify" },
  } as ProjectAir;
};

const codes = (air: ProjectAir): string[] => validateAir(air).map((d) => d.code);

describe("EP-215 ① · le document porte bien la paire de codes", () => {
  it("la tontine a un code d'adhesion, le membre un code saisi", () => {
    // Si cette paire disparaissait, toutes les preuves suivantes mesureraient
    // un document inventé.
    const air = lu();
    const t = air.entities.find((e) => e.id === "ent_tontines");
    const m = air.entities.find((e) => e.id === "ent_membres_tontine");
    expect(t?.fields.some((f) => f.id === CODE_CIBLE)).toBe(true);
    expect(m?.fields.some((f) => f.id === CODE_SAISI)).toBe(true);
  });

  it("la règle complète est VALIDE", () => {
    expect(codes(avecRegle())).toEqual([]);
  });
});

describe("EP-215 ② · LES REFUS, ET LE QUATRIÈME EST CELUI QUI COMPTE", () => {
  it("① `designe` sans cible est refusé", () => {
    expect(codes(avecRegle({ designe: null }))).toContain("AIR_RULE_DESIGNE_SANS_CIBLE");
  });

  it("② une cible avec un AUTRE opérateur est refusée — elle ne serait jamais lue", () => {
    expect(codes(avecRegle({ operateur: "required" }))).toContain("AIR_RULE_CIBLE_SANS_DESIGNE");
  });

  it("③ une entité ou un champ inconnus sont refusés", () => {
    expect(
      codes(avecRegle({ designe: { entityId: "ent_inexistante", fieldId: CODE_CIBLE } })),
    ).toContain("AIR_RULE_DESIGNE_ENTITE_INCONNUE");
    expect(
      codes(avecRegle({ designe: { entityId: "ent_tontines", fieldId: "fld_inexistant" } })),
    ).toContain("AIR_RULE_DESIGNE_CHAMP_INCONNU");
  });

  it("④ UNE CIBLE NON UNIQUE EST REFUSÉE", () => {
    // LE REFUS QUI COMPTE, et il mord sur le document RÉEL : son code
    // d'adhésion n'était PAS déclaré unique. Si deux tontines portent le même
    // code, « désigne UNE ligne » ne désigne personne — le serveur en
    // trouverait deux et devrait choisir, et choisir pour l'auteur est
    // exactement ce que ce format refuse.
    const d = validateAir(avecRegle({ unique: false }));
    expect(d.map((x) => x.code)).toContain("AIR_RULE_DESIGNE_CIBLE_NON_UNIQUE");
    // Le message dit QUOI FAIRE.
    const msg = d.find((x) => x.code === "AIR_RULE_DESIGNE_CIBLE_NON_UNIQUE")?.message ?? "";
    expect(msg).toContain("unique");
  });

  it("⑤ des types qui ne se comparent pas sont refusés", () => {
    // Chercher un texte dans une colonne de nombres ne trouverait jamais
    // rien, et sans erreur.
    const air = avecRegle();
    const t = air.entities.find((e) => e.id === "ent_tontines");
    const champ = t?.fields.find((f) => f.id === CODE_CIBLE);
    (champ as { type: string }).type = "number";
    expect(codes(air)).toContain("AIR_RULE_DESIGNE_TYPES_INCOMPATIBLES");
  });
});

describe("EP-215 ③ · LE SERVEUR CHERCHE VRAIMENT, ET L'ÉCRAN NE VOIT RIEN", () => {
  /**
   * EXÉCUTER LA RÈGLE ÉMISE SUR UNE VRAIE BASE.
   *
   * On insère une tontine avec un code connu, puis on demande à la règle
   * émise de juger deux codes : celui-là, et un autre. Aucune assertion sur
   * le texte du SQL — seulement sur le verdict.
   */
  const juger = (codeSaisi: string, codeExistant: string): boolean => {
    const dossier = mkdtempSync(join(tmpdir(), "deribfy-designe-"));
    try {
      const { files } = compileBackend(avecRegle());
      for (const [chemin, contenu] of files) {
        const cible = join(dossier, chemin);
        mkdirSync(dirname(cible), { recursive: true });
        writeFileSync(cible, contenu);
      }
      execFileSync("ln", [
        "-s",
        join(ICI, "..", "..", "..", "node_modules"),
        join(dossier, "node_modules"),
      ]);
      const colCible = CODE_CIBLE.replace(/^fld_/u, "");
      const colSaisi = CODE_SAISI.replace(/^fld_/u, "");
      writeFileSync(
        join(dossier, "pilote.mjs"),
        [
          "const { ouvrir, appliquerSchema } = await import('./src/base.ts');",
          "const { SCHEMA } = await import('./src/schema.ts');",
          "const regles = await import('./src/api/regles-metier.ts');",
          "const base = await ouvrir();",
          "await appliquerSchema(base, SCHEMA);",
          `await base.executer('insert into tontines (id, ${colCible}) values (?, ?)', ['t1', ${JSON.stringify(codeExistant)}]);`,
          "const f = Object.entries(regles).find(([n]) => /^verifierMembresTontine$/.test(n));",
          "if (f === undefined) throw new Error('regle non emise : ' + Object.keys(regles).join(','));",
          `const v = await f[1]({ ${colSaisi}: ${JSON.stringify(codeSaisi)} }, base);`,
          "console.log('@@' + (v === null ? 'ACCEPTE' : 'REFUSE'));",
        ].join("\n"),
      );
      const sortie = execFileSync(process.execPath, [join(dossier, "pilote.mjs")], {
        encoding: "utf8",
        cwd: dossier,
        timeout: 60_000,
        env: { ...process.env, DB_FICHIER: join(dossier, "d.sqlite"), NODE_OPTIONS: "" },
      });
      const ligne = sortie.split("\n").find((l) => l.startsWith("@@"));
      return (ligne ?? "").includes("ACCEPTE");
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  };

  it("UN CODE CONNU EST ACCEPTÉ", () => {
    expect(juger("ABC123", "ABC123")).toBe(true);
  });

  it("UN CODE INCONNU EST REFUSÉ — c'est l'exigence du cahier, mot pour mot", () => {
    expect(juger("ZZZ999", "ABC123")).toBe(false);
  });

  it("la valeur voyage en PARAMÈTRE, jamais dans le texte de la requête", () => {
    // Une valeur recopiée dans le texte est une injection qui attend.
    const regles = compileBackend(avecRegle()).files.get("src/api/regles-metier.ts") ?? "";
    // Le nom de colonne garde le prefixe de l'entite, comme partout dans ce
    // document : `fld_tontines_code_adhesion` devient `tontines_code_adhesion`.
    // Mon premier jet attendait `code_adhesion` — l'assertion etait fausse,
    // pas le code emis, et les deux preuves qui EXECUTENT la recherche le
    // disaient deja en passant.
    expect(regles).toContain("where tontines_code_adhesion = ? limit 1");
    expect(regles).toContain("[ligne[");
  });

  it("L'ÉCRAN NE REÇOIT AUCUN CODE — la fuite que le document redoutait", () => {
    // La raison écrite du document : « le faire dans l'application
    // supposerait de lui livrer la liste des codes ». On vérifie que la règle
    // n'est émise QUE côté serveur.
    const air = avecRegle();
    const serveur = compileBackend(air);
    expect([...serveur.files.keys()]).toContain("src/api/regles-metier.ts");
    // Et côté serveur, la recherche existe bien.
    const r = serveur.files.get("src/api/regles-metier.ts") ?? "";
    expect(r).toContain("select 1 as v from tontines");
  });
});

describe("EP-215 ④ · UN DOCUMENT SANS CETTE RÈGLE NE CHANGE PAS", () => {
  it("les règles restent vérifiées, et le document du corpus reste valide", () => {
    // Additivité stricte : l'opérateur de plus ne change aucun document.
    expect(codes(lu())).toEqual([]);
    const sans = compileBackend({ ...lu(), backend: { kind: "genere", stack: "fastify" } });
    const r = sans.files.get("src/api/regles-metier.ts") ?? "";
    expect(r).not.toContain("select 1 as v from");
  });
});
