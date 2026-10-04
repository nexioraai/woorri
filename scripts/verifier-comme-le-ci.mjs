#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  VÉRIFIER COMME LE CI — EN LISANT LE CI, PAS EN LE RECOPIANT.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI CE FICHIER EXISTE. QUATRE ERREURS, UNE SEULE FORME.
//
// Le 2026-10-04, quatre fautes successives, et c'est la même à chaque fois :
//
//   ① un besoin déclaré INEXPRIMABLE sur la foi de mon modèle du schéma, sans
//     jamais exécuter les quatre étages — qui savaient le faire ;
//   ② « toutes les étapes sont vertes » annoncé en lisant la LISTE DES ÉTAPES,
//     alors que celles-ci sont en `continue-on-error` : GitHub y affiche la
//     `conclusion` (absorbée, verte) quand le gate lit l'`outcome` (l'échec) ;
//   ③ une régression poussée après avoir testé 3 packages sur 11, au lieu du
//     jeu de commandes que le CI lance ;
//   ④ une « anomalie » signalée parce que j'avais lancé `npx tsc --noEmit` à la
//     RACINE, sans lire `defaults.run.working-directory: apps/web` — écrit en
//     commentaire juste au-dessus. L'anomalie n'existait pas.
//
// CAUSE RACINE, en une phrase : j'ai RECRÉÉ le contrôle au lieu d'exécuter
// celui qui existe. Un contrôle recréé est systématiquement plus faible, parce
// qu'il est bâti à partir de ce que l'auteur croit déjà — il ne peut pas
// contredire son auteur, donc il ne peut pas servir de preuve.
//
// ── CE QUE CE SCRIPT FAIT, ET SURTOUT CE QU'IL NE FAIT PAS.
//
// Il LIT `.github/workflows/ci.yml` : la liste des étapes, leur commande, et le
// répertoire effectif de chacune (`defaults` du job, surcharge par étape). Puis
// il les exécute dans l'ordre et rend le verdict au format du gate.
//
// IL NE PORTE AUCUNE LISTE EN DUR. C'est tout l'objet : une liste recopiée ici
// se désynchroniserait du CI au premier ajout d'étape, et redonnerait
// exactement la fausse confiance qu'on cherche à supprimer. Si le workflow
// change, ce script change avec lui, sans que personne y pense.
//
// ── LE CAS QU'IL FAUT TRAITER À PART : LES ÉTAPES ROUGES PAR DÉCISION.
//
// `app_fidelite` est rouge sur `main` par arbitrage (D-134/D-125) et ne doit
// JAMAIS être « corrigée ». Un script qui la compte comme un échec ordinaire
// serait rouge en permanence, donc ignoré — et un contrôle qu'on ignore ne
// protège plus rien. On lit donc la DETTE ARBITRÉE depuis le workflow lui-même
// (le gate l'y annonce), au lieu de la décider ici.
//
// Usage :
//   node scripts/verifier-comme-le-ci.mjs            toutes les étapes
//   node scripts/verifier-comme-le-ci.mjs pkg        celles dont l'id contient « pkg »
//   node scripts/verifier-comme-le-ci.mjs --liste    n'exécute rien, montre le plan

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = join(RACINE, ".github/workflows/ci.yml");

// ── LES ÉTAPES, LUES DU WORKFLOW.
//
// On ne retient que celles qui portent un `id` ET un `run` : le gate ne parle
// que de celles-là (il les nomme par leur id), et une étape `uses:` est une
// action GitHub qu'on ne peut pas rejouer localement.
function etapesDuWorkflow() {
  const doc = parse(readFileSync(WORKFLOW, "utf8"));
  const jobs = Object.values(doc.jobs ?? {});
  const etapes = [];
  for (const job of jobs) {
    // Le répertoire par défaut du job — c'est précisément ce que j'avais
    // manqué, et c'est la seule raison de l'« anomalie » ④.
    const defaut = job.defaults?.run?.["working-directory"] ?? ".";
    for (const s of job.steps ?? []) {
      if (s.id === undefined || s.run === undefined) continue;
      etapes.push({
        id: s.id,
        nom: s.name ?? s.id,
        commande: String(s.run).trim(),
        // Une surcharge par étape gagne sur le défaut du job.
        repertoire: s["working-directory"] ?? defaut,
        // `continue-on-error` est ce qui rend la lecture de GitHub trompeuse :
        // on le consigne pour pouvoir le DIRE, jamais pour absorber l'échec ici.
        absorbe: s["continue-on-error"] === true,
      });
    }
  }
  return etapes;
}

// ── LA DETTE ARBITRÉE, LUE DU GATE.
//
// Le gate du workflow nomme les étapes dont le rouge est un ARBITRAGE. On lit
// ces noms depuis son script shell plutôt que de les décider ici : si
// l'arbitrage tombe, ce fichier suit sans intervention.
function detteArbitree() {
  const brut = readFileSync(WORKFLOW, "utf8");
  const arbitrees = new Set();
  // PREMIÈRE VERSION, ET ELLE NE TROUVAIT RIEN : elle cherchait la chaîne
  // `<id>=failure`. Or le workflow écrit `(app_fidelite=${{ steps.… .outcome }})`
  // — un GABARIT. Le littéral n'existe nulle part dans la source. C'était la
  // même faute qu'au-dessus, à l'échelle d'une regex : lire ce qu'on croit
  // écrit plutôt que ce qui est écrit.
  //
  // On découpe donc le gate en blocs `if`, et tout bloc qui ANNONCE une dette
  // arbitrée désigne son étape par `steps.<id>.outcome`.
  for (const bloc of brut.split(/\bif \[/)) {
    if (!/Dette ARBITR/i.test(bloc)) continue;
    const m = /steps\.([a-z_]+)\.outcome/.exec(bloc);
    if (m?.[1] !== undefined) arbitrees.add(m[1]);
  }
  return arbitrees;
}

const filtre = process.argv.slice(2).find((a) => !a.startsWith("--"));
const seulementLister = process.argv.includes("--liste");
const toutes = etapesDuWorkflow();
const arbitrees = detteArbitree();
const etapes = filtre === undefined ? toutes : toutes.filter((e) => e.id.includes(filtre));

if (etapes.length === 0) {
  console.error(
    `aucune étape ne correspond à « ${filtre} ». Disponibles : ${toutes.map((e) => e.id).join(", ")}`,
  );
  process.exit(2);
}

console.log(
  `${etapes.length} étape(s) lue(s) dans ${WORKFLOW.replace(RACINE + "/", "")}` +
    (arbitrees.size > 0 ? ` · dette arbitrée : ${[...arbitrees].join(", ")}` : ""),
);

if (seulementLister) {
  for (const e of etapes) {
    console.log(`  ${e.id.padEnd(16)} [${e.repertoire}]  ${e.commande.split("\n")[0]}`);
  }
  process.exit(0);
}

const resultats = [];
for (const e of etapes) {
  process.stdout.write(`  ${e.id.padEnd(16)} [${e.repertoire}] … `);
  const r = spawnSync("bash", ["-e", "-c", e.commande], {
    cwd: join(RACINE, e.repertoire),
    encoding: "utf8",
    // Le CI fournit des valeurs de remplacement pour que `next build` puisse
    // instancier ses clients. Sans elles, l'étape échouerait pour une raison
    // qui n'a rien à voir avec le code — un faux rouge vaut un faux vert.
    env: { ...process.env, ...(parse(readFileSync(WORKFLOW, "utf8")).jobs?.ci?.env ?? {}) },
  });
  const ok = r.status === 0;
  resultats.push({ ...e, ok, sortie: `${r.stdout ?? ""}${r.stderr ?? ""}` });
  console.log(ok ? "success" : arbitrees.has(e.id) ? "failure (ARBITRÉE)" : "FAILURE");
}

// ── LE VERDICT, AU FORMAT DU GATE.
//
// Même forme que la ligne que le gate imprime, pour qu'une comparaison avec un
// run réel se fasse à l'œil, sans traduction — une traduction est un endroit où
// se tromper.
console.log(
  "\nÉtape(s) — " + resultats.map((r) => `${r.id}=${r.ok ? "success" : "failure"}`).join(" "),
);

const casses = resultats.filter((r) => !r.ok && !arbitrees.has(r.id));
if (casses.length === 0) {
  const n = resultats.filter((r) => !r.ok).length;
  console.log(
    n === 0
      ? "\n✅ toutes les étapes lues ont réussi."
      : n === 1
        ? "\n✅ aucune régression — le seul rouge est de la dette ARBITRÉE."
        : `\n✅ aucune régression — les ${n} rouges sont de la dette ARBITRÉE.`,
  );
  process.exit(0);
}

console.log(`\n🔴 ${casses.length} étape(s) en échec HORS dette arbitrée :`);
for (const c of casses) {
  console.log(`\n── ${c.id} (${c.nom}) · ${c.repertoire}`);
  console.log(
    c.sortie
      .split("\n")
      .filter((l) => l.trim() !== "")
      .slice(-12)
      .map((l) => "   " + l)
      .join("\n"),
  );
}
process.exit(1);
