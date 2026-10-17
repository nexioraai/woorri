/**
 * EP-216 · L'ENCHERE — LE PLUS HAUT, ET QUI LE PORTE, EXECUTES EN SQL.
 *
 * MESURE QUI A COMMANDE CE LOT, ecrite dans un document du depot. Le cahier
 * d'une tontine attribue le pot « par enchere : le membre qui propose la plus
 * forte prime l'emporte ». Le document a declare l'exigence INEXPRIMABLE :
 * « le format decrit des ecrans, des listes et des gestes individuels ; il
 * n'a aucun noeud pour un mecanisme ou le geste d'un membre invalide celui
 * d'un autre ».
 *
 * ── CE QUE CE LOT FAIT, ET CE QU'IL NE FAIT PAS.
 *
 * IL FAIT : « la plus forte prime » (`max`) et « qui l'emporte » (`porteur`).
 * IL NE FAIT PAS : la CLOTURE. Fermer une enchere a une heure dite demande une
 * horloge, et le format refuse de dire ce qui arrive de soi-meme. Une cloture
 * par un GESTE — le president ferme — etait deja exprimable.
 *
 * ── ET L'EGALITE EST LE COEUR DU LOT.
 *
 * Deux membres peuvent proposer exactement la meme prime. Sans departage, le
 * serveur rendrait « la premiere ligne que la base lui donne » — un ordre qui
 * depend du moteur et de l'index. Les preuves ci-dessous mettent DEUX offres
 * egales et verifient que le gagnant est celui que le DOCUMENT designe.
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

/** Le montant d'une transaction, et sa date : les deux viennent du document. */
const champMontant = (): string => {
  const e = lu().entities.find((x) => x.id === "ent_transactions");
  const f = e?.fields.find((x) => x.type === "decimal" || x.type === "number");
  if (f === undefined) throw new Error("le document n'a plus de montant sur les transactions");
  return f.id;
};
const champDate = (): string => {
  const e = lu().entities.find((x) => x.id === "ent_transactions");
  const f = e?.fields.find((x) => x.type === "datetime" || x.type === "date");
  if (f === undefined) throw new Error("le document n'a plus de date sur les transactions");
  return f.id;
};

/** Le document, plus les deux champs que l'enchere reclame. */
/**
 * LE DOCUMENT PORTE DESORMAIS SA PROPRE ENCHERE.
 *
 * Depuis que le cahier de la tontine est applique, `tontine.air.json` declare
 * `prime_la_plus_forte` et `enchere_gagnante`. Ces preuves en posaient
 * d'identiques — AIR_DUP_ID, et le cliquet avait raison. Elles prennent donc
 * des identifiants A ELLES : elles mesurent le MECANISME, pas le document du
 * jour, et resteront vraies quoi qu'il declare demain.
 */
const avecEnchere = (porteur?: Record<string, unknown>): ProjectAir => {
  const air = JSON.parse(JSON.stringify(lu())) as ProjectAir;
  const t = air.entities.find((e) => e.id === "ent_tontines");
  if (t === undefined) throw new Error("entité des tontines introuvable");
  t.fields = [
    ...t.fields,
    {
      id: "fld_tontines_preuve_prime_max",
      name: "preuve_prime_max",
      type: "decimal",
      required: false,
      derived: { kind: "max", relationId: "rel_transaction_tontine", fieldId: champMontant() },
    },
    {
      id: "fld_tontines_preuve_gagnant",
      name: "preuve_gagnant",
      type: "string",
      required: false,
      derived:
        porteur ?? {
          kind: "porteur",
          relationId: "rel_transaction_tontine",
          fieldId: champMontant(),
          // LE PLUS ANCIEN L'EMPORTE EN CAS D'EGALITE. C'est le document qui
          // le dit — le moteur ne choisit pas a sa place.
          departage: { fieldId: champDate(), sens: "asc" },
        },
    },
  ] as never;
  return { ...air, backend: { kind: "genere", stack: "fastify" } };
};

const codes = (air: ProjectAir): string[] => validateAir(air).map((d) => d.code);

describe("EP-216 ① · le document porte ce qu'il faut, et l'enchère est valide", () => {
  it("les transactions ont un montant et une date", () => {
    expect(champMontant().startsWith("fld_")).toBe(true);
    expect(champDate().startsWith("fld_")).toBe(true);
  });

  it("`max` et `porteur` correctement déclarés sont valides", () => {
    expect(codes(avecEnchere())).toEqual([]);
  });
});

describe("EP-216 ② · LES REFUS, ET LE DERNIER EST LE PLUS UTILE", () => {
  it("classer un champ qui ne s'ordonne pas est refusé", () => {
    // Sur un texte ou un enum, chaque base SQL trancherait autrement.
    const air = avecEnchere({
      kind: "porteur",
      relationId: "rel_transaction_tontine",
      fieldId: "fld_transactions_statut",
      departage: { fieldId: champDate(), sens: "asc" },
    });
    expect(codes(air)).toContain("AIR_EXTREMUM_CHAMP_NON_ORDONNABLE");
  });

  it("un départage inconnu est refusé — rien ne départagerait", () => {
    const air = avecEnchere({
      kind: "porteur",
      relationId: "rel_transaction_tontine",
      fieldId: champMontant(),
      departage: { fieldId: "fld_inexistant", sens: "asc" },
    });
    expect(codes(air)).toContain("AIR_PORTEUR_DEPARTAGE_INCONNU");
  });

  it("DÉPARTAGER PAR LE CHAMP SUR LEQUEL IL Y A ÉGALITÉ EST REFUSÉ", () => {
    // LE REFUS LE PLUS UTILE : il a l'air correct, et il ne départage RIEN.
    // Son auteur croirait le contraire, et le gagnant dépendrait de l'index.
    const air = avecEnchere({
      kind: "porteur",
      relationId: "rel_transaction_tontine",
      fieldId: champMontant(),
      departage: { fieldId: champMontant(), sens: "asc" },
    });
    expect(codes(air)).toContain("AIR_PORTEUR_DEPARTAGE_INUTILE");
  });
});

describe("EP-216 ③ · L'ENCHÈRE SE JOUE VRAIMENT, ÉGALITÉ COMPRISE", () => {
  /** Jouer l'enchère sur une vraie base, et lire le verdict émis. */
  const jouer = (
    offres: readonly { id: string; montant: number; date: string }[],
    sensDepartage: "asc" | "desc" = "asc",
  ): { max: number; gagnant: string | null } => {
    const dossier = mkdtempSync(join(tmpdir(), "deribfy-enchere-"));
    try {
      const air = avecEnchere({
        kind: "porteur",
        relationId: "rel_transaction_tontine",
        fieldId: champMontant(),
        departage: { fieldId: champDate(), sens: sensDepartage },
      });
      for (const [chemin, contenu] of compileBackend(air).files) {
        const cible = join(dossier, chemin);
        mkdirSync(dirname(cible), { recursive: true });
        writeFileSync(cible, estBinaire(cible) ? Buffer.from(contenu, "base64") : contenu);
      }
      execFileSync("ln", [
        "-s",
        join(ICI, "..", "..", "..", "node_modules"),
        join(dossier, "node_modules"),
      ]);
      const colMontant = champMontant().replace(/^fld_/u, "");
      const colDate = champDate().replace(/^fld_/u, "");
      const relCol =
        lu()
          .entities.find((e) => e.id === "ent_transactions")
          ?.fields.find((f) => f.referencesEntityId === "ent_tontines")
          ?.id.replace(/^fld_/u, "") ?? "";
      writeFileSync(
        join(dossier, "pilote.mjs"),
        [
          "const { ouvrir, appliquerSchema } = await import('./src/base.ts');",
          "const { SCHEMA } = await import('./src/schema.ts');",
          "const calculs = await import('./src/calcul/en-base.ts');",
          "const base = await ouvrir();",
          "await appliquerSchema(base, SCHEMA);",
          `const offres = ${JSON.stringify(offres)};`,
          "for (const o of offres) {",
          "  await base.executer(",
          `    'insert into transactions (id, ${relCol}, ${colMontant}, ${colDate}) values (?, ?, ?, ?)',`,
          "    [o.id, 't1', o.montant, o.date],",
          "  );",
          "}",
          "const fMax = Object.entries(calculs).find(([n]) => /PreuvePrimeMax$/.test(n));",
          "const fQui = Object.entries(calculs).find(([n]) => /PreuveGagnant$/.test(n));",
          "if (fMax === undefined || fQui === undefined) throw new Error('calculs non emis : ' + Object.keys(calculs).join(','));",
          "console.log('@@' + JSON.stringify({ max: await fMax[1](base, 't1'), gagnant: await fQui[1](base, 't1') }));",
        ].join("\n"),
      );
      const sortie = execFileSync(process.execPath, [join(dossier, "pilote.mjs")], {
        encoding: "utf8",
        cwd: dossier,
        timeout: 60_000,
        env: { ...process.env, DB_FICHIER: join(dossier, "d.sqlite"), NODE_OPTIONS: "" },
      });
      const ligne = sortie.split("\n").find((l) => l.startsWith("@@"));
      return JSON.parse((ligne ?? '@@{"max":-1,"gagnant":null}').slice(2)) as {
        max: number;
        gagnant: string | null;
      };
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  };

  it("LA PLUS FORTE PRIME L'EMPORTE — le nombre ET la personne", () => {
    const r = jouer([
      { id: "o1", montant: 1000, date: "2026-01-01T10:00:00Z" },
      { id: "o2", montant: 2500, date: "2026-01-01T11:00:00Z" },
      { id: "o3", montant: 1800, date: "2026-01-01T12:00:00Z" },
    ]);
    expect(r.max).toBe(2500);
    expect(r.gagnant).toBe("o2");
  });

  it("EN CAS D'ÉGALITÉ, LE DOCUMENT TRANCHE — et le plus ancien l'emporte", () => {
    // LE COEUR DU LOT. Deux offres EXACTEMENT égales : sans départage, la base
    // rendrait l'une ou l'autre selon son index. Ici c'est le document qui
    // décide, et le verdict est reproductible.
    const r = jouer([
      { id: "tard", montant: 2500, date: "2026-01-01T18:00:00Z" },
      { id: "tot", montant: 2500, date: "2026-01-01T09:00:00Z" },
    ]);
    expect(r.max).toBe(2500);
    expect(r.gagnant).toBe("tot");
  });

  it("ET SI LE DOCUMENT DIT L'INVERSE, L'INVERSE SE PRODUIT", () => {
    // La preuve que le départage est VRAIMENT lu, et non une décoration : le
    // même jeu d'offres, le sens inversé, l'autre gagnant.
    const r = jouer(
      [
        { id: "tard", montant: 2500, date: "2026-01-01T18:00:00Z" },
        { id: "tot", montant: 2500, date: "2026-01-01T09:00:00Z" },
      ],
      "desc",
    );
    expect(r.gagnant).toBe("tard");
  });

  it("aucune offre ⇒ aucun gagnant, et le moteur ne l'invente pas", () => {
    const r = jouer([]);
    expect(r.gagnant).toBeNull();
  });
});

describe("EP-216 ④ · le contrat remis au propriétaire DIT le départage", () => {
  it("il nomme la règle d'égalité, parce que deux serveurs la trancheraient autrement", async () => {
    // `CONTRAT-SERVEUR.md` est emis par `emitProject`, pas par
    // `compileBackend` : mon premier jet cherchait dans les fichiers du
    // SERVEUR, et le contrat est un document remis au PROPRIETAIRE.
    const { emitProject } = await import("../src/emit-project.ts");
    // LE CONTRAT N'EXISTE QUE POUR LE SERVEUR DE QUELQU'UN D'AUTRE. Quand le
    // moteur ecrit le serveur lui-meme (`genere`), il n'y a rien a remettre —
    // le code EST la reponse. On demande donc un backend EXTERNE, le cas ou
    // le proprietaire doit implementer, et c'est precisement la que le
    // departage doit etre DIT : sans lui, son serveur rendrait un autre
    // gagnant que le notre.
    const air = { ...avecEnchere(), backend: { kind: "externe" as const } };
    const p = emitProject(air);
    // `emitProject` rend deja une carte de fichiers : le repli par
    // `Object.entries` introduisait un `any` sans rien couvrir.
    const contrat = p.files.get("CONTRAT-SERVEUR.md") ?? "";
    expect(contrat).toContain("ÉGALITÉ");
    // Et il dit AUSSI pourquoi ce n'est pas un detail.
    expect(contrat).toContain("deux serveurs");
  });
});
