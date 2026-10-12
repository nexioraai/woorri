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

/**
 * QUI APPELLE — LU D'UN JETON SIGNÉ, JAMAIS DEVINÉ.
 *
 * Mesuré au corpus le 2026-10-12 : 2 règles de visibilité désignent
 * l'appelant (@currentUser.email). Sans savoir qui appelle, l'entité était
 * FERMÉE — correct, mais inutilisable.
 *
 * HS256 avec AIR_JWT_SECRET, pris dans l'environnement. `node:crypto`
 * suffit : aucune dépendance ajoutée au projet émis.
 */
function appelantTs(): string {
  return [
    "// \u00c9MIS PAR DERIBFY \u2014 ne pas modifier \u00e0 la main.",
    "import { createHmac, timingSafeEqual } from \"node:crypto\";",
    "",
    "export interface Appelant {",
    "  readonly id: string;",
    "  readonly email?: string;",
    "  readonly droits: readonly string[];",
    "}",
    "",
    "function base64url(entree: Buffer): string {",
    "  return entree",
    "    .toString(\"base64\")",
    "    .replace(/\\+/gu, \"-\")",
    "    .replace(/\\//gu, \"_\")",
    "    .replace(/=+$/u, \"\");",
    "}",
    "",
    "/**",
    " * V\u00c9RIFIE LE JETON, OU REND NULL.",
    " *",
    " * timingSafeEqual et non === : comparer deux signatures caract\u00e8re par",
    " * caract\u00e8re laisse mesurer combien de caract\u00e8res sont bons, et avec assez",
    " * d'essais la signature se devine.",
    " *",
    " * L'algorithme est IMPOS\u00c9, jamais lu dans le jeton pour d\u00e9cider : accepter",
    " * alg:none parce que le jeton le demande est la faille classique.",
    " *",
    " * Un jeton sans exp est REFUS\u00c9 : un jeton \u00e9ternel ne se r\u00e9voque jamais.",
    " */",
    "export function lireJeton(jeton: string, secret: string): Appelant | null {",
    "  const parts = jeton.split(\".\");",
    "  if (parts.length !== 3) return null;",
    "  const [entete, charge, signature] = parts as [string, string, string];",
    "  let tete: { alg?: string };",
    "  let corps: Record<string, unknown>;",
    "  try {",
    "    tete = JSON.parse(Buffer.from(entete, \"base64url\").toString(\"utf8\")) as { alg?: string };",
    "    corps = JSON.parse(Buffer.from(charge, \"base64url\").toString(\"utf8\")) as Record<",
    "      string,",
    "      unknown",
    "    >;",
    "  } catch {",
    "    return null;",
    "  }",
    "  if (tete.alg !== \"HS256\") return null;",
    "  const attendue = base64url(",
    "    createHmac(\"sha256\", secret)",
    "      .update(entete + \".\" + charge)",
    "      .digest(),",
    "  );",
    "  const a = Buffer.from(attendue);",
    "  const b = Buffer.from(signature);",
    "  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;",
    "  const exp = corps[\"exp\"];",
    "  if (typeof exp !== \"number\" || exp * 1000 <= Date.now()) return null;",
    "  const id = corps[\"sub\"];",
    "  if (typeof id !== \"string\" || id === \"\") return null;",
    "  const email = corps[\"email\"];",
    "  const droits = corps[\"rights\"];",
    "  return {",
    "    id,",
    "    ...(typeof email === \"string\" && email !== \"\" ? { email } : {}),",
    "    droits: Array.isArray(droits) ? droits.filter((x): x is string => typeof x === \"string\") : [],",
    "  };",
    "}",
    "",
    "/**",
    " * L'APPELANT D'UNE REQU\u00caTE, S'IL EN A UN ET S'IL EST V\u00c9RIFIABLE.",
    " *",
    " * Le secret vient de l'ENVIRONNEMENT : aucun secret dans les fichiers \u00e9mis,",
    " * car un secret versionn\u00e9 ne redevient jamais secret.",
    " *",
    " * SANS SECRET CONFIGUR\u00c9, rend null \u2014 et les lectures qui exigent une",
    " * identit\u00e9 refusent. Traiter \u00ab pas de secret \u00bb comme \u00ab tout le monde est",
    " * autoris\u00e9 \u00bb serait le pire d\u00e9faut possible.",
    " */",
    "export function appelantDe(entetes: Record<string, unknown>): Appelant | null {",
    "  const secret = process.env.AIR_JWT_SECRET ?? \"\";",
    "  if (secret === \"\") return null;",
    "  const brut = entetes[\"authorization\"];",
    "  if (typeof brut !== \"string\" || !brut.startsWith(\"Bearer \")) return null;",
    "  return lireJeton(brut.slice(7), secret);",
    "}",
    "",
  ].join("\n");
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
    // ── CHIFFRER DÈS QUE L'HÔTE N'EST PAS LOCAL.
    //
    // Mesuré : une URL Supabase SANS \`sslmode\` donne \`ssl = undefined\` —
    // le pilote tente alors une connexion EN CLAIR vers l'internet. Un
    // défaut comme celui-là ne se voit jamais : ça marche, et ça fuit.
    //
    // Donc : si l'URL dit explicitement quoi faire, on la laisse décider ;
    // sinon on chiffre et on VÉRIFIE le certificat. Accepter un certificat
    // non vérifié par défaut serait chiffrer sans protéger — un test de
    // l'émetteur l'interdit, et c'est pourquoi la formule n'apparaît même
    // pas ici : un cliquet qui se déclenche sur un commentaire ne sert plus
    // à rien, et on finirait par l'assouplir.
    const hote = new URL(url).hostname;
    const local = hote === "localhost" || hote === "127.0.0.1" || hote === "::1";
    const client = /[?&]sslmode=/u.test(url)
      ? new Client({ connectionString: url })
      : new Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: true } });
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
  // ── CE MOTEUR N'ACCEPTE NI BOOLÉEN NI « undefined » EN PARAMÈTRE.
  //
  // Mesuré le 2026-10-12 : « Provided value cannot be bound to SQLite
  // parameter ». Postgres, lui, les accepte. Sans cette conversion, tout
  // document portant un champ oui/non répondait 500 à l'écriture — et rien
  // ne le disait avant de démarrer le serveur sur ce moteur-là.
  //
  // C'est le seul endroit qui connaît les deux moteurs : la conversion n'a
  // donc pas à être répétée ailleurs, où on finirait par l'oublier.
  const lier = (params: readonly unknown[]): unknown[] =>
    params.map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : v === undefined ? null : v));
  const db = new DatabaseSync(process.env.DB_FICHIER ?? "./donnees.sqlite");
  return {
    moteur: "sqlite",
    tous: async (sql, params = []) =>
      db.prepare(sql).all(...(lier(params) as never[])) as unknown as Record<string, unknown>[],
    un: async (sql, params = []) =>
      (db.prepare(sql).get(...(lier(params) as never[])) ?? null) as unknown as Record<
        string,
        unknown
      > | null,
    executer: async (sql, params = []) => {
      db.prepare(sql).run(...(lier(params) as never[]));
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

/**
 * CE QUE LE SERVEUR A LE DROIT D'EXPOSER.
 *
 * Mesuré au corpus le 2026-10-12 : 39 règles d'AUTORISATION, et le serveur
 * rendait TOUTES les lignes à tout le monde. « Seul un bien publié et non
 * archivé peut apparaître dans la liste des annonces » — et la liste rendait
 * les archivés. Ce n'est pas un manque de fonctionnalité, c'est une fuite.
 *
 * 37 de ces 39 règles sont des filtres sur les DONNÉES : aucune identité
 * n'est nécessaire pour les appliquer. Elles le sont donc, en SQL, dans la
 * requête elle-même — pas après coup en mémoire, où un `lire(id)` les
 * contournerait.
 *
 * Les 2 autres désignent l'appelant (`@currentUser.email`). Elles ne peuvent
 * pas être appliquées : le serveur ne sait pas qui appelle. L'entité est
 * alors FERMÉE — pas servie sans filtre. C'est la doctrine de ce dépôt
 * depuis 1.28.0 : un refus se récupère, un accès accordé par erreur non.
 */
function visibilite(
  air: ProjectAir,
  e: Entite,
): { sql: string; params: string[]; besoinAppelant: boolean } | { bloque: string; regle: string } {
  const regles = air.rules.filter((r) => r.kind !== "validation" && r.entityId === e.id);
  const morceaux: string[] = [];
  const params: string[] = [];
  let besoinAppelant = false;
  for (const r of regles) {
    for (const a2 of r.assertions) {
      const champ = e.fields.find((x) => x.id === a2.fieldId);
      if (champ === undefined || champ.derived !== undefined) continue;
      // Une règle qui désigne l'appelant ne peut pas devenir une condition
      // SQL : rien dans la requête ne dit qui appelle.
      // Une sentinelle désigne l'appelant. Seul le courriel est résolu : il
      // correspond à une revendication standard du jeton. Toute autre
      // sentinelle FERME l'entité au lieu d'inventer une revendication —
      // deviner où lire l'identité serait inventer de la sécurité.
      if (typeof a2.value === "string" && a2.value.startsWith("@")) {
        if (!/^@current_?[Uu]ser\.email$/u.test(a2.value)) {
          return { bloque: `sentinelle « ${a2.value} » non résoluble`, regle: r.id };
        }
        besoinAppelant = true;
      }
      const c = colonne(champ);
      const litteral = (v: unknown): string => {
        // Les booléens sont ÉCRITS dans le SQL : `true` a le même sens dans
        // les deux moteurs, alors qu'un booléen passé en paramètre ne se lie
        // pas de la même façon.
        if (typeof v === "boolean") return v ? "true" : "false";
        // Une sentinelle devient une LECTURE DU JETON, pas une constante.
        params.push(
          typeof v === "string" && v.startsWith("@")
            ? "a?.email ?? null"
            : JSON.stringify(v),
        );
        return "?";
      };
      switch (a2.operator) {
        case "eq":
          morceaux.push(`${c} = ${litteral(a2.value)}`);
          break;
        case "neq":
          // `col <> x` exclut aussi les lignes où `col` est vide. C'est
          // VOULU : fermé par défaut — une ligne dont l'état est inconnu ne
          // doit pas passer pour conforme.
          morceaux.push(`${c} <> ${litteral(a2.value)}`);
          break;
        case "required":
          morceaux.push(`(${c} is not null and ${c} <> '')`);
          break;
        case "in": {
          const vs = Array.isArray(a2.value) ? (a2.value as unknown[]) : [a2.value];
          morceaux.push(`${c} in (${vs.map((v) => litteral(v)).join(", ")})`);
          break;
        }
        default:
          return { bloque: `opérateur « ${a2.operator} » non traduit`, regle: r.id };
      }
    }
  }
  return { sql: morceaux.join(" and "), params, besoinAppelant };
}

function depot(air: ProjectAir, e: Entite): string {
  const n = CAMEL(e.id);
  const v = visibilite(air, e);
  // Une entité dont une règle désigne l'appelant est FERMÉE : la route
  // refusera. Le dépôt n'a alors aucun filtre à poser — mais il ne doit
  // surtout pas en poser un partiel, qui aurait l'air de protéger.
  const vis = "bloque" in v ? { sql: "", params: [], besoinAppelant: false } : v;
  const cols = stockes(e).map(colonne);
  const lus = lisibles(e).map(colonne);
  const journal = e.appendOnly === true;
  const l = [
    `import type { ${n} } from "../modele/${table(e)}.ts";`,
    `import type { Base } from "../base.ts";`,
    `import type { Appelant } from "../appelant.ts";`,
    "",
    "// 🔴 À ÉCRIRE : la requête dépend de VOTRE base. Les colonnes, elles,",
    "//    viennent du contrat et sont justes.",
    `export const COLONNES = ${JSON.stringify(cols)} as const;`,
    "// Ce qu'une lecture a le droit de rendre — les champs SENSIBLES n'y",
    "// sont pas, et les y remettre serait une fuite, pas une amélioration.",
    `export const COLONNES_LUES = ${JSON.stringify(lus)} as const;`,
    "",
    `export interface ${n}Depot {`,
    "  // L'appelant est passé À LA LECTURE : une règle du document peut le",
    "  // désigner (« seul le propriétaire voit sa commande »). Le filtre",
    "  // devient une condition SQL sur sa revendication, jamais une",
    "  // comparaison faite après coup — qui se contournerait.",
    `  lister(appelant: Appelant | null): Promise<Partial<${n}>[]>;`,
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
    // ── LE FILTRE DE VISIBILITÉ, DANS LA REQUÊTE.
    //
    // Filtrer après coup en mémoire laisserait `lire(id)` tout rendre : il
    // suffirait de deviner un identifiant. La condition est donc DANS le SQL,
    // des deux côtés.
    `  const VISIBLE = ${JSON.stringify(vis.sql === "" ? "" : ` where ${vis.sql}`)};`,
    `  const FILTRE = (a: Appelant | null): unknown[] => [${vis.params.join(", ")}];`,
    `  const COLS = ${JSON.stringify(["id", ...cols])};`,
    "  return {",
    `    lister: async (a) =>`,
    `      (await base.tous(\`select \${LUES} from ${table(e)}\${VISIBLE}\`, FILTRE(a))) as Partial<${n}>[],`,
    "    // ── `lire` N'EST PAS UNE LECTURE PUBLIQUE, ET NE SE FILTRE PAS.",
    "    //",
    "    // Elle sert au contrôle d'EXISTENCE avant écriture. Y poser le filtre",
    "    // de visibilité ferait passer une ligne cachée pour absente : un",
    "    // journal invisible redeviendrait réécrivable, et une ligne masquée",
    "    // serait écrasée comme si elle n'existait pas. Le filtre appartient à",
    "    // `lister`, qui est la lecture rendue à l'appelant.",
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

function routes(air: ProjectAir, e: Entite): string {
  const n = CAMEL(e.id);
  // ── UNE ENTITÉ QU'ON NE SAIT PAS FILTRER EST FERMÉE, PAS OUVERTE.
  //
  // Deux règles du corpus désignent l'appelant (`@currentUser.email`). Le
  // serveur ne sait pas qui appelle, donc il ne peut pas les appliquer.
  // Servir la collection sans filtre exposerait les commandes de tout le
  // monde ; 403 et le nom de la règle, parce qu'un refus se récupère et
  // qu'un accès accordé par erreur non.
  const v = visibilite(air, e);


  // ── UNE LECTURE QUI DÉPEND DE L'APPELANT EXIGE UN APPELANT.
  //
  // Sans jeton vérifiable, le filtre comparerait la colonne à `null` et ne
  // rendrait rien — ce qui ressemblerait à « cette personne n'a aucune
  // commande » alors que la vraie réponse est « je ne sais pas qui vous
  // êtes ». Deux situations différentes ne doivent pas donner le même écran.
  const exigeAppelant =
    "bloque" in v
      ? []
      : [
          "    const appelant = appelantDe(req.headers as Record<string, unknown>);",
          ...(v.besoinAppelant
            ? [
                "    if (appelant === null) {",
                "      return rep.code(403).send({",
                `        error: "AIR_APPELANT_REQUIS",`,
                `        message: "cette collection n'est lisible que par son propriétaire",`,
                "      });",
                "    }",
              ]
            : []),
        ];
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
    `import type { Base } from "../base.ts";`,
    `import { appelantDe } from "../appelant.ts";`,
    `import { verifier${PASCAL(e.id)} } from "./regles-metier.ts";`,
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
    `async function enLigne(base: Base, x: Partial<${n}>, nonCalcules: Set<string>): Promise<{ id: unknown; values: Record<string, unknown> }> {`,
    "  const src = x as unknown as Record<string, unknown>;",
    "  const vue: Record<string, unknown> = {};",
    ...e.fields.flatMap((f) => {
      if (f.sensitive === true) {
        return [`  // « ${f.name} » est SENSIBLE : il ne ressort jamais.`];
      }
      if (f.derived?.kind === "count" || f.derived?.kind === "sum") {
        return [
          "  try {",
          `    vue[${JSON.stringify(f.name)}] = await ${n}${PASCAL(f.id)}(base, String(src["id"]));`,
          "  } catch {",
          `    nonCalcules.add(${JSON.stringify(f.name)});`,
          "  }",
        ];
      }
      if (f.derived !== undefined) {
        return [`  // « ${f.name} » est CALCULÉ par le document, pas stocké ici.`];
      }
      const c = JSON.stringify(colonne(f));
      // UN OUI/NON DOIT RESTER UN OUI/NON. SQLite rend 1 ou 0 ; Postgres rend
      // un vrai booléen. Le modèle émis annonce `boolean` : sans conversion,
      // l'application recevrait 1 au lieu de true selon le moteur — même
      // défaut que le nombre rendu en texte, mesuré la veille.
      if (f.type === "boolean") {
        return [
          `  if (src[${c}] !== undefined && src[${c}] !== null) {`,
          `    vue[${JSON.stringify(f.name)}] =`,
          `      src[${c}] === true || src[${c}] === 1 || src[${c}] === "1";`,
          "  }",
        ];
      }
      return [
        `  if (src[${c}] !== undefined) {`,
        `    vue[${JSON.stringify(f.name)}] = src[${c}];`,
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
    `export function ${CAMEL(e.id)}Routes(app: FastifyInstance, depot: ${n}Depot, base: Base): void {`,
    // ── LA LECTURE : FILTRÉE, OU REFUSÉE. UNE SEULE DES DEUX EST ÉMISE.
    //
    // Émettre aussi le corps normal après un refus laisserait du code qui
    // référence un appelant inexistant — et, pire, une route qui pourrait
    // rendre les lignes sans filtre si le refus sautait un jour.
    ...("bloque" in v
      ? [
          "  app.get(BASE, async (_req, rep) =>",
          "    rep.code(403).send({",
          `      error: "AIR_VISIBILITE_INAPPLICABLE",`,
          `      regle: ${JSON.stringify(v.regle)},`,
          `      message: ${JSON.stringify(v.bloque)},`,
          "    }));",
        ]
      : [
          "  app.get(BASE, async (req, rep) => {",
          ...exigeAppelant,
          "    const nonCalcules = new Set<string>();",
          "    const vues = await Promise.all(",
          "      (await depot.lister(appelant)).map(async (x) => enLigne(base, x, nonCalcules)),",
          "    );",
          "    if (nonCalcules.size > 0) {",
          '      void rep.header("X-Air-Non-Calcule", [...nonCalcules].join(","));',
          "    }",
          "    return rep.send(vues);",
          "  });",
        ]),
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
    "    // LES RÈGLES DU DOCUMENT, AVANT D'ÉCRIRE.",
    "    //",
    "    // Sur la ligne QUI SERA enregistrée — l'existante fusionnée avec ce",
    "    // que la requête propose. Vérifier le seul corps de la requête",
    "    // laisserait passer une règle tenue par un champ qu'il ne mentionne",
    "    // pas. 422 : la requête est comprise, c'est son contenu qui est",
    "    // refusé.",
    "    const futur = { ...(existante ?? {}), ...retenir(corps), id };",
    `    const violation = verifier${PASCAL(e.id)}(futur as Record<string, unknown>);`,
    "    if (violation !== null) {",
    "      return rep.code(422).send({",
    `      error: "AIR_REGLE_VIOLEE",`,
    "        regle: violation.regle,",
    "        message: violation.message,",
    "      });",
    "    }",
    "    const ligne = await depot.enregistrer(futur);",
    "    const nonCalcules = new Set<string>();",
    "    const vue = await enLigne(base, ligne, nonCalcules);",
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
 * LA CLÉ QUI RELIE L'ENFANT AU PARENT.
 *
 * Une relation déclare `from`, `to` et `kind` — jamais la colonne. Mais le
 * champ de l'entité ENFANT la déclare, lui : `referencesEntityId` dit vers
 * quelle entité il pointe. La clé se résout donc, sans convention inventée.
 *
 * Elle ne se résout PAS quand l'enfant porte deux champs vers le même parent
 * (« créé par » et « validé par » vers les utilisateurs, par exemple) : rien
 * dans le document ne dit lequel compte. Ce cas-là reste un refus explicite —
 * deviner aurait produit un chiffre faux avec l'air d'être juste.
 */
function cleEtrangere(
  air: ProjectAir,
  relationId: string,
): { enfant: Entite; cle: Champ } | { ambigu: string } {
  const rel = air.relations.find((r) => r.id === relationId);
  if (rel === undefined) return { ambigu: `relation « ${relationId} » introuvable` };
  const enfant = air.entities.find((e) => e.id === rel.toEntityId);
  if (enfant === undefined) return { ambigu: `entité « ${rel.toEntityId} » introuvable` };
  const candidats = enfant.fields.filter((f) => f.referencesEntityId === rel.fromEntityId);
  const [unique] = candidats;
  if (candidats.length === 1 && unique !== undefined) return { enfant, cle: unique };
  return {
    ambigu:
      candidats.length === 0
        ? `aucun champ de « ${enfant.id} » ne pointe vers « ${rel.fromEntityId} »`
        : `${String(candidats.length)} champs de « ${enfant.id} » pointent vers « ${rel.fromEntityId} » : ${candidats.map((c) => c.id).join(", ")}`,
  };
}

/** Les champs dont la valeur se compte en base, pour une entité donnée. */
function champsEnBase(e: Entite): Champ[] {
  return e.fields.filter((f) => f.derived?.kind === "count" || f.derived?.kind === "sum");
}

/**
 * CE QUI SE COMPTE EN BASE — ET QUI EST MAINTENANT ÉCRIT.
 *
 * Longtemps un trou, parce que « la requête dépend de votre base ». C'était
 * vrai avant que l'émetteur produise le schéma : il le produit, il connaît
 * donc les tables ET la colonne qui relie l'enfant au parent. Le trou n'était
 * plus justifié, il était seulement resté.
 *
 * Reste un refus là où le document est réellement muet : deux chemins
 * possibles vers le même parent. Il LÈVE alors, et son nom part dans
 * l'en-tête `X-Air-Non-Calcule` — la ligne reste lisible.
 */
function calculs(air: ProjectAir): string {
  const l = [
    "// ÉMIS depuis le contrat — ne pas modifier à la main.",
    `import type { Base } from "../base.ts";`,
    "",
  ];
  for (const e of air.entities) {
    for (const f of champsEnBase(e)) {
      const d = f.derived;
      // `champsEnBase` ne garde que `count`/`sum`, mais le type l'ignore :
      // cette garde le lui dit, au lieu d'une assertion qui le forcerait.
      if (d === undefined || (d.kind !== "count" && d.kind !== "sum")) continue;
      const r = cleEtrangere(air, d.relationId);
      const nomFn = `${CAMEL(e.id)}${PASCAL(f.id)}`;
      if ("ambigu" in r) {
        l.push(
          "/**",
          ` * ${e.name}.${f.name} — NON CALCULABLE depuis le document.`,
          ` * ${r.ambigu}.`,
          " *",
          " * Deviner la colonne aurait produit un chiffre faux avec l'air",
          " * d'être juste. Le document doit dire lequel compte.",
          " */",
          `export async function ${nomFn}(base: Base, idParent: string): Promise<number> {`,
          "  void base;",
          "  void idParent;",
          `  throw new Error("AIR_CALCUL_A_ECRIRE:${f.id}");`,
          "}",
          "",
        );
        continue;
      }
      const t = table(r.enfant);
      const cle = colonne(r.cle);
      const somme =
        d.kind === "sum"
          ? (r.enfant.fields.find((x) => x.id === d.fieldId)?.id ?? d.fieldId)
          : "";
      const expr =
        d.kind === "count"
          ? "count(*)"
          : `coalesce(sum(${somme.replace(/^fld_/u, "")}), 0)`;
      l.push(
        "/**",
        ` * ${e.name}.${f.name} = ${d.kind === "count" ? "le NOMBRE" : "la SOMME"} sur « ${r.enfant.name} »,`,
        ` * reliées par « ${r.cle.name} ».`,
        " */",
        `export async function ${nomFn}(base: Base, idParent: string): Promise<number> {`,
        `  const r = await base.un(\`select ${expr} as v from ${t} where ${cle} = ?\`, [idParent]);`,
        "  return Number(r?.[\"v\"] ?? 0);",
        "}",
        "",
      );
    }
  }
  if (l.length === 3) l.push("// Le document n'en déclare aucun.");
  return l.join("\n");
}

/**
 * LES RÈGLES DU DOCUMENT, FAITES RESPECTER PAR LE SERVEUR.
 *
 * L'application les vérifie aussi, mais une vérification côté écran ne
 * protège de rien : la route s'appelle directement. Mesuré au corpus —
 * 160 règles de validation sur 31 documents, et le serveur n'en appliquait
 * AUCUNE : il levait `AIR_REGLE_A_ECRIRE`.
 *
 * HUIT opérateurs couvrent ces 160 règles (589 assertions). On les écrit
 * tous, une fois — pas un par besoin métier.
 *
 * LES RÈGLES D'AUTORISATION NE SONT PAS ICI, et c'est une limite assumée :
 * elles disent QUI a le droit, et ce contrat ne transporte pas l'identité de
 * l'appelant jusqu'ici. Les appliquer en devinant l'appelant serait pire que
 * de ne pas les appliquer — ça donnerait l'illusion d'un contrôle d'accès.
 */
function reglesMetier(air: ProjectAir): string {
  const l = [
    "// ÉMIS depuis le contrat — ne pas modifier à la main.",
    "",
    "/** Une règle non tenue : laquelle, et ce qu'elle dit. */",
    "export interface Violation {",
    "  readonly regle: string;",
    "  readonly message: string;",
    "}",
    "",
    "// Les comparaisons de grandeur n'ont de sens que sur des nombres. Un",
    "// `NaN` rendrait toute comparaison fausse en silence : on refuse alors",
    "// la règle au lieu de la laisser passer.",
    "function nombre(v: unknown): number | null {",
    "  if (typeof v === \"number\") return Number.isFinite(v) ? v : null;",
    "  if (typeof v === \"string\" && v.trim() !== \"\") {",
    "    const n = Number(v);",
    "    return Number.isFinite(n) ? n : null;",
    "  }",
    "  return null;",
    "}",
    "",
    "function rempli(v: unknown): boolean {",
    "  return v !== undefined && v !== null && v !== \"\";",
    "}",
    "",
  ];
  const validation = air.rules.filter((r) => r.kind === "validation");
  const autorisation = air.rules.filter((r) => r.kind !== "validation");

  for (const e of air.entities) {
    const miennes = validation.filter((r) => r.entityId === e.id);
    l.push(
      `/**`,
      ` * Les règles de « ${e.name} », vérifiées AVANT écriture.`,
      ` *`,
      ` * La ligne examinée est celle qui SERA enregistrée — l'existante`,
      ` * fusionnée avec ce que la requête propose. Vérifier le seul corps de`,
      ` * la requête laisserait passer une règle tenue par un champ qu'elle ne`,
      ` * mentionne pas.`,
      ` */`,
      `export function verifier${PASCAL(e.id)}(ligne: Record<string, unknown>): Violation | null {`,
    );
    if (miennes.length === 0) {
      l.push("  void ligne;", "  // Le document n'en déclare aucune pour cette entité.");
    }
    for (const r of miennes) {
      for (const a of r.assertions) {
        const champ = e.fields.find((x) => x.id === a.fieldId);
        if (champ === undefined) {
          l.push(`  // « ${a.fieldId} » n'est pas un champ de cette entité : règle ignorée.`);
          continue;
        }
        if (champ.sensitive === true) {
          l.push(
            `  // « ${champ.name} » est SENSIBLE : il n'est jamais conservé, donc`,
            `  // la ligne enregistrée ne le porte pas. Cette assertion ne peut`,
            `  // pas être vérifiée ici — l'écran la vérifie à la saisie.`,
          );
          continue;
        }
        const c = JSON.stringify(colonne(champ));
        const v = JSON.stringify(a.value ?? null);
        const echec = `return { regle: ${JSON.stringify(r.id)}, message: ${JSON.stringify(r.description)} };`;
        const cond = (() => {
          switch (a.operator) {
            case "required":
              return `!rempli(ligne[${c}])`;
            case "eq":
              return `rempli(ligne[${c}]) && String(ligne[${c}]) !== String(${v})`;
            case "neq":
              return `rempli(ligne[${c}]) && String(ligne[${c}]) === String(${v})`;
            case "gt":
              return `rempli(ligne[${c}]) && !((nombre(ligne[${c}]) ?? -Infinity) > Number(${v}))`;
            case "gte":
              return `rempli(ligne[${c}]) && !((nombre(ligne[${c}]) ?? -Infinity) >= Number(${v}))`;
            case "lte":
              return `rempli(ligne[${c}]) && !((nombre(ligne[${c}]) ?? Infinity) <= Number(${v}))`;
            case "matches":
              return `rempli(ligne[${c}]) && !new RegExp(String(${v})).test(String(ligne[${c}]))`;
            case "in":
              return `rempli(ligne[${c}]) && !(${v} as unknown[]).map(String).includes(String(ligne[${c}]))`;
            default:
              return "";
          }
        })();
        if (cond === "") {
          // AUCUN OPÉRATEUR INCONNU NE PASSE EN SILENCE. S'il en apparaît un,
          // le serveur REFUSE la règle au lieu de l'ignorer : une règle
          // ignorée est une règle qui ne protège plus, et personne ne le voit.
          l.push(
            `  // Opérateur « ${a.operator} » non couvert par cet émetteur.`,
            `  throw new Error("AIR_REGLE_A_ECRIRE:${r.id}");`,
          );
          continue;
        }
        l.push(
          `  // ${r.description}`,
          `  //   \`${champ.name}\` ${a.operator}${a.value === undefined ? "" : ` ${JSON.stringify(a.value)}`}`,
          `  if (${cond}) ${echec}`,
        );
      }
    }
    l.push("  return null;", "}", "");
  }

  if (autorisation.length > 0) {
    l.push(
      "// ── CE QUE CE SERVEUR NE SAIT PAS FAIRE RESPECTER, ET LE DIT.",
      "//",
      `// ${String(autorisation.length)} règle(s) d'AUTORISATION : elles disent QUI a le droit.`,
      "// Ce contrat ne transporte pas l'identité de l'appelant jusqu'ici ;",
      "// deviner l'appelant donnerait l'illusion d'un contrôle d'accès, ce",
      "// qui est pire que de ne pas en avoir.",
      ...autorisation.map((r) => `//   · ${r.id} — ${r.description}`),
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
    ...air.entities.map((e) => `  ${CAMEL(e.id)}Routes(app, ${CAMEL(e.id)}DepotSql(base), base);`),
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
  files.set("src/appelant.ts", appelantTs());
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
    files.set(`src/depot/${table(e)}.ts`, depot(air, e));
    files.set(`src/api/${table(e)}.ts`, routes(air, e));
  }
  files.set("src/api/regles-metier.ts", reglesMetier(air));
  if (air.entities.some((e) => e.fields.some((f) => f.derived?.kind === "count" || f.derived?.kind === "sum"))) {
    files.set("src/calcul/en-base.ts", calculs(air));
  }
  return { files };
}
