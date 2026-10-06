// GATE RACINE — LE SERVEUR GÉNÉRÉ COMPILE-T-IL VRAIMENT ?
//
// ── POURQUOI ELLE NAÎT AVEC L'ÉMETTEUR, PAS APRÈS.
//
// Le défaut de fond de ce dépôt porte toujours le même nom : « émis, donc
// supposé bon ». Il a coûté une journée entière le 2026-10-05 — six défauts
// dans la cible web qu'aucun test de paquet ne pouvait voir, parce qu'ils
// testent des SOURCES et non des applications PRODUITES.
//
// Mesuré à la première exécution de cette gate : le contrôleur appelait
// `tontineCalculs.…`, un symbole qui n'existe nulle part. `tsc` ne pouvait pas
// le voir — c'est du Java dans une chaîne. Seul un vrai `mvn compile` le dit.
//
// ── CE QU'ELLE PROUVE, ET CE QU'ELLE NE PROUVE PAS.
//
// 🟢 PROUVÉ : le projet Maven émis compile avec un vrai JDK et les vraies
//    dépendances Spring Boot. Et les REFUS que le document exige sont dans le
//    code produit — journal, transitions, champs calculés, champs sensibles.
//
// 🟠 NON PROUVÉ : que le serveur RÉPONDE. Le démarrer exigerait une base et un
//    port ; et surtout, les méthodes que le propriétaire doit écrire LÈVENT
//    par construction. Un serveur généré qui répondrait à tout serait un
//    serveur qui ment sur ce qui reste à faire.
const { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } = await import("node:fs");
const { execFileSync } = await import("node:child_process");
const { tmpdir } = await import("node:os");
const { join } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const R = join(fileURLToPath(import.meta.url), "..", "..", "..", "..") + "/";
const { outillageJava } = await import(R + "docs/elite-protocol/evidence/outillage-java.mjs");
const { migrateAirDocument, assertValidAir } = await import(R + "packages/air-schema/src/index.ts");
const { compileBackend } = await import(R + "packages/compiler/src/index.ts");
const { documentsDuCorpus } = await import(R + "docs/elite-protocol/evidence/corpus-documents.mjs");

const OUT = join(tmpdir(), "deribfy-gate-backend") + "/";

// ── L'OUTILLAGE JAVA, CHERCHÉ PUIS DIT.
//
// Sur un runner GitHub, `java` et `mvn` sont fournis. Sur une machine de
// développement, pas forcément. Une gate qui se TAIRAIT dans ce cas
// laisserait croire qu'elle a mesuré : elle REFUSE, et dit comment l'installer.
console.log("  racine  :", R);
const outillage = outillageJava(21);
console.log(outillage.lignes.join("\n"));
if (!outillage.ok) {
  console.error(`\n  🔴 ${outillage.motif}`);
  console.error("     macOS :  /opt/homebrew/bin/brew install openjdk maven");
  console.error("     CI    :  actions/setup-java@v4 avec java-version: 21");
  process.exit(2);
}
const { java: JAVA, mvn: MVN } = outillage;
const JAVA_HOME = JAVA.replace(/\/bin\/java$/, "");

rmSync(OUT, { recursive: true, force: true });
console.log("═".repeat(78));
console.log("GATE RACINE — le SERVEUR généré compile-t-il ?");
console.log("═".repeat(78));
console.log("\n  document                 fichiers   refus    verdict");
console.log("  " + "─".repeat(72));

let mesures = 0;
let echecs = 0;
for (const [nom, chemin, transformer] of documentsDuCorpus(R)) {
  let air;
  try {
    const brut = JSON.parse(readFileSync(chemin, "utf8"));
    const prepare = transformer === undefined ? brut : transformer(brut);
    if (prepare === undefined) continue;
    air = assertValidAir(migrateAirDocument(prepare));
  } catch {
    continue; // la gate de compilation d'app rapporte déjà les documents invalides
  }
  const { files } = compileBackend(air);
  // ── UN DOCUMENT SANS BACKEND N'EST PAS UN ÉCHEC.
  //
  // `backend` est optionnel, et son absence veut dire « aucun serveur émis ».
  // Les 30 documents du corpus gelé sont dans ce cas : les compter comme des
  // ratés ferait d'une propriété voulue un défaut.
  if (files.size === 0) continue;
  mesures += 1;

  const dir = OUT + nom + "/";
  for (const [f, contenu] of files) {
    const p = dir + f;
    mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true });
    writeFileSync(p, contenu);
  }

  // ── LES REFUS DU DOCUMENT DOIVENT ÊTRE DANS LE CODE PRODUIT.
  //
  // Compiler ne suffit pas : un serveur qui compile et accepte tout est un
  // CRUD, pas le serveur que le document décrit. On vérifie donc ce qui le
  // distingue d'un CRUD écrit à la main.
  const tout = [...files.values()].join("\n");
  const attendus = [];
  if (air.entities.some((e) => e.appendOnly === true)) {
    attendus.push(["journal", "AIR_JOURNAL_REECRITURE"], ["effacement", "AIR_JOURNAL_SUPPRESSION"]);
  }
  if (air.entities.some((e) => e.fields.some((f) => f.transitions !== undefined))) {
    attendus.push(["états", "AIR_TRANSITION_INTERDITE"]);
  }
  if (air.entities.some((e) => e.fields.some((f) => f.derived !== undefined))) {
    attendus.push(["calculé", "AIR_CALCUL_A_ECRIRE"]);
  }
  const manquants = attendus.filter(([, marque]) => !tout.includes(marque)).map(([q]) => q);

  // ── AUCUN SECRET DANS LE PROJET ÉMIS.
  //
  // ⚠️ `[ \t]*` ET NON `\s*` : `\s` traverse les sauts de ligne. La première
  // version lisait `password:` suivi d'un vide, franchissait la ligne, et
  // accusait le `jpa:` suivant d'être un mot de passe en dur. C'est la même
  // faute que la veille sur la feuille de styles web — une classe d'erreur qui
  // revient, et qui se referme en interdisant à la regex de changer de ligne.
  const secret = /password[ \t]*[:=][ \t]*["']?[A-Za-z0-9]{3,}/.test(
    tout.replace(/\$\{[^}]*\}/g, ""),
  );

  let verdict = "🟢 BUILD SUCCESS";
  let ko = false;
  try {
    execFileSync(MVN, ["-B", "-q", "compile"], {
      cwd: dir,
      stdio: "pipe",
      timeout: 900000,
      env: { ...process.env, JAVA_HOME },
    });
  } catch (e) {
    const brut = String(e.stdout ?? "") + String(e.stderr ?? "");
    const ligne =
      brut.split("\n").find((l) => /\.java:\[\d+/.test(l)) ??
      brut.split("\n").find((l) => l.includes("[ERROR]")) ??
      "mvn n'a pas abouti";
    verdict = `🔴 ${ligne.replace(/^\[ERROR\]\s*/, "").slice(0, 60)}`;
    ko = true;
  }
  if (manquants.length > 0) {
    verdict = `🔴 refus ABSENTS du code : ${manquants.join(", ")}`;
    ko = true;
  }
  if (secret) {
    verdict = "🔴 un secret littéral dans le projet émis";
    ko = true;
  }
  if (ko) echecs += 1;
  console.log(
    `  ${nom.padEnd(24)} ${String(files.size).padStart(6)}  ${String(attendus.length - manquants.length + "/" + attendus.length).padStart(7)}   ${verdict}`,
  );
}

if (mesures === 0) {
  console.error("\n  🔴 AUCUN document ne déclare de backend — la gate n'a rien mesuré.");
  console.error("     Un document doit porter `backend: { kind: \"genere\", stack: … }`.");
  process.exitCode = 1;
} else {
  console.log(`\n  ${mesures - echecs}/${mesures} serveur(s) généré(s) compilent.`);
  process.exitCode = echecs === 0 ? 0 : 1;
}
