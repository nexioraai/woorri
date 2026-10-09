// ============================================================
// LA RÉPARATION DU PLAN, ÉPROUVÉE — à coût NUL.
//
// `reparerPlan` est pure : elle prend un modèle, elle en rend un autre. On
// peut donc la juger sans un seul appel payant, et c'est exactement ce qu'il
// faut faire avant de la laisser toucher au travail de quelqu'un.
//
// LE CONTRÔLE QUI COMPTE : après réparation, le JUGE qui refusait ne doit
// plus rien avoir à dire. Pas « le code a l'air bon » — le juge, le vrai,
// celui qui a refusé trois tirages payés.
// ============================================================
import { reparerPlan, ecransDe, jugerPlanEcrans, validerModele, parcoursParPriorite, parcoursFerme } from "./modele-metier.mjs";

// LES DEUX DIAGNOSTICS VIENNENT DE `ecransDe`, PAS DE `jugerPlanEcrans`.
// Première version de ce fichier : j'interrogeais le second, qui rendait
// « aucun » sur un modèle pourtant fautif — et deux contrôles passaient au
// vert pour cette seule raison. Le pipeline, lui, concatène les deux
// sources ; c'est donc ainsi qu'il faut les lire.
const refusDe = (m) => [...ecransDe(m).diagnostics, ...jugerPlanEcrans(ecransDe(m), m)].map((d) => d.code);

let echecs = 0;
const verifie = (nom, condition, detail = "") => {
  if (condition) { console.log(`  ✅ ${nom}`); return; }
  console.error(`  🔴 ${nom}${detail === "" ? "" : ` — ${detail}`}`);
  echecs += 1;
};

const socle = (parcours) => ({
  version: "modele-metier/1.2.0",
  acteurs: [{ id: "act_client", nom: "Client" }],
  concepts: [
    { id: "ent_commande", nom: "Commande", donnees: true, attributs: [{ nom: "numero", nature: "texte" }] },
    { id: "ent_produit", nom: "Produit", donnees: true, attributs: [{ nom: "titre", nature: "texte" }] },
  ],
  relations: [],
  parcours,
  couverture: { couverts: [{ terme: "commande", noeuds: ["ent_commande"] }], nonRetenus: [] },
});

// ── ① CONSULTER SANS SOURCE : le défaut mesuré en production.
{
  const avant = socle([
    { id: "par_suivi", besoin: "suivre sa commande", acteur: "act_client",
      // `decouvrir` serait une source VALIDE (bloc « list ») : le cas réel
      // est un consommateur dont l'amont porte un AUTRE concept.
      etapes: [{ concept: "ent_produit", geste: "decouvrir" }, { concept: "ent_commande", geste: "consulter" }] },
  ]);
  const refusAvant = refusDe(avant);
  verifie("le juge refuse BIEN le modèle d'origine",
    refusAvant.includes("DERIVATION_IDENTITE_SANS_SOURCE"),
    `un test qui part d'un modèle déjà valide ne prouverait rien — obtenu ${refusAvant.join(",") || "aucun"}`);

  const { modele, reparations } = reparerPlan(avant);
  verifie("une seule réparation, et c'est celle du juge",
    reparations.length === 1 && /choisir/.test(reparations[0].action));
  const etapes = modele.parcours[0].etapes;
  verifie("« choisir » est posé JUSTE AVANT le consommateur, même concept",
    etapes.length === 3 && etapes[1].geste === "choisir" && etapes[1].concept === "ent_commande",
    etapes.map((e) => `${e.geste}:${e.concept}`).join(" → "));

  const refusApres = refusDe(modele);
  verifie("LE JUGE N'A PLUS RIEN À DIRE", refusApres.length === 0, refusApres.join(", "));
  verifie("le modèle d'origine est INTACT — la réparation ne mute pas",
    avant.parcours[0].etapes.length === 2);
}

// ── ② CONFIRMATION AVANT L'ÉCRITURE : l'ordre est faux, pas le contenu.
{
  const avant = socle([
    { id: "par_achat", besoin: "acheter", acteur: "act_client",
      etapes: [
        { concept: "ent_produit", geste: "decouvrir" },
        { concept: "ent_commande", geste: "confirmer" },
        { concept: "ent_commande", geste: "payer" },
      ] },
  ]);
  const refusAvant = refusDe(avant);
  verifie("le juge refuse BIEN la confirmation prématurée",
    refusAvant.includes("DERIVATION_CONFIRMATION_SANS_ECRITURE"), refusAvant.join(", "));

  const { modele, reparations } = reparerPlan(avant);
  const g = modele.parcours[0].etapes.map((e) => e.geste);
  verifie("la confirmation passe APRÈS le paiement qu'elle observe",
    g.indexOf("confirmer") > g.indexOf("payer"), g.join(" → "));
  verifie("aucune étape n'est perdue ni inventée",
    modele.parcours[0].etapes.length === 3 && reparations.length >= 1);
}

// ── ③ CE QU'ELLE REFUSE DE RÉPARER, et c'est le test le plus important.
{
  const avant = socle([
    { id: "par_vide", besoin: "confirmer sans rien écrire", acteur: "act_client",
      etapes: [{ concept: "ent_produit", geste: "decouvrir" }, { concept: "ent_commande", geste: "confirmer" }] },
  ]);
  const { modele, reparations } = reparerPlan(avant);
  verifie("AUCUNE écriture nulle part ⇒ AUCUNE réparation inventée",
    reparations.filter((r) => /confirmation/.test(r.action)).length === 0);
  const refus = refusDe(modele);
  verifie("et le juge REFUSE TOUJOURS — on ne masque pas ce qu'on ne sait pas réparer",
    refus.includes("DERIVATION_CONFIRMATION_SANS_ECRITURE"), refus.join(", "));
}

// ── ④ UN MODÈLE DÉJÀ BON NE DOIT PAS ÊTRE TOUCHÉ.
{
  const bon = socle([
    { id: "par_suivi", besoin: "suivre sa commande", acteur: "act_client",
      etapes: [{ concept: "ent_commande", geste: "choisir" }, { concept: "ent_commande", geste: "consulter" }] },
  ]);
  const { modele, reparations } = reparerPlan(bon);
  verifie("rien à réparer ⇒ rien n'est touché", reparations.length === 0 && modele === bon);
}

// ── ⑤ LE CŒUR FERMÉ SE RÉORDONNE (tirs réels 3 et 5 : le reproche ne
// corrige pas ce juge, 0/4 — la table EP-135 dit « il réordonne »).
const socleConnexion = (parcours) => ({
  version: "modele-metier/1.2.0",
  acteurs: [{ id: "act_client", nom: "Client" }],
  concepts: [
    { id: "ent_commande", nom: "Commande", donnees: true, attributs: [
      { id: "att_numero", nature: "texte", requis: true },
    ] },
    { id: "ent_compte", nom: "Compte", donnees: true, attributs: [
      { id: "att_email", nature: "texte", requis: true },
    ] },
  ],
  relations: [],
  parcours,
  couverture: { couverts: [
    { terme: "commande", noeuds: ["ent_commande"] },
    { terme: "compte", noeuds: ["ent_compte"] },
  ], nonRetenus: [] },
});
const PAR_CONNEXION = { id: "par_connexion", besoin: "retrouver ses commandes", acteur: "act_client", etapes: [
  { concept: "ent_compte", geste: "s_identifier" },
  { concept: "ent_commande", geste: "consulter_historique" },
] };
const PAR_SUIVI = { id: "par_suivi", besoin: "suivre une commande", acteur: "act_client", etapes: [
  { concept: "ent_commande", geste: "decouvrir" },
  { concept: "ent_commande", geste: "choisir" },
  { concept: "ent_commande", geste: "consulter" },
] };
{
  const avant = socleConnexion([PAR_CONNEXION, PAR_SUIVI]);
  const refusAvant = validerModele(avant).map((x) => x.code);
  verifie("⑤ le juge refuse BIEN la connexion en tête (le defaut des tirs 3 et 5)",
    refusAvant.includes("MODELE_COEUR_EXIGE_CONNEXION"), refusAvant.join(", ") || "aucun");
  const { modele, reparations } = reparerPlan(avant);
  verifie("⑤ la reparation PROMEUT le parcours ouvert en tete, et le dit",
    reparations.length === 1 && /promu en tête/.test(reparations[0].action),
    JSON.stringify(reparations));
  verifie("⑤ le coeur est desormais OUVERT, par les predicats memes du juge",
    parcoursParPriorite(modele)[0].id === "par_suivi" &&
      !parcoursFerme(modele, parcoursParPriorite(modele)[0]));
  verifie("⑤ LES JUGES REPASSENT SILENCIEUX — validerModele n'a plus rien a dire",
    validerModele(modele).length === 0, validerModele(modele).map((x) => x.code).join(", "));
  const plan = ecransDe(modele);
  verifie("⑤ et le plan d'ecrans aussi",
    [...plan.diagnostics, ...jugerPlanEcrans(plan, modele)].length === 0);
  verifie("⑤ l'original est INTACT — la reparation ne mute pas",
    avant.parcours[0].id === "par_connexion");
}

// ── ⑥ OUVERT DEJA EN TETE : rien a reparer, rien n'est touche.
{
  const bon = socleConnexion([PAR_SUIVI, PAR_CONNEXION]);
  const { modele, reparations } = reparerPlan(bon);
  verifie("⑥ ouvert en tete : zero reparation, modele rendu tel quel",
    reparations.length === 0 && modele === bon);
}

// ── ⑦ PRIORITES EXPLICITES : l'ordre voulu s'ecrit, le juge se tait.
{
  const avant = socleConnexion([
    { ...PAR_CONNEXION, priorite: 0 },
    { ...PAR_SUIVI, priorite: 1 },
  ]);
  verifie("⑦ le juge refuse bien ce cas aussi",
    validerModele(avant).map((x) => x.code).includes("MODELE_COEUR_EXIGE_CONNEXION"));
  const { modele, reparations } = reparerPlan(avant);
  verifie("⑦ priorites explicites reecrites : le coeur devient l'ouvert, juges silencieux",
    reparations.length === 1 &&
      parcoursParPriorite(modele)[0].id === "par_suivi" &&
      validerModele(modele).length === 0,
    validerModele(modele).map((x) => x.code).join(", "));
}

console.log(echecs === 0 ? "\n✅ réparation du plan : éprouvée contre les VRAIS juges." : `\n🔴 ${String(echecs)} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
