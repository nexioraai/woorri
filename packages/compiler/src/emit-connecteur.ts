/**
 * LE CONNECTEUR D'API — ÉMIS SUR LE SERVEUR, JAMAIS DANS L'APPLICATION.
 *
 * AIR 1.36.0 a rendu une API extérieure DÉCLARABLE, et le validateur sait la
 * refuser quand elle est mal déclarée. Mesure du 2026-10-13 : un seul fichier
 * lisait `air.apis` — le validateur. ZÉRO code émettait un appel. Une API
 * déclarable et refusable, mais pas appelable. Voici l'appel.
 *
 * ── LA DÉCISION QUI COMMANDE TOUTE L'ARCHITECTURE : LE SECRET.
 *
 * `auth.kind === "header_secret"` porte le NOM d'une variable
 * d'environnement, jamais sa valeur. Il aurait été plus court de faire
 * appeler l'API par l'application elle-même : un `fetch` dans l'écran, et
 * c'était fini. C'eût été une FUITE. Le paquet installé sur un téléphone se
 * décompresse ; tout ce qu'il contient est public. Le secret serait parti
 * chez chaque personne qui installe l'application.
 *
 * Donc l'application parle à SON serveur, et le serveur seul parle à l'API.
 * Le secret ne quitte jamais la machine qui le détient.
 *
 * ── CE QUE LE CONNECTEUR REFUSE, ET POURQUOI CHAQUE REFUS EXISTE.
 *
 * L'HÔTE VIENT DE LA DÉCLARATION, JAMAIS DE LA REQUÊTE. Le domaine est écrit
 * en littéral dans le fichier émis. Une application ne peut pas demander au
 * serveur d'appeler une autre adresse : c'est ce qui ferme la classe entière
 * des attaques où l'on fait appeler au serveur une adresse interne.
 *
 * EXACTEMENT LES ENTRÉES DÉCLARÉES. Un champ en trop est refusé, pas ignoré.
 * Ignorer en silence laisserait passer des données vers l'API extérieure que
 * personne n'a déclarées — et le manifeste de confidentialité, lui, ne
 * parlerait que des champs déclarés. Il deviendrait faux.
 *
 * EXACTEMENT LES SORTIES DÉCLARÉES. La réponse est filtrée aux clés
 * déclarées avant de revenir à l'application. Si l'API se met un jour à
 * renvoyer une adresse ou un numéro en plus, ça ne traverse pas. Le filtre
 * est le cliquet de confidentialité du connecteur.
 *
 * AUCUNE REPRISE AUTOMATIQUE. Un appel qui échoue n'est pas rejoué. Rejouer
 * un `POST` qui débite un compte le débiterait DEUX FOIS. Tant que le
 * document ne dit pas quelles opérations sont rejouables sans dommage, le
 * moteur ne devine pas.
 *
 * ── LE CODE ÉMIS DOIT ÊTRE EFFAÇABLE, PAS SEULEMENT VALIDE.
 *
 * Mesuré le 2026-10-13 : le serveur émis est exécuté par un `node` nu, qui
 * EFFACE les types sans les transformer. Une propriété de paramètre de
 * constructeur — `constructor(public readonly nom: string)` — est du
 * TypeScript correct, que `tsc` accepte, et que Node REFUSE :
 * ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX. Elle exige qu'on fabrique du code, pas
 * qu'on retire des annotations. Les champs sont donc écrits à la main. Même
 * raison pour `enum`, `namespace` et les décorateurs : un cliquet les
 * interdit dans tout code émis, parce que « ça compile » ne veut pas dire
 * « ça démarre ».
 *
 * UN DÉLAI, ET IL EST COURT. Sans délai, une API qui ne répond plus retient
 * une connexion du serveur jusqu'à épuisement : l'application entière tombe
 * à cause d'un tiers.
 */
import type { ProjectAir } from "@deribfy/air-schema";

type Api = NonNullable<ProjectAir["apis"]>[number];
type Operation = Api["operations"][number];

/** Un identifiant AIR est en tiret-bas ; un nom de fonction est en camel. */
const CAMEL = (id: string): string =>
  id.replace(/[_-]+([a-z0-9])/gu, (_m, c: string) => c.toUpperCase());

/**
 * LE DÉLAI. Dix secondes.
 *
 * Mesuré sur la chaîne : le délai de lecture des sondes vivantes est de cet
 * ordre. Plus court couperait une API lente mais correcte ; plus long
 * laisserait l'écran de la personne attendre sans rien dire.
 */
const DELAI_MS = 10_000;

/** Les segments `{nom}` du chemin, dans l'ordre où ils apparaissent. */
export const segmentsDuChemin = (chemin: string): readonly string[] =>
  [...chemin.matchAll(/\{([a-z][a-zA-Z0-9_]*)\}/gu)].map((m) => m[1] ?? "");

/** Ce qu'une opération attend : ses `sends` ET les segments de son chemin. */
export const entreesAttendues = (op: Operation): readonly string[] => {
  const vues = new Set<string>();
  for (const nom of [...segmentsDuChemin(op.path), ...(op.sends ?? [])]) {
    vues.add(nom);
  }
  return [...vues];
};

/** Le corps part en JSON ; une requête sans corps met ses entrées en query. */
const porteUnCorps = (op: Operation): boolean =>
  op.method === "POST" || op.method === "PUT" || op.method === "PATCH";

function verificationDuType(cle: string, type: "string" | "number" | "boolean"): readonly string[] {
  // ── ON NE CONVERTIT PAS, ON REFUSE.
  //
  // Beaucoup d'API rendent un nombre sous forme de texte. Convertir
  // discrètement ferait entrer `NaN` dans un calcul le jour où la valeur
  // n'est pas convertible, et personne ne saurait d'où il vient. Le document
  // DÉCLARE ce que l'API rend ; si la déclaration est fausse, c'est la
  // déclaration qu'il faut corriger, et le refus le dit.
  const garde =
    type === "number"
      ? `typeof v !== "number" || !Number.isFinite(v)`
      : `typeof v !== "${type}"`;
  return [
    `  {`,
    `    const v = (brut as Record<string, unknown>)[${JSON.stringify(cle)}];`,
    `    if (${garde}) {`,
    `      throw new ReponseInattendue(`,
    `        ${JSON.stringify(cle)},`,
    `        ${JSON.stringify(type)},`,
    `      );`,
    `    }`,
    `    sortie[${JSON.stringify(cle)}] = v;`,
    `  }`,
  ];
}

function uneOperation(api: Api, op: Operation): readonly string[] {
  const nom = CAMEL(op.id);
  const segments = segmentsDuChemin(op.path);
  const attendues = entreesAttendues(op);
  const corps = porteUnCorps(op);
  // Les `sends` qui ne sont PAS dans le chemin voyagent dans le corps ou la
  // query ; ceux qui sont dans le chemin y sont déjà, les envoyer deux fois
  // dirait deux fois la même chose à l'API.
  const transportes = (op.sends ?? []).filter((s) => !segments.includes(s));
  const typeSortie =
    "{ " + op.returns.map((r) => `${r.key}: ${r.type}`).join("; ") + " }";
  return [
    "",
    `/**`,
    ` * ${op.name}`,
    ` *`,
    ` * ${op.method} ${op.path} — déclarée au document, donc appelable. Aucune`,
    ` * autre adresse de cette API n'est joignable : il n'y a de fonction que`,
    ` * pour ce qui est déclaré.`,
    ` */`,
    `export async function ${nom}(`,
    `  entrees: Readonly<Record<string, string | number | boolean>>,`,
    `): Promise<${typeSortie}> {`,
    ...(attendues.length > 0
      ? [
          `  for (const nom of ${JSON.stringify(attendues)}) {`,
          `    if (!(nom in entrees)) throw new EntreeManquante(nom);`,
          `  }`,
          `  for (const nom of Object.keys(entrees)) {`,
          `    if (!${JSON.stringify(attendues)}.includes(nom)) {`,
          `      throw new EntreeEnTrop(nom);`,
          `    }`,
          `  }`,
        ]
      : [
          `  // Cette opération n'attend rien : tout champ fourni est en trop.`,
          `  for (const nom of Object.keys(entrees)) throw new EntreeEnTrop(nom);`,
        ]),
    // ── LE CHEMIN EST ÉCHAPPÉ SEGMENT PAR SEGMENT.
    //
    // Une valeur contenant `../` ou `?` changerait l'adresse appelée. Chaque
    // segment est encodé, donc une valeur reste une valeur.
    `  let chemin = ${JSON.stringify(op.path)};`,
    ...segments.map(
      (s) =>
        `  chemin = chemin.replace(${JSON.stringify(`{${s}}`)}, encodeURIComponent(String(entrees[${JSON.stringify(s)}]))); `,
    ),
    `  const url = new URL("https://" + DOMAINE + chemin);`,
    ...(corps || transportes.length === 0
      ? []
      : [
          `  for (const nom of ${JSON.stringify(transportes)}) {`,
          `    url.searchParams.set(nom, String(entrees[nom]));`,
          `  }`,
        ]),
    `  const reponse = await appeler(url, ${JSON.stringify(op.method)}, ${
      corps && transportes.length > 0
        ? `Object.fromEntries(${JSON.stringify(transportes)}.map((n) => [n, entrees[n]]))`
        : "undefined"
    });`,
    `  const brut: unknown = await reponse.json().catch(() => null);`,
    `  if (brut === null || typeof brut !== "object") {`,
    `    throw new ReponseInattendue("(racine)", "object");`,
    `  }`,
    // ── LE FILTRE. Seules les clés déclarées traversent.
    `  const sortie: Record<string, unknown> = {};`,
    ...op.returns.flatMap((r) => verificationDuType(r.key, r.type)),
    `  return sortie as ${typeSortie};`,
    `}`,
  ];
}

/** Le module d'une API déclarée : un fichier, une API, rien d'implicite. */
export function moduleConnecteur(api: Api): string {
  const secret =
    api.auth.kind === "header_secret"
      ? [
          "",
          "/**",
          " * LE SECRET — SON NOM SEULEMENT, JAMAIS SA VALEUR.",
          " *",
          " * Le document déclare le NOM d'une variable d'environnement. Ce",
          " * fichier ne contient donc aucun secret : il contient l'endroit où",
          " * aller le chercher. Si la variable est absente, l'appel est refusé",
          " * en nommant la variable — un refus clair vaut mieux qu'un appel",
          " * sans en-tête, que l'API rejetterait par un 401 incompréhensible.",
          " */",
          `const NOM_DU_SECRET = ${JSON.stringify(api.auth.secretEnvName)};`,
          "",
          "export class SecretAbsent extends Error {",
          "  constructor() {",
          "    super(`la variable d'environnement ${NOM_DU_SECRET} n'est pas définie`);",
          "    this.name = \"SecretAbsent\";",
          "  }",
          "}",
        ]
      : [
          "",
          "// Cette API est déclarée `none` : publique, aucun en-tête d'identité.",
          "// Aucun secret n'est lu, donc aucun secret ne peut manquer.",
        ];
  const enTetes =
    api.auth.kind === "header_secret"
      ? [
          `  const valeur = process.env[NOM_DU_SECRET];`,
          `  if (valeur === undefined || valeur === "") throw new SecretAbsent();`,
          `  const entetes: Record<string, string> = {`,
          `    ${JSON.stringify(api.auth.headerName)}: valeur,`,
          `    accept: "application/json",`,
          `  };`,
        ]
      : [`  const entetes: Record<string, string> = { accept: "application/json" };`];
  const l = [
    `// ÉMIS PAR DERIBFY — connecteur de « ${api.name} ».`,
    "//",
    "// CE FICHIER EST UN FICHIER DE SERVEUR. Il n'est jamais embarqué dans",
    "// l'application : il lit l'environnement, et l'environnement d'un",
    "// téléphone est public.",
    "",
    `const DOMAINE = ${JSON.stringify(api.domain)};`,
    `const DELAI_MS = ${DELAI_MS};`,
    ...secret,
    "",
    "export class EntreeManquante extends Error {",
    "  readonly nom: string;",
    "  constructor(nom: string) {",
    "    super(`l'entrée ${nom} est attendue et n'a pas été fournie`);",
    "    this.name = \"EntreeManquante\";",
    "    this.nom = nom;",
    "  }",
    "}",
    "",
    "export class EntreeEnTrop extends Error {",
    "  readonly nom: string;",
    "  constructor(nom: string) {",
    "    super(`l'entrée ${nom} n'est pas déclarée pour cette opération`);",
    "    this.name = \"EntreeEnTrop\";",
    "    this.nom = nom;",
    "  }",
    "}",
    "",
    "export class ApiARefuse extends Error {",
    "  readonly statut: number;",
    "  constructor(statut: number) {",
    "    super(`l'API a répondu ${statut}`);",
    "    this.name = \"ApiARefuse\";",
    "    this.statut = statut;",
    "  }",
    "}",
    "",
    "export class ApiTropLente extends Error {",
    "  constructor() {",
    `    super(\`l'API n'a pas répondu en \${DELAI_MS} ms\`);`,
    "    this.name = \"ApiTropLente\";",
    "  }",
    "}",
    "",
    "export class ReponseInattendue extends Error {",
    "  readonly cle: string;",
    "  readonly attendu: string;",
    "  constructor(cle: string, attendu: string) {",
    "    super(`la réponse ne porte pas ${cle} en ${attendu}`);",
    "    this.name = \"ReponseInattendue\";",
    "    this.cle = cle;",
    "    this.attendu = attendu;",
    "  }",
    "}",
    "",
    "/**",
    " * L'APPEL, ET SES DEUX GARDES.",
    " *",
    " * UN DÉLAI : sans lui, une API muette retient une connexion du serveur",
    " * jusqu'à ce qu'il n'en reste plus. L'application tomberait à cause d'un",
    " * tiers.",
    " *",
    " * AUCUNE REPRISE : un appel échoué n'est pas rejoué. Rejouer un POST qui",
    " * débite débiterait deux fois. Le document ne dit pas encore quelles",
    " * opérations sont rejouables sans dommage, donc le moteur ne devine pas.",
    " */",
    "async function appeler(",
    "  url: URL,",
    "  methode: string,",
    "  corps: Record<string, unknown> | undefined,",
    "): Promise<Response> {",
    ...enTetes,
    "  if (corps !== undefined) entetes[\"content-type\"] = \"application/json\";",
    "  let reponse: Response;",
    "  try {",
    "    reponse = await fetch(url, {",
    "      method: methode,",
    "      headers: entetes,",
    "      body: corps === undefined ? undefined : JSON.stringify(corps),",
    "      signal: AbortSignal.timeout(DELAI_MS),",
    "      redirect: \"error\",",
    "    });",
    "  } catch (e) {",
    "    // `redirect: \"error\"` est volontaire : une redirection pourrait",
    "    // emmener l'en-tête du secret vers un autre hôte que celui déclaré.",
    "    if (e instanceof Error && (e.name === \"TimeoutError\" || e.name === \"AbortError\")) {",
    "      throw new ApiTropLente();",
    "    }",
    "    throw e;",
    "  }",
    "  if (!reponse.ok) throw new ApiARefuse(reponse.status);",
    "  return reponse;",
    "}",
    ...api.operations.flatMap((op) => uneOperation(api, op)),
  ];
  return l.join("\n") + "\n";
}

/**
 * LES ROUTES — COMMENT L'APPLICATION ATTEINT LE CONNECTEUR.
 *
 * TOUJOURS EN POST, quelle que soit la méthode de l'API extérieure. Les
 * entrées voyagent dans le corps, pas dans l'adresse : une adresse se
 * retrouve dans les journaux du serveur, dans ceux de l'hébergeur, et dans
 * l'historique des mandataires. Un numéro de téléphone passé en query y
 * resterait écrit.
 *
 * UN APPELANT EST EXIGÉ. Un appel d'API déclarée coûte de l'argent au
 * propriétaire de l'application — chaque requête part chez un tiers qui la
 * facture. Ouvrir ces adresses à l'anonyme, c'est laisser n'importe qui vider
 * le quota, et la facture, de quelqu'un d'autre.
 */
export function routesConnecteur(apis: readonly Api[]): string {
  const l = [
    `import type { FastifyInstance } from "fastify";`,
    `import { appelantDe } from "../appelant.ts";`,
    ...apis.map(
      (a) => `import * as ${CAMEL(a.id)} from "../connecteur/${a.id}.ts";`,
    ),
    "",
    "// ÉMIS PAR DERIBFY — les adresses du connecteur.",
    "//",
    "// Il n'y a d'adresse QUE pour une opération déclarée. Une opération",
    "// absente du document n'a pas de route : elle n'est pas « interdite »,",
    "// elle n'existe pas. C'est la forme de refus la plus solide.",
    "",
    "export function connecteurRoutes(app: FastifyInstance): void {",
  ];
  for (const api of apis) {
    for (const op of api.operations) {
      const adresse = `/air/v1/apis/${api.id}/${op.id}`;
      l.push(
        `  app.post(${JSON.stringify(adresse)}, async (req, rep) => {`,
        "    const appelant = appelantDe(req.headers as Record<string, unknown>);",
        "    if (appelant === null) {",
        "      return rep.code(403).send({",
        `        error: "AIR_APPELANT_REQUIS",`,
        `        message: "un appel d'API déclarée exige une identité vérifiable",`,
        "      });",
        "    }",
        "    const corps = (req.body ?? {}) as Record<string, string | number | boolean>;",
        "    try {",
        `      return await ${CAMEL(api.id)}.${CAMEL(op.id)}(corps);`,
        "    } catch (e) {",
        "      return rep.code(statut(e)).send({ error: code(e), message: message(e) });",
        "    }",
        "  });",
      );
    }
  }
  l.push(
    "}",
    "",
    "// ── CE QUE L'APPLICATION APPREND D'UN ÉCHEC, ET CE QU'ELLE N'APPREND PAS.",
    "//",
    "// Le CORPS de la réponse de l'API extérieure ne traverse JAMAIS. Il peut",
    "// contenir l'en-tête du secret réfléchi, un message interne, ou les",
    "// données d'une autre personne. L'application reçoit le genre de l'échec,",
    "// pas le texte du tiers.",
    "function statut(e: unknown): number {",
    "  const nom = e instanceof Error ? e.name : \"\";",
    "  // 400 : la demande est fautive. 503 : le serveur n'est pas configuré.",
    "  // 502 : le tiers a refusé ou a menti sur sa réponse. 504 : il est muet.",
    "  if (nom === \"EntreeManquante\" || nom === \"EntreeEnTrop\") return 400;",
    "  if (nom === \"SecretAbsent\") return 503;",
    "  if (nom === \"ApiTropLente\") return 504;",
    "  if (nom === \"ApiARefuse\" || nom === \"ReponseInattendue\") return 502;",
    "  return 500;",
    "}",
    "",
    "function code(e: unknown): string {",
    "  const nom = e instanceof Error ? e.name : \"\";",
    "  if (nom === \"EntreeManquante\") return \"AIR_API_ENTREE_MANQUANTE\";",
    "  if (nom === \"EntreeEnTrop\") return \"AIR_API_ENTREE_EN_TROP\";",
    "  if (nom === \"SecretAbsent\") return \"AIR_API_SECRET_ABSENT\";",
    "  if (nom === \"ApiTropLente\") return \"AIR_API_TROP_LENTE\";",
    "  if (nom === \"ApiARefuse\") return \"AIR_API_A_REFUSE\";",
    "  if (nom === \"ReponseInattendue\") return \"AIR_API_REPONSE_INATTENDUE\";",
    "  return \"AIR_API_ECHEC\";",
    "}",
    "",
    "function message(e: unknown): string {",
    "  return e instanceof Error ? e.message : \"échec de l'appel\";",
    "}",
  );
  return l.join("\n") + "\n";
}
