/**
 * LE SERVEUR EN NODE / FASTIFY — LE JUMEAU DE L'ÉMETTEUR SPRING.
 *
 * ── POURQUOI IL EXISTE.
 *
 * Un cahier des charges réel impose « Node.js avec Fastify », là où le
 * générateur ne savait écrire que Spring Boot. On a d'abord livré un
 * CONTRAT à lire — utile, et il reste — mais mesuré sur le même document :
 * un client Java reçoit 19 fichiers et 1 016 lignes avec 19 trous ; un
 * client Node recevait une prose à lire et écrivait les 1 016 lignes.
 * Ce n'est pas le même service.
 *
 * ── CE QU'IL ÉMET, ET CE QU'IL LAISSE.
 *
 * Même découpe que son jumeau : par entité un modèle, un dépôt et des
 * routes ; plus la configuration, la session, les règles métier et les
 * calculs. Les trous sont aux MÊMES endroits et portent le MÊME code —
 * `AIR_*_A_ECRIRE` — parce que ce qui dépend de la base ne se devine pas
 * plus en TypeScript qu'en Java.
 *
 * ── CE QUI NE SE NÉGOCIE PAS.
 *
 * Un champ CALCULÉ ne se stocke jamais : il est absent des colonnes et des
 * corps acceptés. Un champ SENSIBLE ne sort d'aucune lecture. Une entité
 * JOURNAL ne se modifie ni ne se supprime. Ces trois refus sont dans le
 * code émis, pas dans un commentaire — c'est ce que la gate mesure.
 */
import type { ProjectAir } from "@deribfy/air-schema";
import type { EnveloppeBackend } from "./emit-spring.ts";

type Entite = ProjectAir["entities"][number];
type Champ = Entite["fields"][number];

const CAMEL = (id: string): string =>
  id
    .replace(/^(ent|fld|act|scr)_/u, "")
    .replace(/[_-](\w)/gu, (_m, c: string) => c.toUpperCase());

/** La même chose, première lettre haute, pour coller deux noms sans ambiguïté. */
const PASCAL = (id: string): string => {
  const c = CAMEL(id);
  return c.charAt(0).toUpperCase() + c.slice(1);
};

/** Le nom de table : l'identifiant du document, sans son préfixe. */
const table = (e: Entite): string => e.id.replace(/^ent_/u, "");
const colonne = (f: Champ): string => f.id.replace(/^fld_/u, "");

/** Le type TypeScript d'un champ — fermé, comme le vocabulaire du contrat. */
function typeTs(f: Champ): string {
  switch (f.type) {
    case "number":
    case "decimal":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "string";
  }
}

/** Les champs RÉELLEMENT stockés : ni calculés, ni dérivés. */
const stockes = (e: Entite): Champ[] => e.fields.filter((f) => f.derived === undefined);
/** Ce qu'une lecture a le droit de rendre : jamais un champ sensible. */
const lisibles = (e: Entite): Champ[] => stockes(e).filter((f) => f.sensitive !== true);

/**
 * LE TYPE SQL D'UN CHAMP.
 *
 * Trois types seulement, et c'est voulu : ils ont le MÊME sens en SQLite et
 * en Postgres. Un `timestamp` natif aurait obligé à écrire deux schémas, puis
 * deux dépôts, puis à n'en vérifier qu'un. Les dates sont donc des chaînes
 * ISO — c'est déjà ce que le contrat transporte.
 */
function typeSql(f: Champ): string {
  switch (f.type) {
    case "number":
    case "decimal":
      return "numeric";
    case "boolean":
      return "boolean";
    default:
      return "text";
  }
}

/**
 * LE SCHÉMA DES TABLES.
 *
 * Java n'en a pas besoin : JPA le déduit des classes et le crée au démarrage
 * (`ddl-auto`). Node n'a pas d'équivalent, alors le schéma est ÉMIS. Sans
 * lui, le serveur démarrerait et échouerait à la première écriture — et
 * personne ne saurait pourquoi.
 *
 * `if not exists` dans les deux moteurs : le serveur applique ce fichier à
 * chaque démarrage sans jamais détruire ce qui est déjà là.
 */
function schemaSql(air: ProjectAir): string {
  const l = [
    "-- ÉMIS PAR DERIBFY DEPUIS LE CONTRAT — NE PAS ÉDITER À LA MAIN.",
    "--",
    "-- Appliqué à chaque démarrage. Rien n'y est détruit.",
    "",
  ];
  for (const e of air.entities) {
    l.push(
      `-- « ${e.name} »${e.appendOnly === true ? " — JOURNAL : rien ne s'y réécrit ni s'y efface." : ""}`,
      `create table if not exists ${table(e)} (`,
      "  id text primary key",
      ...stockes(e).map((f) => `, ${colonne(f)} ${typeSql(f)}`),
      ");",
      "",
    );
  }
  l.push(
    "-- `not null` n'est volontairement PAS posé : le contrat dit ce qui est",
    "-- requis À LA SAISIE, et le serveur le fait respecter. Une colonne",
    "-- obligatoire en base aurait bloqué la lecture des lignes déjà écrites",
    "-- avant qu'un champ devienne requis — une migration déguisée en schéma.",
  );
  return l.join("\n") + "\n";
}

/**
 * LA BASE, ET LE SEUL ENDROIT QUI CONNAÎT LES DEUX MOTEURS.
 *
 * Patron repris de la pile Java : ça marche sans rien installer, et UNE
 * variable d'environnement branche la vraie base. Avec une différence —
 * Java part sur une base EN MÉMOIRE, donc tout disparaît à l'arrêt ; ici le
 * défaut est un FICHIER SQLite, intégré au runtime, qui survit au
 * redémarrage. Un serveur qui perd ses données à chaque arrêt donne une
 * fausse idée de ce qui marche.
 *
 * Les requêtes sont écrites une fois, avec des `?`. Postgres veut `$1` : la
 * traduction est faite ICI, et nulle part ailleurs.
 */
/**
 * CE QUE `node:sqlite` EXPOSE, DÉCLARÉ ICI.
 *
 * Le moteur est INTÉGRÉ au runtime ; ses types, eux, n'arrivent qu'avec une
 * version récente de `@types/node`. Obliger chaque projet émis à la même
 * version qu'un autre aurait été une contrainte inventée par l'émetteur.
 *
 * On déclare donc la part UTILISÉE, et rien de plus. Une déclaration peut
 * mentir — c'est pourquoi elle ne sert jamais de preuve : le comportement est
 * établi par la gate qui DÉMARRE le serveur et relit ce qu'il a écrit.
 */
function sqliteDts(): string {
  return `// ÉMIS PAR DERIBFY — ne pas modifier à la main.
declare module "node:sqlite" {
  class StatementSync {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  }
  export class DatabaseSync {
    constructor(chemin: string);
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close(): void;
  }
}
`;
}

function baseTs(): string {
  return `// ÉMIS PAR DERIBFY — ne pas modifier à la main.
import { DatabaseSync } from "node:sqlite";

export interface Base {
  readonly moteur: "sqlite" | "postgres";
  tous(sql: string, params?: readonly unknown[]): Promise<Record<string, unknown>[]>;
  un(sql: string, params?: readonly unknown[]): Promise<Record<string, unknown> | null>;
  executer(sql: string, params?: readonly unknown[]): Promise<void>;
}

/** \`?\` → \`$1\`, \`$2\`… Postgres ne connaît que cette forme. */
function numeroter(sql: string): string {
  let n = 0;
  return sql.replace(/\\?/gu, () => {
    n += 1;
    return "$" + String(n);
  });
}

/**
 * OUVRIR LA BASE.
 *
 * DB_URL absent → fichier SQLite (DB_FICHIER, sinon ./donnees.sqlite).
 * DB_URL en postgres://… → la vraie base. \`pg\` est alors chargé À LA
 * DEMANDE : un serveur qui tourne sur SQLite n'a aucune raison d'exiger un
 * pilote Postgres installé.
 */
export async function ouvrir(): Promise<Base> {
  const url = process.env.DB_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    const { Client, types } = await import("pg");
    // UN NOMBRE DOIT RESTER UN NOMBRE.
    //
    // Postgres rend les \`numeric\` en TEXTE pour ne rien perdre en
    // précision — mesuré : "1234.5" là où SQLite rend 1234.5, alors que le
    // modèle émis déclare \`number\`. Une application branchée sur la vraie
    // base recevait donc "5000" au lieu de 5000. On convertit À LA LECTURE :
    // le stockage reste exact, et le contrat est respecté.
    types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
    const client = new Client({ connectionString: url });
    await client.connect();
    return {
      moteur: "postgres",
      tous: async (sql, params = []) =>
        (await client.query(numeroter(sql), [...params])).rows as Record<string, unknown>[],
      un: async (sql, params = []) =>
        ((await client.query(numeroter(sql), [...params])).rows[0] ?? null) as Record<
          string,
          unknown
        > | null,
      executer: async (sql, params = []) => {
        await client.query(numeroter(sql), [...params]);
      },
    };
  }
  const db = new DatabaseSync(process.env.DB_FICHIER ?? "./donnees.sqlite");
  return {
    moteur: "sqlite",
    tous: async (sql, params = []) =>
      db.prepare(sql).all(...(params as never[])) as unknown as Record<string, unknown>[],
    un: async (sql, params = []) =>
      (db.prepare(sql).get(...(params as never[])) ?? null) as unknown as Record<
        string,
        unknown
      > | null,
    executer: async (sql, params = []) => {
      db.prepare(sql).run(...(params as never[]));
    },
  };
}

/**
 * LE SCHÉMA, APPLIQUÉ AU DÉMARRAGE. IL NE DÉTRUIT RIEN.
 *
 * Le SQL arrive en ARGUMENT, il n'est pas lu sur le disque. Deux raisons :
 * un chemin relatif dépend du dossier depuis lequel on lance le serveur — un
 * déploiement l'aurait cassé sans prévenir ; et le compilateur de Deribfy a
 * l'interdiction de toucher au système de fichiers, y compris dans ce qu'il
 * écrit. \`schema.sql\` reste émis À CÔTÉ, pour qu'un humain le lise ou
 * l'applique à la main.
 */
export async function appliquerSchema(base: Base, ddl: string): Promise<void> {
  for (const ordre of ddl.split(";")) {
    const net = ordre.replace(/^\\s*--.*$/gmu, "").trim();
    if (net !== "") await base.executer(net);
  }
}
`;
}

function modele(e: Entite): string {
  const l = [
    `// ÉMIS depuis le contrat — ne pas modifier à la main.`,
    `export interface ${CAMEL(e.id)} {`,
    "  id: string;",
  ];
  for (const f of stockes(e)) {
    l.push(`  ${colonne(f)}${f.required ? "" : "?"}: ${typeTs(f)};`);
  }
  l.push("}");
  const calcules = e.fields.filter((f) => f.derived !== undefined);
  if (calcules.length > 0) {
    l.push(
      "",
      "// CHAMPS CALCULÉS — ABSENTS de l'interface, et c'est voulu : les",
      "// stocker les ferait diverger de ce dont ils dérivent, sans que rien",
      "// ne le signale. Le serveur les recalcule à la lecture.",
      ...calcules.map((f) => `//   · ${colonne(f)}`),
    );
  }
  return l.join("\n") + "\n";
}

function depot(e: Entite): string {
  const n = CAMEL(e.id);
  const cols = stockes(e).map(colonne);
  const lus = lisibles(e).map(colonne);
  const journal = e.appendOnly === true;
  const l = [
    `import type { ${n} } from "../modele/${table(e)}.ts";`,
    `import type { Base } from "../base.ts";`,
    "",
    "// 🔴 À ÉCRIRE : la requête dépend de VOTRE base. Les colonnes, elles,",
    "//    viennent du contrat et sont justes.",
    `export const COLONNES = ${JSON.stringify(cols)} as const;`,
    "// Ce qu'une lecture a le droit de rendre — les champs SENSIBLES n'y",
    "// sont pas, et les y remettre serait une fuite, pas une amélioration.",
    `export const COLONNES_LUES = ${JSON.stringify(lus)} as const;`,
    "",
    `export interface ${n}Depot {`,
    `  lister(): Promise<Partial<${n}>[]>;`,
    `  lire(id: string): Promise<Partial<${n}> | null>;`,
    `  enregistrer(x: Partial<${n}> & { id: string }): Promise<Partial<${n}>>;`,
  ];
  if (journal) {
    l.push(
      "  // ENTITÉ JOURNAL : ni modification ni suppression. Une erreur se",
      "  // répare par une ligne NOUVELLE qui annule la première.",
    );
  } else {
    l.push("  supprimer(id: string): Promise<void>;");
  }
  l.push(
    "}",
    "",
    "// ── LE DÉPÔT, SUR LA VRAIE BASE.",
    "//",
    "// Il n'y a PAS de version « à écrire » : Java reçoit sa persistance de",
    "// JPA, et livrer un Node qui refuse d'enregistrer en aurait fait la pile",
    "// pauvre. Les requêtes portent des `?` ; `base.ts` les traduit pour",
    "// Postgres, et c'est le seul endroit qui connaît les deux moteurs.",
    `export function ${CAMEL(e.id)}DepotSql(base: Base): ${n}Depot {`,
    `  const LUES = ${JSON.stringify(["id", ...lus].join(", "))};`,
    `  const COLS = ${JSON.stringify(["id", ...cols])};`,
    "  return {",
    `    lister: async () => (await base.tous(\`select \${LUES} from ${table(e)}\`)) as Partial<${n}>[],`,
    "    lire: async (id) =>",
    `      (await base.un(\`select \${LUES} from ${table(e)} where id = ?\`, [id])) as Partial<${n}> | null,`,
    "    // UPSERT, parce que le contrat ne distingue pas créer de modifier.",
    "    // `excluded` désigne la ligne proposée — même mot dans les deux moteurs.",
    "    enregistrer: async (x) => {",
    "      const src = x as unknown as Record<string, unknown>;",
    "      const majs = COLS.filter((c) => c !== \"id\")",
    "        .map((c) => `${c} = excluded.${c}`)",
    "        .join(\", \");",
    "      await base.executer(",
    `        \`insert into ${table(e)} (\${COLS.join(", ")}) \` +`,
    "          `values (${COLS.map(() => \"?\").join(\", \")}) ` +",
    "          `on conflict (id) do update set ${majs}`,",
    "        COLS.map((c) => src[c] ?? null),",
    "      );",
    "      return x;",
    "    },",
    ...(journal
      ? []
      : [
          "    supprimer: async (id) => {",
          `      await base.executer(\`delete from ${table(e)} where id = ?\`, [id]);`,
          "    },",
        ]),
    "  };",
    "}",
  );
  return l.join("\n") + "\n";
}

function routes(e: Entite): string {
  const n = CAMEL(e.id);
  const journal = e.appendOnly === true;
  const enBase = e.fields.filter(
    (f) => f.derived?.kind === "count" || f.derived?.kind === "sum",
  );
  const avecEtats = e.fields.filter((f) => f.transitions !== undefined);
  const l = [
    `import type { FastifyInstance } from "fastify";`,
    `import { randomUUID } from "node:crypto";`,
    `import type { ${n} } from "../modele/${table(e)}.ts";`,
    `import type { ${n}Depot } from "../depot/${table(e)}.ts";`,
    ...(enBase.length > 0
      ? [
          `import { ${enBase
            .map((f) => `${n}${PASCAL(f.id)}`)
            .join(", ")} } from "../calcul/en-base.ts";`,
        ]
      : []),
    "",
    "// L'ADRESSE EST IMPOSÉE PAR LE CONTRAT, ELLE N'EST PAS CHOISIE ICI.",
    "//",
    "// L'application générée appelle /air/v1/entities/<id>/rows — c'est ce que",
    "// son client écrit. Inventer d'autres adresses donnait un serveur qui",
    "// compile et à qui aucune application ne sait parler.",
    `const BASE = ${JSON.stringify(`/air/v1/entities/${e.id}/rows`)};`,
    "",
    "/**",
    " * LA VUE D'UNE LIGNE : `{ id, values }`.",
    " *",
    " * C'est la forme que l'application attend et qu'elle NE NÉGOCIE PAS — la",
    " * pile Java la documente ainsi. Mesuré le 2026-10-11 : cet émetteur",
    " * rendait une ligne PLATE, donc l'application lisait `undefined` partout",
    " * en lieu et place de ses données.",
    " *",
    " * Les colonnes LISIBLES seulement — un champ sensible ne sort pas d'ici.",
    " * Un champ qui demande la base est TENTÉ : s'il lève, son nom part dans",
    " * l'en-tête `X-Air-Non-Calcule` et la ligne reste lisible. Laisser",
    " * remonter l'exception rendrait illisible une ligne enregistrée — mesuré",
    " * sur la pile Java, qui répondait 500.",
    " */",
    `function enLigne(x: Partial<${n}>, nonCalcules: Set<string>): { id: unknown; values: Record<string, unknown> } {`,
    "  const src = x as unknown as Record<string, unknown>;",
    "  const vue: Record<string, unknown> = {};",
    ...e.fields.flatMap((f) => {
      if (f.sensitive === true) {
        return [`  // « ${f.name} » est SENSIBLE : il ne ressort jamais.`];
      }
      if (f.derived?.kind === "count" || f.derived?.kind === "sum") {
        return [
          "  try {",
          `    vue[${JSON.stringify(f.name)}] = ${n}${PASCAL(f.id)}(String(src["id"]));`,
          "  } catch {",
          `    nonCalcules.add(${JSON.stringify(f.name)});`,
          "  }",
        ];
      }
      if (f.derived !== undefined) {
        return [`  // « ${f.name} » est CALCULÉ par le document, pas stocké ici.`];
      }
      return [
        `  if (src[${JSON.stringify(colonne(f))}] !== undefined) {`,
        `    vue[${JSON.stringify(f.name)}] = src[${JSON.stringify(colonne(f))}];`,
        "  }",
      ];
    }),
    "  return { id: src[\"id\"], values: vue };",
    "}",
    "",
    "/** Ce que le corps de la requête est autorisé à écrire. */",
    `function retenir(corps: Record<string, unknown>): Partial<${n}> {`,
    "  const garde: Record<string, unknown> = {};",
    ...e.fields.flatMap((f) => {
      if (f.sensitive === true) {
        return [`  // « ${f.name} » SENSIBLE : saisi, jamais conservé.`];
      }
      if (f.derived !== undefined) {
        return [`  // « ${f.name} » se CALCULE : il ne s'écrit pas.`];
      }
      return [
        `  if (corps[${JSON.stringify(f.name)}] !== undefined) {`,
        `    garde[${JSON.stringify(colonne(f))}] = corps[${JSON.stringify(f.name)}];`,
        "  }",
      ];
    }),
    `  return garde as Partial<${n}>;`,
    "}",
    "",
    `/** Routes de « ${e.name} », montées sur le contrat AIR. */`,
    `export function ${CAMEL(e.id)}Routes(app: FastifyInstance, depot: ${n}Depot): void {`,
    "  app.get(BASE, async (_req, rep) => {",
    "    const nonCalcules = new Set<string>();",
    "    const vues = (await depot.lister()).map((x) => enLigne(x, nonCalcules));",
    "    if (nonCalcules.size > 0) {",
    "      void rep.header(\"X-Air-Non-Calcule\", [...nonCalcules].join(\",\"));",
    "    }",
    "    return rep.send(vues);",
    "  });",
    "",
    "  // POST est un UPSERT : le contrat ne distingue pas créer de modifier.",
    "  app.post(BASE, async (req, rep) => {",
    "    const corps = (req.body ?? {}) as Record<string, unknown>;",
    "    const brut = corps[\"id\"];",
    "    const id = brut === undefined || brut === null ? randomUUID() : String(brut);",
    "    const existante = await depot.lire(id);",
  ];

  if (journal) {
    l.push(
      "    // LE DOCUMENT DÉCLARE CETTE ENTITÉ COMME UN JOURNAL.",
      "    //",
      "    // Le refus est prononcé, pas obtenu par absence de route : une route",
      "    // absente répond 404 — « cette adresse n'existe pas » — ce qui est",
      "    // faux, l'adresse existe et c'est le geste qui est interdit. Et c'est",
      "    // le refus que prononce déjà la pile Java : un même document ne doit",
      "    // pas vouloir dire deux choses selon le serveur qu'on en tire.",
      "    if (existante !== null) {",
      "      return rep.code(409).send({",
      `        error: "AIR_JOURNAL_REECRITURE",`,
      `        message: ${JSON.stringify(`« ${e.name} » est un journal : une ligne existante ne se réécrit pas`)},`,
      "      });",
      "    }",
    );
  }

  for (const f of avecEtats) {
    const paires = (f.transitions ?? []).map((t) => `${t.from}>${t.to}`);
    l.push(
      `    // « ${f.name} » : ${String(paires.length)} transition(s) déclarée(s). L'écran`,
      "    // n'affiche pas les gestes impossibles, mais la route s'appelle",
      "    // directement — c'est ici que le refus compte.",
      `    const permises${PASCAL(f.id)} = new Set(${JSON.stringify(paires)});`,
      `    const de${PASCAL(f.id)} =`,
      `      existante === null`,
      "        ? undefined",
      `        : (existante as unknown as Record<string, unknown>)[${JSON.stringify(colonne(f))}];`,
      `    const vers${PASCAL(f.id)} = corps[${JSON.stringify(f.name)}];`,
      "    if (",
      `      de${PASCAL(f.id)} !== undefined &&`,
      `      vers${PASCAL(f.id)} !== undefined &&`,
      `      String(de${PASCAL(f.id)}) !== String(vers${PASCAL(f.id)}) &&`,
      `      !permises${PASCAL(f.id)}.has(\`\${String(de${PASCAL(f.id)})}>\${String(vers${PASCAL(f.id)})}\`)`,
      "    ) {",
      "      return rep.code(409).send({",
      `        error: "AIR_TRANSITION_INTERDITE",`,
      `        message: \`« \${String(de${PASCAL(f.id)})} » ne mène pas à « \${String(vers${PASCAL(f.id)})} »\`,`,
      "      });",
      "    }",
    );
  }

  l.push(
    "    const ligne = await depot.enregistrer({",
    "      ...(existante ?? {}),",
    "      ...retenir(corps),",
    "      id,",
    "    });",
    "    const nonCalcules = new Set<string>();",
    "    const vue = enLigne(ligne, nonCalcules);",
    "    if (nonCalcules.size > 0) {",
    "      void rep.header(\"X-Air-Non-Calcule\", [...nonCalcules].join(\",\"));",
    "    }",
    "    return rep.send(vue);",
    "  });",
    "",
    "  app.delete(`${BASE}/:id`, async (req, rep) => {",
  );

  if (journal) {
    l.push(
      "    void req;",
      "    return rep.code(409).send({",
      `      error: "AIR_JOURNAL_SUPPRESSION",`,
      `      message: ${JSON.stringify(`« ${e.name} » est un journal : rien ne s'y efface`)},`,
      "    });",
    );
  } else {
    l.push(
      "    const { id } = req.params as { id: string };",
      "    await depot.supprimer(id);",
      "    return rep.code(204).send();",
    );
  }

  l.push("  });", "}");
  return l.join("\n") + "\n";
}

/**
 * CE QUI SE COMPTE EN BASE, ET QUI N'EST DONC PAS ÉCRIT ICI.
 *
 * Un champ `count` ou `sum` traverse une relation : la requête dépend du
 * schéma réel de votre base, que le document ne décrit pas. L'émetteur
 * pourrait rendre 0 — ce serait le pire choix possible : une cagnotte à zéro
 * ressemble à une cagnotte vide, et personne ne verrait que rien n'a été
 * calculé. La fonction LÈVE, et le nom du champ est dans le message.
 *
 * Les autres formes dérivées (`calcul`, `bareme`, `versionne`) sont, elles,
 * entièrement décrites par le document : elles ne passent pas par ici.
 */
function calculs(air: ProjectAir): string {
  const l = [
    "// LES CALCULS QUI DEMANDENT LA BASE.",
    "//",
    "// 🔴 À ÉCRIRE. Le document dit QUOI calculer ; la requête dépend de",
    "//    votre base.",
    "",
  ];
  for (const e of air.entities) {
    for (const f of e.fields) {
      const d = f.derived;
      if (d === undefined || (d.kind !== "count" && d.kind !== "sum")) continue;
      const rel = air.relations.find((r) => r.id === d.relationId);
      const cible = rel?.toEntityId ?? "?";
      const quoi =
        d.kind === "count"
          ? `le NOMBRE de lignes de \`${cible}\``
          : `la SOMME de \`${d.fieldId}\` sur les lignes de \`${cible}\``;
      l.push(
        "/**",
        ` * ${e.name}.${f.name} = ${quoi}`,
        ` * liées par \`${d.relationId}\`.`,
        " */",
        `export function ${CAMEL(e.id)}${PASCAL(f.id)}(idParent: string): never {`,
        "  void idParent;",
        `  throw new Error("AIR_CALCUL_A_ECRIRE:${f.id}");`,
        "}",
        "",
      );
    }
  }
  return l.join("\n");
}

function reglesMetier(air: ProjectAir): string {
  const l = [
    "// LES RÈGLES QUE LE SERVEUR DOIT FAIRE RESPECTER.",
    "//",
    "// L'application les vérifie aussi, mais une vérification côté client ne",
    "// protège de rien : elle se contourne. C'est ici que ça compte.",
    "",
  ];
  if (air.rules.length === 0) l.push("// Le document n'en déclare aucune.");
  for (const r of air.rules) {
    l.push(
      `/** ${r.description} */`,
      `export function ${CAMEL(r.id)}(ligne: Record<string, unknown>): void {`,
      ...r.assertions.map(
        (a) =>
          `  //   \`${a.fieldId}\` ${a.operator}${a.value === undefined ? "" : ` ${JSON.stringify(a.value)}`}`,
      ),
      `  // 🔴 À ÉCRIRE : lever si la règle n'est pas tenue.`,
      `  void ligne;`,
      `  throw new Error("AIR_REGLE_A_ECRIRE:${r.id}");`,
      "}",
      "",
    );
  }
  return l.join("\n");
}

function serveur(air: ProjectAir): string {
  const l = [
    `import Fastify from "fastify";`,
    `import { appliquerSchema, ouvrir } from "./base.ts";`,
    `import { SCHEMA } from "./schema.ts";`,
    ...air.entities.map((e) => `import { ${CAMEL(e.id)}Routes } from "./api/${table(e)}.ts";`),
    ...air.entities.map(
      (e) => `import { ${CAMEL(e.id)}DepotSql } from "./depot/${table(e)}.ts";`,
    ),
    "",
    `// ÉMIS depuis le contrat de « ${air.app.name} ».`,
    "//",
    "// SANS RIEN INSTALLER : un fichier SQLite, intégré au runtime, à côté du",
    "// serveur. Les données SURVIVENT au redémarrage — contrairement à la base",
    "// en mémoire de la pile Java, qui donne une fausse idée de ce qui marche.",
    "//",
    "// POUR VOTRE VRAIE BASE : DB_URL=postgres://… et c'est tout. Aucun secret",
    "// dans les fichiers émis ; un secret versionné ne redevient jamais secret.",
    "export async function construire(): Promise<ReturnType<typeof Fastify>> {",
    "  const app = Fastify({ logger: true });",
    "  const base = await ouvrir();",
    "  await appliquerSchema(base, SCHEMA);",
    "  app.log.info(`base : ${base.moteur}`);",
    ...air.entities.map((e) => `  ${CAMEL(e.id)}Routes(app, ${CAMEL(e.id)}DepotSql(base));`),
    "  return app;",
    "}",
    "",
    "if (process.env.NODE_ENV !== \"test\") {",
    "  const port = Number(process.env.PORT ?? 3000);",
    "  const app = await construire();",
    "  await app.listen({ port, host: \"0.0.0.0\" });",
    "}",
  ];
  return l.join("\n") + "\n";
}

function paquet(air: ProjectAir): string {
  return `${JSON.stringify(
    {
      name: `${air.app.slug}-serveur`,
      private: true,
      type: "module",
      // `node src/serveur.ts` : ce runtime retire les types lui-même. Pas
      // d'outil d'exécution à installer, et la gate mesure EXACTEMENT la
      // commande que vous lancez.
      scripts: { dev: "node src/serveur.ts", typecheck: "tsc --noEmit" },
      // `pg` ne sert QUE si DB_URL pointe sur Postgres, et il est chargé à la
      // demande : sur SQLite le serveur n'en a aucun besoin.
      dependencies: { fastify: "^5", pg: "^8" },
      devDependencies: { "@types/pg": "^8", typescript: "^5" },
    },
    null,
    2,
  )}\n`;
}

const tsconfig = (): string =>
  `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        allowImportingTsExtensions: true,
      },
      include: ["src"],
    },
    null,
    2,
  )}\n`;

export function enveloppeFastify(air: ProjectAir): EnveloppeBackend {
  const files = new Map<string, string>();
  files.set("package.json", paquet(air));
  files.set("tsconfig.json", tsconfig());
  files.set("src/serveur.ts", serveur(air));
  files.set("src/base.ts", baseTs());
  files.set("src/sqlite.d.ts", sqliteDts());
  // Le MÊME texte, deux fois : `schema.sql` pour qu'un humain le lise ou
  // l'applique à la main, `src/schema.ts` pour que le serveur l'applique sans
  // dépendre du dossier depuis lequel on l'a lancé. Un test vérifie qu'ils ne
  // divergent jamais.
  const ddl = schemaSql(air);
  files.set("schema.sql", ddl);
  files.set(
    "src/schema.ts",
    "// ÉMIS PAR DERIBFY — copie exacte de schema.sql.\nexport const SCHEMA = " +
      JSON.stringify(ddl) +
      ";\n",
  );
  for (const e of air.entities) {
    files.set(`src/modele/${table(e)}.ts`, modele(e));
    files.set(`src/depot/${table(e)}.ts`, depot(e));
    files.set(`src/api/${table(e)}.ts`, routes(e));
  }
  files.set("src/api/regles-metier.ts", reglesMetier(air));
  if (air.entities.some((e) => e.fields.some((f) => f.derived?.kind === "count" || f.derived?.kind === "sum"))) {
    files.set("src/calcul/en-base.ts", calculs(air));
  }
  return { files };
}
