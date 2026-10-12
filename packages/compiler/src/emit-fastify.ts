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
    `  creer(x: Omit<${n}, "id">): Promise<${n}>;`,
  ];
  if (journal) {
    l.push(
      "  // ENTITÉ JOURNAL : ni modification ni suppression. Une erreur se",
      "  // répare par une ligne NOUVELLE qui annule la première.",
    );
  } else {
    l.push(`  modifier(id: string, x: Partial<${n}>): Promise<${n}>;`, "  supprimer(id: string): Promise<void>;");
  }
  l.push(
    "}",
    "",
    `export function ${CAMEL(e.id)}DepotNonEcrit(): ${n}Depot {`,
    `  const refus = (): never => { throw new Error("AIR_DEPOT_A_ECRIRE:${e.id}"); };`,
    "  return {",
    "    lister: refus, lire: refus, creer: refus,",
    ...(journal ? [] : ["    modifier: refus, supprimer: refus,"]),
    "  };",
    "}",
  );
  return l.join("\n") + "\n";
}

/**
 * LES TRANSITIONS D'ÉTAT, REFUSÉES SUR LE SERVEUR.
 *
 * Le document dit ce qui SUCCÈDE À QUOI. L'application le respecte déjà en
 * n'affichant pas les boutons impossibles — mais un écran ne protège de rien :
 * la route s'appelle directement. La garde compare l'état AVANT, lu en base,
 * à celui demandé ; une transition non déclarée est refusée en 409.
 *
 * Rendre un tableau de lignes, et non une chaîne, pour que l'appelant garde
 * l'indentation du corps de route dans lequel elles s'insèrent.
 */
function gardeTransitions(e: Entite): readonly string[] {
  const avecEtats = e.fields.filter((f) => f.transitions !== undefined);
  if (avecEtats.length === 0) return [];
  const l = [
    "    const precedent = await depot.lire(id);",
    "    if (precedent === null) return rep.code(404).send({ erreur: \"introuvable\" });",
    "    const ancien = precedent as unknown as Record<string, unknown>;",
  ];
  for (const f of avecEtats) {
    const paires = (f.transitions ?? []).map((t) => `${t.from}>${t.to}`);
    l.push(
      `    // « ${f.name} » : ${String(paires.length)} transition(s) déclarée(s).`,
      `    const permises${CAMEL(f.id)} = new Set(${JSON.stringify(paires)});`,
      `    const de${CAMEL(f.id)} = ancien[${JSON.stringify(colonne(f))}];`,
      `    const vers${CAMEL(f.id)} = corps[${JSON.stringify(colonne(f))}];`,
      `    if (`,
      `      de${CAMEL(f.id)} !== undefined &&`,
      `      vers${CAMEL(f.id)} !== undefined &&`,
      `      String(de${CAMEL(f.id)}) !== String(vers${CAMEL(f.id)}) &&`,
      `      !permises${CAMEL(f.id)}.has(\`\${String(de${CAMEL(f.id)})}>\${String(vers${CAMEL(f.id)})}\`)`,
      `    ) {`,
      "      return rep.code(409).send({",
      `        erreur: "AIR_TRANSITION_INTERDITE",`,
      `        message: \`« \${String(de${CAMEL(f.id)})} » ne mène pas à « \${String(vers${CAMEL(f.id)})} »\`,`,
      "      });",
      "    }",
    );
  }
  return l;
}

function routes(e: Entite): string {
  const n = CAMEL(e.id);
  const journal = e.appendOnly === true;
  const l = [
    `import type { FastifyInstance } from "fastify";`,
    `import type { ${n}Depot } from "../depot/${table(e)}.ts";`,
    "",
    `/** Routes de « ${e.name} ». Montées sous /${table(e)}. */`,
    `export function ${CAMEL(e.id)}Routes(app: FastifyInstance, depot: ${n}Depot): void {`,
    `  app.get("/${table(e)}", async () => depot.lister());`,
    `  app.get("/${table(e)}/:id", async (req, rep) => {`,
    "    const { id } = req.params as { id: string };",
    "    const x = await depot.lire(id);",
    "    if (x === null) return rep.code(404).send({ erreur: \"introuvable\" });",
    "    return x;",
    "  });",
    `  app.post("/${table(e)}", async (req, rep) =>`,
    `    rep.code(201).send(await depot.creer(req.body as never)));`,
  ];
  if (journal) {
    l.push(
      "  // LE DOCUMENT DÉCLARE CETTE ENTITÉ COMME UN JOURNAL.",
      "  //",
      "  // Les routes EXISTENT et REFUSENT, au lieu d'être absentes. Une route",
      "  // absente répond 404 — « cette adresse n'existe pas » — ce qui est",
      "  // faux et se lit comme une erreur de montage côté appelant. Le 409",
      "  // dit la vraie raison, et c'est le même refus que la pile Java : le",
      "  // document ne doit pas vouloir dire deux choses selon le serveur.",
      `  app.patch("/${table(e)}/:id", async (req, rep) => {`,
      "    void req;",
      "    return rep.code(409).send({",
      `      erreur: "AIR_JOURNAL_REECRITURE",`,
      `      message: ${JSON.stringify(`« ${e.name} » est un journal : une ligne existante ne se réécrit pas`)},`,
      "    });",
      "  });",
      `  app.delete("/${table(e)}/:id", async (req, rep) => {`,
      "    void req;",
      "    return rep.code(409).send({",
      `      erreur: "AIR_JOURNAL_SUPPRESSION",`,
      `      message: ${JSON.stringify(`« ${e.name} » est un journal : une ligne ne s'efface pas`)},`,
      "    });",
      "  });",
    );
  } else {
    l.push(
      `  app.patch("/${table(e)}/:id", async (req, rep) => {`,
      "    const { id } = req.params as { id: string };",
      "    const corps = req.body as Record<string, unknown>;",
      ...gardeTransitions(e),
      "    return depot.modifier(id, corps as never);",
      "  });",
      `  app.delete("/${table(e)}/:id", async (req, rep) => {`,
      "    const { id } = req.params as { id: string };",
      "    await depot.supprimer(id);",
      "    return rep.code(204).send();",
      "  });",
    );
  }
  l.push("}");
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
    ...air.entities.map((e) => `import { ${CAMEL(e.id)}Routes } from "./api/${table(e)}.ts";`),
    ...air.entities.map(
      (e) => `import { ${CAMEL(e.id)}DepotNonEcrit } from "./depot/${table(e)}.ts";`,
    ),
    "",
    `// ÉMIS depuis le contrat de « ${air.app.name} ».`,
    "export function construire(): ReturnType<typeof Fastify> {",
    "  const app = Fastify({ logger: true });",
    ...air.entities.map(
      (e) => `  ${CAMEL(e.id)}Routes(app, ${CAMEL(e.id)}DepotNonEcrit());`,
    ),
    "  return app;",
    "}",
    "",
    "if (process.env.NODE_ENV !== \"test\") {",
    "  const port = Number(process.env.PORT ?? 3000);",
    "  void construire().listen({ port, host: \"0.0.0.0\" });",
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
      scripts: { dev: "tsx src/serveur.ts", typecheck: "tsc --noEmit" },
      dependencies: { fastify: "^5" },
      devDependencies: { tsx: "^4", typescript: "^5" },
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
