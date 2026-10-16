/**
 * EP-246 · UN MODÈLE DE LA COMPLEXITÉ CONTERAK PASSE LES DEUX JUGES.
 *
 * ── CE QUE EP-242 ET EP-243 NE PROUVAIENT PAS.
 *
 * EP-242 éprouve la réparation en isolation, EP-243 son branchement — mais
 * tous deux sur une maquette à DEUX parcours. Or le cas qui a coûté 2,7352 $
 * en porte quatre, trois rôles, quatre concepts et deux identités. Une
 * réparation qui marche à deux parcours et casse à quatre n'aurait rien
 * réparé du tout.
 *
 * ── LA MAQUETTE, ET D'OÙ VIENNENT SES FORMES.
 *
 * Elle n'est pas inventée : chaque élément vient des DIAGNOSTICS RÉELS des
 * trois tirages (ligne 38071852, 2026-10-15 20:51) —
 *
 *   parcours[par_abonnement_souscription].etapes[1] : identité de
 *       cpt_abonnement élue par choisir, n'atteint aucun consommateur
 *   ecrans[ecr_entree] : traversé par 2 acteurs avec surface NON publique
 *       (srf_cpt_releve_decouvrir)
 *
 * — ainsi que des réparations que le moteur avait déjà consignées
 * (`par_releve_mensuel`, `par_historique_rapports`, `cpt_preuve_paiement`).
 *
 * ── CE QUI A FALLU COMPRENDRE POUR LA REPRODUIRE.
 *
 * Mes deux premières maquettes rendaient ZÉRO diagnostic. Mesure : une
 * surface est identifiée par `concept|geste|état|PORTÉE`, et `porteeDe` rend
 * `acteur:<id>` à celui qui PRODUIT le concept. Deux rôles ne partagent donc
 * une surface privée que si NI L'UN NI L'AUTRE ne la produit — d'où le
 * troisième rôle, l'agent releveur, qui saisit les relevés que les deux
 * autres regardent. Sans ce détail, le défaut ne se reproduit pas.
 *
 * ── CE QUE CE FICHIER N'AUTORISE PAS.
 *
 * Les juges sont importés TELS QUELS et jamais modifiés. Si quelqu'un les
 * assouplissait pour faire passer la réparation, le contrôle de sécurité
 * d'EP-242 rougirait — et celui-ci passerait sans rien prouver. Les deux se
 * lisent ensemble.
 */
import { describe, expect, it } from "vitest";
import {
  consommateursDIdentite,
  ecransDe,
  jugerPlanEcrans,
  surfacesDe,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";
import { reparerParcours } from "../../../benchmarks/air-emission/reparation-parcours.mjs";

/** Les juges RÉELS, concaténés comme le pipeline les lit. */
const juger = (m: ModeleMetier): { code: string; path?: string }[] => {
  const plan = ecransDe(m);
  return [
    ...plan.diagnostics,
    ...jugerPlanEcrans(plan, m),
    ...validerModele(m),
  ] as { code: string; path?: string }[];
};

const outils = { ecransDe, surfacesDe, consommateursDIdentite, juger };
const codes = (m: ModeleMetier): string[] => juger(m).map((d) => d.code);

/** Trois rôles, quatre concepts, quatre parcours, deux identités élues. */
const CONTERAK = {
  version: "modele-metier/1.2.0",
  acteurs: [
    { id: "act_consommateur", nom: "Consommateur" },
    { id: "act_gestionnaire", nom: "Gestionnaire" },
    // CE RÔLE EST LA CLÉ DE LA REPRODUCTION : c est lui qui PRODUIT les
    // relevés, donc ni le consommateur ni le gestionnaire ne les produit —
    // et leurs deux surfaces de découverte deviennent identiques.
    { id: "act_agent", nom: "Agent releveur" },
  ],
  concepts: [
    { id: "cpt_compteur", nom: "Compteur", donnees: true, attributs: [{ id: "att_num", nature: "texte", requis: true }] },
    { id: "cpt_releve", nom: "Relevé", donnees: true, attributs: [{ id: "att_index", nature: "nombre", requis: true }] },
    { id: "cpt_abonnement", nom: "Abonnement", donnees: true, attributs: [{ id: "att_formule", nature: "texte", requis: true }] },
    { id: "cpt_preuve_paiement", nom: "Preuve de paiement", donnees: true, attributs: [{ id: "att_ref", nature: "texte", requis: true }] },
  ],
  relations: [{ de: "cpt_compteur", vers: "cpt_releve", nature: "possede" }],
  parcours: [
    {
      id: "par_releve_mensuel", acteur: "act_consommateur", besoin: "voir ses releves du mois",
      etapes: [
        { concept: "cpt_compteur", geste: "choisir" },
        { concept: "cpt_releve", geste: "decouvrir" },
        { concept: "cpt_releve", geste: "consulter" },
      ],
    },
    {
      id: "par_saisie_releve", acteur: "act_agent", besoin: "noter un nouveau releve",
      etapes: [
        { concept: "cpt_compteur", geste: "choisir" },
        { concept: "cpt_releve", geste: "saisir" },
        { concept: "cpt_releve", geste: "confirmer" },
      ],
    },
    {
      id: "par_controle_releves", acteur: "act_gestionnaire", besoin: "controler les releves",
      etapes: [
        { concept: "cpt_compteur", geste: "choisir" },
        { concept: "cpt_releve", geste: "decouvrir" },
        { concept: "cpt_releve", geste: "consulter" },
      ],
    },
    {
      id: "par_abonnement_souscription", acteur: "act_consommateur", besoin: "souscrire un abonnement",
      etapes: [
        { concept: "cpt_abonnement", geste: "choisir" },
        { concept: "cpt_preuve_paiement", geste: "saisir" },
        { concept: "cpt_preuve_paiement", geste: "confirmer" },
      ],
    },
  ],
  couverture: { couverts: [{ terme: "compteur", noeuds: ["cpt_compteur"] }], nonRetenus: [] },
} as unknown as ModeleMetier;

describe("EP-246 · CONTERAK passe P2 par réparation, pas par assouplissement", () => {
  it("la maquette porte BIEN les deux défauts mesurés", () => {
    // Sans ce contrôle, tout le reste du fichier passerait au vert sur un
    // modèle déjà sain — et ne prouverait rien.
    const avant = codes(CONTERAK);
    expect(avant, "la traversée d acteur ne se reproduit pas").toContain(
      "DERIVATION_TRAVERSEE_ACTEUR",
    );
    expect(avant, "l identité non consommée ne se reproduit pas").toContain(
      "DERIVATION_IDENTITE_NON_CONSOMMEE",
    );
  });

  it("LA PREUVE CENTRALE — après réparation, les deux juges se taisent", () => {
    const r = reparerParcours(CONTERAK, outils) as {
      modele: ModeleMetier
      reparations: { action: string }[]
    };
    const apres = codes(r.modele);
    expect(apres, "la traversée d acteur subsiste").not.toContain("DERIVATION_TRAVERSEE_ACTEUR");
    expect(apres, "l identité non consommée subsiste").not.toContain(
      "DERIVATION_IDENTITE_NON_CONSOMMEE",
    );
    // Et RIEN d autre n est apparu : une réparation qui déplace le problème
    // ne répare pas, elle maquille.
    expect(apres, `des défauts sont apparus : ${apres.join(", ")}`).toEqual([]);
  });

  it("les DEUX réparations ont opéré, et elles le disent", () => {
    const r = reparerParcours(CONTERAK, outils) as { reparations: { action: string }[] };
    const dit = r.reparations.map((x) => x.action).join(" | ");
    expect(dit, "l écran partagé n a pas été séparé").toMatch(/chercher/u);
    expect(dit, "la consommation d identité n a pas été posée").toMatch(/consulter cpt_abonnement/u);
  });

  it("LE CŒUR DU PRODUIT N EST PAS TOUCHÉ", () => {
    // `par_releve_mensuel` porte l écran d entrée. C est le gestionnaire qui
    // s écarte, jamais le consommateur — sinon on changerait l application
    // pour satisfaire une règle.
    const r = reparerParcours(CONTERAK, outils) as { modele: ModeleMetier };
    const p = (r.modele as unknown as {
      parcours: { id: string; etapes: { geste: string }[] }[]
    }).parcours;
    const coeur = p.find((x) => x.id === "par_releve_mensuel");
    const controle = p.find((x) => x.id === "par_controle_releves");
    expect(coeur?.etapes[1]?.geste, "le parcours du consommateur a été modifié").toBe("decouvrir");
    expect(controle?.etapes[1]?.geste, "le gestionnaire n a pas été séparé").toBe("chercher");
  });

  it("AUCUN JUGE N A BOUGÉ — la règle refuse toujours ce modèle non réparé", () => {
    // Le contrôle qui interdit de « faire passer » en désarmant : on rejuge
    // la maquette d origine, et elle doit TOUJOURS être refusée.
    expect(codes(CONTERAK)).toContain("DERIVATION_TRAVERSEE_ACTEUR");
    expect(codes(CONTERAK)).toContain("DERIVATION_IDENTITE_NON_CONSOMMEE");
  });
});
