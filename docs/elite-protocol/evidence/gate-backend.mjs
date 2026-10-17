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
const { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, symlinkSync } =
  await import("node:fs");
const { execFileSync } = await import("node:child_process");
const { tmpdir } = await import("node:os");
const { join } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const R = join(fileURLToPath(import.meta.url), "..", "..", "..", "..") + "/";
const { outillageJava } = await import(R + "docs/elite-protocol/evidence/outillage-java.mjs");
const { migrateAirDocument, assertValidAir } = await import(R + "packages/air-schema/src/index.ts");
const { compileBackend } = await import(R + "packages/compiler/src/index.ts");
const { documentsDuCorpus } = await import(R + "docs/elite-protocol/evidence/corpus-documents.mjs");
// ── LE BINAIRE EST DÉCODÉ, ET LA DÉCISION EST UNIQUE (2026-10-17).
//
// Les faces de police embarquées voyagent en base64 dans la carte de fichiers.
// Écrire ce base64 EN TEXTE produit un fichier présent, non vide et INVALIDE —
// et une famille introuvable ne lève pas : elle retombe en silence sur la
// police système. NEUF écrivains existaient ; `fichiers-binaires.ts` est le
// seul endroit où la décision vit.
const { estBinaire } = await import(
  new URL("../../../packages/compiler/src/fichiers-binaires.ts", import.meta.url).href,
);

const OUT = join(tmpdir(), "deribfy-gate-backend") + "/";

// ── LE COMPILATEUR TYPESCRIPT, EMPRUNTE A LA RACINE.
//
// Meme regle que pour Fastify : la gate n'installe rien. Si l'outil manque,
// elle le DIT au lieu de sauter silencieusement les serveurs Node.
const TSC = join(R, "node_modules", "typescript", "bin", "tsc");

// ── LES PILES MESURÉES.
//
// Le document choisit la sienne ; ses RÈGLES, elles, n'en dépendent pas. Un
// journal qui refuserait la réécriture en Java et l'accepterait en Node serait
// un document qui veut dire deux choses selon le serveur — et rien ne l'aurait
// dit, puisque le corpus ne déclare qu'une pile. La gate les mesure donc
// TOUTES à partir du même document, et exige de chacune les mêmes refus.
const PILES = ["spring_boot", "fastify"];

// ── UN MODE RAPIDE, POUR LE CROCHET DE PRÉ-PUSH SEULEMENT.
//
// Mesuré : couvrir les 31 documents fait passer cette gate de 10 s à ~205 s.
// Le crochet de pré-push rejoue TOUTE la chaîne ; elle dépasse alors dix
// minutes et GitHub ferme la connexion pendant ce temps — le push échoue sans
// qu'aucune étape soit rouge.
//
// AIR_GATE_RAPIDE=1 limite la mesure aux documents qui DÉCLARENT un serveur.
// Le CI ne pose pas cette variable : les 31 documents y restent couverts. La
// barrière avant push subsiste donc, sans être payée dix minutes.
//
// Le mode est DIT dans la sortie : une gate qui mesure moins sans le dire
// serait pire qu'une gate absente.
const RAPIDE = process.env.AIR_GATE_RAPIDE === "1";
if (RAPIDE) {
  console.log("  mode    : RAPIDE — seuls les documents DÉCLARANT un serveur");
  console.log("            (le CI, lui, mesure les 31 documents du corpus)");
}

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
console.log("\n  document · pile                  fichiers   refus    verdict");
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
  // ── TOUS LES DOCUMENTS, PAS SEULEMENT CELUI QUI DEMANDE UN SERVEUR.
  //
  // Mesuré : sur 31 documents du corpus, UN SEUL déclare `backend: genere`.
  // Les émetteurs n'étaient donc éprouvés que sur ce document-là — un défaut
  // qui n'apparaîtrait que sur le dix-septième ne se serait vu qu'en
  // production. Le corpus est GELÉ : on n'y touche pas, on injecte le
  // serveur ICI, après validation, comme la gate le fait déjà pour la pile.
  //
  // `domain` est volontairement omis : le validateur exige qu'il figure dans
  // `network.allowedDomains`, et l'inventer ferait échouer des documents sur
  // une propriété que cette gate ne mesure pas.
  const genere = air.backend !== undefined && air.backend.kind === "genere";
  if (RAPIDE && !genere) continue;
  for (const pile of PILES) {
  const airPile = genere
    ? { ...air, backend: { ...air.backend, stack: pile } }
    : { ...air, backend: { kind: "genere", stack: pile } };
  const { files } = compileBackend(airPile);
  // ── UN DOCUMENT SANS BACKEND N'EST PAS UN ÉCHEC.
  //
  // `backend` est optionnel, et son absence veut dire « aucun serveur émis ».
  // Les 30 documents du corpus gelé sont dans ce cas : les compter comme des
  // ratés ferait d'une propriété voulue un défaut.
  if (files.size === 0) continue;
  mesures += 1;

  const dir = OUT + nom + "." + pile + "/";
  for (const [f, contenu] of files) {
    const p = dir + f;
    mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true });
    writeFileSync(p, estBinaire(p) ? Buffer.from(contenu, "base64") : contenu);
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
  // ── LE REFUS DE CALCULER N'EST EXIGÉ QUE LÀ OÙ LE DOCUMENT EST MUET.
  //
  // Longtemps `count`/`sum` étaient des trous : « la requête dépend de votre
  // base ». C'était vrai avant que l'émetteur produise le schéma. Il le
  // produit, et la colonne qui relie l'enfant au parent est déclarée par
  // `referencesEntityId` — le trou n'était plus justifié, il était resté.
  //
  // Reste UN cas réellement indécidable : l'enfant porte DEUX champs vers le
  // même parent (« créé par » et « validé par » vers les utilisateurs). Rien
  // ne dit lequel compte ; deviner donnerait un chiffre faux avec l'air
  // d'être juste. Là, et là seulement, le refus est exigé.
  const indecidable = air.entities.some((e) =>
    e.fields.some((f) => {
      const d = f.derived;
      if (d === undefined || (d.kind !== "count" && d.kind !== "sum")) return false;
      const rel = air.relations.find((r) => r.id === d.relationId);
      const enfant = air.entities.find((x) => x.id === rel?.toEntityId);
      if (rel === undefined || enfant === undefined) return true;
      return enfant.fields.filter((x) => x.referencesEntityId === rel.fromEntityId).length !== 1;
    }),
  );
  if (indecidable) attendus.push(["calculé", "AIR_CALCUL_A_ECRIRE"]);
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
  // ── DEUX PILES, DEUX COMPILATEURS, UN SEUL VERDICT.
  //
  // Le document choisit sa pile ; cette gate la suit. Un serveur Node
  // verifie par `mvn` ne prouverait rien, et l'inverse non plus. On
  // reconnait la pile a ce qui a ete EMIS — pas a ce que le document dit :
  // si l'emetteur se trompait de pile, c'est precisement ce qu'on veut voir.
  const estNode = files.has("package.json");
  try {
    if (estNode) {
      // ── CE QU'ON IMPORTE DOIT ÊTRE DÉCLARÉ.
      //
      // Les dépendances sont empruntées à la racine du dépôt : un projet émis
      // compilerait donc même si son `package.json` oubliait de déclarer ce
      // qu'il importe — et ne s'installerait nulle part ailleurs. Le vert
      // mentirait. On confronte les imports au manifeste AVANT de compiler.
      const manifeste = JSON.parse(files.get("package.json"));
      const declarees = new Set([
        ...Object.keys(manifeste.dependencies ?? {}),
        ...Object.keys(manifeste.devDependencies ?? {}),
      ]);
      const importees = new Set();
      for (const [f, contenu] of files) {
        if (!f.endsWith(".ts")) continue;
        // DEUX FORMES, PAS UNE. `pg` est chargé par `import("pg")` — un
        // balayage qui ne lirait que `from "…"` l'aurait manqué, et avec lui
        // tout paquet chargé à la demande sans être déclaré.
        for (const m of contenu.matchAll(/(?:from|import\()\s*"([^".][^"]*)"/gu)) {
          const paquet = m[1].startsWith("@")
            ? m[1].split("/").slice(0, 2).join("/")
            : m[1].split("/")[0];
          if (!paquet.startsWith("node:")) importees.add(paquet);
        }
      }
      const nonDeclarees = [...importees].filter((d) => !declarees.has(d));
      if (nonDeclarees.length > 0) {
        throw new Error(
          `error TS: importé sans être déclaré dans package.json : ${nonDeclarees.join(", ")}`,
        );
      }
      // Les dependances sont EMPRUNTEES a la racine, comme le fait la gate
      // web. On ne les installe pas ici : une gate qui telecharge ne mesure
      // plus le code, elle mesure le reseau.
      symlinkSync(join(R, "node_modules"), dir + "node_modules", "dir");
      execFileSync(process.execPath, [TSC, "--noEmit", "-p", "tsconfig.json"], {
        cwd: dir,
        stdio: "pipe",
        timeout: 300000,
      });
    } else {
      execFileSync(MVN, ["-B", "-q", "compile"], {
        cwd: dir,
        stdio: "pipe",
        timeout: 900000,
        env: { ...process.env, JAVA_HOME },
      });
    }
  } catch (e) {
    // Le message de l'erreur compte autant que la sortie du compilateur :
    // les refus que CETTE gate prononce elle-même n'ont pas de stdout.
    const brut =
      String(e.stdout ?? "") + String(e.stderr ?? "") + "\n" + String(e.message ?? "");
    const ligne =
      brut.split("\n").find((l) => /\.(java|ts):?[:(\[]\d+/.test(l)) ??
      brut.split("\n").find((l) => l.includes("[ERROR]") || l.includes("error TS")) ??
      (estNode ? "tsc n'a pas abouti" : "mvn n'a pas abouti");
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
    `  ${(nom + " · " + pile).padEnd(31)} ${String(files.size).padStart(6)}  ${String(attendus.length - manquants.length + "/" + attendus.length).padStart(7)}   ${verdict}`,
  );
  }
}

if (mesures === 0) {
  console.error("\n  🔴 AUCUN document ne déclare de backend — la gate n'a rien mesuré.");
  console.error("     Un document doit porter `backend: { kind: \"genere\", stack: … }`.");
  process.exitCode = 1;
} else {
  console.log(`\n  ${mesures - echecs}/${mesures} serveur(s) généré(s) compilent.`);
  process.exitCode = echecs === 0 ? 0 : 1;
}
