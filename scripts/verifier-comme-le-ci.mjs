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
  // Ce que le vérificateur NE couvre pas, et pourquoi — publié avec le reste.
  const nonRejouables = [];
  for (const job of jobs) {
    // Le répertoire par défaut du job — c'est précisément ce que j'avais
    // manqué, et c'est la seule raison de l'« anomalie » ④.
    const defaut = job.defaults?.run?.["working-directory"] ?? ".";
    for (const s of job.steps ?? []) {
      // ── LE SOCLE AUSSI, ET SON ABSENCE M'A COÛTÉ UNE CI ROUGE.
      //
      // Cette boucle exigeait un `id`. Elle ne voyait donc QUE les étapes que
      // le gate arbitre — et ignorait les trois premières du workflow :
      // `checkout`, `setup-node`, et `npm ci` À LA RACINE.
      //
      // Mesuré le 2026-10-06, sur le push de dix commits : `npm ci` a refusé
      // d'installer (« Missing: @deribfy/primitives-web from lock file » — un
      // paquet que j'avais créé sans réconcilier le verrou racine). Le job est
      // mort AVANT la première étape mesurée, les dix-neuf sont passées en
      // `skipped`, et ce vérificateur annonçait « aucune régression ».
      //
      // C'est le défaut fondateur de cet outil, retourné contre lui : j'avais
      // écrit un modèle du CI au lieu d'exécuter le CI. Le modèle ne couvrait
      // que ce que le gate sait nommer.
      //
      // Une étape SANS `id` est hors arbitrage par construction : son échec
      // tue le job et ne peut jamais être de la dette arbitrée. Elle est donc
      // FATALE, et marquée comme telle.
      if (s.run === undefined) continue;

      // ── DEUX ÉTAPES NE SE REJOUENT PAS, ET LA RAISON EST DÉRIVÉE, PAS NOMMÉE.
      //
      // Élargir la lecture au socle a fait entrer deux étapes qu'il ne FAUT
      // pas exécuter ici. Plutôt qu'une liste de noms — qui vieillirait sans
      // que rien ne le dise — on les reconnaît par ce qu'elles DÉCLARENT :
      //
      // ① une commande qui contient une expression GitHub (`${{ }}`) n'a aucun
      //    sens hors du runner : c'est le cas du GATE final, qui lit
      //    `steps.<id>.outcome`. Le rejouer comparerait des chaînes vides.
      //
      // ② une étape qui demande un SECRET parle à quelque chose d'extérieur.
      //    Mesuré ici : « Report system health » écrit dans un vrai projet
      //    Supabase de production avec une clé de service. Un hook `pre-push`
      //    ne doit RIEN écrire dehors — et en local il irait chercher la clé
      //    dans un `.env`, donc viser la vraie base.
      //
      // Les deux sont ANNONCÉES plus bas au lieu d'être passées en silence :
      // une étape que ce vérificateur ne couvre pas doit se voir.
      const brutRun = String(s.run);
      const brutEnv = JSON.stringify(s.env ?? {});
      const motifNonRejouable = brutRun.includes("${{")
        ? "lit des expressions du runner (steps.*.outcome)"
        : brutEnv.includes("secrets.")
          ? "écrit dehors avec un secret de CI"
          : undefined;
      if (motifNonRejouable !== undefined) {
        nonRejouables.push({ nom: s.name ?? brutRun.trim().slice(0, 40), motif: motifNonRejouable });
        continue;
      }

      etapes.push({
        // `id` reste l'IDENTITÉ D'ARBITRAGE — `null` quand le workflow n'en
        // donne pas, ce qui rend `arbitrees.has(id)` faux : une étape de socle
        // ne peut pas être de la dette arbitrée, et c'est exact.
        id: s.id ?? null,
        // `etiquette` est ce qu'on AFFICHE. Séparée de l'identité parce que la
        // première version employait `id` pour les deux, et `null.padEnd` a
        // cassé le vérificateur à la première étape de socle.
        etiquette: s.id ?? "socle/" + String(s.run).trim().split("\n")[0].slice(0, 22),
        socle: s.id === undefined,
        nom: s.name ?? s.id ?? String(s.run).trim().split("\n")[0].slice(0, 40),
        commande: String(s.run).trim(),
        // Une surcharge par étape gagne sur le défaut du job.
        repertoire: s["working-directory"] ?? defaut,
        // `continue-on-error` est ce qui rend la lecture de GitHub trompeuse :
        // on le consigne pour pouvoir le DIRE, jamais pour absorber l'échec ici.
        absorbe: s["continue-on-error"] === true,
      });
    }
  }
  return { etapes, nonRejouables };
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
const { etapes: toutes, nonRejouables } = etapesDuWorkflow();
const arbitrees = detteArbitree();
const etapes = filtre === undefined ? toutes : toutes.filter((e) => e.etiquette.includes(filtre));

if (etapes.length === 0) {
  console.error(
    `aucune étape ne correspond à « ${filtre} ». Disponibles : ${toutes.map((e) => e.etiquette).join(", ")}`,
  );
  process.exit(2);
}

console.log(
  `${etapes.length} étape(s) lue(s) dans ${WORKFLOW.replace(RACINE + "/", "")}` +
    (arbitrees.size > 0 ? ` · dette arbitrée : ${[...arbitrees].join(", ")}` : ""),
);
// ── CE QUE CE VÉRIFICATEUR NE COUVRE PAS, DIT AVANT LE RESTE.
//
// Un outil qui tait ses angles morts fait croire à une couverture totale.
// C'est exactement ce qui s'est produit le 2026-10-06 : il ignorait les trois
// étapes de socle sans le dire, `npm ci` est tombé sur le runner, et il
// annonçait « aucune régression ».
if (nonRejouables.length > 0) {
  console.log(
    `  ⚪ ${String(nonRejouables.length)} étape(s) NON rejouable(s) ici : ` +
      nonRejouables.map((n) => `${n.nom} (${n.motif})`).join(" · "),
  );
}

if (seulementLister) {
  for (const e of etapes) {
    console.log(`  ${e.etiquette.padEnd(16)} [${e.repertoire}]  ${e.commande.split("\n")[0]}`);
  }
  process.exit(0);
}

const resultats = [];
for (const e of etapes) {
  process.stdout.write(`  ${e.etiquette.padEnd(16)} [${e.repertoire}] … `);
  // LE TEMPS DE CHAQUE ÉTAPE EST AFFICHÉ, et ce n'est pas de la décoration :
  // ce script est destiné à un hook `pre-push`. Un contrôle trop lent se fait
  // contourner, et un contrôle contourné ne protège rien — il faut donc voir où
  // part le temps pour pouvoir en discuter sur des chiffres.
  const depart = process.hrtime.bigint();
  // ── `npm ci` EST DESTRUCTEUR : ON EXÉCUTE SA VÉRIFICATION, PAS SON ÉCRITURE.
  //
  // `npm ci` EFFACE `node_modules` avant de réinstaller. Le lancer tel quel
  // dans un hook `pre-push` détruirait l'environnement de travail à chaque
  // push, et laisserait le dépôt sans dépendances si le réseau lâchait.
  //
  // `--dry-run` n'est PAS une autre commande : c'est `npm ci` dont la phase de
  // RÉSOLUTION tourne et la phase d'écriture est sautée. Or c'est exactement
  // la résolution qui a échoué le 2026-10-06 (`EUSAGE`, verrou en désaccord),
  // et c'est la seule chose que cette étape doit prouver ici.
  //
  // ⚠️ CE QUE ÇA NE PROUVE PAS, ET QUI EST DIT : qu'un paquet se TÉLÉCHARGE,
  // et qu'un script `postinstall` passe. Deux risques réels, plus faibles que
  // celui-ci, et non couverts — plutôt que couverts en apparence.
  const commande =
    e.socle && /^npm ci\b/.test(e.commande) ? `${e.commande} --dry-run` : e.commande;
  const r = spawnSync("bash", ["-e", "-c", commande], {
    cwd: join(RACINE, e.repertoire),
    encoding: "utf8",
    // Le CI fournit des valeurs de remplacement pour que `next build` puisse
    // instancier ses clients. Sans elles, l'étape échouerait pour une raison
    // qui n'a rien à voir avec le code — un faux rouge vaut un faux vert.
    env: { ...process.env, ...(parse(readFileSync(WORKFLOW, "utf8")).jobs?.ci?.env ?? {}) },
  });
  const ok = r.status === 0;
  const secondes = Number(process.hrtime.bigint() - depart) / 1e9;
  resultats.push({ ...e, ok, secondes, sortie: `${r.stdout ?? ""}${r.stderr ?? ""}` });
  console.log(
    `${ok ? "success" : arbitrees.has(e.id) ? "failure (ARBITRÉE)" : "FAILURE"}` +
      `  ${secondes.toFixed(1)} s`,
  );
}

// ── LE VERDICT, AU FORMAT DU GATE.
//
// Même forme que la ligne que le gate imprime, pour qu'une comparaison avec un
// run réel se fasse à l'œil, sans traduction — une traduction est un endroit où
// se tromper.
console.log(
  "\nÉtape(s) — " + resultats.map((r) => `${r.etiquette}=${r.ok ? "success" : "failure"}`).join(" "),
);
const total = resultats.reduce((t, r) => t + r.secondes, 0);
const lentes = [...resultats].sort((a, b) => b.secondes - a.secondes).slice(0, 3);
console.log(
  `durée : ${(total / 60).toFixed(1)} min · les plus lentes : ` +
    lentes.map((r) => `${r.etiquette} ${r.secondes.toFixed(0)} s`).join(", "),
);

// ── UN ÉCHEC ABSORBÉ DU SOCLE N'EST PAS UNE CASSURE.
//
// Pour une étape qui porte un `id`, `continue-on-error` ne sauve rien : le
// gate lit son `outcome`. Pour une étape de SOCLE, personne ne le lit — son
// échec est réellement toléré par le CI (c'est le cas du lint « informatif,
// non bloquant »). Le confondre avec une cassure rendrait ce vérificateur plus
// strict que le CI, et un contrôle plus strict que la vérité se fait
// contourner.
const casses = resultats.filter(
  (r) => !r.ok && !arbitrees.has(r.id) && !(r.socle && r.absorbe),
);
if (casses.length === 0) {
  // ── DEUX RAISONS D'ÊTRE ROUGE SANS CASSER, ET ELLES NE SE CONFONDENT PAS.
  //
  // ARBITRÉE : le gate du workflow NOMME cette étape comme un rouge accepté.
  //   C'est une décision du propriétaire, consignée (D-125/D-134).
  //
  // ABSORBÉE : personne ne lit son résultat — `continue-on-error` sans `id`.
  //   Le CI la tolère par construction, ce qui n'est pas la même chose qu'une
  //   décision : c'est de la dette que rien ne tient.
  //
  // La première version de ce bloc disait « dette ARBITRÉE » pour les deux.
  // Un outil dont toute la valeur est de ne pas confondre les catégories ne
  // peut pas se permettre ça dans sa dernière ligne.
  const arb = resultats.filter((r) => !r.ok && arbitrees.has(r.id));
  const abs = resultats.filter((r) => !r.ok && r.socle && r.absorbe);
  const morceaux = [];
  if (arb.length > 0) {
    morceaux.push(
      `${String(arb.length)} ARBITRÉ(S) par le gate (${arb.map((r) => r.etiquette).join(", ")})`,
    );
  }
  if (abs.length > 0) {
    morceaux.push(
      `${String(abs.length)} ABSORBÉ(S) — personne ne lit leur résultat (${abs
        .map((r) => r.etiquette)
        .join(", ")})`,
    );
  }
  console.log(
    morceaux.length === 0
      ? "\n✅ toutes les étapes rejouées ont réussi."
      : `\n✅ aucune régression — ${morceaux.join(" · ")}.`,
  );
  process.exit(0);
}

console.log(`\n🔴 ${casses.length} étape(s) en échec HORS dette arbitrée :`);
for (const c of casses) {
  console.log(`\n── ${c.etiquette} (${c.nom}) · ${c.repertoire}`);
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
