/**
 * LA PORTE DE L'AGENT — PLUS ÉTROITE QUE CELLE DU CONNECTEUR.
 *
 * `agent.allowedOperations` dit ce que l'agent peut faire. Mesure du
 * 2026-10-13 : rien ne l'appliquait. Les routes du connecteur sont ouvertes à
 * tout appelant authentifié ; brancher l'agent dessus aurait rendu
 * `allowedOperations` DÉCORATIF — un agent autorisé sur une seule opération
 * aurait pu appeler les autres, et le document aurait menti sur ses pouvoirs.
 *
 * L'agent a donc SA porte. Elle ne connaît que les opérations autorisées : il
 * n'y a pas de branche pour les autres. Une opération non autorisée n'est pas
 * « interdite », elle n'existe pas de ce côté-ci.
 *
 * ── LE PIÈGE QUE CE FICHIER FERME : UNE CONFIRMATION D'ÉCRAN NE CONFIRME
 *    RIEN.
 *
 * `confirmBeforeAct: true` se lit comme « demande avant d'agir ». Il aurait
 * été naturel de l'appliquer dans l'écran : une boîte « êtes-vous sûr ? », et
 * c'était fini. Ç'aurait été une promesse SANS SERRURE. Le serveur est
 * joignable directement — avec le jeton de la personne, un appel bien formé
 * agit sans jamais passer par l'écran. La confirmation doit donc être exigée
 * LÀ OÙ L'ACTE A LIEU.
 *
 * Alors l'écran demande d'abord une INTENTION : le serveur rend un résumé de
 * ce qui va se passer, et un jeton signé. L'acte exige ce jeton.
 *
 * Trois liens, trois raisons :
 *   — lié à l'APPELANT : sinon la confirmation d'une personne serait rejouable
 *     par une autre ;
 *   — lié aux ENTRÉES : sinon on confirme « envoyer 10 » et on agit
 *     « envoyer 10000 » ;
 *   — avec une ÉCHÉANCE : une confirmation d'hier n'est pas une confirmation.
 *
 * ── CE QUE CETTE PORTE NE FAIT PAS, ET QU'IL FAUT DIRE.
 *
 * ELLE N'INTERPRÈTE AUCUNE PHRASE. Décider quelle opération répond à « envoie
 * 5000 à Awa » demande un modèle, et un modèle est une API — déclarée comme
 * les autres. Le document ne dit pas encore laquelle sert de cerveau. Tant
 * qu'il ne le dit pas, l'agent EXÉCUTE ce qu'on lui désigne ; il ne devine
 * pas.
 *
 * UNE INTENTION EST REJOUABLE DANS SA FENÊTRE. La signature est sans état :
 * rien n'enregistre qu'une intention a servi. Dans les cinq minutes, le même
 * jeton, avec les mêmes entrées et le même appelant, agirait une seconde
 * fois. La rendre à usage unique exige un état partagé — une table — que le
 * document ne déclare pas. Ce qui borne l'exposition : il faut DÉJÀ le jeton
 * d'identité de la personne pour entrer.
 */
import type { ProjectAir } from "@deribfy/air-schema";

type Api = NonNullable<ProjectAir["apis"]>[number];
type Operation = Api["operations"][number];

const CAMEL = (id: string): string =>
  id.replace(/[_-]+([a-z0-9])/gu, (_m, c: string) => c.toUpperCase());

/**
 * CINQ MINUTES.
 *
 * Deux minutes suffiraient à qui lit vite. Une personne qu'on appelle au
 * téléphone pendant qu'elle lit une confirmation reviendrait trop tard, et
 * son action échouerait sans qu'elle comprenne pourquoi. Cinq minutes.
 */
const FENETRE_S = 300;

/** Où vit une opération autorisée. Sans ambiguïté : le validateur la refuse. */
export interface OperationDeLAgent {
  readonly api: Api;
  readonly op: Operation;
}

/**
 * RÉSOUDRE CHAQUE OPÉRATION AUTORISÉE VERS SON API.
 *
 * Deux API peuvent déclarer une opération du même nom — l'unicité n'est
 * garantie que PAR API. Depuis le 2026-10-13, un agent qui nomme une
 * opération ambiguë est REFUSÉ (AIR_AGENT_OPERATION_AMBIGUOUS), donc il y a
 * ici au plus une porteuse. On ne s'en remet pas à cette promesse en
 * silence : une ambiguïté qui arriverait quand même fait échouer l'émission
 * plutôt que de choisir la première venue.
 */
export function operationsDeLAgent(air: ProjectAir): readonly OperationDeLAgent[] {
  const autorisees = air.agent?.allowedOperations ?? [];
  const sortie: OperationDeLAgent[] = [];
  for (const id of autorisees) {
    const porteuses = (air.apis ?? []).flatMap((api) =>
      api.operations.filter((op) => op.id === id).map((op) => ({ api, op })),
    );
    if (porteuses.length !== 1) {
      throw new Error(
        `AIR_AGENT_OPERATION_AMBIGUOUS à l'émission : « ${id} » est portée par ` +
          `${String(porteuses.length)} API. Le validateur doit l'avoir refusé ; ` +
          `émettre en choisissant pour l'auteur serait pire que de s'arrêter.`,
      );
    }
    sortie.push(porteuses[0] as OperationDeLAgent);
  }
  return sortie;
}

/**
 * LE CERVEAU, RÉSOLU VERS SON API.
 *
 * Même garde que pour les pouvoirs : le validateur refuse un cerveau
 * introuvable ou ambigu, et l'émission s'arrête plutôt que de choisir pour
 * l'auteur.
 */
export function cerveauDeLAgent(air: ProjectAir): OperationDeLAgent | null {
  const brain = air.agent?.brain;
  if (brain === undefined) return null;
  const porteuses = (air.apis ?? []).flatMap((api) =>
    api.operations.filter((op) => op.id === brain.operationId).map((op) => ({ api, op })),
  );
  if (porteuses.length !== 1) {
    throw new Error(
      `AIR_AGENT_BRAIN_* à l'émission : « ${brain.operationId} » est portée par ` +
        `${String(porteuses.length)} API. Le validateur doit l'avoir refusé.`,
    );
  }
  return porteuses[0] as OperationDeLAgent;
}

/** Ce qu'une opération attend : ses `sends` ET les segments de son chemin. */
const attendues = (op: Operation): readonly string[] => {
  const vues = new Set<string>();
  for (const m of op.path.matchAll(/\{([a-z][a-zA-Z0-9_]*)\}/gu)) vues.add(m[1] ?? "");
  for (const s of op.sends ?? []) vues.add(s);
  return [...vues];
};

export function routesAgent(air: ProjectAir): string {
  const agent = air.agent;
  if (agent === undefined) throw new Error("routesAgent appelé sans agent déclaré");
  const ops = operationsDeLAgent(air);
  const cerveau = cerveauDeLAgent(air);
  const brain = agent.brain;
  // Le module du cerveau peut etre une API differente de celles des pouvoirs.
  const modules = [
    ...new Set([...ops.map((o) => o.api.id), ...(cerveau === null ? [] : [cerveau.api.id])]),
  ];
  const droit = agent.requiredRightId;
  const confirme = agent.confirmBeforeAct;

  /** Le catalogue : des NOMS, et rien du fournisseur. */
  const catalogue = ops.map((o) => ({
    id: o.op.id,
    nom: o.op.name,
    attend: attendues(o.op),
  }));

  const gardeDuDroit =
    droit === undefined
      ? [
          "    // Aucun droit n'est exigé par le document : tout appelant",
          "    // authentifié peut réveiller l'agent.",
        ]
      : [
          `    if (!appelant.droits.includes(${JSON.stringify(droit)})) {`,
          "      return rep.code(403).send({",
          `        error: "AIR_AGENT_DROIT_REQUIS",`,
          `        message: ${JSON.stringify(`ce droit est exigé pour réveiller l'agent : ${droit}`)},`,
          "      });",
          "    }",
        ];

  const l = [
    `import type { FastifyInstance } from "fastify";`,
    `import { createHmac, timingSafeEqual } from "node:crypto";`,
    `import { appelantDe, type Appelant } from "../appelant.ts";`,
    ...modules.map((id) => `import * as ${CAMEL(id)} from "../connecteur/${id}.ts";`),
    "",
    "// ÉMIS PAR DERIBFY — la porte de l'agent.",
    "//",
    "// Elle ne connaît QUE les opérations autorisées au document. Il n'y a pas",
    "// de branche pour les autres : une opération non autorisée n'est pas",
    "// « interdite », elle n'existe pas de ce côté-ci.",
    "",
    `const CATALOGUE = ${JSON.stringify(catalogue, null, 2)} as const;`,
    `const FENETRE_S = ${FENETRE_S};`,
    `const CONFIRMATION_REQUISE = ${String(confirme)};`,
    `const VOIX = ${String(agent.voiceInput === true)};`,
    "",
    "/**",
    " * LA SIGNATURE D'UNE INTENTION.",
    " *",
    " * Le même secret que l'identité : s'il manque, `appelantDe` rend déjà",
    " * `null` et personne n'entre. Deux secrets pour deux usages donneraient un",
    " * serveur à moitié configuré qui refuse l'un et accepte l'autre.",
    " */",
    "function signer(charge: string): string {",
    "  const secret = process.env.AIR_JWT_SECRET ?? \"\";",
    "  return createHmac(\"sha256\", secret).update(charge).digest(\"base64url\");",
    "}",
    "",
    "/**",
    " * LA CHARGE EST CANONIQUE — SINON DEUX ÉCRITURES DU MÊME ACTE DIFFÉRERAIENT.",
    " *",
    " * Les clés sont triées : `{a,b}` et `{b,a}` désignent le même acte, et",
    " * doivent donner la même signature. Sans tri, une confirmation validerait",
    " * un acte et pas son jumeau écrit dans l'autre ordre.",
    " */",
    "function charge(",
    "  operation: string,",
    "  entrees: Record<string, unknown>,",
    "  appelant: Appelant,",
    "  echeance: number,",
    "): string {",
    "  const triees: Record<string, unknown> = {};",
    "  for (const cle of Object.keys(entrees).sort()) triees[cle] = entrees[cle];",
    "  return [operation, JSON.stringify(triees), appelant.id, String(echeance)].join(\"\\u0000\");",
    "}",
    "",
    "/** Une comparaison à temps constant : une signature se devine autrement. */",
    "function memeSignature(a: string, b: string): boolean {",
    "  const ba = Buffer.from(a);",
    "  const bb = Buffer.from(b);",
    "  if (ba.length !== bb.length) return false;",
    "  return timingSafeEqual(ba, bb);",
    "}",
    "",
    "export function agentRoutes(app: FastifyInstance): void {",
    "",
    "  // ── CE QUE L'AGENT PEUT FAIRE — DES NOMS, ET RIEN DU FOURNISSEUR.",
    "  //",
    "  // Ni domaine, ni nom de variable de secret, ni méthode HTTP. La personne",
    "  // qui parle à l'agent n'a pas à savoir par quel service il passe.",
    "  app.get(\"/air/v1/agent\", async (req, rep) => {",
    "    const appelant = appelantDe(req.headers as Record<string, unknown>);",
    "    if (appelant === null) {",
    "      return rep.code(403).send({",
    "        error: \"AIR_APPELANT_REQUIS\",",
    "        message: \"l'agent ne se réveille que pour une identité vérifiable\",",
    "      });",
    "    }",
    ...gardeDuDroit,
    "    return {",
    "      operations: CATALOGUE,",
    "      confirmationRequise: CONFIRMATION_REQUISE,",
    "      voix: VOIX,",
    "    };",
    "  });",
  ];

  if (confirme) {
    l.push(
      "",
      "  // ── L'INTENTION : CE QUI VA SE PASSER, ET UN JETON POUR LE FAIRE.",
      "  //",
      "  // Le résumé est le NOM que le document donne à l'opération. Le moteur",
      "  // n'invente pas de phrase : il n'a pas la langue de la personne.",
      "  app.post(\"/air/v1/agent/intention\", async (req, rep) => {",
      "    const appelant = appelantDe(req.headers as Record<string, unknown>);",
      "    if (appelant === null) {",
      "      return rep.code(403).send({",
      "        error: \"AIR_APPELANT_REQUIS\",",
      "        message: \"l'agent ne se réveille que pour une identité vérifiable\",",
      "      });",
      "    }",
      ...gardeDuDroit,
      "    const corps = (req.body ?? {}) as { operation?: unknown; entrees?: unknown };",
      "    const voulue = CATALOGUE.find((c) => c.id === corps.operation);",
      "    if (voulue === undefined) {",
      "      return rep.code(403).send({",
      "        error: \"AIR_AGENT_OPERATION_NON_AUTORISEE\",",
      "        message: \"cette opération n'est pas dans les pouvoirs de l'agent\",",
      "      });",
      "    }",
      "    const entrees = (corps.entrees ?? {}) as Record<string, unknown>;",
      "    const echeance = Math.floor(Date.now() / 1000) + FENETRE_S;",
      "    return {",
      "      resume: voulue.nom,",
      "      operation: voulue.id,",
      "      expireDans: FENETRE_S,",
      "      intention: `${String(echeance)}.${signer(charge(voulue.id, entrees, appelant, echeance))}`,",
      "    };",
      "  });",
    );
  }

  if (cerveau !== null && brain !== undefined) {
    const attendCatalogue = brain.catalogueInput !== undefined;
    l.push(
      "",
      "  // ── PARLER : DES MOTS, ET UNE PROPOSITION. JAMAIS UN ACTE.",
      "  //",
      "  // Le cerveau PROPOSE. L'acte reste une demande distincte, pour une",
      "  // raison simple : un interprète qui agirait en même temps qu'il",
      "  // comprend ne laisserait aucun endroit où refuser. Ici, ce qui",
      "  // revient est une proposition — et, si le document demande une",
      "  // confirmation, l'intention signée qui permettra d'agir.",
      "  app.post(\"/air/v1/agent/parler\", async (req, rep) => {",
      "    const appelant = appelantDe(req.headers as Record<string, unknown>);",
      "    if (appelant === null) {",
      "      return rep.code(403).send({",
      "        error: \"AIR_APPELANT_REQUIS\",",
      "        message: \"l'agent n'écoute que pour une identité vérifiable\",",
      "      });",
      "    }",
      ...gardeDuDroit,
      "    const corps = (req.body ?? {}) as { mots?: unknown };",
      "    if (typeof corps.mots !== \"string\" || corps.mots.trim() === \"\") {",
      "      return rep.code(400).send({",
      "        error: \"AIR_AGENT_MOTS_MANQUANTS\",",
      "        message: \"aucune parole n'a été transmise\",",
      "      });",
      "    }",
      "    let brut;",
      "    try {",
      `      brut = await ${CAMEL(cerveau.api.id)}.${CAMEL(cerveau.op.id)}({`,
      `        ${JSON.stringify(brain.wordsInput)}: corps.mots,`,
      ...(attendCatalogue
        ? [
            `        ${JSON.stringify(brain.catalogueInput ?? "")}: JSON.stringify(CATALOGUE),`,
          ]
        : [
            "        // Le document ne declare pas de cle de catalogue : ce",
            "        // service connait deja ce qu'il peut proposer.",
          ]),
      "      });",
      "    } catch (e) {",
      "      return rep.code(statut(e)).send({ error: code(e), message: message(e) });",
      "    }",
      `      const choisie = (brut as Record<string, unknown>)[${JSON.stringify(brain.choiceOutput)}];`,
      "    // ── LE CERVEAU NE PEUT PAS S'INVENTER UN POUVOIR.",
      "    //",
      "    // C'est le refus central de cette route. Un modèle de langue se",
      "    // trompe, et un modèle manipulé par la phrase qu'on lui donne se",
      "    // trompe exprès. L'opération qu'il désigne doit être dans le",
      "    // catalogue — qui ne contient QUE les pouvoirs déclarés.",
      "    const permise = CATALOGUE.find((c) => c.id === choisie);",
      "    if (permise === undefined) {",
      "      return rep.code(403).send({",
      "        error: \"AIR_AGENT_CHOIX_HORS_POUVOIRS\",",
      "        message: \"l'interprète a désigné une opération qui n'est pas un pouvoir de l'agent\",",
      "      });",
      "    }",
      `      const texteValeurs = (brut as Record<string, unknown>)[${JSON.stringify(brain.inputsOutput)}];`,
      "    // Les valeurs arrivent en TEXTE JSON : `returns` n'autorise que",
      "    // string, number et boolean, donc une API ne peut pas déclarer",
      "    // rendre un objet. Un texte qui n'est pas du JSON d'objet est",
      "    // refusé ici ; les CHAMPS, eux, seront policés par le connecteur.",
      "    let valeurs;",
      "    try {",
      "      valeurs = JSON.parse(String(texteValeurs));",
      "    } catch {",
      "      return rep.code(502).send({",
      "        error: \"AIR_AGENT_VALEURS_ILLISIBLES\",",
      "        message: \"l'interprète n'a pas rendu des valeurs lisibles\",",
      "      });",
      "    }",
      "    if (typeof valeurs !== \"object\" || valeurs === null || Array.isArray(valeurs)) {",
      "      return rep.code(502).send({",
      "        error: \"AIR_AGENT_VALEURS_ILLISIBLES\",",
      "        message: \"l'interprète n'a pas rendu des valeurs lisibles\",",
      "      });",
      "    }",
      "    const proposition = {",
      "      operation: permise.id,",
      "      nom: permise.nom,",
      "      entrees: valeurs as Record<string, unknown>,",
      "    };",
      ...(confirme
        ? [
            "    const echeance = Math.floor(Date.now() / 1000) + FENETRE_S;",
            "    return {",
            "      ...proposition,",
            "      expireDans: FENETRE_S,",
            "      intention: `${String(echeance)}.${signer(",
            "        charge(permise.id, proposition.entrees, appelant, echeance),",
            "      )}`,",
            "    };",
          ]
        : [
            "    // Ce document ne demande pas de confirmation : la proposition",
            "    // suffit, et l'acte se demande ensuite sans intention.",
            "    return proposition;",
          ]),
      "  });",
    );
  }

  l.push(
    "",
    "  // ── L'ACTE.",
    "  app.post(\"/air/v1/agent/act\", async (req, rep) => {",
    "    const appelant = appelantDe(req.headers as Record<string, unknown>);",
    "    if (appelant === null) {",
    "      return rep.code(403).send({",
    "        error: \"AIR_APPELANT_REQUIS\",",
    "        message: \"l'agent n'agit que pour une identité vérifiable\",",
    "      });",
    "    }",
    ...gardeDuDroit,
    "    const corps = (req.body ?? {}) as {",
    "      operation?: unknown;",
    "      entrees?: unknown;",
    "      intention?: unknown;",
    "    };",
    "    const entrees = (corps.entrees ?? {}) as Record<string, string | number | boolean>;",
  );

  if (confirme) {
    l.push(
      "    // ── LA CONFIRMATION EST EXIGÉE ICI, PAS À L'ÉCRAN.",
      "    //",
      "    // Le serveur est joignable directement : une confirmation tenue par",
      "    // l'écran seul serait une promesse sans serrure.",
      "    if (typeof corps.intention !== \"string\") {",
      "      return rep.code(403).send({",
      "        error: \"AIR_AGENT_CONFIRMATION_REQUISE\",",
      "        message: \"cet agent demande avant d'agir : aucune intention n'est fournie\",",
      "      });",
      "    }",
      "    const [brutEcheance, signature] = corps.intention.split(\".\");",
      "    const echeance = Number(brutEcheance);",
      "    if (!Number.isFinite(echeance) || signature === undefined) {",
      "      return rep.code(403).send({",
      "        error: \"AIR_AGENT_CONFIRMATION_INVALIDE\",",
      "        message: \"l'intention n'a pas la forme attendue\",",
      "      });",
      "    }",
      "    if (echeance < Math.floor(Date.now() / 1000)) {",
      "      return rep.code(403).send({",
      "        error: \"AIR_AGENT_CONFIRMATION_EXPIREE\",",
      "        message: \"une confirmation passée n'est pas une confirmation\",",
      "      });",
      "    }",
      "    const attendue = signer(",
      "      charge(String(corps.operation), entrees, appelant, echeance),",
      "    );",
      "    if (!memeSignature(signature, attendue)) {",
      "      // La signature lie l'opération, les entrées ET l'appelant. Changer",
      "      // un montant après avoir confirmé ne passe pas ; rejouer la",
      "      // confirmation de quelqu'un d'autre ne passe pas non plus.",
      "      return rep.code(403).send({",
      "        error: \"AIR_AGENT_CONFIRMATION_INVALIDE\",",
      "        message: \"l'intention ne correspond pas à cet acte\",",
      "      });",
      "    }",
    );
  } else {
    l.push(
      "    // Le document ne demande pas de confirmation pour cet agent : il n'y",
      "    // a donc aucune intention à exiger, et aucune route pour en produire.",
    );
  }

  l.push(
    "    try {",
    "      switch (corps.operation) {",
  );
  for (const { api, op } of ops) {
    l.push(
      `        case ${JSON.stringify(op.id)}:`,
      `          return await ${CAMEL(api.id)}.${CAMEL(op.id)}(entrees);`,
    );
  }
  l.push(
    "        default:",
    "          // Il n'existe pas de branche pour une opération non autorisée.",
    "          return rep.code(403).send({",
    "            error: \"AIR_AGENT_OPERATION_NON_AUTORISEE\",",
    "            message: \"cette opération n'est pas dans les pouvoirs de l'agent\",",
    "          });",
    "      }",
    "    } catch (e) {",
    "      return rep.code(statut(e)).send({ error: code(e), message: message(e) });",
    "    }",
    "  });",
    "}",
    "",
    "// Les échecs du connecteur, traduits comme pour ses propres routes : le",
    "// CORPS de la réponse du tiers ne traverse jamais.",
    "function statut(e: unknown): number {",
    "  const nom = e instanceof Error ? e.name : \"\";",
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
