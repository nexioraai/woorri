// GATE RACINE — LE VRAI BUILD VITE D'UNE APPLICATION WEB ÉMISE.
//
// ── CE QUE PERSONNE N'AVAIT JAMAIS LANCÉ.
//
// `app_web` passe `tsc` sur les 31 applications, et `app_web_rendu` monte
// leurs 233 écrans. Aucune des deux ne lance **le build**. Mesuré le
// 2026-10-05 : `vite build` n'avait JAMAIS tourné sur une application émise.
//
// C'est la PREMIÈRE commande que tape le propriétaire — `npm install && npm
// run build`. Si elle échoue, tout le reste ne sert à rien : les types sont
// bons, les écrans se montent, et il n'a pas de site.
//
// Et `tsc` ne peut pas la remplacer. Trois choses lui échappent par
// construction :
//
//   · `vite.config.ts` est EXCLU du tsconfig (configuration Node, pas code
//     d'application) — donc jamais vérifiée nulle part avant cette gate ;
//   · le RÉSOLVEUR de modules de Vite n'est pas celui de TypeScript : un
//     chemin que `tsc` accepte peut rester introuvable au bundling ;
//   · le manifeste PWA est un ACTIF — Vite le renomme avec une empreinte, et
//     c'est le lien dans `index.html` qui doit suivre. S'il ne suit pas, le
//     navigateur refuse l'installation, sans rien dire à personne.
//
// ── POURQUOI UN SEUL `npm install`, PARTAGÉ.
//
// Les 31 applications déclarent les MÊMES dépendances (react, react-dom,
// vite, le plugin). Installer 31 fois coûterait treize minutes pour la même
// chose. On installe UNE fois dans un répertoire de cache, et chaque
// application reçoit un lien.
//
// ⚠️ ON N'EMPRUNTE PAS LES DÉPENDANCES DE LA RACINE DU DÉPÔT, et c'est
// délibéré : elle porte `vite` 8 là où le gabarit émis demande `^7`. Une gate
// qui bâtirait avec une AUTRE version que celle livrée au propriétaire ne
// prouverait rien sur ce qu'il recevra. L'installation part donc du
// `package.json` ÉMIS, exactement comme la sienne.
const { mkdirSync, writeFileSync, rmSync, existsSync, symlinkSync, readdirSync, readFileSync } =
  await import("node:fs");
const { execFileSync } = await import("node:child_process");
const { tmpdir } = await import("node:os");
const { join } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const R = join(fileURLToPath(import.meta.url), "..", "..", "..", "..") + "/";

const SOURCE = join(tmpdir(), "deribfy-gate-web") + "/";
const CACHE = join(tmpdir(), "deribfy-gate-web-deps") + "/";

console.log("  racine  :", R);
console.log("  node    :", process.version, "·", process.platform, process.arch);
console.log("  sources :", SOURCE);
if (!existsSync(SOURCE)) {
  console.error("  🔴 lancer d'abord `npm run gate:app-web` — il écrit les projets.");
  process.exit(2);
}
const apps = readdirSync(SOURCE).sort();
if (apps.length === 0) {
  console.error("  🔴 aucune application sous", SOURCE);
  process.exit(2);
}

// ── L'INSTALLATION PARTAGÉE, DEPUIS LE `package.json` ÉMIS.
if (!existsSync(CACHE + "node_modules")) {
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(CACHE + "package.json", readFileSync(SOURCE + apps[0] + "/package.json", "utf8"));
  // ── `npm ci` ET NON `npm install` — C'EST LE CONTRÔLE, PAS UN DÉTAIL.
  //
  // `install` RÉSOUT les versions : il réussirait même si le verrou émis était
  // faux, périmé ou absent. `ci` INSTALLE LE VERROU et refuse tout désaccord
  // avec le `package.json`. C'est donc cette commande — et elle seule — qui
  // prouve que le projet livré au propriétaire est reproductible.
  //
  // Elle fait aussi office de cliquet sur le gabarit : changer une dépendance
  // sans régénérer le verrou fait échouer la gate ici, et non chez lui.
  const verrou = SOURCE + apps[0] + "/package-lock.json";
  if (!existsSync(verrou)) {
    console.error("  🔴 aucun `package-lock.json` émis — le projet livré ne serait pas reproductible.");
    process.exit(2);
  }
  writeFileSync(CACHE + "package-lock.json", readFileSync(verrou, "utf8"));
  console.log("  deps    : `npm ci` (une fois) depuis le VERROU ÉMIS…");
  try {
    execFileSync("npm", ["ci", "--no-audit", "--no-fund"], {
      cwd: CACHE,
      stdio: "inherit",
      timeout: 900000,
    });
  } catch (e) {
    console.error("  🔴 `npm ci` a échoué —", String(e.message).slice(0, 300));
    console.error("     Un verrou en désaccord avec le package.json émis : régénérer");
    console.error("     `template-web/package-lock.json` (voir son LISEZ-MOI).");
    process.exit(2);
  }
} else {
  console.log("  deps    : cache réutilisé ✔");
}
const vite = CACHE + "node_modules/vite/package.json";
console.log(
  "  vite    :",
  existsSync(vite) ? JSON.parse(readFileSync(vite, "utf8")).version : "INTROUVABLE",
);

console.log("═".repeat(78));
console.log("GATE RACINE — l'application WEB émise SE CONSTRUIT-ELLE ?");
console.log("═".repeat(78));
console.log("\n  document                 modules   bundle    manifeste   verdict");
console.log("  " + "─".repeat(72));

let echecs = 0;
for (const app of apps) {
  const dir = SOURCE + app + "/";
  // Chaque application reçoit un lien vers l'installation partagée. `force`
  // n'existe pas pour un lien : on retire d'abord, sinon une seconde passe
  // échoue sur « file already exists » et la gate accuserait le build.
  rmSync(dir + "node_modules", { recursive: true, force: true });
  symlinkSync(CACHE + "node_modules", dir + "node_modules", "dir");
  rmSync(dir + "dist", { recursive: true, force: true });

  let sortie = "";
  try {
    sortie = String(
      // PAS de `--logLevel warn` : il supprime la ligne « N modules transformed »,
      // et la colonne du tableau affichait « ? » sur les 31 lignes. Une colonne
      // muette donne l'illusion d'une mesure. La sortie est CAPTURÉE de toute
      // façon — elle ne pollue rien.
      execFileSync("npx", ["vite", "build"], {
        cwd: dir,
        stdio: "pipe",
        timeout: 300000,
      }),
    );
  } catch (e) {
    const brut = String(e.stdout ?? "") + String(e.stderr ?? "");
    // ── LA PREMIÈRE LIGNE N'EST PAS L'ERREUR.
    //
    // Vite annonce sa version avant de travailler. La version d'origine de
    // cette gate publiait donc « vite v7.3.6 building… » comme cause de
    // l'échec — mesuré au contrôle négatif. Un échec illisible à distance
    // coûte un aller-retour ; on cherche la ligne qui PORTE l'erreur, et on
    // retombe sur les dernières lignes si aucune ne se nomme.
    const lignes = brut.trim().split("\n").map((l) => l.trim()).filter((l) => l !== "");
    // Par ORDRE DE PRÉCISION : ce qui nomme la cause avant ce qui annonce
    // l'échec. « ✗ Build failed in 37ms » matchait en premier et ne disait
    // rien — mesuré au contrôle négatif, deux fois de suite.
    const motifs = [
      /Could not resolve|Cannot find|Unexpected|SyntaxError|Transform failed/i,
      /\[vite|\[plugin/i,
      /error/i,
      /failed/i,
    ];
    const parlante =
      motifs.map((m) => lignes.find((l) => m.test(l))).find((l) => l !== undefined) ??
      lignes.slice(-2).join(" | ");
    console.log(
      `  ${app.padEnd(24)} ${"—".padStart(7)}  ${"—".padStart(7)}  ${"—".padStart(9)}   🔴 BUILD REFUSÉ — ${parlante.slice(0, 90)}`,
    );
    echecs++;
    continue;
  }

  // ── CE QUE LE BUILD DOIT AVOIR PRODUIT, VÉRIFIÉ SUR LE DISQUE.
  //
  // Un `vite build` peut rendre 0 et ne rien écrire d'utilisable. On regarde
  // donc l'ARTEFACT, pas le code de sortie.
  const html = existsSync(dir + "dist/index.html")
    ? readFileSync(dir + "dist/index.html", "utf8")
    : "";
  const actifs = existsSync(dir + "dist/assets") ? readdirSync(dir + "dist/assets") : [];
  const js = actifs.filter((f) => f.endsWith(".js"));
  const manifeste = actifs.find((f) => f.endsWith(".webmanifest"));
  const poids = js.reduce(
    (n, f) => n + readFileSync(dir + "dist/assets/" + f, "utf8").length,
    0,
  );
  const modules = /(\d+) modules transformed/.exec(sortie)?.[1] ?? "?";

  const griefs = [];
  if (html === "") griefs.push("aucun index.html");
  if (js.length === 0) griefs.push("aucun bundle JS");
  // LE LIEN DU MANIFESTE DOIT SUIVRE SON EMPREINTE. Vite renomme l'actif ; si
  // `index.html` pointe encore le nom d'origine, le navigateur ne trouve rien
  // et refuse l'installation — en silence, et seulement sur un vrai appareil.
  if (manifeste === undefined) griefs.push("manifeste absent de dist/");
  else if (!html.includes(manifeste)) griefs.push(`lien du manifeste périmé (${manifeste})`);
  // AUCUN REACT NATIVE DANS L'ARTEFACT LIVRÉ. La gate de compilation le
  // vérifie sur les SOURCES ; ici c'est le bundle, c'est-à-dire ce que le
  // navigateur reçoit vraiment.
  for (const f of js) {
    if (readFileSync(dir + "dist/assets/" + f, "utf8").includes("react-native")) {
      griefs.push(`react-native dans ${f}`);
    }
  }

  if (griefs.length > 0) echecs++;
  console.log(
    `  ${app.padEnd(24)} ${String(modules).padStart(7)}  ${String(Math.round(poids / 1024) + "k").padStart(7)}  ${(manifeste === undefined ? "—" : "lié").padStart(9)}   ${
      griefs.length === 0 ? "🟢 OK" : "🔴 " + griefs.join(" · ")
    }`,
  );
}

console.log(`\n  ${apps.length - echecs}/${apps.length} applications web se CONSTRUISENT.`);
process.exitCode = echecs === 0 ? 0 : 1;
