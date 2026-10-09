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
  verifie("⑧ D3 le cout de la tranche morte voyage avec l'erreur — plus de chiffre sous la realite",
    erreur !== null && typeof erreur.coutTrancheUsd === "number" && erreur.coutTrancheUsd > 0 &&
      Number(erreur.jetonsTranche?.entree ?? 0) > 0 && Number(erreur.jetonsTranche?.sortie ?? 0) > 0,
    JSON.stringify({ cout: erreur?.coutTrancheUsd, jetons: erreur?.jetonsTranche }));
  // 4e CHEMIN DE PERTE (tir c29bd806) : l'erreur AVANT suspension doit
  // porter le MEME etat que la suspension — mesure sur le CONTENU : le
  // modele P0 (acteurs, concepts), la phase, les comptes de la premiere
  // passe. Pas un compteur : le modele lui-meme.
  const complet = erreur?.etatComplet;
  verifie("⑧ D3 l'erreur porte l'ETAT COMPLET : le modele P0 paye y est, EN CONTENU",
    complet !== undefined && complet.modele !== null &&
      (complet.modele?.acteurs?.length ?? 0) > 0 && (complet.modele?.concepts?.length ?? 0) > 0,
    JSON.stringify({ acteurs: complet?.modele?.acteurs?.length, concepts: complet?.modele?.concepts?.length }));
  verifie("⑧ D3 l'etat complet dit la phase, les tirages et la premiere passe — le recit survit",
    complet?.phase === "reparation" && (complet?.tirages?.length ?? 0) >= 1 &&
      typeof complet?.premierePasse === "number" && Array.isArray(complet?.tours),
    JSON.stringify({ phase: complet?.phase, tirages: complet?.tirages?.length, pp: complet?.premierePasse }));
}

// ── ⑨ scenario E : LE TOUR EN BOUCHEES (arbitrage du 2026-10-09). Mesure :
// 79 corrections demandees d'un coup → 19 noeuds SUPPRIMES ; 4 demandees →
// reussite. Le tour se decoupe : une bouchee amputante est REJETEE (par
// l'enveloppe scellee D-093, appelee par bouchee), consignee, les autres
// gardent leurs gains — refusee SEULEMENT si toutes amputent.
console.log("— scenario E : bouchees — rejet isole, refus seulement si TOUTES amputent —");
{
  // E1 — le decoupage est observable dans le journal du tour (course C).
  const toursC = C.r.resultat.tours ?? [];
  const b0 = toursC[0]?.bouchees ?? [];
  verifie("⑨ E1 chaque tour journalise ses bouchees — au plus K=12 diagnostics chacune",
    b0.length >= 1 && b0.every((b) => b.taille >= 1 && b.taille <= 12 && typeof b.cle === "string"),
    JSON.stringify(b0.map((b) => `${b.cle}:${String(b.taille)}`)));
  verifie("⑨ E1 l'ordre des rangs est cablage → additif → cosmetique, jamais l'inverse",
    b0.every((b, i) => i === 0 || b0[i - 1].cle.split("|")[0] <= b.cle.split("|")[0]),
    JSON.stringify(b0.map((b) => b.cle)));

  // L'enveloppe amputante : delegue tout au client a blanc, mais pour les
  // appels de reparation CHOISIS la reponse SUPPRIME un ECRAN IDENTIFIE —
  // la fusion de la reparation prend les cles rendues telles quelles, et un
  // noeud a id retire est exactement ce que l'empreinte d'amputation
  // detecte. (Premiere version : trancher `rules`/`slots` — noeuds sans id,
  // invisibles a l'empreinte, qui INTRODUISAIENT un diagnostic : oscillation
  // au lieu d'amputation. L'essai l'a montre, le scenario s'est corrige.)
  const envelopperAmputant = (mode) => {
    const interne = creerClientABlanc({ corpus: CORPUS });
    let faite = false;
    return {
      journal: interne.journal,
      messages: {
        create: async (appel) => {
          const texteUser = String(appel?.messages?.[0]?.content ?? "");
          const props = Object.keys(appel?.output_config?.format?.schema?.properties ?? {});
          const estReparation = appel.max_tokens !== 1 && !props.includes("acteurs") &&
            !texteUser.includes("SECTIONS À ÉMETTRE MAINTENANT");
          if (!estReparation || (mode === "premiere" && faite)) return interne.messages.create(appel);
          faite = true;
          const tranche = {};
          for (const k of props) tranche[k] = CORPUS[k];
          tranche.screens = CORPUS.screens.slice(0, -1); // l'ecran retire, a CHAQUE fois
          return {
            content: [{ type: "text", text: JSON.stringify(tranche) }],
            stop_reason: "end_turn",
            usage: { input_tokens: 100, output_tokens: 50 },
          };
        },
      },
    };
  };

  // E2 — UNE bouchee ampute : rejetee et consignee, les autres passent, le
  // tour n'est PAS rejete pour amputation.
  const clientE2 = envelopperAmputant("premiere");
  const mE2 = await creerMoteur({ cleApi: "client-a-blanc", client: clientE2 });
  const E2 = (await mE2.poursuivreEmission({ brief: BRIEF, slug: "blanc" })).resultat;
  const tE2 = (E2.tours ?? [])[0];
  verifie("⑨ E2 la bouchee amputante est REJETEE et consignee, les autres passent",
    tE2 !== undefined && tE2.bouchees.some((b) => b.ampute.length > 0) &&
      tE2.bouchees.some((b) => b.ampute.length === 0),
    JSON.stringify(tE2?.bouchees?.map((b) => b.ampute.length) ?? null));
  verifie("⑨ E2 le tour n'est PAS rejete pour amputation — la fatalite de tour est morte",
    tE2 !== undefined && tE2.rejet !== "amputation",
    `rejet=${String(tE2?.rejet)} · raison=${String(E2.raison ?? "—").slice(0, 70)}`);

  // E3 — TOUTES les bouchees amputent : refusee qui le DIT.
  const mE3 = await creerMoteur({ cleApi: "client-a-blanc", client: envelopperAmputant("toutes") });
  const E3 = (await mE3.poursuivreEmission({ brief: BRIEF, slug: "blanc" })).resultat;
  verifie("⑨ E3 toutes amputent → refusee « TOUTES les bouchées amputent »",
    E3.ok === false && /TOUTES les bouchées amputent/.test(E3.raison ?? ""),
    String(E3.raison ?? "—").slice(0, 90));
  verifie("⑨ E3 le refus rend la BASE et le MODELE — l'ecriture terminale peut les conserver",
    E3.document !== undefined && E3.document !== null && E3.modele !== undefined,
    JSON.stringify({ doc: E3.document !== null, modele: E3.modele !== undefined }));

  // E4 — le rappel anti-suppression vit dans les prescriptions d'ecrans,
  // le canal que CHAQUE bouchee d'ecrans recoit (EP-073 ②).
  const mX = await creerMoteur({ cleApi: "client-a-blanc", client: creerClientABlanc({ corpus: CORPUS }) });
  const texteEcrans = mX.modeleMetier.obligationsPrescriptives(
    "ecrans", MODELE, mX.modeleMetier.ecransDe(MODELE), mX.presentation.DESTINATIONS_MIN,
  );
  verifie("⑨ E4 chaque bouchee d'ecrans recoit le rappel : exister deja, AMPUTATION rejetee",
    texteEcrans.includes("EN RÉPARATION") &&
      texteEcrans.includes("AMPUTATION détectée et REJETÉE") &&
      texteEcrans.includes("n'efface jamais ce qu'un diagnostic ne nomme pas"),
    texteEcrans.slice(texteEcrans.indexOf("EN RÉPARATION"), texteEcrans.indexOf("EN RÉPARATION") + 80));
}

// ── ⑩ scenario F : LE PLAFOND COMPTE LA CONVERGENCE, PAS LES REVELATIONS
// (arbitrage du 2026-10-09). Mesure c29bd806 : 2/3 tours acheves TOUS
// revelants (+37, +38) pendant que le compte fondait 37 → 1 — l'ancien
// plafond aurait refuse une ligne en pleine convergence saine.
//
// LA METHODE : le journal des tours est PRECHARGE dans un etat de reprise —
// c'est exactement ainsi que les vraies reprises portent leurs tours — et
// on observe la decision de la tete de boucle. Deterministe, sans dependre
// de ce que le client a blanc sait guerir (rien : 62 → 62 mesure).
console.log("— scenario F : le plafond ignore les revelations, coupe la non-convergence —");
{
  const tourFait = (n, revelation) => ({
    n, avant: 70 - n, apres: 70 - n - (revelation ? -30 : 5), coutUsd: 0.1,
    revelation, introduits: 0, reveles: revelation ? 30 : 0, ampute: [], bouchees: [],
  });
  const etatRepris = (tours) => ({
    phase: "reparation",
    modele: C.r.resultat.modele,
    acquis: JSON.parse(JSON.stringify(C.r.resultat.document)),
    tirages: [], niveaux: C.r.resultat.niveaux ?? null,
    premierePasse: 62, tours, tentativesReparation: tours.length,
    coutUsd: 0, jetons: { entree: 0, sortie: 0 },
  });

  // F1 — TROIS tours REVELANTS au journal : l'ancien plafond refusait ici
  // meme ; le nouveau LAISSE TRAVAILLER (le tour 4 se lance et s'acheve),
  // et c'est la stagnation du client a blanc qui arrete — pas le plafond.
  const F1 = (await (await creerMoteur({ cleApi: "client-a-blanc", client: creerClientABlanc({ corpus: CORPUS }) }))
    .poursuivreEmission({ brief: BRIEF, slug: "blanc", etat: etatRepris([tourFait(1, true), tourFait(2, true), tourFait(3, true)]) })).resultat;
  verifie("⑩ F1 trois tours REVELANTS ne declenchent PAS le plafond — le tour 4 se lance et s'acheve",
    (F1.tours ?? []).length === 4 && (F1.tours ?? [])[3]?.n === 4,
    `tours=${String(F1.tours?.length)} · raison=${String(F1.raison ?? "—").slice(0, 60)}`);
  verifie("⑩ F1 le refus final ne vient JAMAIS du plafond de convergence",
    F1.ok === false && !/non convergé en/.test(F1.raison ?? ""),
    String(F1.raison ?? "—").slice(0, 80));

  // F2 — TROIS tours acheves SANS revelation, sans convergence : le plafond
  // coupe AVANT tout nouvel appel payant, en nommant les deux comptes.
  const clientF2 = creerClientABlanc({ corpus: CORPUS });
  const avantF2 = clientF2.journal.length;
  const F2 = (await (await creerMoteur({ cleApi: "client-a-blanc", client: clientF2 }))
    .poursuivreEmission({ brief: BRIEF, slug: "blanc", etat: etatRepris([tourFait(1, false), tourFait(2, false), tourFait(3, false)]) })).resultat;
  verifie("⑩ F2 trois tours NON revelants sans convergence → le plafond coupe TOUJOURS",
    F2.ok === false && /non convergé en 3 tours de convergence/.test(F2.raison ?? "") &&
      /0 révélation/.test(F2.raison ?? ""),
    String(F2.raison ?? "—").slice(0, 90));
  verifie("⑩ F2 la coupe tombe AVANT tout nouvel appel de reparation — zero paye pour mesurer un refus connu",
    clientF2.journal.slice(avantF2).filter((x) => x.type === "reparation").length === 0,
    `appels reparation=${String(clientF2.journal.slice(avantF2).filter((x) => x.type === "reparation").length)}`);

  // F3 — la forme EXACTE de c29bd806 : DEUX tours revelants au journal — le
  // tour 3 doit se lancer (l'ancien comportement l'aurait laisse aussi,
  // mais une revelation de plus l'aurait tue ; ici elle ne le tuera pas).
  const F3 = (await (await creerMoteur({ cleApi: "client-a-blanc", client: creerClientABlanc({ corpus: CORPUS }) }))
    .poursuivreEmission({ brief: BRIEF, slug: "blanc", etat: etatRepris([tourFait(1, true), tourFait(2, true)]) })).resultat;
  verifie("⑩ F3 la forme c29bd806 (2 tours revelants) : le tour 3 se lance — la ligne reste jouable",
    (F3.tours ?? []).length === 3 && !/non convergé en/.test(F3.raison ?? ""),
    `tours=${String(F3.tours?.length)}`);
}

console.log(
  echecs === 0
    ? "\n✅ continuation : machinerie correcte a blanc — PAS une preuve de production."
    : `\n🔴 ${String(echecs)} controle(s) en echec.`,
);
process.exit(echecs === 0 ? 0 : 1);
