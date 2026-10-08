// ============================================================
// LA CONTINUATION, EPROUVEE A BLANC — machinerie correcte, RIEN DE PLUS.
//
// ── CE QUE CE FICHIER PROUVE, ET CE QU'IL NE PROUVE PAS.
//
// Il prouve la MACHINERIE : suspension entre deux appels, reprise depuis un
// etat serialise, rien de paye re-paye (P0, sonde, passes acquises),
// equivalence avec l'emission d'un trait. Il ne prouve PAS la production :
// le service est SIMULE, ses durees et ses refus reels n'existent pas ici.
// Un vert a blanc n'est pas un vert reel — le premier tir contre le vrai
// service appartient a l'etage travailleur, apres l'arbitrage de test.
//
// ── POURQUOI LES FIXTURES NE GUERISSENT PAS, ET CE QUE CA RETIRE.
//
// MESURE : aucun document des corpus v2/v3 ne passe les juges d'aujourd'hui
// nu — minimum 10 diagnostics (les juges ont durci depuis leur emission).
// Le client a blanc rend donc des reparations qui ne guerissent pas, et la
// sous-propriete « une section reparee avec succes n'est pas re-payee a la
// tranche suivante » n'est PAS prouvable ici : elle exige une reparation qui
// change le contenu, c'est-a-dire le vrai service. Ce qui est prouve a sa
// place : une suspension en pleine reparation reprend SANS re-emettre une
// seule passe, sans re-sonder, sans re-tirer P0.
//
// ── LES BUDGETS SONT CALIBRES, PAS DEVINES.
//
// Une course d'etalonnage (sans ralentissement) horodate chaque appel ; les
// budgets des scenarios se posent 400 ms APRES le debut mesure de l'appel
// qu'on veut voir en vol, et l'appel ralenti dure 2 500 ms : la coupure
// tombe DANS sa fenetre quelle que soit la gigue de la machine.
// ============================================================
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

let echecs = 0;
const verifie = (nom, condition, detail = "") => {
  if (condition) { console.log(`  ✅ ${nom}`); return; }
  console.error(`  🔴 ${nom}${detail === "" ? "" : ` — ${detail}`}`);
  echecs += 1;
};

// ── ⓪ LE MOTEUR NE CONNAIT AUCUNE BASE. « Sans ecrire de ligne reelle »
// est structurel, pas une precaution : c'est l'etage travailleur qui
// parlera a la table, jamais le moteur.
{
  const src = readFileSync(join(HERE, "moteur.mjs"), "utf8");
  verifie("⓪ aucun acces base dans le moteur", !/supabase/iu.test(src));
  verifie("⓪ `poursuivreEmission` est exposee", src.includes("poursuivreEmission, coeur"));
}

// ── LES FIXTURES.
//
// Le modele P0 passe les VRAIS juges (validerModele + plan) — forge par
// iteration contre eux, pas suppose. Le corpus est un document REEL,
// migre par le migrateur officiel du schema.
const MODELE = {
  version: "modele-metier/1.2.0",
  acteurs: [{ id: "act_client", nom: "Client" }],
  concepts: [{
    id: "ent_commande", nom: "Commande", donnees: true,
    attributs: [
      { id: "att_numero", nature: "texte", requis: true },
      { id: "att_montant", nature: "nombre", requis: false },
    ],
  }],
  relations: [],
  parcours: [{
    id: "par_suivi", besoin: "suivre sa commande", acteur: "act_client",
    etapes: [
      { concept: "ent_commande", geste: "decouvrir" },
      { concept: "ent_commande", geste: "choisir" },
      { concept: "ent_commande", geste: "consulter" },
    ],
  }],
  couverture: {
    couverts: [
      { terme: "commande", noeuds: ["ent_commande"] },
      { terme: "suivre", noeuds: ["par_suivi"] },
    ],
    nonRetenus: [],
  },
};
const BRIEF = "suivre sa commande dans le quartier";

/**
 * LE CLIENT A BLANC — la frontiere payante entiere, simulee.
 *
 * Il distingue ses reponses par la GRAMMAIRE de l'appel (les proprietes du
 * schema demande) et par les marqueurs de NOS PROPRES invites — jamais par
 * un texte d'erreur. Chaque appel est journalise avec son instant : c'est
 * ce journal qui porte les preuves.
 */
function creerClientABlanc({ corpus, lent = () => false, delaiMs = 8, delaiLentMs = 2500 }) {
  const journal = [];
  let screensServis = 0;
  return {
    journal,
    messages: {
      create: async (appel) => {
        const props = Object.keys(appel?.output_config?.format?.schema?.properties ?? {});
        const texteUser = String(appel?.messages?.[0]?.content ?? "");
        let type, corps;
        if (appel.max_tokens === 1) { type = "sonde"; corps = "{}"; }
        else if (props.includes("acteurs")) { type = "p0"; corps = JSON.stringify(MODELE); }
        else {
          type = texteUser.includes("SECTIONS À ÉMETTRE MAINTENANT") ? "emission" : "reparation";
          const tranche = {};
          for (const k of props) {
            if (k === "screens" && type === "emission") {
              // Les lots d'ecrans ACCUMULENT : servir le corpus deux fois
              // doublerait chaque ecran.
              tranche.screens = screensServis === 0 ? corpus.screens : [];
              screensServis += 1;
            } else {
              tranche[k] = corpus[k];
            }
          }
          corps = JSON.stringify(tranche);
        }
        const entree = { type, props: [...props].sort().join("+"), t: Date.now() };
        journal.push(entree);
        await new Promise((r) => setTimeout(r, lent(entree) ? delaiLentMs : delaiMs));
        return {
          content: [{ type: "text", text: corps }],
          stop_reason: "end_turn",
          usage: { input_tokens: 100, output_tokens: 50 },
        };
      },
    },
  };
}

const { creerMoteur } = await import(join(HERE, "moteur.mjs"));
const airSchema = await import(join(REPO, "packages/air-schema/src/index.ts"));
const CORPUS = airSchema.migrateAirDocument(
  JSON.parse(readFileSync(join(REPO, "packages/golden-corpus/corpus-v3/bus-intercites.air.json"), "utf8")),
);

const lancer = async ({ lent, budgetMs, etat } = {}) => {
  const client = creerClientABlanc({ corpus: CORPUS, lent });
  const m = await creerMoteur({ cleApi: "client-a-blanc", client });
  const r = await m.poursuivreEmission({
    brief: BRIEF, slug: "blanc",
    ...(etat === undefined ? {} : { etat }),
    ...(budgetMs === undefined ? {} : { budgetMs }),
  });
  return { r, journal: client.journal };
};
const types = (j, t) => j.filter((x) => x.type === t);
const sigs = (j, t) => types(j, t).map((x) => x.props);

// ── ETALONNAGE + PREUVE ④ : l'emission d'un trait, deux entrees, un resultat.
console.log("— etalonnage (course a blanc, sans ralentissement) —");
const C = await lancer({});
const t0 = C.journal[0].t;
const rel = (entree) => entree.t - t0;
{
  verifie("④ la course a blanc TERMINE (fini: true)", C.r.fini === true);
  const client2 = creerClientABlanc({ corpus: CORPUS });
  const m2 = await creerMoteur({ cleApi: "client-a-blanc", client: client2 });
  const direct = await m2.emettreApplication({ brief: BRIEF, slug: "blanc" });
  verifie("④ `emettreApplication` ≡ `poursuivreEmission(∞)` — document octet pour octet",
    JSON.stringify(direct.document) === JSON.stringify(C.r.resultat.document));
  verifie("④ memes diagnostics, meme issue, meme cout",
    direct.ok === C.r.resultat.ok &&
    direct.coutUsd === C.r.resultat.coutUsd &&
    JSON.stringify(direct.diagnostics) === JSON.stringify(C.r.resultat.diagnostics));
}

// ── ① SUSPENSION A LA FRONTIERE, ET JAMAIS PENDANT UN APPEL.
console.log("— scenario A : coupure en pleine emission —");
const socleEntree = types(C.journal, "emission")[1];
const A1 = await lancer({
  lent: (e) => e.type === "emission" && e.props === socleEntree.props,
  budgetMs: rel(socleEntree) + 400,
});
{
  verifie("① suspendu, raison budget_temps", A1.r.fini === false && A1.r.raison === "budget_temps");
  verifie("① phase `emission`, prochaine etape nommee",
    A1.r.etat.phase === "emission" && typeof A1.r.etape === "string" && A1.r.etape !== "emission",
    `etape=${String(A1.r.etape)}`);
  verifie("① l'appel EN VOL (socle, ralenti a 2,5 s) a ETE TERMINE, pas interrompu : son resultat est dans l'etat",
    socleEntree.props.split("+").every((k) => A1.r.etat.acquis[k] !== undefined));
  verifie("① deux passes emises exactement avant la coupure",
    sigs(A1.journal, "emission").length === 2 && types(A1.journal, "reparation").length === 0);
  verifie("① le budget zero suspend AVANT le moindre appel",
    await (async () => { const z = await lancer({ budgetMs: 0 }); return z.r.fini === false && z.r.etat.phase === "p0" && z.journal.length === 0; })());
}

// ── ③ L'ETAT FAIT L'ALLER-RETOUR JSON — c'est lui qui ira en `jsonb`.
const etatRond = JSON.parse(JSON.stringify(A1.r.etat));
verifie("③ l'etat survit a JSON sans perte", JSON.stringify(etatRond) === JSON.stringify(A1.r.etat));

// ── ② et ⑥ : LA REPRISE NE RE-PAIE RIEN — ni P0, ni sonde, ni passe acquise.
console.log("— scenario A, tranche 2 : reprise depuis l'etat serialise —");
const A2 = await lancer({ etat: etatRond });
{
  verifie("② la reprise TERMINE", A2.r.fini === true);
  verifie("② ZERO tirage P0 dans la tranche 2", types(A2.journal, "p0").length === 0);
  verifie("⑥ ZERO sondage dans la tranche 2 — les niveaux voyagent dans l'etat",
    types(A2.journal, "sonde").length === 0);
  verifie("② tranche 1 + tranche 2 = CHAQUE passe emise UNE fois, dans l'ordre de la course d'etalonnage",
    JSON.stringify([...sigs(A1.journal, "emission"), ...sigs(A2.journal, "emission")]) ===
      JSON.stringify(sigs(C.journal, "emission")));
  verifie("② le document final est IDENTIQUE a celui d'un trait — la suspension ne change pas l'oeuvre",
    JSON.stringify(A2.r.resultat.document) === JSON.stringify(C.r.resultat.document));
  verifie("② le cout cumule est celui d'un trait — rien paye deux fois",
    A2.r.resultat.coutUsd === C.r.resultat.coutUsd,
    `${String(A2.r.resultat.coutUsd)} vs ${String(C.r.resultat.coutUsd)}`);
}

// ── ⑤ SUSPENSION EN PLEINE REPARATION.
console.log("— scenario B : coupure pendant la reparation —");
const premiereRep = types(C.journal, "reparation")[0];
const B1 = await lancer({
  lent: (e) => e.type === "reparation",
  budgetMs: rel(premiereRep) + 400,
});
{
  verifie("⑤ suspendu en phase `reparation`", B1.r.fini === false && B1.r.etat.phase === "reparation");
  verifie("⑤ l'emission etait COMPLETE avant la coupure",
    sigs(B1.journal, "emission").length === sigs(C.journal, "emission").length);
  verifie("⑤ `premierePasse` est fige dans l'etat — le verdict de la premiere validation survit aux tranches",
    B1.r.etat.premierePasse === C.r.resultat.premierePasse);
  const B2 = await lancer({ etat: JSON.parse(JSON.stringify(B1.r.etat)) });
  verifie("⑤ la reprise TERMINE, et ne re-emet AUCUNE passe, ne re-sonde pas, ne re-tire pas P0",
    B2.r.fini === true &&
      types(B2.journal, "emission").length === 0 &&
      types(B2.journal, "sonde").length === 0 &&
      types(B2.journal, "p0").length === 0);
  verifie("⑤ meme document final qu'un trait", 
    JSON.stringify(B2.r.resultat.document) === JSON.stringify(C.r.resultat.document));
}

console.log(
  echecs === 0
    ? "\n✅ continuation : machinerie correcte a blanc — PAS une preuve de production."
    : `\n🔴 ${String(echecs)} controle(s) en echec.`,
);
process.exit(echecs === 0 ? 0 : 1);
