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
const { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, symlinkSync } =
  await import("node:fs");
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
// ── LES DEUX PILES, DEBOUT, SUR LE MÊME DOCUMENT.
//
// Le document choisit la sienne ; ses REFUS, eux, n'en dépendent pas. Et
// « compile » n'a jamais voulu dire « marche » : c'est tout l'objet de cette
// gate-ci. Mesurer une seule pile aurait laissé l'autre non démarrée.
// Une pile, et la BASE sur laquelle on la démarre. Le serveur Node sait
// parler à deux moteurs ; n'en démarrer qu'un laissait l'autre chemin
// inexécuté — du code qui compile et que personne n'a vu tourner.
const PILES = [
  { pile: "spring_boot", base: "h2" },
  { pile: "fastify", base: "sqlite" },
  { pile: "fastify", base: "postgres" },
];

const essais = [];
const dire = (ok, quoi, detail = "") => {
  essais.push(ok);
  console.log(`  ${ok ? "🟢" : "🔴"} ${quoi}${detail === "" ? "" : " — " + detail}`);
};

// ── UNE RÈGLE AJOUTÉE PAR CETTE GATE, ET POURQUOI.
//
// Le corpus est GELÉ, et le document de référence ne déclare aucune règle de
// VALIDATION — seulement des règles d'autorisation, que ce contrat ne peut
// pas faire respecter. La gate en ajoute donc une, ici et nulle part
// ailleurs, pour éprouver le MÉCANISME sur un vrai serveur démarré.
//
// Les 160 règles réelles du corpus, elles, sont éprouvées par la gate de
// COMPILATION, qui les traverse toutes sur 31 documents.
//
// Le seuil est choisi pour que les autres preuves restent valides : les
// lignes qu'elles écrivent portent 0 et 1234,5, toutes deux ≥ 0.
const REGLE_GATE = "rule_gate_minimum";
const entiteReglee = air.entities.find(
  (e) =>
    e.appendOnly !== true &&
    e.fields.some((f) => f.transitions !== undefined) &&
    e.fields.some(
      (f) =>
        (f.type === "decimal" || f.type === "number") &&
        f.derived === undefined &&
        f.sensitive !== true,
    ),
);
const champRegle = entiteReglee?.fields.find(
  (f) =>
    (f.type === "decimal" || f.type === "number") && f.derived === undefined && f.sensitive !== true,
);
if (entiteReglee !== undefined && champRegle !== undefined) {
  air.rules.push({
    id: REGLE_GATE,
    kind: "validation",
    entityId: entiteReglee.id,
    description: `« ${champRegle.name} » ne peut pas être négatif`,
    assertions: [{ fieldId: champRegle.id, operator: "gte", value: 0 }],
  });
}

// ── UNE RÈGLE DE VISIBILITÉ, AJOUTÉE PAR CETTE GATE.
//
// Même raison que la règle de validation : le corpus est gelé et le document
// de référence ne déclare AUCUNE règle. Les 39 règles réelles du corpus sont
// éprouvées par la gate de compilation ; celle-ci éprouve le MÉCANISME sur un
// serveur démarré — ce que « compile » ne dira jamais.
//
// L'état exclu est choisi hors des transitions écrites par les autres
// preuves, pour ne pas leur retirer leurs lignes sous les pieds.
const REGLE_VISIBILITE = "rule_gate_visibilite";
const ETAT_CACHE = "TERMINEE";
const champEtatCache = entiteReglee?.fields.find(
  (f) => f.transitions !== undefined && (f.enumValues ?? []).includes(ETAT_CACHE),
);
if (entiteReglee !== undefined && champEtatCache !== undefined) {
  air.rules.push({
    id: REGLE_VISIBILITE,
    kind: "authorization",
    entityId: entiteReglee.id,
    description: `une ${entiteReglee.name} ${ETAT_CACHE} n'apparaît pas dans la liste`,
    assertions: [{ fieldId: champEtatCache.id, operator: "neq", value: ETAT_CACHE }],
  });
}

console.log("═".repeat(78));
console.log("GATE RACINE — les SERVEURS générés RÉPONDENT-ILS ?");
console.log("═".repeat(78));

for (const [rang, { pile, base }] of PILES.entries()) {
  const estNode = pile === "fastify";
  // Un port par pile : un serveur tué laisse son port en attente un moment,
  // et la pile suivante le trouverait occupé.
  const port = PORT + rang;
  const { files } = compileBackend(
      pile === air.backend?.stack ? air : { ...air, backend: { ...air.backend, stack: pile } },
    );
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

  console.log("\n" + "─".repeat(78));
    console.log(`  PILE « ${pile} » sur « ${base} » — port ${String(port)}`);
    console.log("─".repeat(78));

    // ── DÉMARRER NODE N'EST PAS DÉMARRER JAVA.
    //
    // Maven résout ses dépendances et lance le serveur. Côté Node, on exécute
    // la source TELLE QUELLE : ce runtime retire les types lui-même — rien à
    // installer, et une preuve de plus : le code émis tourne sur Node nu. Il
    // lui faut seulement `node_modules`, EMPRUNTÉ à la racine comme le fait
    // la gate de compilation — une gate qui télécharge ne mesure plus le
    // code, elle mesure le réseau.
    //
    // DB_FICHIER met la base SQLite dans le dossier de la gate, effacé à
    // chaque tir. Rien d'autre : le serveur émis ouvre sa base et applique son
    // schéma tout seul. C'est une VRAIE persistance SQL — la ligne relue
    // revient de la base, pas d'une mémoire de processus, et c'est ce qui rend
    // le refus de réécriture du journal réellement probant.
    if (estNode) symlinkSync(join(R, "node_modules"), OUT + "node_modules", "dir");

    // ── UN VRAI POSTGRES, SANS DOCKER NI SERVEUR INSTALLÉ.
    //
    // PGlite est Postgres compilé en WebAssembly : même moteur SQL, même
    // protocole réseau. Son serveur de socket écoute, et le serveur émis s'y
    // connecte avec le VRAI client `pg` — c'est tout le chemin Postgres qui
    // s'exécute enfin, ici comme sur le CI, sur Mac comme sur Linux.
    //
    // Ce que ça NE prouve pas, et qu'il faut dire : ni SSL, ni extensions, ni
    // pool de connexions d'une base hébergée. Le SQL et le protocole, oui.
    let pgl;
    let socketPg;
    let dbUrl = "";
    if (base === "postgres") {
      const { PGlite } = await import(R + "node_modules/@electric-sql/pglite/dist/index.js");
      const { PGLiteSocketServer } = await import(
        R + "node_modules/@electric-sql/pglite-socket/dist/index.js"
      );
      pgl = await PGlite.create();
      socketPg = new PGLiteSocketServer({ db: pgl, port: port + 100, host: "127.0.0.1" });
      await socketPg.start();
      dbUrl = `postgres://postgres@127.0.0.1:${String(port + 100)}/postgres`;
      console.log(`  base    : PostgreSQL réel (WebAssembly) sur ${String(port + 100)}`);
    }
    const serveur = estNode
      ? spawn(process.execPath, ["src/serveur.ts"], {
          cwd: OUT,
          env: {
          ...process.env,
          PORT: String(port),
          DB_FICHIER: OUT + "donnees.sqlite",
          ...(dbUrl === "" ? {} : { DB_URL: dbUrl }),
        },
          stdio: ["ignore", "pipe", "pipe"],
          detached: true,
        })
      : spawn(MVN, ["-B", "-q", "spring-boot:run"], {
          cwd: OUT,
          env: { ...process.env, JAVA_HOME: JAVA.replace(/\/bin\/java$/, ""), PORT: String(port) },
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

  const B = `http://localhost:${String(port)}/air/v1/entities`;
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
      // ── UN CALCUL, DEUX ISSUES LÉGITIMES, ET UNE SEULE INTERDITE.
      //
      // Si la clé qui relie l'enfant au parent se résout, le serveur doit
      // rendre un NOMBRE. Si elle est indécidable — deux champs vers le même
      // parent — il doit refuser en SE NOMMANT dans X-Air-Non-Calcule, et la
      // ligne doit rester lisible. Ce qui est interdit, c'est de rendre zéro
      // en silence : une cagnotte à zéro ressemble à une cagnotte vide.
      const calcule = avecEtats.fields.find((f) => f.derived !== undefined);
      if (calcule !== undefined) {
        const lu = await fetch(`${B}/${avecEtats.id}/rows`);
        const entete = lu.headers.get("X-Air-Non-Calcule") ?? "";
        const rows = lu.ok ? await lu.json() : [];
        const g2 = rows.find((x) => x.id === "gate2");
        const v = g2?.values?.[calcule.name];
        const nomme = entete.includes(calcule.name);
        dire(
          lu.ok && (typeof v === "number" || nomme),
          nomme
            ? "un calcul INDÉCIDABLE laisse la ligne lisible et se NOMME"
            : "un calcul se fait vraiment et rend un NOMBRE",
          `HTTP ${String(lu.status)} · ${calcule.name} = ${JSON.stringify(v)} (${typeof v})` +
            ` · X-Air-Non-Calcule: ${entete || "(absent)"}`,
        );
      }

      // ── LA SOMME DOIT ÊTRE LA BONNE, PAS SEULEMENT UN NOMBRE.
      //
      // Une fonction qui rendrait TOUJOURS zéro passait la preuve ci-dessus.
      // On écrit donc deux lignes enfant de montants connus, et on exige le
      // total exact. C'est la seule façon de distinguer « ça calcule » de
      // « ça rend zéro », et zéro est précisément la valeur qui trompe.
      const somme = avecEtats.fields.find((f) => f.derived?.kind === "sum");
      const relS = somme === undefined ? undefined : air.relations.find((r) => r.id === somme.derived.relationId);
      const enfant = relS === undefined ? undefined : air.entities.find((e) => e.id === relS.toEntityId);
      const cle = enfant?.fields.filter((f) => f.referencesEntityId === relS?.fromEntityId);
      const champSomme = enfant?.fields.find((f) => f.id === somme?.derived.fieldId);
      if (enfant !== undefined && cle?.length === 1 && champSomme !== undefined) {
        const montants = [250.5, 749.5];
        for (const [k, m] of montants.entries()) {
          const corps = { id: `gateS${String(k)}` };
          for (const f of enfant.fields) {
            if (f.required !== true || f.derived !== undefined || f.sensitive === true) continue;
            corps[f.name] =
              f.id === cle[0].id
                ? "gate2"
                : f.id === champSomme.id
                  ? m
                  : f.type === "datetime"
                    ? "2026-01-01T00:00:00Z"
                    : f.type === "decimal" || f.type === "number"
                      ? 0
                      : f.type === "boolean"
                        ? false
                        : (f.enumValues ?? ["x"])[0];
          }
          corps[cle[0].name] = "gate2";
          corps[champSomme.name] = m;
          await fetch(`${B}/${enfant.id}/rows`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(corps),
          });
        }
        const attendu = montants.reduce((t, m) => t + m, 0);
        const relu = await fetch(`${B}/${avecEtats.id}/rows`);
        const parents = relu.ok ? await relu.json() : [];
        const obtenu = parents.find((x) => x.id === "gate2")?.values?.[somme.name];
        const entete = relu.headers.get("X-Air-Non-Calcule") ?? "";
        dire(
          obtenu === attendu || entete.includes(somme.name),
          entete.includes(somme.name)
            ? `la somme INDÉCIDABLE se nomme au lieu de rendre zéro (« ${somme.name} »)`
            : `la somme est EXACTE (« ${somme.name} » = ${String(attendu)})`,
          `obtenu ${JSON.stringify(obtenu)} sur ${String(montants.length)} ligne(s) de « ${enfant.name} »`,
        );
      }

      // ── UNE RÈGLE DU DOCUMENT DOIT MORDRE SUR LE SERVEUR.
      //
      // L'écran la vérifie aussi, mais une vérification côté écran ne protège
      // de rien : la route s'appelle directement. Et le refus doit NOMMER la
      // règle — « 422 » sans dire laquelle laisse l'appelant deviner.
      if (entiteReglee?.id === avecEtats.id && champRegle !== undefined) {
        const r = await fetch(`${B}/${avecEtats.id}/rows`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: "gateR", [champRegle.name]: -1 }),
        });
        const corps = r.status === 422 ? await r.json() : {};
        dire(
          r.status === 422 && corps.regle === REGLE_GATE,
          `une règle du document est FAITE RESPECTER par le serveur (« ${champRegle.name} » ≥ 0)`,
          `HTTP ${String(r.status)} · règle ${JSON.stringify(corps.regle ?? null)}`,
        );
      }

      // ── CE QUE LE SERVEUR N'A PAS LE DROIT D'EXPOSER, IL NE L'EXPOSE PAS.
      //
      // Mesuré le 2026-10-12 : le serveur rendait TOUTES les lignes. « Seul un
      // bien publié et non archivé peut apparaître dans la liste » — et la
      // liste rendait les archivés. Ce n'est pas un manque, c'est une fuite.
      if (champEtatCache !== undefined && entiteReglee?.id === avecEtats.id) {
        await fetch(`${B}/${avecEtats.id}/rows`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: "gateV", [champEtatCache.name]: ETAT_CACHE }),
        });
        const lu = await fetch(`${B}/${avecEtats.id}/rows`);
        const vues = lu.ok ? await lu.json() : [];
        const ids = vues.map((x) => x.id);
        dire(
          lu.ok && !ids.includes("gateV") && ids.includes("gate2"),
          `une ligne ${ETAT_CACHE} est ÉCRITE mais N'APPARAÎT PAS dans la liste`,
          `HTTP ${String(lu.status)} · lignes vues ${JSON.stringify(ids)}`,
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
    // ── LE TYPE D'UNE VALEUR NE DOIT PAS DÉPENDRE DU MOTEUR.
    //
    // Mesuré le 2026-10-11, dès le premier vrai démarrage sur Postgres : un
    // `numeric` revient en TEXTE ("99"), là où SQLite rend un nombre — et le
    // modèle émis déclare `number`. Une application branchée sur la vraie
    // base recevrait "5000" au lieu de 5000. Rien ne pouvait le voir sans
    // exécuter les deux moteurs.
    const estNombre = (f) =>
      (f.type === "decimal" || f.type === "number") &&
      f.derived === undefined &&
      f.sensitive !== true;
    const entN = air.entities.find(
      (e) => e.appendOnly !== true && e.fields.some(estNombre),
    );
    const champN = entN?.fields.find(estNombre);
    if (entN !== undefined && champN !== undefined) {
      const corps = { id: "gate3" };
      for (const f of entN.fields) {
        if (f.required !== true || f.derived !== undefined || f.sensitive === true) continue;
        corps[f.name] =
          f.name === champN.name
            ? 1234.5
            : f.type === "datetime"
              ? "2026-01-01T00:00:00Z"
              : f.type === "decimal" || f.type === "number"
                ? 0
                : f.type === "boolean"
                  ? false
                  : (f.enumValues ?? ["x"])[0];
      }
      corps[champN.name] = 1234.5;
      const ecrit = await fetch(`${B}/${entN.id}/rows`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corps),
      });
      const relu = await fetch(`${B}/${entN.id}/rows`);
      const lignesLues = ecrit.ok && relu.ok ? await relu.json() : [];
      const ligne = lignesLues.find((x) => x.id === "gate3");
      // La ligne est `{ id, values }` : les champs vivent sous `values`.
      const valeur = ligne?.values?.[champN.name];
      dire(
        typeof valeur === "number",
        `un nombre revient en NOMBRE, pas en texte (« ${champN.name} »)`,
        `reçu ${JSON.stringify(valeur)} (${typeof valeur}) · écriture HTTP ${String(ecrit.status)}` +
          (typeof valeur === "number"
            ? ""
            : ` · ${String(lignesLues.length)} ligne(s) · ${JSON.stringify(lignesLues[0] ?? null).slice(0, 300)}`),
      );
    }

  } catch (e) {
    dire(false, "la gate n'a pas abouti", String(e instanceof Error ? e.message : e).slice(0, 80));
  } finally {
    arreter();
    if (socketPg !== undefined) await socketPg.stop();
    if (pgl !== undefined) await pgl.close();
  }

}

const ko = essais.filter((x) => !x).length;
console.log(`\n  ${String(essais.length - ko)}/${String(essais.length)} preuves tenues.`);
process.exitCode = ko === 0 && essais.length >= 33 ? 0 : 1;
