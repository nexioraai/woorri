// ============================================================
// LA SPÉCIFICATION POUR LE DÉVELOPPEUR BACKEND — DÉRIVÉE, JAMAIS RECOPIÉE.
//
// ── POURQUOI ELLE EST GÉNÉRÉE ET NON ÉCRITE.
//
// L'ami du propriétaire exige Spring Boot. Son développeur a besoin du schéma,
// des rôles, des droits — et surtout de savoir CE QUI LUI REVIENT.
//
// Une spécification recopiée à la main diverge du document au premier
// changement, et personne ne s'en aperçoit avant que les deux ne se
// contredisent en production. Celle-ci est DÉRIVÉE de `tontine.air.json` : la
// régénérer après une modification du document suffit, et il n'existe aucun
// chemin pour qu'elle mente.
//
// ── CE QU'ELLE APPORTE DE PLUS QUE LE CAHIER DES CHARGES.
//
// Le cahier décrit tout, sans dire où chaque chose vit. Ce document le dit :
//
//   · les ENTITÉS et les RELATIONS — ce que le backend doit persister ;
//   · les DROITS et les RÔLES — la matrice d'accès, qu'il doit faire respecter
//     côté serveur, car une garde côté application ne garde rien ;
//   · et surtout LES DIX BESOINS INEXPRIMABLES. Ce ne sont pas des manques du
//     projet : ce sont les règles métier qui N'APPARTIENNENT PAS à l'interface.
//     Le séquestre, les enchères, les pénalités, la cagnotte, l'OTP, le Mobile
//     Money : tout cela se calcule et se décide sur le serveur. L'argent ne se
//     calcule jamais sur un téléphone.
//
// C'est donc la liste de travail du développeur Spring Boot, et elle est
// exhaustive par construction : tout ce que l'interface ne sait pas porter est
// nécessairement de son côté.
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const air = JSON.parse(readFileSync(join(ICI, "tontine.air.json"), "utf8"));

// Le type AIR vers son équivalent PostgreSQL et Java. La table est explicite :
// deviner « decimal → double » coûterait des centimes à chaque arrondi, et une
// tontine se brouille sur des centimes.
const TYPES = {
  string: ["VARCHAR(255)", "String"],
  text: ["TEXT", "String"],
  number: ["INTEGER", "Integer"],
  // JAMAIS `double` : un montant se compte en unités indivisibles. Le cahier
  // écrit lui-même DECIMAL(12,2).
  decimal: ["DECIMAL(12,2)", "BigDecimal"],
  boolean: ["BOOLEAN", "Boolean"],
  date: ["DATE", "LocalDate"],
  datetime: ["TIMESTAMP", "Instant"],
  enum: ["(type énuméré)", "enum"],
  reference: ["UUID", "(entité liée)"],
  asset: ["TEXT (URL)", "String"],
  json: ["JSONB", "JsonNode"],
};

const l = [];
const t = (s = "") => l.push(s);

t(`# ${air.app.name} — spécification dérivée`);
t();
t(`> Générée depuis le document AIR \`${air.projectId}\`, contrat ${air.airSchemaVersion}.`);
t(`> Ne pas modifier à la main : régénérer après toute évolution du document.`);
t();
t(air.app.description[0].text);
t();

// ── LE PARTAGE DES RESPONSABILITÉS, D'ABORD. C'est la question que se pose un
// développeur backend en ouvrant un document, et y répondre en dernier serait
// le laisser deviner.
t(`## Qui fait quoi`);
t();
t(`| | Côté **Spring Boot** | Côté **application générée** |`);
t(`|---|---|---|`);
t(`| Données | persistance, intégrité, migrations | affichage, saisie |`);
t(`| Accès | **faire respecter** la matrice | masquer ce qui est interdit |`);
t(`| Argent | **tout le calcul** | afficher des montants déjà calculés |`);
t(`| Opérateurs | Mobile Money, OTP, PDF | déclencher, montrer le résultat |`);
t();
t(
  `La matrice d'accès est **appliquée par le serveur**. L'application la respecte ` +
    `aussi — elle masque ce qu'un rôle n'ouvre pas — mais une garde côté client ne ` +
    `garde rien : elle évite une erreur, elle n'empêche pas une attaque.`,
);
t();

// ── LES ENTITÉS
t(`## Entités`);
t();
for (const e of air.entities) {
  t(`### \`${e.name}\``);
  t();
  t(`| Champ | Type AIR | PostgreSQL | Java | Requis |`);
  t(`|---|---|---|---|---|`);
  for (const f of e.fields) {
    const [sql, java] = TYPES[f.type] ?? ["?", "?"];
    const detail =
      f.type === "enum"
        ? ` — ${f.enumValues.map((v) => `\`${v}\``).join(", ")}`
        : f.type === "reference"
          ? ` → \`${air.entities.find((x) => x.id === f.referencesEntityId)?.name ?? "?"}\``
          : "";
    t(`| \`${f.name}\` | ${f.type} | ${sql}${detail} | ${java} | ${f.required ? "oui" : "non"} |`);
  }
  t();
}

// ── LES RELATIONS
t(`## Relations`);
t();
t(
  `Le format ne connaît pas \`many_to_one\` : une relation se déclare toujours ` +
    `depuis le côté « un ». En JPA, cela se lit \`@OneToMany\` d'un côté et ` +
    `\`@ManyToOne\` de l'autre.`,
);
t();
t(`| Depuis | Vers | Cardinalité |`);
t(`|---|---|---|`);
const nomDe = (id) => air.entities.find((x) => x.id === id)?.name ?? id;
for (const r of air.relations) {
  t(`| \`${nomDe(r.fromEntityId)}\` | \`${nomDe(r.toEntityId)}\` | ${r.kind} |`);
}
t();

// ── LA MATRICE D'ACCÈS
t(`## Matrice d'accès`);
t();
t(`### Droits`);
t();
for (const d of air.access.rights) {
  t(`- \`${d.id}\` — ${d.label[0].text}`);
}
t();
t(`### Rôles`);
t();
t(`| Rôle | Droits |`);
t(`|---|---|`);
for (const r of air.access.roles) {
  const quoi =
    r.grantsAllRights === true
      ? "**tous** (super-administrateur)"
      : r.rightIds.length === 0
        ? "_aucun_ — liste blanche vide"
        : r.rightIds.map((x) => `\`${x}\``).join(", ");
  t(`| ${r.label[0].text} | ${quoi} |`);
}
t();
t(
  `Rôle par défaut : **${air.access.roles.find((r) => r.id === air.access.defaultRoleId)?.label[0].text}**. ` +
    `Un compte nouvellement créé n'a donc **aucun** droit du bureau tant qu'on ne lui en accorde pas.`,
);
t();

// ── LES ÉCRANS
t(`## Écrans et droits exigés`);
t();
t(`| Écran | Droit exigé |`);
t(`|---|---|`);
for (const s of air.screens) {
  t(`| ${s.title[0].text} | ${s.requiredRightId ? `\`${s.requiredRightId}\`` : "_ouvert_"} |`);
}
t();

// ── CE QUI REVIENT AU BACKEND
const absents = air.intent.needs.filter((b) => b.resolution.kind === "unexpressible");
t(`## Ce qui revient au backend (${absents.length} points)`);
t();
t(
  `Ces exigences du cahier des charges **ne sont pas portées par l'interface**, et ` +
    `c'est volontaire : ce sont des règles métier, financières ou réglementaires. ` +
    `Elles sont donc à implémenter côté Spring Boot. La liste est exhaustive par ` +
    `construction — tout ce que l'application ne sait pas porter se trouve ici.`,
);
t();
for (const [i, b] of absents.entries()) {
  t(`### ${i + 1}. ${b.statement}`);
  t();
  t(`> ${b.resolution.reason}`);
  t();
}

// ── CE QUE L'APPLICATION PORTE
const portes = air.intent.needs.filter((b) => b.resolution.kind === "satisfied");
t(`## Ce que l'application porte déjà (${portes.length} points)`);
t();
for (const b of portes) t(`- ${b.statement}`);
t();

t(`---`);
t();
t(
  `*${air.entities.length} entités · ${air.relations.length} relations · ` +
    `${air.screens.length} écrans · ${air.access.rights.length} droits · ` +
    `${air.access.roles.length} rôles · ${portes.length} besoins portés · ` +
    `${absents.length} au backend.*`,
);

const sortie = join(ICI, "SPECIFICATION.md");
writeFileSync(sortie, l.join("\n"), "utf8");
console.log(`  écrit : ${sortie} (${l.length} lignes)`);

// ══════════════════════════════════════════════════════════════
//  LA MÊME SPÉCIFICATION, EN PAGE PARTAGEABLE
// ══════════════════════════════════════════════════════════════
//
// Le développeur backend ne lira pas un fichier dans un dépôt auquel il n'a pas
// accès. La page est donc produite ICI, depuis LES MÊMES DONNÉES : une page
// écrite à part diverge du document au premier changement, et c'est exactement
// ce que ce fichier existe pour empêcher.

const ech = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Le Markdown en ligne que la spécification emploie : `code` et **gras**.
const inline = (s) =>
  ech(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");

const h = [];
const cellules = (ligne) =>
  ligne.slice(1, -1).split("|").map((c) => inline(c.trim()));

// On rejoue les lignes deja produites : une seule source, deux sorties.
for (let i = 0; i < l.length; i++) {
  const ligne = l[i];
  if (ligne.startsWith("| ") && (l[i + 1] ?? "").startsWith("|---")) {
    const entetes = cellules(ligne);
    let j = i + 2;
    const corps = [];
    while (j < l.length && l[j].startsWith("| ")) corps.push(cellules(l[j++]));
    h.push(
      `<div class="defile"><table><thead><tr>${entetes
        .map((c) => `<th>${c}</th>`)
        .join("")}</tr></thead><tbody>${corps
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
        .join("")}</tbody></table></div>`,
    );
    i = j - 1;
  } else if (ligne.startsWith("### ")) h.push(`<h3>${inline(ligne.slice(4))}</h3>`);
  else if (ligne.startsWith("## ")) h.push(`<h2>${inline(ligne.slice(3))}</h2>`);
  else if (ligne.startsWith("# ")) h.push(`<h1>${inline(ligne.slice(2))}</h1>`);
  else if (ligne.startsWith("> ")) h.push(`<blockquote>${inline(ligne.slice(2))}</blockquote>`);
  else if (ligne.startsWith("- ")) {
    const items = [];
    while (i < l.length && l[i].startsWith("- ")) items.push(inline(l[i++].slice(2)));
    i--;
    h.push(`<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`);
  } else if (ligne === "---") h.push("<hr/>");
  else if (ligne.trim() !== "") h.push(`<p>${inline(ligne)}</p>`);
}

const CSS = `
:root{
  --encre:#171a1f; --encre-douce:#4a5159; --papier:#faf9f6; --carte:#ffffff;
  --rule:#e2ded5; --accent:#0f6b58; --accent-doux:#e6f1ed;
  --dette:#8c4a2f; --dette-doux:#f7ece6;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --encre:#e9e7e1; --encre-douce:#a3a8ad; --papier:#14161a; --carte:#1b1e23;
    --rule:#2d3138; --accent:#4fd1ab; --accent-doux:#132a24;
    --dette:#e0a183; --dette-doux:#2b1d16;
  }
}
:root[data-theme="dark"]{
  --encre:#e9e7e1; --encre-douce:#a3a8ad; --papier:#14161a; --carte:#1b1e23;
  --rule:#2d3138; --accent:#4fd1ab; --accent-doux:#132a24;
  --dette:#e0a183; --dette-doux:#2b1d16;
}
body{background:var(--papier);color:var(--encre);
  font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  margin:0;padding:0 1.25rem 5rem;}
main{max-width:52rem;margin:0 auto;display:flex;flex-direction:column;gap:.2rem}
h1{font-family:Georgia,"Times New Roman",serif;font-weight:600;font-size:2.1rem;
  line-height:1.2;text-wrap:balance;margin:3rem 0 .5rem;letter-spacing:-.01em}
h2{font-family:Georgia,serif;font-weight:600;font-size:1.4rem;text-wrap:balance;
  margin:3rem 0 .25rem;padding-bottom:.45rem;border-bottom:2px solid var(--rule)}
h3{font-weight:600;font-size:1.02rem;margin:2rem 0 .25rem;
  letter-spacing:.04em;text-transform:uppercase;color:var(--encre-douce)}
p{margin:.7rem 0;max-width:40rem}
blockquote{margin:.9rem 0;padding:.75rem 1rem;background:var(--dette-doux);
  border-left:3px solid var(--dette);color:var(--encre-douce);font-size:.94rem}
ul{margin:.7rem 0;padding-left:1.1rem;display:flex;flex-direction:column;gap:.3rem;max-width:40rem}
code{font:.88em ui-monospace,SFMono-Regular,Menlo,monospace;
  background:var(--accent-doux);color:var(--accent);padding:.1em .35em;border-radius:3px}
.defile{overflow-x:auto;margin:1rem 0;border:1px solid var(--rule);border-radius:6px;background:var(--carte)}
table{border-collapse:collapse;width:100%;font-size:.9rem;font-variant-numeric:tabular-nums}
th{text-align:left;font-weight:600;padding:.6rem .8rem;background:var(--accent-doux);
  color:var(--accent);white-space:nowrap;font-size:.8rem;letter-spacing:.03em;text-transform:uppercase}
td{padding:.55rem .8rem;border-top:1px solid var(--rule);vertical-align:top}
tr:hover td{background:var(--accent-doux)}
hr{border:0;border-top:1px solid var(--rule);margin:3rem 0 1rem}
p:last-of-type em,p em{color:var(--encre-douce)}
`;

writeFileSync(
  join(ICI, "specification.html"),
  `<title>Tontine — spécification backend</title>\n<style>${CSS}</style>\n<main>\n${h.join("\n")}\n</main>\n`,
  "utf8",
);
console.log(`  écrit : ${join(ICI, "specification.html")}`);
