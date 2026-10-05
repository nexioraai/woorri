// ════════════════════════════════════════════════════════════════════
//  LE CONTRAT QUE LE SERVEUR DOIT TENIR — DÉRIVÉ DU DOCUMENT.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI IL EST DÉRIVÉ, ET JAMAIS ÉCRIT À LA MAIN.
//
// Le propriétaire d'une application exige un backend Spring Boot. Il ne peut
// pas commencer sans savoir ce que l'application appellera. Une spécification
// recopiée à la main divergerait du document au premier changement — et c'est
// le SERVEUR qui aurait tort, sans que personne le voie avant l'intégration.
//
// Ce fichier ne décide RIEN. Il lit le document et le protocole du moteur, et
// rend la liste des obligations. Chaque ligne du contrat est traçable à un
// nœud de l'AIR : si le document change, le contrat change avec lui.
//
// ── CE QU'IL AJOUTE À « LES 4 ENTITÉS, LEURS ENDPOINTS ».
//
// Le document porte des obligations que personne ne devinerait d'une liste
// d'entités :
//
//   · une entité `appendOnly` ne se modifie ni ne s'efface — le serveur doit
//     REFUSER, pas seulement l'application ;
//   · un champ `derived` se CALCULE — le serveur ne doit pas l'accepter en
//     écriture, sinon la valeur écrite diverge de ce dont elle dérive ;
//   · un champ à `transitions` n'accepte que les passages déclarés ;
//   · un geste à `confirmation` est SUSPENDU jusqu'à un code hors application,
//     que le serveur seul émet et vérifie ;
//   · les DROITS reviennent avec la session, et c'est le serveur qui les dit.
//
// Lancer : `npx tsx slices/tontine/contrat-api.mjs`
// (tsx, et non node : le protocole est importé du compilateur en TypeScript —
//  le recopier ici créerait une seconde autorité sur la forme des URL.)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Le MÊME rendu que la spécification : un second document dérivé du même AIR
// n'a aucune raison d'avoir une autre page, et deux copies du renderer
// divergeraient au premier correctif.
import { page } from "../rendu-markdown.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const R = join(ICI, "..", "..");

const { urlProtocoleDonnees, urlProtocoleLigne, OPERATIONS_SESSION } = await import(
  join(R, "packages", "compiler", "src", "resolve-lock.ts")
);

const air = JSON.parse(readFileSync(join(ICI, "tontine.air.json"), "utf8"));

// Le DOMAINE est un exemple, et il est dit comme tel : le vrai vient de
// `dataset.sourceDomain` quand le document déclarera ses sources distantes.
// Écrire ici un domaine en le présentant comme acquis ferait croire la
// configuration faite.
const DOMAINE = "api.exemple.tontine";
const BASE = `https://${DOMAINE}`;

const l = [];
const t = (s = "") => l.push(s);

const champ = (f) => {
  const bouts = [`\`${f.name}\``, f.type];
  if (f.required === true) bouts.push("**requis**");
  if (f.enumValues !== undefined) bouts.push(`∈ ${f.enumValues.map((v) => `\`${v}\``).join(" · ")}`);
  if (f.derived !== undefined) bouts.push("🧮 **calculé par le serveur**");
  if (f.transitions !== undefined) bouts.push("🔒 transitions contrôlées");
  return bouts.join(" — ");
};

t(`# Contrat d'API — « ${air.app.name} »`);
t();
t(`> Dérivé du document AIR \`${air.projectId}\`, contrat ${air.airSchemaVersion}.`);
t("> Ne pas éditer à la main : régénérer par `npx tsx slices/tontine/contrat-api.mjs`.");
t();
t("Ce document dit ce que **le serveur** doit faire. Il ne dit rien de son");
t("langage ni de sa base : l'application parle HTTP et JSON, et rien d'autre.");
t();
t("Toutes les URL sont relatives à la racine de votre serveur. Le domaine");
t(`\`${DOMAINE}\` ci-dessous est un EXEMPLE — le vrai sera celui que le document`);
t("déclarera comme source de ses données.");
t();

// ── 1. LES DONNÉES ──────────────────────────────────────────────────
t("## 1. Les données — une ressource par entité, trois méthodes");
t();
t("L'application lit, crée et supprime des lignes. Le protocole est le même");
t("pour chaque entité, et il n'a qu'une ressource : la **collection**.");
t();
t("| méthode | chemin | ce que le serveur fait |");
t("| --- | --- | --- |");
t("| `GET` | `/air/v1/entities/{entityId}/rows` | rend **le tableau JSON** des lignes : `[{ \"id\": \"…\", \"values\": { … } }]` |");
t("| `POST` | `/air/v1/entities/{entityId}/rows` | crée la ligne, ou **remplace** celle dont l'`id` est fourni dans le corps |");
t("| `DELETE` | `/air/v1/entities/{entityId}/rows/{id}` | supprime la ligne |");
t();
t("`POST` et non `PUT` : à la création, le client ne connaît pas encore l'URL");
t("de la ligne — c'est le serveur qui décide de l'identifiant.");
t();
t("`{id}` est un gabarit. L'application **encode** l'identifiant dans l'URL");
t("(`percent-encoding`) : un identifiant qui contiendrait `/` ou `?` viserait");
t("sinon une autre ressource — ou la collection entière, selon le serveur.");
t();
t(`Les ${String(air.entities.length)} entités de cette application :`);
t();

const appendOnly = [];
const calcules = [];
const avecTransitions = [];

for (const e of air.entities) {
  t(`### \`${e.id}\``);
  t();
  t(`- lecture : \`GET ${urlProtocoleDonnees(DOMAINE, e.id)}\``);
  t(`- écriture : \`POST ${urlProtocoleDonnees(DOMAINE, e.id)}\``);
  // ── UN GABARIT N'EST PAS UN IDENTIFIANT.
  //
  // Première version : `urlProtocoleLigne(DOMAINE, e.id, "{id}")`. La fonction
  // encode son argument — à juste titre, un identifiant portant `/` ou `?`
  // changerait de ressource — et le gabarit ressortait `%7Bid%7D`. Un contrat
  // qui montre une URL échappée apprend à l'implémenteur une forme qu'aucun
  // client n'enverra.
  t(`- suppression : \`DELETE ${urlProtocoleDonnees(DOMAINE, e.id)}/{id}\``);
  t();
  if (e.appendOnly === true) {
    appendOnly.push(e.id);
    t("> 🚫 **ENTITÉ JOURNAL — aucune modification, aucune suppression.**");
    t("> Le document la déclare `appendOnly`. Le serveur doit REFUSER `DELETE`,");
    t("> et refuser un `POST` qui porte l'`id` d'une ligne existante. La seule");
    t("> correction admise est une ligne NOUVELLE qui annule la première — ce que");
    t("> la comptabilité appelle une contre-passation. L'application ne propose");
    t("> déjà pas ces gestes ; un serveur qui les accepterait les rendrait");
    t("> atteignables par tout autre chemin.");
    t();
  }
  t("Champs attendus dans `values` :");
  t();
  for (const f of e.fields) {
    t(`- ${champ(f)}`);
    if (f.derived !== undefined) calcules.push({ e: e.id, f, });
    if (f.transitions !== undefined) avecTransitions.push({ e: e.id, f });
  }
  t();
}

// ── 2. CE QUE LE SERVEUR CALCULE ────────────────────────────────────
if (calcules.length > 0) {
  t("## 2. Les champs que le serveur CALCULE");
  t();
  t("Ces valeurs ne se saisissent pas : elles dérivent d'autres lignes. Le");
  t("serveur les rend en lecture et doit **ignorer ou refuser** toute tentative");
  t("de les écrire — une valeur écrite diverge de ce dont elle dérive, et");
  t("personne ne s'en aperçoit avant le décompte final.");
  t();
  for (const { e, f } of calcules) {
    const d = f.derived;
    const rel = air.relations.find((r) => r.id === d.relationId);
    const cible = rel === undefined ? "?" : rel.toEntityId;
    const quoi =
      d.kind === "count"
        ? `le NOMBRE de lignes de \`${cible}\` liées par \`${d.relationId}\``
        : `la SOMME de \`${d.fieldId}\` sur les lignes de \`${cible}\` liées par \`${d.relationId}\``;
    t(`- \`${e}.${f.name}\` = ${quoi}`);
  }
  t();
}

// ── 3. LES ÉTATS ────────────────────────────────────────────────────
if (avecTransitions.length > 0) {
  t("## 3. Les états, et les seuls passages permis");
  t();
  t("Une énumération liste des valeurs et ne dit rien de leur ordre. Ces");
  t("champs-là se succèdent dans le temps : **la première valeur est l'état");
  t("initial**, et tout autre passage que ceux listés doit être refusé par le");
  t("serveur. Sans ce refus, un paiement en échec pourrait repasser en attente.");
  t();
  for (const { e, f } of avecTransitions) {
    t(`### \`${e}.${f.name}\``);
    t();
    t(`État initial : \`${f.enumValues[0]}\`.`);
    t();
    t("| depuis | vers |");
    t("| --- | --- |");
    for (const tr of f.transitions) t(`| \`${tr.from}\` | \`${tr.to}\` |`);
    t();
    const terminaux = f.enumValues.filter((v) => !f.transitions.some((x) => x.from === v));
    if (terminaux.length > 0) {
      t(`États TERMINAUX (rien n'en sort) : ${terminaux.map((v) => `\`${v}\``).join(" · ")}.`);
      t();
    }
  }
}

// ── 4. LA SESSION ───────────────────────────────────────────────────
t("## 4. La session, et les droits");
t();
t("Cinq opérations. Les chemins viennent du protocole du moteur, pas d'une");
t("convention de ce document.");
t();
t("| méthode | chemin | ce que le serveur rend |");
t("| --- | --- | --- |");
const rendus = {
  ouvrir: "l'identité **et les droits** — voir ci-dessous",
  etat: "l'état courant (appelé au démarrage de l'application)",
  fermer: "rien (204 suffit)",
  creerCompte: "l'identité si la session s'ouvre, sinon `pendingConfirmation: true`",
  reinitialiser: "l'ACCEPTATION de l'envoi — **jamais** si le compte existe",
};
for (const [nom, op] of Object.entries(OPERATIONS_SESSION)) {
  t(`| \`${op.methode}\` | \`${op.chemin}\` | ${rendus[nom]} |`);
}
t();
t("Corps de `POST /air/v1/session` et `POST /air/v1/accounts` :");
t("`{ \"email\": \"…\", \"password\": \"…\" }`.");
t();
t("Réponse attendue de `POST` et `GET /air/v1/session` :");
t();
t("```json");
t("{");
t('  "userId": "identifiant de la personne, absent si aucune session",');
t('  "rights": ["les droits accordés — voir la liste ci-dessous"],');
t('  "pendingConfirmation": false');
t("}");
t("```");
t();
t("### Les droits reviennent AVEC l'identité");
t();
t("Ce n'est pas un détail d'implémentation. Les demander par un second appel");
t("ferait exister un instant où l'identité est établie et les droits inconnus.");
t("L'accès étant **fermé par défaut**, cet instant afficherait un refus à");
t("quelqu'un qui a le droit — exactement le défaut que le contrôle d'accès");
t("existe pour empêcher.");
t();
t("Les droits de cette application :");
t();
for (const r of air.access.rights) t(`- \`${r.id}\` — ${r.name ?? ""}`);
t();
t("### Les rôles appartiennent au serveur");
t();
t("L'application ne connaît que des DROITS. Qui a quel rôle, et quel rôle");
t("donne quel droit, est votre affaire — le document les décrit pour que les");
t("deux côtés parlent de la même chose, pas pour que l'application les calcule.");
t();
t("Un rôle marqué **tous les droits** les reçoit TOUS, y compris ceux ajoutés");
t("plus tard : recopier la liste à sa place la désaccorderait au premier droit");
t("nouveau, et le garant de l'association perdrait un accès sans que rien ne");
t("le dise.");
t();
t("| rôle | droits |");
t("| --- | --- |");
for (const role of air.access.roles) {
  // ── `grantsAllRights` N'EST PAS UNE LISTE VIDE.
  //
  // Première version : je ne lisais que `rightIds`. Le Président, qui porte
  // `grantsAllRights: true`, s'affichait « aucun droit » — et le contrat
  // envoyait implémenter une autorisation FAUSSE, celle qui refuse au garant
  // de l'association les écrans dont il est responsable.
  //
  // Le document a raison et c'est le lecteur du document qui avait tort. Un
  // contrat dérivé n'est fiable que s'il lit TOUT ce que le format exprime.
  const d =
    role.grantsAllRights === true
      ? "**tous les droits** (`grantsAllRights`)"
      : (role.rightIds ?? []).map((x) => `\`${x}\``).join(" · ");
  t(`| \`${role.id}\` | ${d === "" ? "_aucun_" : d} |`);
}
t();
if (air.access.delegation !== undefined) {
  const dg = air.access.delegation;
  t("### Agir au nom d'un autre");
  t();
  t(`Le champ \`${dg.holderFieldId}\` de \`${dg.subjectEntityId}\` désigne le mandataire`);
  t("d'une personne. Les droits **délégables** sont une liste blanche :");
  t();
  for (const id of dg.delegatableRightIds) t(`- \`${id}\``);
  t();
  t("Un mandat **transmet** un droit, il ne le **crée** pas : le serveur doit");
  t("refuser l'action si le mandant lui-même n'a pas le droit. Et aucun autre");
  t("droit que ceux listés ne se délègue — « ce mandataire peut tout faire pour");
  t("moi » est une procuration générale que personne ne signe en connaissance");
  t("de cause.");
  t();
}

// ── 5. LES GESTES SUSPENDUS ─────────────────────────────────────────
const capacites = air.actions.filter((a) => a.effect.kind === "capability");
if (capacites.length > 0) {
  t("## 5. Les gestes que le serveur exécute");
  t();
  t("Ces actions ne s'exécutent pas dans l'application : elle **demande**, le");
  t("serveur fait, l'application suit l'issue.");
  t();
  for (const a of capacites) {
    t(`### \`${a.id}\` — ${a.name}`);
    t();
    t(`- capacité : \`${a.effect.capability}\`, méthode \`${a.effect.method}\``);
    if (a.requiredRightId !== undefined) {
      t(`- droit exigé : \`${a.requiredRightId}\` — **le serveur doit le vérifier**, pas seulement l'application`);
    }
    if (a.confirmation !== undefined) {
      t(`- 🔐 **SUSPENDU à un code de ${String(a.confirmation.digits)} chiffres reçu hors de l'application**`);
      t();
      t("  Le serveur **émet** ce code sur un autre canal (SMS, messagerie) et le");
      t("  **vérifie** lui-même. L'application ne fait que le saisir et le");
      t("  transmettre : une application qui vérifierait elle-même un secret le");
      t("  détiendrait, et un secret que le vérificateur détient ne prouve plus");
      t("  rien. Le document dit que le geste est suspendu et combien de chiffres");
      t("  sont attendus — ni par quel canal, ni comment vérifier.");
    }
    t();
  }
}

// ── 6. CE QUE LE FORMAT NE PEUT PAS DIRE ────────────────────────────
const absents = air.intent.needs.filter((b) => b.resolution.kind === "unexpressible");
if (absents.length > 0) {
  t("## 6. Ce qui n'appartient PAS à l'application");
  t();
  t(`${String(absents.length)} exigences du cahier des charges ne sont pas exprimables dans le`);
  t("document, et ce n'est pas un manque du format : chacune a besoin d'une");
  t("**horloge** ou manipule de l'**argent** entre des personnes. Un document");
  t("qui décrit des écrans ne doit porter ni l'une ni l'autre.");
  t();
  t("Elles sont donc **entièrement à vous**. L'application les verra par les");
  t("données qu'elle lit et par les gestes qu'elle demande — jamais en les");
  t("calculant.");
  t();
  for (const b of absents) {
    t(`### ${b.statement}`);
    t();
    t(`> **Pourquoi le serveur et pas l'application** — ${b.resolution.reason}`);
    t();
  }
}

t("---");
t();
t("## Ce que ce contrat ne dit pas, délibérément");
t();
t("- **Aucune forme de jeton n'est imposée.** Cookie, en-tête, durée de vie :");
t("  mettez ce que vous voulez dans la réponse de `POST /air/v1/session`,");
t("  l'application le renvoie tel quel. Choisir à votre place reviendrait à");
t("  décider de la sécurité de votre serveur depuis un générateur d'écrans.");
t("- **Aucun schéma de base de données.** Les entités ci-dessus sont ce que");
t("  l'application attend en JSON, pas vos tables.");
t("- **Aucune pagination.** `GET …/rows` rend tout. Le jour où une collection");
t("  devient grande, cela se verra et se décidera — l'annoncer maintenant");
t("  obligerait à l'implémenter des deux côtés sans savoir laquelle le mérite.");
t();

const sortie = join(ICI, "CONTRAT-API.md");
writeFileSync(sortie, l.join("\n"));
const sortieHtml = join(ICI, "contrat-api.html");
writeFileSync(sortieHtml, page(`${air.app.name} — contrat d'API`, l), "utf8");
console.log(`  entités ${String(air.entities.length)} · droits ${String(air.access.rights.length)} · rôles ${String(air.access.roles.length)}`);
console.log(`  journaux (appendOnly) : ${appendOnly.length === 0 ? "aucun" : appendOnly.join(" ")}`);
console.log(`  champs calculés ${String(calcules.length)} · champs à états ${String(avecTransitions.length)} · gestes serveur ${String(capacites.length)}`);
console.log(`  exigences entièrement serveur : ${String(absents.length)}`);
console.log(`  écrit : ${sortie} (${String(l.length)} lignes)`);
console.log(`  écrit : ${sortieHtml}`);
