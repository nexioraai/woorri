// GATE RACINE — TOUTE APPLICATION WEB ÉMISE DOIT COMPILER.
//
// ── POURQUOI CETTE GATE, LE MÊME JOUR QUE LA CIBLE WEB.
//
// Le défaut que je paie en boucle sur ce dépôt porte toujours le même nom :
// « émise, donc supposée bonne ». Il a coûté trois fois la même journée — un
// fichier oublié dans la table d'embarquement, et les 28 applications natives
// ne compilaient plus, alors que tous les tests de paquets restaient verts
// parce qu'ils testent des SOURCES, jamais des applications PRODUITES.
//
// La cible web vient de naître. Elle naît donc avec sa gate, pas après : sans
// elle, « Deribfy génère des applications web » serait une affirmation sur du
// texte, et pas sur un programme.
//
// ── CE QU'ELLE PROUVE, ET CE QU'ELLE NE PROUVE PAS.
//
// 🟢 PROUVÉ : le projet émis passe le VRAI `tsc`, avec les vraies dépendances.
// 🟠 NON PROUVÉ ICI : qu'il se MONTE. C'est l'affaire de sa JUMELLE,
//    `app_web_rendu` (`observation/corpus-web.obsweb.tsx`), écrite le même
//    jour : 29 applications, 208 écrans montés, gestes pressés, contrôle
//    négatif exécuté. Cette ligne disait « son équivalent web n'existe pas
//    encore » — une limite périmée trompe autant qu'une preuve périmée.
// 🟠 NON PROUVÉ ICI non plus : `vite.config.ts`. Le tsconfig émis l'exclut —
//    c'est de la configuration exécutée par Node, pas du code d'application —
//    et `@vitejs/plugin-react` n'est de toute façon pas installé à la racine
//    du dépôt. Deux lignes de configuration non vérifiées : c'est peu, et ce
//    peu est écrit ici plutôt que supposé.
//
// Elle emprunte `react`, `react-dom` et `typescript` au dépôt lui-même : une
// application web n'a pas de verrou de dépendances embarqué (le natif, lui, en
// a un, scellé dans le gabarit Expo). C'est une LIMITE ASSUMÉE de la cible web
// et elle est consignée telle quelle — la gate prouve que le code compile
// contre ces versions, pas que le projet livré soit reproductible au paquet
// près.
const { mkdirSync, writeFileSync, rmSync, existsSync, symlinkSync, readdirSync, readFileSync } =
  await import("node:fs");
const { execFileSync } = await import("node:child_process");
const { tmpdir } = await import("node:os");
const { join } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const R = join(fileURLToPath(import.meta.url), "..", "..", "..", "..") + "/";
const { documentsDuCorpus } = await import(R + "docs/elite-protocol/evidence/corpus-documents.mjs");
const { migrateAirDocument } = await import(R + "packages/air-schema/src/migrations.ts");
const { compileWeb } = await import(R + "packages/compiler/src/index.ts");

const BASE = R + "node_modules";
const OUT = join(tmpdir(), "deribfy-gate-web") + "/";
console.log("  racine  :", R);
console.log("  node    :", process.version, "·", process.platform, process.arch);
console.log("  sortie  :", OUT);
for (const requis of ["react", "react-dom", "typescript", "@types/react"]) {
  if (!existsSync(BASE + "/" + requis)) {
    console.error(`  🔴 \`${requis}\` introuvable à la racine — la compilation ne peut pas avoir lieu.`);
    process.exit(2);
  }
}
console.log("  deps    : empruntées à la racine du dépôt ✔");
rmSync(OUT, { recursive: true, force: true });

// LE MÊME CORPUS QUE LA GATE NATIVE, et c'est le point : la cible web ne se
// juge pas sur un cas choisi pour elle. Toute application que le générateur
// sait produire en natif doit se produire en web, ou l'écart doit être VU.
// LA LISTE EST PARTAGÉE (voir `corpus-documents.mjs`). Les deux gates en
// portaient chacune une : 31 documents d'un côté, 29 de l'autre, quatre heures
// après la naissance de la seconde. Une cible qui mesure un document que
// l'autre ignore ne se voit pas — les deux gates sont vertes.
const docs = documentsDuCorpus(R);

console.log("═".repeat(78));
console.log("GATE RACINE — l'application WEB émise COMPILE-T-ELLE ?");
console.log("═".repeat(78));
console.log("\n  document                 fichiers   react-native   tsc");
console.log("  " + "─".repeat(72));

let echecs = 0;
for (const [nom, chemin, transformer] of docs) {
  let air;
  try {
    // Une VARIANTE est le même document avec une configuration changée. Ce
    // bloc existait côté natif ; la liste étant désormais partagée, l'ignorer
    // ici aurait fait compiler la variante comme le document d'origine — la
    // gate aurait mesuré deux fois la même chose en croyant en mesurer deux.
    const brut = JSON.parse(readFileSync(chemin, "utf8"));
    const prepare = transformer === undefined ? brut : transformer(brut);
    if (prepare === undefined) {
      console.log(`  ${nom.padEnd(24)} ⚪ IGNORÉ — la variante ne s'applique pas à ce document`);
      continue;
    }
    air = migrateAirDocument(prepare);
  } catch (e) {
    const codes = [...new Set((e.diagnostics ?? []).map((d) => d.code))].join(" ");
    console.log(`  ${nom.padEnd(24)} 🔴 DOCUMENT INVALIDE : ${codes || String(e.message).slice(0, 50)}`);
    echecs++;
    continue;
  }
  let c;
  try { c = compileWeb(air); }
  catch (e) { console.log(`  ${nom.padEnd(24)} 🔴 COMPILATION REFUSÉE : ${String(e.message).slice(0, 40)}`); echecs++; continue; }

  // ── AUCUN REACT NATIVE DANS UN PROJET WEB.
  //
  // Ce contrôle est ICI et pas dans un test de paquet, parce qu'un test de
  // paquet lit des sources : il ne verrait jamais un fichier oublié dans la
  // table d'embarquement. C'est exactement l'oubli qui a cassé trois fois.
  const rn = [...c.files.entries()]
    .filter(([f]) => f.endsWith(".ts") || f.endsWith(".tsx"))
    .filter(([, v]) => v.includes('from "react-native"'))
    .map(([f]) => f);

  const dir = OUT + nom + "/";
  for (const [f, contenu] of c.files) {
    const p = dir + f;
    mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true });
    writeFileSync(p, contenu);
  }
  symlinkSync(BASE, dir + "node_modules", "dir");

  // UN échec par application, et non un par contrôle : la première version
  // comptait deux fois le même document et affichait « -29/29 applications
  // compilent ». Un compteur qui rend un nombre impossible ne dit plus rien.
  let verdict = "🟢 EXIT=0";
  let ko = false;
  try {
    execFileSync("npx", ["tsc", "--noEmit"], { cwd: dir, stdio: "pipe", timeout: 180000 });
  } catch (e) {
    const sortie = String(e.stdout ?? "") + String(e.stderr ?? "");
    const lignes = sortie.split("\n").filter((l) => l.includes("error TS"));
    verdict =
      lignes.length > 0
        ? `🔴 ${lignes.length} erreur(s) — ${lignes[0]?.slice(0, 60) ?? ""}`
        : `🔴 tsc n'a pas abouti — ${sortie.trim().split("\n").slice(0, 2).join(" | ").slice(0, 120)}`;
    ko = true;
  }
  // Le React Native résiduel PASSE DEVANT : `tsc` peut très bien l'accepter —
  // les types sont installés à la racine — alors que le navigateur, lui,
  // n'aura rien pour le rendre. Un vert ici serait le pire des mensonges.
  if (rn.length > 0) {
    verdict = `🔴 ${rn.length} fichier(s) React Native : ${rn[0]}`;
    ko = true;
  }
  if (ko) echecs++;
  console.log(
    `  ${nom.padEnd(24)} ${String(c.files.size).padStart(6)}  ${String(rn.length).padStart(10)}   ${verdict}`,
  );
}
console.log(`\n  ${docs.length - echecs}/${docs.length} applications web compilent.`);
process.exitCode = echecs === 0 ? 0 : 1;
