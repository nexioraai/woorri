/**
 * EP-214 · UNE CONDITION SUR UN AGRÉGAT — EXÉCUTÉE EN SQL, PAS RELUE.
 *
 * MESURE QUI A COMMANDÉ CE LOT, ET ELLE ÉTAIT ÉCRITE DANS LE DÉPÔT DEPUIS UN
 * MOIS. Le cahier d'une tontine réelle demande que la cagnotte « se
 * répartisse à parts égales en fin de cycle ». Le document `tontine.air.json`
 * a déclaré cette exigence INEXPRIMABLE et sa raison nommait exactement le
 * manquant : « elle divise par le nombre de membres ACTIFS — une condition
 * que `sum` et `count` ne portent pas ».
 *
 * Vérifié le 2026-10-13 : `count` ne portait qu'une relation, `sum` une
 * relation et un champ. Rien pour restreindre les lignes.
 *
 * ── CE QUE CES PREUVES FONT, ET C'EST LE POINT.
 *
 * Un filtre faux ne lève AUCUNE erreur : il rend silencieusement zéro, ou un
 * total partiel. C'est la pire espèce de défaut — un chiffre qui a l'air
 * juste. On n'assère donc pas sur le TEXTE du SQL émis : on l'EXÉCUTE sur une
 * vraie base, et on compare les nombres.
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

/**
 * LE DOCUMENT, AVEC UN COMPTE CONDITIONNEL SUR UNE ENTITÉ RÉELLE.
 *
 * On ne fabrique pas un document : on prend celui de la tontine et on ajoute
 * le champ que son propre cahier réclame — le nombre de membres ACTIFS.
 */
const avecCompteFiltre = (condition: unknown): ProjectAir => {
  const air = JSON.parse(JSON.stringify(lu())) as ProjectAir;
  // La relation qui mène des tontines à leurs membres, et le champ de role
  // sur l'entité au bout : les deux viennent du document, pas de moi.
  const rel = air.relations.find((r) => r.id === "rel_membre_tontine");
  if (rel === undefined) throw new Error("le document n'a plus la relation rel_membre_tontine");
  const parent = air.entities.find((e) => e.id === rel.fromEntityId);
  if (parent === undefined) throw new Error("entité parente introuvable");
  parent.fields = [
    ...parent.fields,
    {
      id: "fld_membres_actifs",
      name: "Membres actifs",
      type: "number",
      derived: { kind: "count", relationId: rel.id, ...(condition === undefined ? {} : { condition }) },
    },
  ] as never;
  return { ...air, backend: { kind: "genere", stack: "fastify" } };
};

/** Les valeurs que le ROLE d'un membre peut porter, selon LE DOCUMENT. */
const etatsAdhesion = (): readonly string[] => {
  const e = lu().entities.find((x) => x.id === "ent_membres_tontine");
  const champ = e?.fields.find((f) => f.type === "enum" && f.enumValues !== undefined);
  return champ?.enumValues ?? [];
};

const champEtat = (): string => {
  const e = lu().entities.find((x) => x.id === "ent_membres_tontine");
  const champ = e?.fields.find((f) => f.type === "enum" && f.enumValues !== undefined);
  if (champ === undefined) throw new Error("le document n'a plus de champ a valeurs fermees sur les membres");
  return champ.id;
};

describe("EP-214 ① · le document de la tontine porte bien ce qu'on mesure", () => {
  it("il a la relation vers ses membres, et un role a valeurs fermees", () => {
    // Si ce test tombait, tous les suivants mesureraient un document inventé.
    expect(etatsAdhesion().length).toBeGreaterThan(1);
    expect(champEtat().startsWith("fld_")).toBe(true);
  });

  it("un compte SANS condition reste valide — 1.31.0 n'a pas changé de sens", () => {
    expect(validateAir(avecCompteFiltre(undefined)).map((d) => d.code)).toEqual([]);
  });

  it("un compte AVEC une condition correcte est valide", () => {
    const air = avecCompteFiltre({
      fieldId: champEtat(),
      operateur: "eq",
      valeur: etatsAdhesion()[0],
    });
    expect(validateAir(air).map((d) => d.code)).toEqual([]);
  });
});

describe("EP-214 ② · LES CINQ REFUS, ET LE TROISIÈME EST CELUI QUI COMPTE", () => {
  it("① un champ qui n'est pas sur l'entité agrégée est refusé", () => {
    // Filtrer sur un champ de la ligne PARENTE donnerait le même résultat pour
    // toutes les lignes — faux, et long à voir.
    const air = avecCompteFiltre({ fieldId: "fld_inexistant", operateur: "eq", valeur: "x" });
    expect(validateAir(air).map((d) => d.code)).toContain("AIR_AGREGAT_CONDITION_CHAMP_INCONNU");
  });

  it("② `in` sans liste est refusé, et une liste sans `in` aussi", () => {
    const sansListe = avecCompteFiltre({
      fieldId: champEtat(),
      operateur: "in",
      valeur: etatsAdhesion()[0],
    });
    expect(validateAir(sansListe).map((d) => d.code)).toContain(
      "AIR_AGREGAT_CONDITION_LISTE_ATTENDUE",
    );
    const listeEnTrop = avecCompteFiltre({
      fieldId: champEtat(),
      operateur: "eq",
      valeur: [...etatsAdhesion()],
    });
    expect(validateAir(listeEnTrop).map((d) => d.code)).toContain(
      "AIR_AGREGAT_CONDITION_LISTE_INATTENDUE",
    );
  });

  it("③ UNE VALEUR QUE LE CHAMP NE PEUT PAS PORTER EST REFUSÉE", () => {
    // LE REFUS QUI COMPTE. Un filtre sur une valeur impossible rend TOUJOURS
    // zéro : ni erreur, ni avertissement, juste un total vide que personne ne
    // sait expliquer.
    const air = avecCompteFiltre({
      fieldId: champEtat(),
      operateur: "eq",
      valeur: "cet_etat_n_existe_pas",
    });
    const d = validateAir(air);
    expect(d.map((x) => x.code)).toContain("AIR_AGREGAT_CONDITION_VALEUR_IMPOSSIBLE");
    // Le message NOMME les valeurs possibles : un refus qui ne dit pas quoi
    // faire oblige à lire le code du moteur.
    const msg = d.find((x) => x.code === "AIR_AGREGAT_CONDITION_VALEUR_IMPOSSIBLE")?.message ?? "";
    for (const v of etatsAdhesion()) expect(msg).toContain(v);
  });

  it("④ ordonner ce qui ne s'ordonne pas est refusé", () => {
    // `gt` sur un enum : chaque base SQL trancherait autrement, donc le total
    // dépendrait de la base.
    const air = avecCompteFiltre({
      fieldId: champEtat(),
      operateur: "gt",
      valeur: etatsAdhesion()[0],
    });
    expect(validateAir(air).map((d) => d.code)).toContain(
      "AIR_AGREGAT_CONDITION_ORDRE_IMPOSSIBLE",
    );
  });
});

/**
 * DEUX VALEURS DE ROLE, GARANTIES.
 *
 * La destructuration rend `string | undefined`, et le typecheck a raison de
 * le dire : si le document n'avait plus qu'une valeur, les preuves
 * compareraient des `undefined` et passeraient en ne mesurant rien. On leve.
 */
const deuxRoles = (): readonly [string, string] => {
  const [a, b] = etatsAdhesion();
  if (a === undefined || b === undefined) {
    throw new Error(
      "le role d'un membre ne porte plus deux valeurs : ces preuves ne " +
        "mesureraient plus rien, il faut choisir un autre champ.",
    );
  }
  return [a, b];
};

describe("EP-214 ③ · LE SQL ÉMIS COMPTE VRAIMENT LES BONNES LIGNES", () => {
  /**
   * EXÉCUTER LE CALCUL ÉMIS SUR UNE VRAIE BASE.
   *
   * Le serveur émis tourne sur un `node` nu qui efface les types. On écrit ses
   * fichiers, on applique son schéma, on insère des lignes, et on appelle la
   * fonction de calcul telle qu'elle a été émise. Aucune assertion sur le
   * texte du SQL : seulement sur le NOMBRE qu'il rend.
   */
  const compter = (condition: unknown, lignes: readonly { etat: string }[]): number => {
    const dossier = mkdtempSync(join(tmpdir(), "deribfy-agregat-"));
    try {
      const { files } = compileBackend(avecCompteFiltre(condition));
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
      const etat = champEtat().replace(/^fld_/u, "");
      const rel = lu().relations.find((r) => r.id === "rel_membre_tontine");
      const cleCol =
        lu()
          .entities.find((e) => e.id === "ent_membres_tontine")
          ?.fields.find((f) => f.referencesEntityId === rel?.fromEntityId)
          ?.id.replace(/^fld_/u, "") ?? "";
      writeFileSync(
        join(dossier, "pilote.mjs"),
        [
          "const { ouvrir, appliquerSchema } = await import('./src/base.ts');",
          "const { SCHEMA } = await import('./src/schema.ts');",
          "const calculs = await import('./src/calcul/en-base.ts');",
          "const base = await ouvrir();",
          "await appliquerSchema(base, SCHEMA);",
          `const lignes = ${JSON.stringify(lignes)};`,
          "let i = 0;",
          "for (const l of lignes) {",
          "  i += 1;",
          "  await base.executer(",
          `    'insert into membres_tontine (id, ${cleCol}, ${etat}) values (?, ?, ?)',`,
          "    ['a' + i, 'tontine-1', l.etat],",
          "  );",
          "}",
          "const f = Object.entries(calculs).find(([n]) => /MembresActifs$/.test(n));",
          "if (f === undefined) throw new Error('fonction de calcul non emise : ' + Object.keys(calculs).join(','));",
          "console.log('@@' + String(await f[1](base, 'tontine-1')));",
        ].join("\n"),
      );
      const sortie = execFileSync(process.execPath, [join(dossier, "pilote.mjs")], {
        encoding: "utf8",
        cwd: dossier,
        timeout: 60_000,
        env: { ...process.env, DB_FICHIER: join(dossier, "d.sqlite"), NODE_OPTIONS: "" },
      });
      const ligne = sortie.split("\n").find((l) => l.startsWith("@@"));
      return Number((ligne ?? "@@-1").slice(2));
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  };

  it("SANS condition, il compte TOUTES les lignes", () => {
    const [a, b] = deuxRoles();
    expect(compter(undefined, [{ etat: a }, { etat: b }, { etat: a }])).toBe(3);
  });

  it("AVEC `eq`, il ne compte que les lignes qui correspondent", () => {
    // C'est la mesure que le cahier de la tontine réclamait : « le nombre de
    // membres ACTIFS », et pas le nombre de membres.
    const [a, b] = deuxRoles();
    const n = compter({ fieldId: champEtat(), operateur: "eq", valeur: a }, [
      { etat: a },
      { etat: b },
      { etat: a },
    ]);
    expect(n).toBe(2);
  });

  it("AVEC `neq`, il compte le complément — et les deux font le total", () => {
    const [a, b] = deuxRoles();
    const lignes = [{ etat: a }, { etat: b }, { etat: a }];
    const egaux = compter({ fieldId: champEtat(), operateur: "eq", valeur: a }, lignes);
    const autres = compter({ fieldId: champEtat(), operateur: "neq", valeur: a }, lignes);
    expect(egaux + autres).toBe(lignes.length);
  });

  it("AVEC `in`, il compte l'union — et la valeur voyage en PARAMÈTRE", () => {
    const etats = etatsAdhesion();
    const lignes = etats.map((etat) => ({ etat }));
    const n = compter({ fieldId: champEtat(), operateur: "in", valeur: [etats[0], etats[1]] }, lignes);
    expect(n).toBe(2);
    // La valeur ne doit pas être recopiée dans le texte de la requête : une
    // valeur dans le texte est une injection qui attend.
    const { files } = compileBackend(
      avecCompteFiltre({ fieldId: champEtat(), operateur: "in", valeur: [etats[0]] }),
    );
    const calcul = files.get("src/calcul/en-base.ts") ?? "";
    expect(calcul).toContain("in (?)");
  });
});

describe("EP-214 ④ · LA PARITÉ DES DEUX PILES TIENT", () => {
  it("Java porte la MÊME condition, en JPQL", () => {
    // Un document qui choisit Java doit compter les MÊMES lignes qu'un
    // document qui choisit Node. Sinon le choix de la pile change le chiffre.
    const air = avecCompteFiltre({
      fieldId: champEtat(),
      operateur: "eq",
      valeur: etatsAdhesion()[0],
    });
    const java = compileBackend({ ...air, backend: { kind: "genere", stack: "spring_boot" } });
    const tout = [...java.files.values()].join("\n");
    expect(tout).toContain("and t.");
    expect(tout).toContain(etatsAdhesion()[0] ?? "");
  });
});
