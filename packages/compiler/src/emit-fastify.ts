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
import { PRELUDE_EXPRESSION, emettreExpressionTs } from "./expression.ts";
import { moduleConnecteur, routesConnecteur } from "./emit-connecteur.ts";
import { routesAgent } from "./emit-agent.ts";

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
 * CE QUI EST RÉELLEMENT CONSERVÉ EN BASE.
 *
 * Mesuré le 2026-10-12 : les 5 champs `sensitive` du corpus avaient une
 * COLONNE dans le schéma émis — `profil_mot_de_passe`,
 * `paiement_numero_carte` — alors que le serveur ne leur écrit jamais rien.
 * La colonne était morte, et un schéma qui annonce stocker un numéro de carte
 * invite à le remplir par un autre chemin : une requête à la main, un import,
 * un correctif pressé.
 *
 * On ne crée pas le contenant de ce qu'on a décidé de ne pas garder.
 *
 * MÊME LISTE pour le schéma ET pour l'ordre d'insertion : les séparer
 * casserait l'écriture au premier champ sensible — l'insertion nommerait une
 * colonne qui n'existe pas.
 */
const conserves = (e: Entite): Champ[] => stockes(e).filter((f) => f.sensitive !== true);

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
      // ── `unique` DU DOCUMENT DEVIENT UNE CONTRAINTE, PAS UN COMMENTAIRE.
      //
      // Mesuré le 2026-10-12 : 72 champs `unique` dans 28 documents, et le
      // schéma émis n'en portait AUCUNE contrainte. Un cahier réel l'exige
      // mot pour mot — « une référence de transaction ne peut être utilisée
      // qu'une seule fois dans toute l'application ». Sans contrainte en
      // base, deux écritures simultanées passent toutes les deux : la
      // vérification applicative ne protège pas d'une course.
      //
      // Même mot-clé dans les deux moteurs.
      ...conserves(e).map(
        (f) => `, ${colonne(f)} ${typeSql(f)}${f.unique === true ? " unique" : ""}`,
      ),
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
    "  // ── OÙ LES DROITS VIVENT RÉELLEMENT DANS UN JETON.",
  "  //",
  "  // Recherche du 2026-10-12 : le fournisseur déclaré pose les claims",
  "  // personnalisés sous `app_metadata`, posé CÔTÉ SERVEUR. `user_metadata`",
  "  // est modifiable par la personne elle-même et ne doit JAMAIS servir à",
  "  // autoriser — c'est la faute documentée du domaine.",
  "  //",
  "  // On lit donc `app_metadata` en priorité, puis la racine pour un jeton",
  "  // émis par un autre serveur. `user_metadata` n'est jamais lu.",
  "  const meta = corps[\"app_metadata\"];",
  "  const depuisMeta =",
  "    typeof meta === \"object\" && meta !== null",
  "      ? (meta as Record<string, unknown>)[\"rights\"]",
  "      : undefined;",
  "  const droits = depuisMeta ?? corps[\"rights\"];",
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

/**
 * UN DOUBLON N'EST PAS UNE PANNE DU SERVEUR.
 *
 * Mesuré le 2026-10-13 : deux lignes portant le même « code_adhesion »
 * faisaient répondre 500 avec le message brut du moteur — « UNIQUE
 * constraint failed: tontines.tontines_code_adhesion ». Deux défauts dans
 * une seule réponse. L'appelant ne peut pas distinguer SA faute d'une panne
 * du serveur, donc il réessaie ce qui ne marchera jamais. Et le corps de
 * réponse livre le nom physique de la table et de la colonne à qui le
 * demande — un plan du schéma offert sur une erreur.
 *
 * La contrainte \`unique\` a été posée en base le 2026-10-12 ; sa traduction
 * en réponse ne l'avait pas été. Le défaut est né de ce décalage.
 *
 * Les deux moteurs disent la même chose autrement : SQLite dans le message,
 * Postgres dans le code 23505, le détail et le nom de la contrainte. Le
 * texte rassemblé porte, chez l'un comme chez l'autre, le nom de la
 * colonne — c'est lui qui permet de nommer le champ DÉCLARÉ.
 */
function texteErreur(e: unknown): string {
  if (typeof e !== "object" || e === null) return String(e);
  const o = e as Record<string, unknown>;
  return [o["message"], o["detail"], o["constraint"]]
    .map((x) => (x === undefined || x === null ? "" : String(x)))
    .join(" | ");
}

export function estDoublon(e: unknown): boolean {
  if (typeof e === "object" && e !== null) {
    const o = e as Record<string, unknown>;
    // Postgres nomme la faute par son code, et lui seul est sans ambiguïté.
    if (o["code"] === "23505") return true;
  }
  const t = texteErreur(e);
  return t.includes("UNIQUE constraint failed") || t.includes("duplicate key value");
}

/**
 * QUEL CHAMP DÉCLARÉ est en cause — jamais quelle colonne.
 *
 * Les colonnes sont essayées de la plus longue à la plus courte : « code »
 * se trouve dans « code_adhesion », et répondre « code » serait faux.
 *
 * \`null\` quand la colonne n'est pas reconnue : mieux vaut un 409 sans nom
 * de champ qu'un 409 qui en nomme un au hasard.
 */
export function champDoublon(
  e: unknown,
  colonnes: ReadonlyArray<readonly [string, string]>,
): string | null {
  const t = texteErreur(e);
  const triees = [...colonnes].sort((a, b) => b[0].length - a[0].length);
  for (const [col, champ] of triees) if (t.includes(col)) return champ;
  return null;
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
  for (const f of conserves(e)) {
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
  const cols = conserves(e).map(colonne);
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
    (f) => f.derived?.kind === "count" || f.derived?.kind === "sum" || f.derived?.kind === "max" || f.derived?.kind === "min" || f.derived?.kind === "porteur",
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
      if (f.derived?.kind === "count" || f.derived?.kind === "sum" || f.derived?.kind === "max" || f.derived?.kind === "min" || f.derived?.kind === "porteur") {
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
    `    const violation = await verifier${PASCAL(e.id)}(futur as Record<string, unknown>, base);`,
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
  return e.fields.filter((f) => f.derived?.kind === "count" || f.derived?.kind === "sum" || f.derived?.kind === "max" || f.derived?.kind === "min" || f.derived?.kind === "porteur");
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
      // `.includes()` ne RESTREINT pas le type : la disjonction explicite si.
      if (
        d === undefined ||
        (d.kind !== "count" &&
          d.kind !== "sum" &&
          d.kind !== "max" &&
          d.kind !== "min" &&
          d.kind !== "porteur")
      ) {
        continue;
      }
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
        d.kind === "sum" || d.kind === "max" || d.kind === "min" || d.kind === "porteur"
          ? (r.enfant.fields.find((x) => x.id === d.fieldId)?.id ?? d.fieldId)
          : "";
      // 1.41.0 — quatre sortes d'agregat, et le `porteur` n'en est pas un :
      // il rend un IDENTIFIANT. Il est donc emis a part, juste apres.
      const colSomme = somme.replace(/^fld_/u, "");
      const expr =
        d.kind === "count"
          ? "count(*)"
          : d.kind === "max"
            ? `max(${colSomme})`
            : d.kind === "min"
              ? `min(${colSomme})`
              : `coalesce(sum(${colSomme}), 0)`;
      // ── LE PORTEUR (1.41.0) — IL REND UNE LIGNE, PAS UN NOMBRE.
      //
      // `order by` sur le champ classe, PUIS sur le departage : c'est ce
      // second critere qui rend le gagnant reproductible. Sans lui, deux
      // bases donneraient deux gagnants, et aucune ne serait fautive.
      if (d.kind === "porteur") {
        const colClasse = somme.replace(/^fld_/u, "");
        const colDep = d.departage.fieldId.replace(/^fld_/u, "");
        const sens = d.sens === "min" ? "asc" : "desc";
        l.push(
          "/**",
          ` * ${e.name}.${f.name} = la LIGNE de « ${r.enfant.name} » qui porte le`,
          ` * ${d.sens === "min" ? "plus bas" : "plus haut"} « ${d.fieldId} ».`,
          " *",
          ` * EN CAS D'EGALITE, « ${d.departage.fieldId} » ${d.departage.sens === "asc" ? "le plus petit" : "le plus grand"} l'emporte.`,
          " * Ce second critere n'est pas un ornement : sans lui, la base",
          " * rendrait « la premiere ligne qu'elle trouve » — un ordre qui",
          " * depend du moteur et de l'index. Le gagnant d'une enchere ne peut",
          " * pas dependre de ca.",
          " */",
          `export async function ${nomFn}(base: Base, idParent: string): Promise<string | null> {`,
          `  const r = await base.un(`,
          `    \`select id as v from ${t} where ${cle} = ? order by ${colClasse} ${sens}, ${colDep} ${d.departage.sens} limit 1\`,`,
          "    [idParent],",
          "  );",
          "  const v = r?.[\"v\"];",
          "  return v === undefined || v === null ? null : String(v);",
          "}",
          "",
        );
        continue;
      }

      // ── LA CONDITION (1.39.0) — UNE CLAUSE `where` DE PLUS, ET RIEN D'AUTRE.
      //
      // Elle est fermee par le format : un champ de l'entite au bout de la
      // relation, un operateur d'un ensemble fini, une valeur litterale. Elle
      // se traduit donc en SQL sans ambiguite — et la valeur passe en
      // PARAMETRE, jamais dans le texte de la requete.
      const cond = "condition" in d ? d.condition : undefined;
      const SQL_OP: Readonly<Record<string, string>> = {
        eq: "=",
        neq: "<>",
        gt: ">",
        gte: ">=",
        lt: "<",
        lte: "<=",
      };
      const filtreSql =
        cond === undefined
          ? ""
          : cond.operateur === "in"
            ? ` and ${cond.fieldId.replace(/^fld_/u, "")} in (${(cond.valeur as readonly unknown[]).map(() => "?").join(", ")})`
            : ` and ${cond.fieldId.replace(/^fld_/u, "")} ${SQL_OP[cond.operateur] ?? "="} ?`;
      const parametres =
        cond === undefined
          ? "[idParent]"
          : cond.operateur === "in"
            ? `[idParent, ${(cond.valeur as readonly unknown[]).map((v) => JSON.stringify(v)).join(", ")}]`
            : `[idParent, ${JSON.stringify(cond.valeur)}]`;
      l.push(
        "/**",
        ` * ${e.name}.${f.name} = ${d.kind === "count" ? "le NOMBRE" : "la SOMME"} sur « ${r.enfant.name} »,`,
        ` * reliées par « ${r.cle.name} ».`,
        ...(cond === undefined
          ? []
          : [
              " *",
              ` * FILTRÉ : seules les lignes dont « ${cond.fieldId} » ${cond.operateur}`,
              ` * ${JSON.stringify(cond.valeur)} sont comptées. Le document le dit ; le`,
              " * serveur le fait. La valeur voyage en PARAMÈTRE : une valeur",
              " * recopiée dans le texte de la requête est une injection qui attend.",
            ]),
        " */",
        `export async function ${nomFn}(base: Base, idParent: string): Promise<number> {`,
        `  const r = await base.un(\`select ${expr} as v from ${t} where ${cle} = ?${filtreSql}\`, ${parametres});`,
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
    // La base est necessaire depuis 1.40.0 : `designe` cherche parmi des
    // lignes d'une autre entite. Le type suffit — rien n'est execute ici.
    'import type { Base } from "../base.ts";',
    "",
    PRELUDE_EXPRESSION,
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
    "// ── COMPARER DES VALEURS QUI NE VIENNENT PAS DU MEME MONDE.",
    "//",
    "// DEFAUT MESURE LE 2026-10-13, et il preexistait a ce lot. La ligne jugee",
    "// est `{ ...existante, ...corps }` : `existante` vient de la BASE, ou un",
    "// booleen vaut 0 ou 1, tandis que le document ecrit `true`. Une",
    "// comparaison par texte donnait donc `\"0\" === \"true\"` — FAUX — et la",
    "// regle etait silencieusement sautee a la MISE A JOUR, alors qu'elle",
    "// mordait a la creation. Aucune erreur, aucun signe : juste une",
    "// protection qui s'eteint une fois sur deux.",
    "//",
    "// On normalise donc les deux cotes AVANT de comparer : un booleen reste",
    "// un booleen, qu'il arrive de SQLite en 0/1 ou du document en true.",
    "function memeValeur(a: unknown, b: unknown): boolean {",
    "  const bool = (v: unknown): boolean | null => {",
    "    if (typeof v === \"boolean\") return v;",
    "    if (v === 1 || v === \"1\" || v === \"true\") return true;",
    "    if (v === 0 || v === \"0\" || v === \"false\") return false;",
    "    return null;",
    "  };",
    "  const ba = bool(a);",
    "  const bb = bool(b);",
    "  if (ba !== null && bb !== null) return ba === bb;",
    "  return String(a) === String(b);",
    "}",
    "",
    "// ── UNE RÉFÉRENCE DE FICHIER NE DOIT PAS SORTIR DES DOMAINES DÉCLARÉS.",
    "//",
    "// Mesuré le 2026-10-12 : 60 champs `asset` dans 29 documents sur 31, et",
    "// les deux émetteurs backend n'en parlaient pas une seule fois. Une ligne",
    "// pouvait donc porter une référence vers n'importe quel hôte — une image",
    "// servie depuis un domaine que personne n'a déclaré, et le document dit",
    "// pourtant lesquels sont permis (`network.allowedDomains`).",
    "//",
    "// Rien n'est inventé ici : les deux faits viennent du document.",
    "//",
    "// Un chemin RELATIF est accepté : il désigne le stockage de l'application",
    "// elle-même. Une URL absolue doit nommer un domaine déclaré. Une URL",
    "// illisible est REFUSÉE — ne pas savoir n'est pas une permission.",
    `const DOMAINES: readonly string[] = ${JSON.stringify(air.network.allowedDomains)};`,
    "function refHorsDomaine(v: unknown): boolean {",
    "  if (typeof v !== \"string\" || !v.includes(\"://\")) return false;",
    "  try {",
    "    return !DOMAINES.includes(new URL(v).hostname);",
    "  } catch {",
    "    return true;",
    "  }",
    "}",
    "",
  ];
  const validation = air.rules.filter((r) => r.kind === "validation");
  const autorisation = air.rules.filter((r) => r.kind !== "validation");

  for (const e of air.entities) {
    const miennes = validation.filter((r) => r.entityId === e.id);
    // Une seule évaluation par champ calculé, même si plusieurs règles le visent.
    const calculsEcrits = new Set<string>();
    l.push(
      `/**`,
      ` * Les règles de « ${e.name} », vérifiées AVANT écriture.`,
      ` *`,
      ` * La ligne examinée est celle qui SERA enregistrée — l'existante`,
      ` * fusionnée avec ce que la requête propose. Vérifier le seul corps de`,
      ` * la requête laisserait passer une règle tenue par un champ qu'elle ne`,
      ` * mentionne pas.`,
      ` */`,
      // ── POURQUOI CETTE VERIFICATION EST ASYNCHRONE ET VOIT LA BASE (1.40.0).
      //
      // Les neuf premiers operateurs comparent DANS la ligne : rien a lire
      // ailleurs. `designe` cherche PARMI DES LIGNES d'une autre entite — il
      // lui faut la base. Garder une signature synchrone aurait oblige a
      // verifier le code dans l'ecran, ce qui supposerait de lui livrer la
      // LISTE DES CODES : n'importe qui pourrait alors rejoindre n'importe
      // quelle tontine. La verification se fait la ou les codes ne sortent
      // jamais.
      `export async function verifier${PASCAL(e.id)}(ligne: Record<string, unknown>, base: Base): Promise<Violation | null> {`,
      "  void base;",
    );
    const assets = e.fields.filter((f) => f.type === "asset" && f.derived === undefined);
    for (const f of assets) {
      l.push(
        `  // « ${f.name} » désigne un fichier : sa référence doit rester dans les`,
        `  // domaines que le document déclare.`,
        `  if (refHorsDomaine(ligne[${JSON.stringify(colonne(f))}])) {`,
        `    return { regle: "AIR_ASSET_HORS_DOMAINE", message: ${JSON.stringify(`« ${f.name} » pointe hors des domaines déclarés`)} };`,
        "  }",
      );
    }
    if (miennes.length === 0 && assets.length === 0) {
      l.push("  void ligne;", "  // Le document n'en déclare aucune pour cette entité.");
    }
    for (const r of miennes) {
      // ── LE GARDE (1.42.0) : LA REGLE NE SE VERIFIE QUE S'IL EST VRAI.
      //
      // Toutes ses conditions doivent tenir. Il est emis en UNE expression,
      // juste devant les assertions, et les assertions sont indentees dedans :
      // le code emis se lit comme la regle se dit — « si sans telephone,
      // alors le mandataire est exige ».
      const garde = (r.appliqueSi ?? [])
        .map((g) => {
          const champG = e.fields.find((x) => x.id === g.fieldId);
          if (champG === undefined) return "";
          const cg = JSON.stringify(colonne(champG));
          const vg = JSON.stringify(g.value ?? null);
          switch (g.operator) {
            case "required":
              return `rempli(ligne[${cg}])`;
            case "eq":
              return `memeValeur(ligne[${cg}], ${vg})`;
            case "neq":
              return `!memeValeur(ligne[${cg}], ${vg})`;
            case "in":
              return `(${vg} as unknown[]).map(String).includes(String(ligne[${cg}]))`;
            case "gt":
              return `(nombre(ligne[${cg}]) ?? -Infinity) > Number(${vg})`;
            case "gte":
              return `(nombre(ligne[${cg}]) ?? -Infinity) >= Number(${vg})`;
            case "lt":
              return `(nombre(ligne[${cg}]) ?? Infinity) < Number(${vg})`;
            case "lte":
              return `(nombre(ligne[${cg}]) ?? Infinity) <= Number(${vg})`;
            default:
              return "";
          }
        })
        .filter((x) => x !== "");
      if (garde.length > 0) {
        l.push(
          `  // ${r.description}`,
          `  //   NE S'APPLIQUE QUE SI : ${(r.appliqueSi ?? []).map((g) => `${g.fieldId} ${g.operator}${g.value === undefined ? "" : ` ${JSON.stringify(g.value)}`}`).join(" ET ")}`,
          `  if (${garde.join(" && ")}) {`,
        );
      }
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
        // ── UNE RÈGLE SUR UN CHAMP CALCULÉ NE DOIT PAS PASSER EN SILENCE.
        //
        // Mesuré le 2026-10-12, en éprouvant un cahier des charges réel : le
        // contrôle était ÉCRIT mais ne se déclenchait jamais. La valeur
        // calculée n'est pas stockée, donc la ligne examinée ne la porte pas,
        // donc la condition était toujours fausse. « L'index ne peut pas être
        // inférieur au précédent » aurait passé sans jamais bloquer — pire
        // qu'une règle absente, parce que le document affirme la protéger.
        //
        // Un `calcul` se déduit de la ligne elle-même : on l'ÉVALUE. Les
        // autres formes dépendent de la base ou d'un barème ; elles ne sont
        // pas vérifiables à l'écriture, et on le DIT en levant.
        if (champ.derived !== undefined) {
          if (champ.derived.kind !== "calcul") {
            l.push(
              `  // « ${champ.name} » se calcule hors de la ligne (${champ.derived.kind}) :`,
              `  // invérifiable à l'écriture. On refuse au lieu de laisser passer.`,
              `  throw new Error("AIR_REGLE_NON_VERIFIABLE:${r.id}");`,
            );
            continue;
          }
          const nomCalc = `calc${PASCAL(champ.id)}`;
          if (!calculsEcrits.has(nomCalc)) {
            calculsEcrits.add(nomCalc);
            l.push(
              `  // « ${champ.name} » — évalué depuis la ligne, pas lu en base.`,
              `  const parId${PASCAL(e.id)}: Record<string, unknown> = {`,
              ...stockes(e).map((x) => `    ${JSON.stringify(x.id)}: ligne[${JSON.stringify(colonne(x))}],`),
              "  };",
              `  const ${nomCalc} = ${emettreExpressionTs(champ.derived.expression, `parId${PASCAL(e.id)}`)};`,
            );
          }
          const ech2 = `return { regle: ${JSON.stringify(r.id)}, message: ${JSON.stringify(r.description)} };`;
          const c2 = (() => {
            switch (a.operator) {
              case "required":
                return `${nomCalc} === null`;
              case "gt":
                return `${nomCalc} !== null && !(${nomCalc} > Number(${JSON.stringify(a.value ?? 0)}))`;
              case "gte":
                return `${nomCalc} !== null && !(${nomCalc} >= Number(${JSON.stringify(a.value ?? 0)}))`;
              case "lte":
                return `${nomCalc} !== null && !(${nomCalc} <= Number(${JSON.stringify(a.value ?? 0)}))`;
              case "eq":
                return `${nomCalc} !== null && ${nomCalc} !== Number(${JSON.stringify(a.value ?? 0)})`;
              case "neq":
                return `${nomCalc} !== null && ${nomCalc} === Number(${JSON.stringify(a.value ?? 0)})`;
              default:
                return "";
            }
          })();
          if (c2 === "") {
            l.push(
              `  // Opérateur « ${a.operator} » sans sens sur un calcul numérique.`,
              `  throw new Error("AIR_REGLE_NON_VERIFIABLE:${r.id}");`,
            );
            continue;
          }
          l.push(`  // ${r.description}`, `  if (${c2}) ${ech2}`);
          continue;
        }
        const c = JSON.stringify(colonne(champ));
        // ── COMPARER À UN AUTRE CHAMP DE LA MÊME LIGNE (1.35.0).
        //
        // Mesuré sur deux cahiers réels : « l'index ne peut pas être inférieur
        // au précédent » et « les requêtes du mois ne dépassent pas le plafond
        // du compte ». Les deux butaient sur la même limite — une assertion ne
        // se comparait qu'à une CONSTANTE.
        //
        // Le côté droit devient donc une LECTURE DE LA LIGNE quand
        // `otherFieldId` est posé. Le validateur a déjà refusé un champ d'une
        // autre entité, les deux formes ensemble, et la comparaison d'un champ
        // avec lui-même.
        const autre = a.otherFieldId;
        const champAutre =
          autre === undefined ? undefined : e.fields.find((x) => x.id === autre);
        const v =
          champAutre === undefined
            ? JSON.stringify(a.value ?? null)
            : `ligne[${JSON.stringify(colonne(champAutre))}]`;
        const echec = `return { regle: ${JSON.stringify(r.id)}, message: ${JSON.stringify(r.description)} };`;
        const cond = (() => {
          switch (a.operator) {
            case "required":
              return `!rempli(ligne[${c}])`;
            case "eq":
              return `rempli(ligne[${c}]) && !memeValeur(ligne[${c}], ${v})`;
            case "neq":
              return `rempli(ligne[${c}]) && memeValeur(ligne[${c}], ${v})`;
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
        // ── `designe` (1.40.0) — UNE LECTURE, PAS UNE COMPARAISON.
        //
        // La valeur saisie doit correspondre a une ligne EXISTANTE. Le
        // validateur a deja exige que le champ cible soit `unique`, donc il y
        // a au plus une ligne : « existe ou non » est une question qui a une
        // reponse. La valeur voyage en PARAMETRE — une valeur recopiee dans
        // le texte de la requete est une injection qui attend.
        if (a.operator === "designe" && a.designe !== undefined) {
          const tableCible = a.designe.entityId.replace(/^ent_/u, "");
          const colCible = a.designe.fieldId.replace(/^fld_/u, "");
          l.push(
            `  // ${r.description}`,
            `  //   \`${champ.name}\` doit designer une ligne de « ${a.designe.entityId} »`,
            `  if (rempli(ligne[${c}])) {`,
            `    const trouvee = await base.un(`,
            `      \`select 1 as v from ${tableCible} where ${colCible} = ? limit 1\`,`,
            `      [ligne[${c}]],`,
            "    );",
            `    if (trouvee === undefined || trouvee === null) ${echec}`,
            "  }",
          );
          continue;
        }
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
      // On referme le garde APRES toutes les assertions : elles sont toutes
      // sous la meme condition, ce qui est exactement ce que la regle dit.
      if (garde.length > 0) l.push("  }");
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
    `import { appliquerSchema, champDoublon, estDoublon, ouvrir } from "./base.ts";`,
    `import { SCHEMA } from "./schema.ts";`,
    ...air.entities.map((e) => `import { ${CAMEL(e.id)}Routes } from "./api/${table(e)}.ts";`),
    ...(avecApis(air) ? [`import { connecteurRoutes } from "./api/connecteur.ts";`] : []),
    ...(avecApis(air) && air.agent !== undefined
      ? [`import { agentRoutes } from "./api/agent.ts";`]
      : []),
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
    "  // ── UN DOUBLON RÉPOND 409 ET NOMME LE CHAMP DÉCLARÉ.",
    "  //",
    "  // Posé ICI et non dans chaque route : la contrainte peut être violée",
    "  // par n'importe quelle écriture de n'importe quelle entité, et un",
    "  // traitement recopié vingt fois est un traitement qui finira par",
    "  // manquer quelque part.",
    "  //",
    "  // La table ci-dessous est la SEULE traduction colonne → champ. Elle",
    "  // existe pour que la réponse ne porte jamais le nom physique : le",
    "  // schéma n'est pas une information publique.",
    "  const UNIQUES: ReadonlyArray<readonly [string, string]> = [",
    ...air.entities.flatMap((e) =>
      conserves(e)
        .filter((f) => f.unique === true)
        .map((f) => `    ["${colonne(f)}", "${f.name}"],`),
    ),
    "  ];",
    "  app.setErrorHandler((err, _req, rep) => {",
    "    if (estDoublon(err)) {",
    "      return rep.code(409).send({",
    '        error: "AIR_VALEUR_DEJA_PRISE",',
    "        champ: champDoublon(err, UNIQUES),",
    "      });",
    "    }",
    "    // Tout le reste garde le comportement par défaut de Fastify : une",
    "    // erreur inconnue ne doit pas être déguisée en faute de l'appelant.",
    "    return rep.send(err);",
    "  });",
    "  // ── LES EN-TÊTES DE PROTECTION, SUR CHAQUE RÉPONSE.",
    "  //",
    "  // Mesuré le 2026-10-12 : 0 serveur sur 31 n'en posait AUCUN. Le contrat",
    "  // d'API était émis, démarré et prouvé — et il répondait sans aucune",
    "  // protection de transport ni de type.",
    "  //",
    "  // Posés ici et nulle part ailleurs, sans dépendance ajoutée : `helmet`",
    "  // ferait la même chose au prix d'un paquet de plus, pour quatre lignes.",
    "  //",
    "  // `nosniff` : un navigateur ne doit pas DEVINER le type d'une réponse.",
    "  // `DENY` : cette API n'a rien à faire dans un cadre d'une autre page.",
    "  // HSTS n'est posé que derrière TLS — l'annoncer en clair ne protège rien",
    "  // et casse un développement en local.",
    "  app.addHook(\"onSend\", async (req, rep) => {",
    "    void rep.header(\"X-Content-Type-Options\", \"nosniff\");",
    "    void rep.header(\"X-Frame-Options\", \"DENY\");",
    "    void rep.header(\"Referrer-Policy\", \"no-referrer\");",
    "    if (req.protocol === \"https\") {",
    "      void rep.header(\"Strict-Transport-Security\", \"max-age=31536000\");",
    "    }",
    "  });",
    "  const base = await ouvrir();",
    "  await appliquerSchema(base, SCHEMA);",
    "  app.log.info(`base : ${base.moteur}`);",
    ...air.entities.map((e) => `  ${CAMEL(e.id)}Routes(app, ${CAMEL(e.id)}DepotSql(base), base);`),
    ...(avecApis(air) ? ["  connecteurRoutes(app);"] : []),
    ...(avecApis(air) && air.agent !== undefined ? ["  agentRoutes(app);"] : []),
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

/** Un document declare-t-il au moins une API ? Rien n'est emis sinon. */
const avecApis = (air: ProjectAir): boolean =>
  air.apis !== undefined && air.apis.length > 0;

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
  // ── LE CONNECTEUR — UN FICHIER PAR API DECLAREE, SUR LE SERVEUR.
  //
  // Un document sans `apis` n'emet AUCUN de ces fichiers : le connecteur
  // n'est pas une dependance du serveur, c'est une consequence d'une
  // declaration. Les 31 documents du corpus continuent d'emettre exactement
  // ce qu'ils emettaient.
  if (air.apis !== undefined && air.apis.length > 0) {
    for (const api of air.apis) {
      files.set(`src/connecteur/${api.id}.ts`, moduleConnecteur(api));
    }
    files.set("src/api/connecteur.ts", routesConnecteur(air.apis));
    // ── LA PORTE DE L'AGENT — PLUS ETROITE QUE CELLE DU CONNECTEUR.
    //
    // Le validateur refuse un agent sans API (AIR_AGENT_NO_API), donc cette
    // porte ne s'emet qu'a l'interieur du bloc qui a deja des API.
    if (air.agent !== undefined) {
      files.set("src/api/agent.ts", routesAgent(air));
    }
  }
  if (air.entities.some((e) => e.fields.some((f) => f.derived?.kind === "count" || f.derived?.kind === "sum" || f.derived?.kind === "max" || f.derived?.kind === "min" || f.derived?.kind === "porteur"))) {
    files.set("src/calcul/en-base.ts", calculs(air));
  }
  return { files };
}
