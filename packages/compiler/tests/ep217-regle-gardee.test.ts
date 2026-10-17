/**
 * EP-217 · UNE REGLE QUI NE VAUT QUE SOUS CONDITION — EXECUTEE.
 *
 * MESURE QUI A COMMANDE CE LOT, ecrite dans un cahier des charges REEL. La
 * tontine du Cameroun (version 1.2, § 3) exige :
 *
 *   « Tout membre ne possedant pas de smartphone ou de compte Mobile Money
 *     est rattache a un membre parrain certifie de l'association. »
 *
 * Inexprimable jusqu'ici, et la raison n'etait pas un operateur manquant :
 * les assertions d'une regle doivent TOUTES etre vraies, TOUJOURS. Exiger un
 * mandataire revenait donc a l'exiger de TOUT LE MONDE — y compris de ceux
 * qui ont un telephone, pour qui le parrainage n'a aucun sens.
 *
 * IL MANQUAIT LE SI.
 *
 * ── CE QUE CES PREUVES MESURENT.
 *
 * Un garde faux ne leve AUCUNE erreur : la regle ne s'applique jamais, elle
 * a l'air de proteger, et elle ne protege rien. On n'assere donc pas sur le
 * texte emis — on EXECUTE la regle sur les deux cotes du garde.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBackend } from "../src/compile-backend.ts";
import { migrateAirDocument, validateAir, type ProjectAir } from "@deribfy/air-schema";
// ── LE BINAIRE EST DÉCODÉ, ET LA DÉCISION EST UNIQUE (2026-10-17).
//
// Les faces de police embarquées voyagent en base64 dans la carte de fichiers.
// Écrire ce base64 EN TEXTE produit un fichier présent, non vide et INVALIDE —
// et une famille introuvable ne lève pas : elle retombe en silence sur la
// police système. NEUF écrivains existaient ; `fichiers-binaires.ts` est le
// seul endroit où la décision vit.
import { estBinaire } from "../../../packages/compiler/src/fichiers-binaires.ts";

const ICI = dirname(fileURLToPath(import.meta.url));
const DOC = join(ICI, "..", "..", "..", "slices", "tontine", "tontine.air.json");

const lu = (): ProjectAir =>
  migrateAirDocument(JSON.parse(readFileSync(DOC, "utf8")) as Record<string, unknown>);

/** LA REGLE DU CAHIER, mot pour mot : sans telephone ⇒ un mandataire. */
/**
 * LE DOCUMENT PORTE DESORMAIS CETTE REGLE.
 *
 * Elle y a ete posee des que 1.42.0 l'a rendue exprimable — c'etait le but.
 * Ces preuves en posaient une du meme identifiant : AIR_DUP_ID. Elles
 * prennent donc le leur, et mesurent le MECANISME du garde plutot que le
 * document du jour.
 */
const REGLE = {
  id: "rule_preuve_garde_mandataire",
  description: "Un membre sans telephone est rattache a un mandataire.",
  kind: "validation" as const,
  entityId: "ent_utilisateurs",
  appliqueSi: [
    { fieldId: "fld_utilisateurs_est_sans_telephone", operator: "eq" as const, value: true },
  ],
  assertions: [{ fieldId: "fld_utilisateurs_mandataire", operator: "required" as const }],
};

const avecRegle = (regle: unknown = REGLE): ProjectAir => {
  const air = JSON.parse(JSON.stringify(lu())) as ProjectAir;
  return {
    ...air,
    rules: [...air.rules, regle],
    backend: { kind: "genere", stack: "fastify" },
  } as ProjectAir;
};

const codes = (air: ProjectAir): string[] => validateAir(air).map((d) => d.code);

describe("EP-217 ① · le document porte ce que la regle designe", () => {
  it("`est_sans_telephone` et `mandataire` existent tous deux sur la personne", () => {
    // LE POINT QUI REND CE LOT PETIT : les deux champs sont sur la MEME
    // entite. Il ne manquait donc pas de traversee de relation — juste le SI.
    const u = lu().entities.find((e) => e.id === "ent_utilisateurs");
    expect(u?.fields.some((f) => f.id === "fld_utilisateurs_est_sans_telephone")).toBe(true);
    expect(u?.fields.some((f) => f.id === "fld_utilisateurs_mandataire")).toBe(true);
  });

  it("la regle gardee est VALIDE", () => {
    expect(codes(avecRegle())).toEqual([]);
  });

  it("le document SANS cette regle reste valide — additivite stricte", () => {
    expect(codes(lu())).toEqual([]);
  });
});

describe("EP-217 ② · UN GARDE FAUTIF EST REFUSE", () => {
  it("un champ inconnu dans le garde est refuse, et le chemin dit `appliqueSi`", () => {
    // Le chemin compte : la reparation doit savoir si c'est le garde ou
    // l'assertion qu'il faut corriger.
    const d = validateAir(
      avecRegle({
        ...REGLE,
        appliqueSi: [{ fieldId: "fld_inexistant", operator: "eq", value: true }],
      }),
    );
    expect(d.map((x) => x.code)).toContain("AIR_RULE_FIELD_UNKNOWN");
    expect(d.find((x) => x.code === "AIR_RULE_FIELD_UNKNOWN")?.path).toContain("appliqueSi");
  });

  it("UN GARDE QUI NE PEUT JAMAIS ETRE VRAI EST REFUSE", () => {
    // LE REFUS QUI COMPTE. Un garde impossible desactive SILENCIEUSEMENT la
    // regle : elle est presente, elle a l'air de proteger, et elle ne
    // s'applique jamais. Aucune erreur ne le dirait.
    const air = avecRegle({
      ...REGLE,
      entityId: "ent_tontines",
      appliqueSi: [
        { fieldId: "fld_tontines_statut", operator: "eq", value: "CET_ETAT_N_EXISTE_PAS" },
      ],
      assertions: [{ fieldId: "fld_tontines_nom", operator: "required" }],
    });
    const d = validateAir(air);
    expect(d.map((x) => x.code)).toContain("AIR_RULE_GARDE_IMPOSSIBLE");
    // Le message NOMME les valeurs possibles.
    const msg = d.find((x) => x.code === "AIR_RULE_GARDE_IMPOSSIBLE")?.message ?? "";
    expect(msg).toContain("EN_ATTENTE");
  });
});

describe("EP-217 ③ · LA REGLE S'APPLIQUE DES DEUX COTES DU GARDE", () => {
  /** Juger une ligne par la regle EMISE, sur une vraie base. */
  const juger = (ligne: Record<string, unknown>): boolean => {
    const dossier = mkdtempSync(join(tmpdir(), "deribfy-garde-"));
    try {
      for (const [chemin, contenu] of compileBackend(avecRegle()).files) {
        const cible = join(dossier, chemin);
        mkdirSync(dirname(cible), { recursive: true });
        writeFileSync(cible, estBinaire(cible) ? Buffer.from(contenu, "base64") : contenu);
      }
      execFileSync("ln", [
        "-s",
        join(ICI, "..", "..", "..", "node_modules"),
        join(dossier, "node_modules"),
      ]);
      writeFileSync(
        join(dossier, "pilote.mjs"),
        [
          "const { ouvrir, appliquerSchema } = await import('./src/base.ts');",
          "const { SCHEMA } = await import('./src/schema.ts');",
          "const regles = await import('./src/api/regles-metier.ts');",
          "const base = await ouvrir();",
          "await appliquerSchema(base, SCHEMA);",
          "const f = Object.entries(regles).find(([n]) => /^verifierUtilisateurs$/.test(n));",
          "if (f === undefined) throw new Error('regle non emise : ' + Object.keys(regles).join(','));",
          `const v = await f[1](${JSON.stringify(ligne)}, base);`,
          "console.log('@@' + (v === null ? 'ACCEPTE' : 'REFUSE:' + v.regle));",
        ].join("\n"),
      );
      const sortie = execFileSync(process.execPath, [join(dossier, "pilote.mjs")], {
        encoding: "utf8",
        cwd: dossier,
        timeout: 60_000,
        env: { ...process.env, DB_FICHIER: join(dossier, "d.sqlite"), NODE_OPTIONS: "" },
      });
      const l = sortie.split("\n").find((x) => x.startsWith("@@")) ?? "";
      return l.includes("ACCEPTE");
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  };

  /** Une ligne complete, pour que SEUL le garde decide du verdict. */
  const base = {
    nom_complet: "Awa",
    photo_profil: "https://exemple.test/p.jpg",
    est_president_verifie: 0,
    cree_le: "2026-01-01T00:00:00Z",
  };

  it("SANS TELEPHONE et SANS mandataire ⇒ REFUSE", () => {
    // C'est l'exigence du cahier, mot pour mot.
    expect(juger({ ...base, utilisateurs_est_sans_telephone: 1 })).toBe(false);
  });

  it("SANS TELEPHONE mais AVEC un mandataire ⇒ ACCEPTE", () => {
    expect(
      juger({ ...base, utilisateurs_est_sans_telephone: 1, utilisateurs_mandataire: "u1" }),
    ).toBe(true);
  });

  it("UN BOOLEEN DE LA BASE (0/1) VAUT CELUI DU DOCUMENT (true/false)", () => {
    // DEFAUT TROUVE EN ECRIVANT CE LOT, ET IL PREEXISTAIT. La ligne jugee est
    // `{ ...existante, ...corps }` : `existante` vient de la BASE, ou un
    // booleen vaut 0 ou 1, tandis que le document ecrit `true`. La
    // comparaison par texte donnait `"1" === "true"` — FAUX — et la regle
    // etait silencieusement sautee a la MISE A JOUR, alors qu'elle mordait a
    // la creation. Aucune erreur, aucun signe.
    //
    // Les quatre formes que la base et le document peuvent produire doivent
    // donc se comparer : 1, "1", true d'un cote ; 0, "0", false de l'autre.
    expect(juger({ ...base, utilisateurs_est_sans_telephone: 1 })).toBe(false);
    expect(juger({ ...base, utilisateurs_est_sans_telephone: true })).toBe(false);
    expect(juger({ ...base, utilisateurs_est_sans_telephone: "1" })).toBe(false);
    // Et l'autre cote, dans ses trois formes : la regle ne s'applique pas.
    expect(juger({ ...base, utilisateurs_est_sans_telephone: 0 })).toBe(true);
    expect(juger({ ...base, utilisateurs_est_sans_telephone: false })).toBe(true);
    expect(juger({ ...base, utilisateurs_est_sans_telephone: "0" })).toBe(true);
  });

  it("AVEC TELEPHONE et SANS mandataire ⇒ ACCEPTE — le garde protege vraiment", () => {
    // LA PREUVE QUI COMPTE. Sans le garde, cette ligne serait REFUSEE : la
    // regle aurait exige un mandataire de quelqu'un qui n'en a pas besoin.
    // C'est exactement le defaut que le SI corrige.
    expect(juger({ ...base, utilisateurs_est_sans_telephone: 0 })).toBe(true);
  });
});
