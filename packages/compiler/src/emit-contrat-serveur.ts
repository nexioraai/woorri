/**
 * LE CONTRAT QUE LE SERVEUR DOIT HONORER.
 *
 * ── LA PROMESSE ÉTAIT FAITE, ET ELLE N'ÉTAIT PAS TENUE.
 *
 * Règle 51 du noyau d'émission, mot pour mot : « Deribfy n'émet alors
 * AUCUN code serveur, SEULEMENT LE CONTRAT QUE CE SERVEUR DOIT HONORER ».
 * Et `compileBackend` rendait `new Map()` — rien. Son commentaire affirmait
 * que « Deribfy lui a déjà remis le CONTRAT » ; mesuré sur une sortie
 * réelle, les seuls fichiers nommés « contrat » sont des contrats
 * d'interface (blocs, primitives, navigation, session). Le client repartait
 * avec une application qui appelle un serveur, et rien qui dise ce que ce
 * serveur doit faire.
 *
 * ── POURQUOI UN DOCUMENT, ET PAS UN ÉMETTEUR DE PLUS.
 *
 * Le besoin mesuré venait d'un cahier qui impose Node.js et Fastify, là où
 * le générateur ne sait écrire que Spring Boot. Écrire un émetteur Fastify
 * aurait réglé ce cas et laissé le suivant — Go, PHP, Django. Un contrat
 * les sert TOUS, et il se relit par un humain qui écrira le serveur à la
 * main.
 *
 * ── CE QU'IL DIT, ET CE QU'IL NE DIT PAS.
 *
 * Il dit ce que le serveur doit GARANTIR : les tables, ce qui se calcule et
 * ne se stocke JAMAIS, les règles à faire respecter, qui a le droit de
 * quoi, et les gestes qui exigent une confirmation hors de l'application.
 * Il ne dit ni le langage, ni le cadre, ni la forme des routes : ce sont
 * des décisions de celui qui écrit le serveur.
 */
import type { ProjectAir } from "@deribfy/air-schema";

/** Décrit une règle calculée en français, sans jargon de schéma. */
function direLeCalcul(d: NonNullable<ProjectAir["entities"][number]["fields"][number]["derived"]>): string {
  if (d.kind === "count") return `le NOMBRE de lignes liées par \`${d.relationId}\``;
  if (d.kind === "sum") return `la SOMME de \`${d.fieldId}\` sur les lignes liées par \`${d.relationId}\``;
  if (d.kind === "calcul") return "une expression sur les champs de la même ligne";
  if (d.kind === "bareme") {
    const m = d.mode === "global" ? "TOUTE la quantité au prix du palier atteint" : "chaque tranche à son prix";
    return `un barème sur \`${d.fieldId}\` — ${String(d.paliers.length)} palier(s), ${m}, frais fixes ${String(d.fraisFixes)}`;
  }
  return `une règle qui CHANGE avec le temps, choisie sur \`${d.dateFieldId}\` — ${String(d.versions.length)} version(s)`;
}

export function emettreContratServeur(air: ProjectAir): string {
  const l: string[] = [
    `# Contrat du serveur — ${air.app.name}`,
    "",
    "Ce document dit ce que votre serveur doit **garantir**. Il ne dit ni le",
    "langage, ni le cadre, ni la forme de vos routes : ce sont vos décisions.",
    "",
    "Il est ÉMIS depuis le contrat de l’application — si l’application change,",
    "ce document change avec elle. Ne le modifiez pas à la main.",
    "",
  ];

  // ── CE QUI NE SE STOCKE JAMAIS. En premier, parce que c'est la faute la
  // plus facile à commettre et la plus longue à voir : une valeur écrite
  // diverge de ce dont elle dérive, et rien ne le signale.
  // Le `derived` voyage AVEC l'entree : le filtrer puis le relire obligerait
  // a une assertion que ce paquet interdit, a raison — une assertion est une
  // promesse que le compilateur ne verifie pas.
  const calcules = air.entities.flatMap((e) =>
    e.fields.flatMap((f) => (f.derived === undefined ? [] : [{ e, f, d: f.derived }])),
  );
  if (calcules.length > 0) {
    l.push(
      "## Ce qui se CALCULE et ne se stocke JAMAIS",
      "",
      "Écrire une de ces valeurs la ferait diverger de ce dont elle dérive,",
      "sans que rien ne le signale. Le serveur les recalcule à la lecture.",
      "",
    );
    for (const { e, f, d } of calcules) {
      l.push(`- **${e.name}.${f.name}** — ${direLeCalcul(d)}`);
    }
    l.push("", "Le calcul exact est écrit dans `lib/calculs/` du projet livré.", "");
  }

  // ── LES TABLES.
  l.push("## Les données", "");
  for (const e of air.entities) {
    l.push(`### ${e.name} \`${e.id}\``);
    for (const f of e.fields) {
      const marques = [
        f.required ? "obligatoire" : null,
        (f.sensitive ?? false) ? "**SENSIBLE — jamais dans un journal**" : null,
        f.derived !== undefined ? "calculé, non stocké" : null,
      ].filter((x) => x !== null);
      l.push(`- \`${f.id}\` · ${f.type}${marques.length > 0 ? ` · ${marques.join(" · ")}` : ""}`);
    }
    if (e.appendOnly ?? false) {
      l.push("", "> **Journal** : ces lignes ne se corrigent pas en place. Une erreur", "> se répare par une ligne NOUVELLE qui annule la première.");
    }
    l.push("");
  }

  if (air.relations.length > 0) {
    l.push("### Liens", "");
    for (const r of air.relations) l.push(`- \`${r.id}\` : ${r.fromEntityId} → ${r.toEntityId} (${r.kind})`);
    l.push("");
  }

  // ── LES RÈGLES À FAIRE RESPECTER.
  if (air.rules.length > 0) {
    l.push(
      "## Les règles à faire respecter",
      "",
      "L’application les vérifie aussi, mais **une vérification côté client ne",
      "protège de rien** : elle se contourne. C’est le serveur qui décide.",
      "",
    );
    for (const r of air.rules) {
      l.push(`- **${r.id}** (${r.entityId}) — ${r.description}`);
      for (const a of r.assertions) l.push(`  - \`${a.fieldId}\` ${a.operator}${a.value === undefined ? "" : ` ${JSON.stringify(a.value)}`}`);
    }
    l.push("");
  }

  // ── QUI A LE DROIT DE QUOI.
  if (air.access !== undefined) {
    l.push(
      "## Qui a le droit de quoi",
      "",
      "À faire respecter **dans la base**, pas seulement dans l’application.",
      "",
    );
    for (const d of air.access.rights) l.push(`- droit \`${d.id}\``);
    for (const r of air.access.roles) {
      const quoi = (r.grantsAllRights ?? false) ? "TOUS les droits" : r.rightIds.join(", ") || "aucun droit";
      l.push(`- rôle \`${r.id}\` → ${quoi}`);
    }
    l.push(`- rôle par défaut : \`${air.access.defaultRoleId}\``);
    l.push("");
  } else {
    l.push(
      "## Qui a le droit de quoi",
      "",
      "> Le document ne déclare **aucun** contrôle d’accès. Si cette application",
      "> porte des données personnelles, c’est une décision à prendre avant la",
      "> mise en ligne — pas après.",
      "",
    );
  }

  // ── CE QUI EXIGE LE SERVEUR, ET LUI SEUL.
  const aConfirmer = air.actions.filter((a) => a.confirmation !== undefined);
  if (aConfirmer.length > 0) {
    l.push(
      "## Les gestes qui exigent une confirmation hors de l’application",
      "",
      "Le code part du serveur et se vérifie sur le serveur. Une application",
      "qui vérifierait elle-même un code le détiendrait — et un secret que le",
      "vérificateur détient ne prouve plus rien.",
      "",
    );
    for (const a of aConfirmer) {
      l.push(`- **${a.name}** \`${a.id}\` — code à ${String(a.confirmation?.digits ?? 0)} chiffres`);
    }
    l.push("");
  }

  if (air.integrations.length > 0) {
    l.push("## Les services tiers déclarés", "");
    for (const i of air.integrations) {
      l.push(`- \`${i.id}\` · classe \`${i.providerClass}\`${i.capability === undefined ? "" : ` · capacité \`${i.capability}\``}`);
    }
    l.push("", "Les identifiants et les clés **ne sont pas** dans ce document, et ne", "doivent jamais l’être : ils viennent de votre provisionnement.", "");
  }

  l.push(
    "## Ce que ce document ne dit pas",
    "",
    "Tout ce qui demande une **horloge** ou un **secret** vous appartient : une",
    "échéance qui se déclenche seule, un envoi de code, un prélèvement",
    "récurrent. Le contrat les décrit quand l’application les attend ; il ne",
    "les exécute pas.",
    "",
  );
  return l.join("\n");
}
