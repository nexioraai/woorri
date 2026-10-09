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
// Le client a blanc rend donc des reparations qui ne guerissent pas : la
// sous-propriete « une section GUERIE n'est pas re-payee » exige le vrai
// service. Ce qui EST prouve ici : la suspension reprend sans re-emettre,
// re-sonder ni re-tirer P0 (⑤) — et le CONTENU d'un tour coupe SURVIT a la
// suspension et a la reprise (scenario D, reponse marquee). Lecon du
// 2026-10-09 : une preuve de comptage n'est pas une preuve de contenu —
// le pli de reparation est reste casse sous un ⑦ vert.
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
import { MODELE, BRIEF, creerClientABlanc } from "./client-a-blanc.mjs";
void MODELE; // la fixture vit dans le module partage ; l'import dit la dependance

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

// ── ⑦ LE FILET DES TENTATIVES : des tours qui n'achevent JAMAIS s'arretent
// au 9e lancement (defaut mesure, tir 0234da42 : zero tour acheve, aucun
// frein, 6,87 $ brules — seul le garde-fou du harnais a arrete). Depuis
// l'arbitrage du 2026-10-09, la CONVERGENCE se compte en tours ACHEVES
// (3) et le filet anti-boucle en LANCEMENTS (9) — distincts : un tour reel
// traverse plusieurs tranches, le confondre etranglait la boucle.
//
// Le scenario coupe CHAQUE tranche pendant le premier appel de reparation
// (appel ralenti + budget calibre juste apres son debut) : aucun tour ne
// s'acheve, et c'est exactement le cas qui n'avait aucun frein.
console.log("— scenario C2 : tours jamais acheves → filet au 9e lancement —");
{
  const premiereRep = types(C.journal, "reparation")[0];
  let etatC2 = null;
  let fini = null;
  let tranches = 0;
  for (; tranches < 14; tranches++) {
    const r = await lancer({
      lent: (e) => e.type === "reparation",
      budgetMs: rel(premiereRep) + 400,
      ...(etatC2 === null ? {} : { etat: JSON.parse(JSON.stringify(etatC2)) }),
    });
    if (r.r.fini) { fini = r.r; break; }
    etatC2 = r.r.etat;
  }
  verifie("⑦ la boucle S'ARRETE — plus jamais sans frein",
    fini !== null, `encore suspendue apres ${String(tranches)} tranches`);
  verifie("⑦ exactement 9 lancements, portes par l'etat a travers les tranches",
    fini !== null && fini.resultat.tentativesReparation === 9,
    String(fini?.resultat?.tentativesReparation));
  verifie("⑦ refusee qui DIT « filet anti-boucle », lancements et tours acheves comptes",
    fini !== null && /filet anti-boucle : 9 tentatives/.test(fini.resultat.raison ?? ""),
    fini?.resultat?.raison ?? "—");
  verifie("⑦ zero tour acheve — le cas exact du defaut mesure",
    fini !== null && fini.resultat.tours.length === 0,
    String(fini?.resultat?.tours?.length));
}

// ── ⑧ scenario D : LE CONTENU D'UN TOUR COUPE SURVIT. Lecon du 2026-10-09 :
// le catch de reparation lisait la cle de l'EMISSION — undefined — et le
// travail paye d'un tour coupe etait JETE a chaque coupure (80 = 80 apres
// 2,9 $). ⑦ etait vert pendant ce temps : il comptait les tentatives, pas
// le contenu. Ce scenario mesure LE CONTENU : la reponse de reparation est
// MARQUEE, et le marqueur doit se retrouver dans l'acquis suspendu, puis
// survivre a une reprise, puis voyager sous la cle du CONTRAT quand c'est
// une erreur transitoire qui coupe le tour.
console.log("— scenario D : le contenu d'un tour coupe survit (pli + reprise + erreur) —");
{
  // Client enveloppant : tout est delegue au client a blanc, SAUF les appels
  // de reparation — reponse marquee, lente (2,5 s), ou jetee selon le plan.
  const envelopper = ({ jetteAu = null } = {}) => {
    const interne = creerClientABlanc({ corpus: CORPUS });
    let appelsReparation = 0;
    return {
      journal: interne.journal,
      messages: {
        create: async (appel) => {
          const texteUser = String(appel?.messages?.[0]?.content ?? "");
          const props = Object.keys(appel?.output_config?.format?.schema?.properties ?? {});
          const estReparation =
            appel.max_tokens !== 1 && !props.includes("acteurs") &&
            !texteUser.includes("SECTIONS À ÉMETTRE MAINTENANT");
          if (!estReparation) return interne.messages.create(appel);
          appelsReparation += 1;
          if (jetteAu !== null && appelsReparation >= jetteAu) {
            throw Object.assign(new Error("Connection error simulee en plein tour"), {});
          }
          await new Promise((r) => setTimeout(r, 2500));
          const tranche = { __MARQUEUR_TOUR_COUPE__: `appel-${String(appelsReparation)}` };
          for (const k of props) tranche[k] = CORPUS[k];
          return {
            content: [{ type: "text", text: JSON.stringify(tranche) }],
            stop_reason: "end_turn",
            usage: { input_tokens: 100, output_tokens: 50 },
          };
        },
      },
    };
  };
  const premiereRep = types(C.journal, "reparation")[0];

  // D1 — coupure de budget en plein tour : le marqueur est DANS l'acquis.
  const mD = await creerMoteur({ cleApi: "client-a-blanc", client: envelopper() });
  const D1 = await mD.poursuivreEmission({
    brief: BRIEF, slug: "blanc", budgetMs: rel(premiereRep) + 400,
  });
  verifie("⑧ D1 suspendu en pleine reparation", D1.fini === false && D1.etat.phase === "reparation");
  verifie("⑧ D1 LE CONTENU PAYE SURVIT : la section reparee (marquee) est dans l'acquis suspendu",
    D1.etat.acquis.__MARQUEUR_TOUR_COUPE__ === "appel-1",
    JSON.stringify(D1.etat.acquis.__MARQUEUR_TOUR_COUPE__));

  // D2 — reprise depuis l'etat JSON-rond, nouvelle coupure : toujours la.
  const D2 = await mD.poursuivreEmission({
    brief: BRIEF, slug: "blanc",
    etat: JSON.parse(JSON.stringify(D1.etat)), budgetMs: 400,
  });
  verifie("⑧ D2 repris puis coupe encore : le contenu survit a la traversee JSON et a la reprise",
    D2.fini === false && D2.etat.acquis.__MARQUEUR_TOUR_COUPE__ !== undefined,
    JSON.stringify(D2.etat?.acquis?.__MARQUEUR_TOUR_COUPE__));

  // D3 — erreur TRANSITOIRE en plein tour : le contenu paye voyage sous la
  // cle du CONTRAT (`assemblagePartiel`), celle que le travailleur replie.
  const mE = await creerMoteur({ cleApi: "client-a-blanc", client: envelopper({ jetteAu: 2 }) });
  let erreur = null;
  try {
    await mE.poursuivreEmission({ brief: BRIEF, slug: "blanc" });
  } catch (e) { erreur = e; }
  verifie("⑧ D3 l'erreur transitoire porte le contenu paye sous la cle du contrat",
    erreur !== null && erreur.assemblagePartiel?.document?.__MARQUEUR_TOUR_COUPE__ === "appel-1",
    JSON.stringify(erreur?.assemblagePartiel?.document?.__MARQUEUR_TOUR_COUPE__));
  verifie("⑧ D3 etiquetee transitoire — le travailleur retentera au lieu de refuser",
    erreur !== null && erreur.transitoire === true, String(erreur?.transitoire));
}

console.log(
  echecs === 0
    ? "\n✅ continuation : machinerie correcte a blanc — PAS une preuve de production."
    : `\n🔴 ${String(echecs)} controle(s) en echec.`,
);
process.exit(echecs === 0 ? 0 : 1);
