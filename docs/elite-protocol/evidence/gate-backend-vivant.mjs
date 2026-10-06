// GATE RACINE — LE SERVEUR GÉNÉRÉ RÉPOND-IL, ET SES REFUS MORDENT-ILS ?
//
// ── LA JUMELLE DE `gate:backend`, ET POURQUOI ELLE EXISTE.
//
// `gate:backend` COMPILE. Il ne démarre rien. Or ce dépôt connaît par cœur le
// défaut « compile et ne marche pas » : le modèle d'accès 1.28.0 était émis et
// INERTE, `navigate` jetait ses paramètres, la tontine affichait zéro donnée.
// Les trois compilaient.
//
// Mesuré à la première exécution de cette gate-ci : une ligne portant un champ
// CALCULÉ était enregistrée puis ILLISIBLE — `Calculs` lève tant que le
// propriétaire ne l'a pas écrit, et l'exception remontait en 500. Le serveur
// compilait parfaitement. Seul un vrai démarrage le dit.
//
// ── CE QU'ELLE PROUVE, PAR HTTP ET NON PAR LECTURE DE CODE.
//
// ① le serveur DÉMARRE et sert la collection d'une entité ;
// ② un JOURNAL refuse la réécriture (409) et l'effacement (409) ;
// ③ une transition DÉCLARÉE est acceptée (200) ;
// ④ une transition NON déclarée est refusée (409) ;
// ⑤ un calcul non écrit n'explose pas : le champ est absent et l'en-tête
//    `X-Air-Non-Calcule` le nomme.
//
// ③ ET ④ ENSEMBLE, jamais l'un sans l'autre : une gate qui refuserait tout
// passerait sans rien prouver.
//
// ── CE QU'ELLE NE PROUVE PAS.
//
// 🟠 Les règles d'ARGENT. `ReglesMetier` lève par construction : séquestre,
//    tour, pénalités, répartition, enchères appartiennent au propriétaire. Les
//    tester reviendrait à les avoir écrites à sa place.
const { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
const { execFileSync, spawn } = await import("node:child_process");
const { tmpdir } = await import("node:os");
const { join } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const R = join(fileURLToPath(import.meta.url), "..", "..", "..", "..") + "/";
const { outillageJava } = await import(R + "docs/elite-protocol/evidence/outillage-java.mjs");
const { migrateAirDocument, assertValidAir } = await import(R + "packages/air-schema/src/index.ts");
const { compileBackend } = await import(R + "packages/compiler/src/index.ts");

const PORT = 8099; // hors du port de développement, pour ne rien bousculer
const OUT = join(tmpdir(), "deribfy-gate-backend-vivant") + "/";
const DOC = R + "slices/tontine/tontine.air.json";

const outillage = outillageJava(21);
console.log(outillage.lignes.join("\n"));
if (!outillage.ok) {
  console.error(`\n  🔴 ${outillage.motif}`);
  console.error("     macOS :  /opt/homebrew/bin/brew install openjdk maven");
  console.error("     CI    :  actions/setup-java@v4 avec java-version: 21");
  process.exit(2);
}
const { java: JAVA, mvn: MVN } = outillage;
if (!existsSync(DOC)) {
  console.error("  🔴 document de référence absent :", DOC);
  process.exit(2);
}

const air = assertValidAir(migrateAirDocument(JSON.parse(readFileSync(DOC, "utf8"))));
const { files } = compileBackend(air);
if (files.size === 0) {
  console.error("  🔴 ce document n'émet aucun serveur — rien à démarrer.");
  process.exit(2);
}
rmSync(OUT, { recursive: true, force: true });
for (const [f, c] of files) {
  const p = OUT + f;
  mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true });
  writeFileSync(p, c);
}

console.log("═".repeat(78));
console.log("GATE RACINE — le SERVEUR généré RÉPOND-IL ?");
console.log("═".repeat(78));

const serveur = spawn(MVN, ["-B", "-q", "spring-boot:run"], {
  cwd: OUT,
  env: { ...process.env, JAVA_HOME: JAVA.replace(/\/bin\/java$/, ""), PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
let journal = "";
serveur.stdout.on("data", (d) => (journal += String(d)));
serveur.stderr.on("data", (d) => (journal += String(d)));

const arreter = () => {
  try {
    process.kill(-serveur.pid, "SIGKILL");
  } catch {
    /* déjà mort */
  }
};

const B = `http://localhost:${String(PORT)}/air/v1/entities`;
const attendre = async () => {
  // 240 s : un premier démarrage télécharge Spring Boot ET compile. Sur une
  // machine de développement c'est 45 s ; sur un runner partagé au cache vide,
  // bien plus. Un délai trop court ferait accuser le serveur de ne pas démarrer
  // alors qu'il téléchargeait encore — un faux rouge vaut un faux vert.
  for (let i = 0; i < 240; i += 1) {
    try {
      const r = await fetch(`${B}/${air.entities[0].id}/rows`);
      if (r.ok) return true;
    } catch {
      /* pas encore */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

const essais = [];
const dire = (ok, quoi, detail = "") => {
  essais.push(ok);
  console.log(`  ${ok ? "🟢" : "🔴"} ${quoi}${detail === "" ? "" : " — " + detail}`);
};

try {
  const debout = await attendre();
  dire(debout, "le serveur DÉMARRE et sert une collection");
  if (!debout) {
    console.error("\n" + journal.split("\n").slice(-25).join("\n"));
    throw new Error("serveur injoignable");
  }

  // ── LE JOURNAL. L'entité `appendOnly` du document, quelle qu'elle soit.
  const journalEnt = air.entities.find((e) => e.appendOnly === true);
  if (journalEnt !== undefined) {
    const requis = Object.fromEntries(
      journalEnt.fields
        .filter((f) => f.required === true && f.derived === undefined && f.sensitive !== true)
        .map((f) => [
          f.name,
          f.type === "datetime"
            ? "2026-01-01T00:00:00Z"
            : f.type === "decimal" || f.type === "number"
              ? "0"
              : f.type === "boolean"
                ? "false"
                : (f.enumValues ?? ["x"])[0],
        ]),
    );
    const creer = await fetch(`${B}/${journalEnt.id}/rows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "gate1", ...requis }),
    });
    dire(creer.ok, "une ligne de journal se CRÉE", `HTTP ${String(creer.status)}`);
    const rejouer = await fetch(`${B}/${journalEnt.id}/rows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "gate1", ...requis }),
    });
    dire(rejouer.status === 409, "le journal REFUSE la réécriture", `HTTP ${String(rejouer.status)}`);
    const effacer = await fetch(`${B}/${journalEnt.id}/rows/gate1`, { method: "DELETE" });
    dire(effacer.status === 409, "le journal REFUSE l'effacement", `HTTP ${String(effacer.status)}`);
  }

  // ── LES TRANSITIONS. L'acceptation ET le refus, jamais l'un seul.
  const avecEtats = air.entities.find((e) => e.fields.some((f) => f.transitions !== undefined));
  const champEtat = avecEtats?.fields.find((f) => f.transitions !== undefined);
  if (avecEtats !== undefined && champEtat !== undefined) {
    const t0 = (champEtat.transitions ?? [])[0];
    const requis = Object.fromEntries(
      avecEtats.fields
        .filter((f) => f.required === true && f.derived === undefined && f.sensitive !== true)
        .map((f) => [
          f.name,
          f.name === champEtat.name
            ? t0.from
            : f.type === "datetime"
              ? "2026-01-01T00:00:00Z"
              : f.type === "decimal" || f.type === "number"
                ? "0"
                : f.type === "boolean"
                  ? "false"
                  : (f.enumValues ?? ["x"])[0],
        ]),
    );
    const creer = await fetch(`${B}/${avecEtats.id}/rows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "gate2", ...requis }),
    });
    dire(creer.ok, `une ligne à états se CRÉE (${t0.from})`, `HTTP ${String(creer.status)}`);

    // ── LE CALCUL NON ÉCRIT NE DOIT PAS RENDRE LA LIGNE ILLISIBLE.
    const calcule = avecEtats.fields.find((f) => f.derived !== undefined);
    if (calcule !== undefined) {
      const lu = await fetch(`${B}/${avecEtats.id}/rows`);
      const entete = lu.headers.get("X-Air-Non-Calcule") ?? "";
      dire(
        lu.ok && entete.includes(calcule.name),
        "un calcul NON ÉCRIT laisse la ligne lisible et se NOMME",
        `HTTP ${String(lu.status)} · X-Air-Non-Calcule: ${entete || "(absent)"}`,
      );
    }

    const legal = await fetch(`${B}/${avecEtats.id}/rows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "gate2", [champEtat.name]: t0.to }),
    });
    dire(legal.ok, `la transition DÉCLARÉE est acceptée (${t0.from} → ${t0.to})`, `HTTP ${String(legal.status)}`);

    const illegal = await fetch(`${B}/${avecEtats.id}/rows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "gate2", [champEtat.name]: t0.from }),
    });
    dire(
      illegal.status === 409,
      `la transition NON déclarée est refusée (${t0.to} → ${t0.from})`,
      `HTTP ${String(illegal.status)}`,
    );
  }
} catch (e) {
  dire(false, "la gate n'a pas abouti", String(e instanceof Error ? e.message : e).slice(0, 80));
} finally {
  arreter();
}

const ko = essais.filter((x) => !x).length;
console.log(`\n  ${String(essais.length - ko)}/${String(essais.length)} preuves tenues.`);
process.exitCode = ko === 0 && essais.length >= 5 ? 0 : 1;
