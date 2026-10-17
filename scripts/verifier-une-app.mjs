// ════════════════════════════════════════════════════════════════════
//  VÉRIFIER UNE APPLICATION — compiler, puis la MONTER écran par écran.
// ════════════════════════════════════════════════════════════════════
//
//   node scripts/verifier-une-app.mjs <document.air.json>
//   npm run verifier:une-app -- slices/tontine/tontine.air.json
//
// ── CE QUE CE SCRIPT RÉPOND, ET QUE RIEN NE RÉPONDAIT.
//
// « Est-ce que l'application que le moteur vient de produire S'AFFICHE ? »
//
// Les cinq juges lisent le document. Le LOT 2 a ajouté la compilation.
// Personne ne montait les écrans d'UNE génération : `gate:app-rendu` ne sait
// le faire que sur le corpus gelé de 29 applications, et son cliquet exige ce
// nombre EXACT — y glisser une génération l'aurait cassé.
//
// ── TROIS NIVEAUX, DANS L'ORDRE OÙ ILS COÛTENT.
//
//   ① le document est VALIDE          — `assertValidAir`, instantané
//   ② l'application se COMPILE        — `compileProject`, moins d'une seconde
//   ③ son code TYPECHECKE             — `tsc --noEmit` sur les fichiers émis
//   ④ les écrans se MONTENT           — react-test-renderer, quelques secondes
//   ⑤ ses formulaires sont SOUMETTABLES — arithmétique sur le document
//   ⑥ l'application AGIT              — on appuie, on saisit, on regarde (LOT 6)
//
// Chaque niveau arrête le suivant : monter des écrans qu'on n'a pas pu
// compiler n'apprendrait rien, et le dire deux fois ferait croire à deux
// défauts.
//
// ── AUCUN APPEL PAYANT. Tout est pur : lecture d'un fichier, compilation
// déterministe, montage en mémoire. Ce script peut tourner mille fois.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const doc = process.argv[2];

if (doc === undefined) {
  console.error("usage : node scripts/verifier-une-app.mjs <document.air.json>");
  process.exit(2);
}

const chemin = resolve(doc);
console.log(`\n  document : ${chemin}\n`);

// ── ① LE DOCUMENT EST-IL VALIDE ?
const { migrateAirDocument, assertValidAir } = await import(
  join(REPO, "packages/air-schema/src/index.ts")
);
let air;
try {
  air = assertValidAir(migrateAirDocument(JSON.parse(readFileSync(chemin, "utf8"))));
  console.log("  ① document VALIDE");
} catch (e) {
  console.error("  ① document REFUSÉ");
  for (const d of e?.diagnostics ?? []) {
    console.error(`     ${d.code ?? "?"} @ ${d.path ?? "?"} — ${String(d.message ?? "").slice(0, 120)}`);
  }
  if ((e?.diagnostics ?? []).length === 0) console.error(`     ${String(e?.message ?? e)}`);
  process.exit(1);
}

// ── ② SE COMPILE-T-ELLE ?
const { compileProject } = await import(join(REPO, "packages/compiler/src/compile-project.ts"));
let fichiers;
try {
  fichiers = compileProject(air).files;
  console.log(`  ② compile — ${String(fichiers.size)} fichiers`);
} catch (e) {
  console.error(`  ② COMPILATION IMPOSSIBLE — ${String(e?.code ?? "")} ${String(e?.message ?? e)}`);
  process.exit(1);
}

// ── ③ LES ÉCRANS SE MONTENT-ILS ?
//
// On écrit dans un dossier NEUF à chaque fois : un reliquat d'une
// vérification précédente ferait monter des écrans qui n'existent plus, et le
// verdict porterait sur une application qui n'est pas celle qu'on tient.
const DEST = join(tmpdir(), "deribfy-une-app");
rmSync(DEST, { recursive: true, force: true });
for (const [nom, contenu] of fichiers) {
  const abs = join(DEST, nom);
  mkdirSync(dirname(abs), { recursive: true });
  // Les `.png` voyagent en base64 dans la carte — convention du dépôt.
  writeFileSync(abs, nom.endsWith(".png") ? Buffer.from(contenu, "base64") : contenu);
}

// ── LE `node_modules` DE RÉFÉRENCE, ET POURQUOI IL EST INDISPENSABLE.
//
// Le `tsconfig.json` émis étend `expo/tsconfig.base`. Depuis un dossier
// temporaire sans dépendances, il est introuvable — et l'outillage échoue
// sur un message qui ne parle ni du document ni de l'application.
//
// La gate de compilation résout ça en liant symboliquement les dépendances
// d'une tranche déjà installée. On fait pareil : on ne réinstalle rien, on
// emprunte. Si l'emprunt n'est pas possible, on le DIT — un échec dont on
// ignore la cause vaut moins qu'un refus net.
const DEPS = join(REPO, "slices/resto-riche/app/node_modules");
if (!existsSync(DEPS)) {
  console.error(
    `  ③ impossible : aucun \`node_modules\` de référence en ${DEPS}\n` +
      "     (lancer `npm ci` dans slices/resto-riche/app, ou dans une autre tranche)",
  );
  process.exit(2);
}
symlinkSync(DEPS, join(DEST, "node_modules"), "dir");

try {
  execFileSync("npx", ["tsc", "--noEmit"], { cwd: DEST, stdio: "pipe", timeout: 180_000 });
  console.log("  ③ le code émis TYPECHECKE");
} catch (e) {
  const sortie = String(e?.stdout ?? "") + String(e?.stderr ?? "");
  const erreurs = sortie.split("\n").filter((l) => l.includes("error TS"));
  console.error(`  ③ TYPECHECK REFUSÉ — ${String(erreurs.length)} erreur(s)`);
  // Si `tsc` n'a produit AUCUNE erreur TS, c'est qu'il n'a pas tourné : on
  // publie sa sortie brute plutôt qu'un échec indéchiffrable.
  for (const l of (erreurs.length > 0 ? erreurs : sortie.split("\n")).slice(0, 12)) {
    console.error(`     ${l}`);
  }
  process.exit(1);
}

try {
  execFileSync(
    "npx",
    [
      "vitest",
      "run",
      "--config",
      "docs/elite-protocol/evidence/observation/une-app.config.ts",
      "une-app.une",
    ],
    { cwd: REPO, stdio: "inherit", env: { ...process.env, DERIBFY_APP: DEST } },
  );
  console.log("\n  ④ tous les écrans se MONTENT.");
} catch {
  console.error("\n  ④ des écrans ne se montent pas — détail ci-dessus.\n");
  process.exit(1);
}

// ════════════════════════════════════════════════════════════════════
// ── ⑤ SES FORMULAIRES PEUVENT-ILS ÊTRE SOUMIS ? (LOT 6)
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT QUE CE NIVEAU A TROUVÉ, ET IL EST SYSTÉMIQUE.
//
// Mesuré le 2026-10-17 sur les 15 documents du dépôt : VINGT formulaires,
// dans DOUZE documents, ne peuvent PAS être soumis. Jamais. En silence.
//
// LE MÉCANISME, LU DANS LE CODE ÉMIS, PAS SUPPOSÉ :
//   ① `air-runtime.tsx` évalue `reglesRespectees(rules, entite, saisie)`
//      AVANT toute écriture, et `return` sans rien dire si c'est faux ;
//   ② une assertion sur un champ ABSENT de la saisie échoue — `in` compare
//      la chaîne « undefined » à sa liste, `required` voit du vide,
//      `matches` refuse `undefined` ;
//   ③ le bouton, lui, est ACTIF : `onSubmit={() => dispatch(actionId, …)}`,
//      sans `disabled` ni condition de validité.
//
// Donc : l'utilisateur remplit tout ce qu'il voit, appuie, et RIEN ne se
// passe — sans message. C'est la famille `APP-D002`, et aucune gate
// existante ne la voyait : `gate:app-rendu` est verte sur les 29.
//
// ── POURQUOI C'EST ARITHMÉTIQUE, ET SANS FAUX POSITIF.
//
// On ne presse rien et on ne devine rien : si une règle de l'entité porte
// une assertion BLOQUANTE sur un champ que le formulaire n'expose pas,
// alors `reglesRespectees` est faux pour TOUTE saisie possible. Ce n'est
// pas une heuristique, c'est une impossibilité.
//
// `neq` est EXCLU, et c'est la précision qui compte : sur une valeur
// absente, `String(undefined) !== attendu` est VRAI, donc `neq` passe. Un
// opérateur inconnu passe aussi (`default: break`). Les inclure aurait
// produit un faux rouge — j'ai failli le faire.
const OPERATEURS_BLOQUANTS = new Set([
  "required",
  "eq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "matches",
]);

const formulairesBloques = (() => {
  const regles = [];
  const ramasser = (o) => {
    if (Array.isArray(o)) return void o.forEach(ramasser);
    if (o === null || typeof o !== "object") return;
    if (Array.isArray(o.rules)) regles.push(...o.rules);
    for (const v of Object.values(o)) ramasser(v);
  };
  ramasser(air);

  const out = [];
  for (const ecran of air.screens ?? []) {
    for (const bloc of ecran.blocks ?? []) {
      if (bloc.blockType !== "form") continue;
      const champsDuFormulaire = new Set(
        (bloc.props ?? []).find((p) => p.key === "fieldIds")?.value ?? [],
      );
      const bloquants = new Map();
      for (const r of regles) {
        if (r.entityId !== bloc.entityId) continue;
        for (const a of r.assertions ?? []) {
          if (typeof a.fieldId !== "string") continue;
          if (!OPERATEURS_BLOQUANTS.has(String(a.operator))) continue;
          if (champsDuFormulaire.has(a.fieldId)) continue;
          const ops = bloquants.get(a.fieldId) ?? new Set();
          ops.add(String(a.operator));
          bloquants.set(a.fieldId, ops);
        }
      }
      if (bloquants.size > 0) {
        out.push({ ecran: ecran.id, bloc: bloc.id, entite: bloc.entityId, bloquants });
      }
    }
  }
  return out;
})();

const nbFormulaires = (air.screens ?? []).reduce(
  (n, e) => n + (e.blocks ?? []).filter((b) => b.blockType === "form").length,
  0,
);

if (formulairesBloques.length === 0) {
  console.log(
    `  ⑤ ${String(nbFormulaires)} formulaire(s) SOUMETTABLE(S)` +
      (nbFormulaires === 0 ? " — aucun formulaire dans ce document" : ""),
  );
} else {
  console.error(
    `  ⑤ ${String(formulairesBloques.length)} formulaire(s) sur ${String(nbFormulaires)} NE PEUVENT PAS ÊTRE SOUMIS`,
  );
  for (const f of formulairesBloques) {
    const detail = [...f.bloquants]
      .map(([champ, ops]) => `${champ} (${[...ops].sort().join("/")})`)
      .sort()
      .join(", ");
    console.error(`     🔴 ${f.ecran}/${f.bloc} — champ(s) sous règle absent(s) : ${detail}`);
  }
  console.error(
    "     Le bouton est ACTIF et l'appui ne produit RIEN, sans message :\n" +
      "     la règle porte sur un champ que le formulaire n'expose pas.\n" +
      "     Deux issues : exposer le champ, ou que le moteur le renseigne.",
  );
  process.exit(1);
}

// ── ⑥ L'APPLICATION AGIT-ELLE ? (LOT 6)
//
// Monter sans exception ne prouve rien : ce dépôt a déjà payé `APP-D002` —
// « 56 contrôles pressables et muets ». On appuie, on saisit, et on regarde
// ce qui arrive à la source de données.
//
// LE COMPTE DES MUTATIONS VIENT DU DOCUMENT, et il est passé au harnais :
// exiger une écriture d'une application qui n'en promet aucune serait un
// faux cliquet, et n'en exiger aucune d'une application qui en promet
// laisserait passer la promesse morte. Le document arbitre.
/**
 * ── CE QU'ON SAISIT DANS CHAQUE CHAMP, ET POURQUOI ÇA VIENT DU DOCUMENT.
 *
 * DÉFAUT MESURÉ SUR MOI-MÊME, le 2026-10-17. Ma première sonde remplissait
 * TOUT avec « 42 ». Sur `bus-intercites` : 136 appuis, 32 champs, ZÉRO
 * écriture — et j'ai failli conclure que l'application était muette.
 *
 * Diagnostic : le document déclare six règles de validation, dont
 * `^[^@\s]+@[^@\s]+\.[a-z]{2,}$` sur l'e-mail et une liste fermée sur le
 * statut d'un billet. « 42 » les viole. La soumission était refusée À RAISON.
 *
 * Un instrument qui crie au loup sur une application saine est PIRE que pas
 * d'instrument : on apprend à l'ignorer. Les valeurs viennent donc des
 * assertions du document lui-même.
 *
 * LA FRONTIÈRE : on ne devine rien. Une énumération donne sa première valeur
 * admise ; un motif est ÉPROUVÉ contre les candidats, et c'est le regex DU
 * DOCUMENT qui tranche ; le reste suit le `type` déclaré. Un champ dont le
 * document ne dit rien reçoit un témoin neutre.
 */
const CANDIDATS = [
  "temoin@exemple.com",
  "2026-01-15",
  "2026-01-15T10:00:00Z",
  "+23566000000",
  "42",
  "Temoin",
];

const valeursParChamp = (() => {
  // ① LES CONTRAINTES, RAMASSÉES OÙ ELLES VIVENT : les assertions des règles.
  const contraintes = new Map();
  const balayerRegles = (o) => {
    if (Array.isArray(o)) return void o.forEach(balayerRegles);
    if (o === null || typeof o !== "object") return;
    if (Array.isArray(o.rules)) {
      for (const r of o.rules) {
        for (const a of r?.assertions ?? []) {
          if (typeof a?.fieldId !== "string") continue;
          const liste = contraintes.get(a.fieldId) ?? [];
          liste.push(a);
          contraintes.set(a.fieldId, liste);
        }
      }
    }
    for (const v of Object.values(o)) balayerRegles(v);
  };
  balayerRegles(air);

  const parType = {
    number: "42",
    decimal: "42",
    integer: "42",
    date: "2026-01-15",
    datetime: "2026-01-15T10:00:00Z",
    boolean: "true",
    text: "Temoin",
    string: "Temoin",
  };

  const out = {};
  for (const e of air.entities ?? []) {
    for (const f of e.fields ?? []) {
      const regles = contraintes.get(f.id) ?? [];
      // ① UNE LISTE FERMÉE : sa première valeur, celle du document.
      const liste =
        regles.find((a) => a.operator === "in" && Array.isArray(a.value))?.value ??
        (Array.isArray(f.options) ? f.options : undefined);
      if (liste !== undefined && liste.length > 0) {
        out[f.id] = String(typeof liste[0] === "object" ? (liste[0].value ?? liste[0].id) : liste[0]);
        continue;
      }
      // ② UN MOTIF : on ÉPROUVE les candidats contre le regex du document.
      const motif = regles.find((a) => a.operator === "matches" && typeof a.value === "string");
      if (motif !== undefined) {
        let retenu;
        try {
          const re = new RegExp(motif.value, "u");
          retenu = CANDIDATS.find((c) => re.test(c));
        } catch {
          // Un motif que la plateforme refuse de compiler n'est pas notre
          // affaire ici : on retombe sur le type, et on ne cache rien.
        }
        if (retenu !== undefined) {
          out[f.id] = retenu;
          continue;
        }
      }
      // ③ SINON, LE TYPE DÉCLARÉ. Un champ muet reçoit un témoin neutre.
      out[f.id] = parType[String(f.type ?? "")] ?? "Temoin";
    }
  }
  return out;
})();

const mutations = (() => {
  const vues = new Set();
  const balayer = (o) => {
    if (Array.isArray(o)) return void o.forEach(balayer);
    if (o === null || typeof o !== "object") return;
    const e = o.effect;
    if (e !== null && typeof e === "object" && e.kind === "mutation") {
      vues.add(String(e.operation ?? "mutation"));
    }
    for (const v of Object.values(o)) balayer(v);
  };
  balayer(air);
  return vues;
})();
console.log(
  `     opérations d'écriture déclarées : ${mutations.size === 0 ? "aucune" : [...mutations].sort().join(", ")}`,
);

try {
  execFileSync(
    "npx",
    [
      "vitest",
      "run",
      "--reporter=verbose",
      "--config",
      "docs/elite-protocol/evidence/observation/une-app.config.ts",
      "une-app.comportement",
    ],
    {
      cwd: REPO,
      stdio: "inherit",
      env: {
        ...process.env,
        DERIBFY_APP: DEST,
        DERIBFY_MUTATIONS: String(mutations.size),
        DERIBFY_VALEURS: JSON.stringify(valeursParChamp),
      },
    },
  );
  console.log("\n  ⑥ l'application AGIT.\n");
} catch {
  console.error("\n  ⑥ l'application ne fait pas ce qu'elle montre — détail ci-dessus.\n");
  process.exit(1);
}
