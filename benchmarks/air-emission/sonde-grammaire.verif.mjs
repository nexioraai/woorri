// ============================================================
// LA SONDE, EPROUVEE CONTRE UN SERVICE SIMULE — a cout NUL.
//
// Ce qu'on veut prouver n'est pas « elle trouve un niveau qui passe » : la
// descente jusqu'au plus degrade le ferait aussi, et perdrait des garanties
// pour rien. On veut qu'elle retienne LE PLUS CONTRAINT QUI PASSE.
//
// Le service est simule ICI, et c'est legitime : ce qui est juge est la
// DECISION de la sonde face a des reponses connues, pas le service. Les
// vraies reponses du service, elles, ont ete mesurees separement — trois
// tirs par niveau, et c'est cette mesure qui a motive la sonde.
// ============================================================

import { creerSondeGrammaire } from "./sonde-grammaire.mjs";

let echecs = 0;
const verifie = (nom, condition, detail = "") => {
  if (condition) { console.log(`  ✅ ${nom}`); return; }
  console.error(`  🔴 ${nom}${detail === "" ? "" : ` — ${detail}`}`);
  echecs += 1;
};

const adaptateurFactice = {
  construireAppelCampagne: (requete, reglages) => ({ ...requete, ...reglages }),
};

/** Un service qui accepte les schemas nommes, et refuse tous les autres. */
const service = (acceptes, journal = []) => ({
  messages: {
    create: async (appel) => {
      journal.push(appel.grammaire.nom);
      if (!acceptes.includes(appel.grammaire.nom)) throw new Error("refus simule");
      return { ok: true };
    },
  },
});

const passe = (nom, niveaux) => ({
  name: nom,
  levels: niveaux.map((n) => ({ name: n, schema: { nom: n } })),
  levelIndex: 0,
});

// ── ① LE PLUS CONTRAINT QUI PASSE, pas le plus degrade.
{
  const p = passe("entites", ["strict", "moyen", "degrade"]);
  const appels = [];
  const s = creerSondeGrammaire({ client: service(["moyen", "degrade"], appels), adaptateur: adaptateurFactice });
  const r = await s.sonder([p]);
  verifie("le niveau MOYEN est retenu, pas le degrade",
    r[0].niveau === 1 && r[0].nom === "moyen", JSON.stringify(r[0]));
  verifie("`levelIndex` est positionne sur ce niveau", p.levelIndex === 1);
  verifie("le niveau degrade n'a meme pas ete essaye",
    !appels.includes("degrade"), appels.join(", "));
}

// ── ② UN NIVEAU STRICT QUI PASSE N'EST JAMAIS ABANDONNE.
{
  const p = passe("donnees", ["strict", "moyen", "degrade"]);
  const appels = [];
  const s = creerSondeGrammaire({ client: service(["strict", "moyen", "degrade"], appels), adaptateur: adaptateurFactice });
  const r = await s.sonder([p]);
  verifie("rien n'est degrade quand le strict passe", r[0].niveau === 0 && p.levelIndex === 0);
  verifie("un seul essai a suffi", appels.length === 1, appels.join(", "));
}

// ── ③ UN ECHEC PASSAGER NE FAIT PAS DESCENDRE D'UN CRAN.
//
// C'est la garde qui empeche la sonde de devenir le « refus silencieux »
// qu'on a ecarte : un delai reseau ordinaire ne doit pas coûter une
// garantie de grammaire.
{
  const p = passe("base", ["strict", "degrade"]);
  let premier = true;
  const client = {
    messages: {
      create: async (appel) => {
        if (appel.grammaire.nom === "strict" && premier) { premier = false; throw new Error("delai passager"); }
        return { ok: true };
      },
    },
  };
  const s = creerSondeGrammaire({ client, adaptateur: adaptateurFactice, tentativesParNiveau: 2 });
  const r = await s.sonder([p]);
  verifie("le strict est retenu malgre un premier echec", r[0].niveau === 0, JSON.stringify(r[0]));
}

// ── ④ AUCUN NIVEAU ACCEPTE : on ne choisit rien, et on le DIT.
{
  const p = passe("actions", ["strict", "degrade"]);
  p.levelIndex = 0;
  const s = creerSondeGrammaire({ client: service([]), adaptateur: adaptateurFactice });
  const r = await s.sonder([p]);
  verifie("niveau `null` rendu, et `levelIndex` laisse intact",
    r[0].niveau === null && p.levelIndex === 0);
}

// ── ⑤ LES PASSES SONT SONDEES EN PARALLELE.
{
  const passes = ["a", "b", "c", "d"].map((n) => passe(n, ["seul"]));
  let enCours = 0, maxSimultane = 0;
  const client = {
    messages: {
      create: async () => {
        enCours += 1; maxSimultane = Math.max(maxSimultane, enCours);
        await new Promise((r) => setTimeout(r, 20));
        enCours -= 1;
        return { ok: true };
      },
    },
  };
  const s = creerSondeGrammaire({ client, adaptateur: adaptateurFactice });
  await s.sonder(passes);
  verifie("les quatre passes sondent en meme temps",
    maxSimultane === 4, `maximum simultane observe : ${String(maxSimultane)}`);
}

// ── ⑥ AUCUN TEXTE D'ERREUR N'EST LU — l'interdit du depot.
{
  const src = (await import("node:fs")).readFileSync(
    new URL("./sonde-grammaire.mjs", import.meta.url), "utf8",
  );
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const interdit of ["e.message", "error.message", ".status", "too large", "too complex", "/4\\d\\d/"]) {
    verifie(`la sonde ne lit pas « ${interdit} »`, !code.includes(interdit));
  }
}

console.log(echecs === 0 ? "\n✅ sonde de grammaire : elle retient le plus contraint qui passe." : `\n🔴 ${String(echecs)} controle(s) en echec.`);
process.exit(echecs === 0 ? 0 : 1);
