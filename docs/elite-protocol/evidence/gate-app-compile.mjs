// GATE RACINE — TOUTE APPLICATION ÉMISE DOIT COMPILER.
//
// Défaut de fond mesuré le 2026-08-31 : 659 tests verts et l'app émise
// échouait à `tsc` dès qu'elle portait un slot. **Les tests vérifiaient le
// TEXTE produit, jamais qu'il COMPILE.** Corriger l'adaptateur de slot était
// couper une tête ; la racine est l'absence de cette gate.
//
// Ici : chaque document du corpus est compilé, écrit sur disque, et soumis au
// VRAI `tsc` avec les vraies dépendances. Aucune simulation.
// PORTABILITÉ (D-074) — cette gate embarquait le chemin ABSOLU de ma machine et
// un répertoire temporaire propre à ma session. Elle ne pouvait donc tourner
// NULLE PART ailleurs : sur la CI, elle échouait avant même de compiler quoi que
// ce soit. Une gate qui ne tourne que chez son auteur ne protège personne — le
// défaut exact que `A-P0-01` avait déjà relevé sur la CI elle-même.
const { mkdirSync, writeFileSync, rmSync, existsSync, symlinkSync, readdirSync, readFileSync } =
  await import("node:fs");
const { execFileSync } = await import("node:child_process");
const { tmpdir } = await import("node:os");
const { join } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const R = join(fileURLToPath(import.meta.url), "..", "..", "..", "..") + "/";
const { migrateAirDocument } = await import(R + "packages/air-schema/src/migrations.ts");
const { compileProject } = await import(R + "packages/compiler/src/index.ts");

// Une application émise a besoin des vraies dépendances pour être compilée. On
// les emprunte à un projet déjà installé ; s'il n'y en a pas, on les installe —
// jamais d'abandon silencieux, sinon la gate se contenterait de ne rien dire.
const BASE = R + "slices/resto-riche/app/node_modules";
// DIAGNOSTIC EN TÊTE (D-075) — quand cette gate échoue sur une machine que je
// n'ai pas, seul son propre journal peut me dire pourquoi. Elle publie donc son
// contexte AVANT de faire quoi que ce soit, et rapporte la sortie RÉELLE de tout
// ce qu'elle lance. Un échec muet coûte un aller-retour ; ceci n'en coûte aucun.
const OUT = join(tmpdir(), "deribfy-gate-compile") + "/";
console.log("  racine  :", R);
console.log("  node    :", process.version, "·", process.platform, process.arch);
console.log("  sortie  :", OUT);
if (!existsSync(BASE)) {
  console.log("  dépendances absentes → installation dans slices/resto-riche/app…");
  try {
    execFileSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: R + "slices/resto-riche/app",
      stdio: "inherit",
      timeout: 900000,
    });
  } catch (e) {
    console.error("  🔴 `npm ci` a échoué —", String(e.message).slice(0, 200));
    console.error("     repli sur `npm install`…");
    execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: R + "slices/resto-riche/app",
      stdio: "inherit",
      timeout: 900000,
    });
  }
}
if (!existsSync(BASE + "/typescript")) {
  console.error("  🔴 `typescript` introuvable dans les dépendances empruntées —");
  console.error("     la compilation ne peut pas avoir lieu. Contenu :",
    existsSync(BASE) ? readdirSync(BASE).slice(0, 12).join(" ") : "node_modules absent");
  process.exit(2);
}
console.log("  deps    : empruntées à slices/resto-riche/app ✔");
rmSync(OUT, { recursive: true, force: true });

const docs = [
  // v3 (généré par emit-v3) EN PLUS de v2 : le corpus gelé reste mesuré, et le
  // nouveau doit franchir exactement les mêmes gates.
  ...readdirSync(R + "packages/golden-corpus/corpus-v2").filter((f) => f.endsWith(".air.json"))
    .map((f) => [f.replace(".air.json", ""), R + "packages/golden-corpus/corpus-v2/" + f]),
  ...(existsSync(R + "packages/golden-corpus/corpus-v3")
    ? readdirSync(R + "packages/golden-corpus/corpus-v3").filter((f) => f.endsWith(".air.json"))
        .map((f) => ["v3-" + f.replace(".air.json", ""), R + "packages/golden-corpus/corpus-v3/" + f])
    : []),
  ["slice-conteneurs", R + "slices/conteneurs/air/suivi-conteneurs.air.json"],
  ["resto-riche", R + "slices/resto-riche/chez-nous.air.json"],
  // ── LA TONTINE, ENFIN COUVERTE DU CÔTÉ NATIF (2026-10-05).
  //
  // Mesuré : elle n'était dans AUCUNE de ces gates. Seule `app_web` la
  // compilait. Son chemin NATIF — celui qui part sur un téléphone — n'était
  // prouvé par rien : « elle compile » reposait sur une sonde que j'avais
  // lancée à la main, pas sur une porte qui se relance toute seule.
  //
  // C'est l'application qui compte le plus pour le propriétaire. La laisser
  // hors des portes revenait à mesurer tout le corpus SAUF celle-là.
  ["tontine", R + "slices/tontine/tontine.air.json"],
  // ── LE SERVEUR NEUTRE, COMPILÉ COMME LES AUTRES (2026-10-05).
  //
  // Le générateur sait désormais émettre une application qui parle le
  // protocole du moteur (`/air/v1/...`) à un serveur quelconque, au lieu du
  // client Supabase. AUCUN document du corpus ne déclare ce protocole : la
  // gate ne l'aurait donc jamais compilé, et le chemin neutre serait resté
  // « émis et supposé bon » — le défaut que ce dépôt paie en boucle.
  //
  // LE DOCUMENT EST CELUI DU CORPUS, et SEULE sa configuration
  // d'authentification change. Deux raisons, et la seconde a été payée :
  //
  //   · un document fabriqué pour l'occasion n'aurait mesuré que ma capacité
  //     à écrire un cas qui passe ;
  //   · le premier essai prenait `dougplace`, qui n'est dans AUCUNE de ces
  //     gates. La gate de rendu y a trouvé quatre fuites d'identifiant —
  //     une dette RÉELLE de ce document, exposée parce que je l'amenais ici
  //     pour la première fois. Elle est consignée, pas corrigée : ce lot
  //     mesure le chemin du serveur, pas l'affichage des références.
  [
    "boutique-mode-serveur-neutre",
    R + "packages/golden-corpus/corpus-v3/boutique-mode.air.json",
    (doc) => {
      const intg = (doc.integrations ?? []).find((i) => i.capability === "auth");
      if (intg === undefined) return undefined; // pas d'auth : rien à mesurer
      intg.config = [
        { key: "url", value: "https://api.exemple.com" },
        { key: "provider", value: "air_http" },
      ];
      return doc;
    },
  ],
].filter(([, p]) => existsSync(p));

// Un slot d'auteur MINIMAL pour chaque slot déclaré : sans lui, le registre
// n'est pas émis et la gate ne testerait jamais le chemin qui a cassé.
const slotBidon = (id) => ({
  slotId: id,
  source: `export function runSlot(entrees: { valeur?: string }): { resultat: string } {\n  return { resultat: String(entrees.valeur ?? "") };\n}\n`,
  authorId: "gate",
});

console.log("═".repeat(78));
console.log("GATE RACINE — l'application émise COMPILE-T-ELLE ?");
console.log("═".repeat(78));
console.log("\n  document                 fichiers   slots   tsc");
console.log("  " + "─".repeat(72));

let echecs = 0;
for (const [nom, chemin, transformer] of docs) {
  // Un document devenu INVALIDE ne doit pas faire planter la gate : elle le
  // RAPPORTE. Un plantage masque l'information au lieu de la donner.
  let air;
  try {
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
  const slots = air.slots.map((s) => slotBidon(s.id));
  let c;
  try { c = compileProject(air, undefined, slots.length > 0 ? { slots } : undefined); }
  catch (e) { console.log(`  ${nom.padEnd(24)} 🔴 COMPILATION REFUSÉE : ${String(e.message).slice(0, 40)}`); echecs++; continue; }

  const dir = OUT + nom + "/";
  for (const [f, contenu] of c.files) {
    const p = dir + f;
    mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true });
    writeFileSync(p, contenu);
  }
  symlinkSync(BASE, dir + "node_modules", "dir");

  let verdict = "🟢 EXIT=0";
  try {
    execFileSync("npx", ["tsc", "--noEmit"], { cwd: dir, stdio: "pipe", timeout: 180000 });
  } catch (e) {
    const sortie = String(e.stdout ?? "") + String(e.stderr ?? "");
    const lignes = sortie.split("\n").filter((l) => l.includes("error TS"));
    // Si `tsc` n'a produit AUCUNE erreur TS, c'est qu'il n'a pas tourné : on
    // publie sa sortie brute, sinon l'échec serait indéchiffrable à distance.
    verdict =
      lignes.length > 0
        ? `🔴 ${lignes.length} erreur(s) — ${lignes[0]?.slice(0, 60) ?? ""}`
        : `🔴 tsc n'a pas abouti — ${sortie.trim().split("\n").slice(0, 2).join(" | ").slice(0, 120)}`;
    echecs++;
  }
  console.log(`  ${nom.padEnd(24)} ${String(c.files.size).padStart(6)}  ${String(slots.length).padStart(5)}   ${verdict}`);
}
console.log(`\n  ${docs.length - echecs}/${docs.length} applications compilent.`);
process.exitCode = echecs === 0 ? 0 : 1;
