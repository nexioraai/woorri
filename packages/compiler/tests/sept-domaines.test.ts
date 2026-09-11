// XIV (confrontation #12) — 7 FIXTURES DE MODÈLE, règles déterministes,
// attendus FIGÉS ICI, ablation par SYMBOLISATION. AUCUNE génération.
// Les noms de domaines n'existent QUE comme données de test (autorisé) —
// aucune règle ne les lit (anti-secteur.test le prouve par ailleurs).
// GENERICITE globale : reste UNKNOWN (P2d/P3 non exécutés) — ce fichier
// prouve la généricité de la COUCHE DE DÉRIVATION uniquement.
import { describe, expect, it } from "vitest";
import {
  etatVideObligatoire,
  mailleDe,
  strategieInitiale,
  surfacesDe,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const modele = (
  graine: string,
  concepts: ModeleMetier["concepts"],
  relations: ModeleMetier["relations"],
  parcours: ModeleMetier["parcours"],
): ModeleMetier => ({
  version: "modele-metier/1.0.0",
  couverture: {
    couverts: concepts.map((c) => ({ terme: c.nom, noeuds: [c.id] })),
    nonRetenus: [],
  },
  acteurs: [{ id: `act_${graine}`, nom: graine }],
  concepts,
  relations,
  parcours,
});

const media = (id: string) => [{ id, nature: "media" as const, requis: true }];

// ── LES 7 MODÈLES (compacts, écrits à la main) ──
const F = {
  marketplace: modele("client",
    [
      { id: "cpt_produit", nom: "produit", donnees: true, attributs: media("att_pp") },
      { id: "cpt_commande", nom: "commande", donnees: true },
    ],
    [{ de: "cpt_commande", vers: "cpt_produit", nature: "reference" }],
    [
      { id: "par_acheter", besoin: "acheter", acteur: "act_client",
        etapes: [
          { concept: "cpt_produit", geste: "decouvrir" },
          { concept: "cpt_produit", geste: "chercher" },
          { concept: "cpt_produit", geste: "consulter" },
          { concept: "cpt_commande", geste: "saisir" },
          { concept: "cpt_commande", geste: "confirmer" },
        ] },
      { id: "par_suivre", besoin: "suivre", acteur: "act_client",
        etapes: [
          { concept: "cpt_commande", geste: "consulter_historique" },
          { concept: "cpt_commande", geste: "consulter" },
        ] },
    ]),
  reservation: modele("cliente",
    [
      { id: "cpt_soin", nom: "soin", donnees: true, attributs: media("att_ps") },
      { id: "cpt_creneau", nom: "creneau", donnees: true },
      { id: "cpt_rdv", nom: "rdv", donnees: true, etats: ["a_venir", "passe"] },
    ],
    [
      { de: "cpt_rdv", vers: "cpt_soin", nature: "reference" },
      { de: "cpt_rdv", vers: "cpt_creneau", nature: "reference" },
    ],
    [
      { id: "par_reserver", besoin: "réserver", acteur: "act_cliente",
        etapes: [
          { concept: "cpt_soin", geste: "decouvrir" },
          { concept: "cpt_soin", geste: "chercher" },
          { concept: "cpt_soin", geste: "consulter" },
          { concept: "cpt_creneau", geste: "choisir" },
          { concept: "cpt_rdv", geste: "saisir" },
          { concept: "cpt_rdv", geste: "confirmer" },
        ] },
      { id: "par_retrouver", besoin: "retrouver", acteur: "act_cliente",
        etapes: [
          { concept: "cpt_rdv", geste: "consulter_historique", etat: "a_venir" },
          { concept: "cpt_rdv", geste: "consulter_historique", etat: "passe" },
        ] },
    ]),
  social: modele("membre",
    [{ id: "cpt_publication", nom: "publication", donnees: true, attributs: media("att_pi") }],
    [],
    [
      { id: "par_publier", besoin: "publier", acteur: "act_membre",
        etapes: [
          { concept: "cpt_publication", geste: "saisir" },
          { concept: "cpt_publication", geste: "confirmer" },
        ] },
      { id: "par_fil", besoin: "suivre le fil", acteur: "act_membre",
        etapes: [
          { concept: "cpt_publication", geste: "decouvrir" },
          { concept: "cpt_publication", geste: "consulter" },
        ] },
    ]),
  education: modele("eleve",
    [
      { id: "cpt_cours", nom: "cours", donnees: true, attributs: media("att_pc") },
      { id: "cpt_progression", nom: "progression", donnees: true, etats: ["en_cours", "termine"] },
    ],
    [{ de: "cpt_progression", vers: "cpt_cours", nature: "reference" }],
    [
      { id: "par_suivre", besoin: "suivre un cours", acteur: "act_eleve",
        etapes: [
          { concept: "cpt_cours", geste: "decouvrir" },
          { concept: "cpt_cours", geste: "consulter" },
        ] },
      { id: "par_progresser", besoin: "voir sa progression", acteur: "act_eleve",
        etapes: [
          { concept: "cpt_progression", geste: "saisir" },
          { concept: "cpt_progression", geste: "consulter_historique", etat: "en_cours" },
        ] },
    ]),
  livraison: modele("client",
    [
      { id: "cpt_article", nom: "article", donnees: true, attributs: media("att_pa") },
      { id: "cpt_livraison", nom: "course", donnees: true, etats: ["en_route", "livree"] },
    ],
    [{ de: "cpt_livraison", vers: "cpt_article", nature: "reference" }],
    [
      { id: "par_commander", besoin: "commander", acteur: "act_client",
        etapes: [
          { concept: "cpt_article", geste: "decouvrir" },
          { concept: "cpt_article", geste: "chercher" },
          { concept: "cpt_article", geste: "consulter" },
          { concept: "cpt_livraison", geste: "saisir" },
          { concept: "cpt_livraison", geste: "confirmer" },
        ] },
      { id: "par_suivre", besoin: "suivre la course", acteur: "act_client",
        etapes: [
          { concept: "cpt_livraison", geste: "consulter_historique", etat: "en_route" },
          { concept: "cpt_livraison", geste: "consulter" },
        ] },
    ]),
  automobile: modele("acheteur",
    [
      { id: "cpt_vehicule", nom: "vehicule", donnees: true, attributs: media("att_pv") },
      { id: "cpt_annonce", nom: "annonce", donnees: true, attributs: media("att_pn") },
    ],
    [{ de: "cpt_annonce", vers: "cpt_vehicule", nature: "reference" }],
    [
      { id: "par_comparer", besoin: "comparer", acteur: "act_acheteur",
        etapes: [
          { concept: "cpt_vehicule", geste: "decouvrir" },
          { concept: "cpt_vehicule", geste: "chercher" },
          { concept: "cpt_vehicule", geste: "consulter" },
        ] },
      { id: "par_vendre", besoin: "vendre", acteur: "act_acheteur",
        etapes: [
          { concept: "cpt_annonce", geste: "saisir" },
          { concept: "cpt_annonce", geste: "confirmer" },
        ] },
      { id: "par_mes_annonces", besoin: "gérer ses annonces", acteur: "act_acheteur",
        etapes: [
          { concept: "cpt_annonce", geste: "decouvrir" },
          { concept: "cpt_annonce", geste: "retirer" },
          { concept: "cpt_annonce", geste: "consulter_historique" },
        ] },
    ]),
  saas: modele("gestionnaire",
    [{ id: "cpt_dossier", nom: "dossier", donnees: true, etats: ["ouvert", "clos"] }],
    [],
    [
      { id: "par_gerer", besoin: "gérer", acteur: "act_gestionnaire",
        etapes: [
          { concept: "cpt_dossier", geste: "saisir" },
          { concept: "cpt_dossier", geste: "confirmer" },
        ] },
      { id: "par_suivre", besoin: "suivre", acteur: "act_gestionnaire",
        etapes: [
          { concept: "cpt_dossier", geste: "consulter_historique", etat: "ouvert" },
          { concept: "cpt_dossier", geste: "consulter" },
        ] },
    ]),
} satisfies Record<string, ModeleMetier>;

describe("XIV — 7 modèles, mêmes règles, structures DIFFÉRENTES (attendus figés)", () => {
  it("les 7 modèles passent P1 sans diagnostic", () => {
    for (const [nom, m] of Object.entries(F)) {
      expect(validerModele(m), nom).toEqual([]);
    }
  });

  it("MAILLE — dérivée par (visuel × accès), jamais par domaine", () => {
    const c = (m: ModeleMetier, id: string) => {
      const trouve = m.concepts.find((x) => x.id === id);
      if (trouve === undefined) throw new Error(id);
      return trouve;
    };
    expect(mailleDe(c(F.marketplace, "cpt_produit"), "decouvrir")).toBe("grille");
    expect(mailleDe(c(F.saas, "cpt_dossier"), "consulter_historique")).toBe("lignes");
    expect(mailleDe(c(F.saas, "cpt_dossier"), "decouvrir")).toBe("lignes"); // ¬visuel
    // F5 : « mes annonces » (produites par l'acteur) en GRILLE — accès catalogue.
    expect(mailleDe(c(F.automobile, "cpt_annonce"), "decouvrir")).toBe("grille");
    // le fil visuel global : accès catalogue ⇒ grille (conséquence ASSUMÉE de
    // F5 — l'amendement supprime le veto producteur ; la chronologie reste
    // en lignes par le geste consulter_historique).
    expect(mailleDe(c(F.social, "cpt_publication"), "decouvrir")).toBe("grille");
    expect(mailleDe(c(F.social, "cpt_publication"), "consulter_historique")).toBe("lignes");
  });

  it("STRATÉGIE/VIDE — dérivés des parcours (saisir ⇒ vide-né ; retirer ⇒ vidable)", () => {
    expect(strategieInitiale(F.marketplace, "cpt_produit")).toBe("seed");
    expect(strategieInitiale(F.marketplace, "cpt_commande")).toBe("vide");
    expect(etatVideObligatoire(F.marketplace, "cpt_commande")).toBe(true);
    expect(etatVideObligatoire(F.reservation, "cpt_soin")).toBe(false);
    expect(etatVideObligatoire(F.automobile, "cpt_annonce")).toBe(true); // saisi ET retiré
  });

  it("DIVERGENCE STRUCTURELLE — les signatures de surfaces diffèrent entre domaines", () => {
    const signature = (m: ModeleMetier) =>
      surfacesDe(m)
        .map((s) => `${s.role}:${s.cardinalite}`)
        .sort()
        .join("|");
    const signatures = Object.fromEntries(
      Object.entries(F).map(([nom, m]) => [nom, signature(m)]),
    );
    // Attendus FIGÉS : au moins 5 signatures distinctes sur 7 (réservation et
    // livraison partagent légitimement une FORME proche — même patron d'achat
    // à états ; tout le reste diverge).
    const distinctes = new Set(Object.values(signatures));
    expect(distinctes.size).toBeGreaterThanOrEqual(5);
    // Et des différences NOMMÉES : le saas n'a ni recherche ni découverte ;
    // le social n'a pas de recherche ; la marketplace en a une.
    expect(signatures.saas).not.toContain("recherche");
    expect(signatures.saas).not.toContain("decouverte");
    expect(signatures.social).not.toContain("recherche");
    expect(signatures.marketplace).toContain("recherche");
  });

  it("ABLATION — symbolisation des identifiants : dérivations ISOMORPHES", () => {
    for (const [nom, m] of Object.entries(F)) {
      const json = JSON.stringify(m);
      const ids = [...new Set([...json.matchAll(/"(act|cpt|par|att)_[a-z0-9_]+"/g)].map((x) => x[0]))];
      const table = new Map(ids.map((id, i) => [id, `"x${String(i)}_symbole"`]));
      let symbolise = json;
      for (const [de, vers] of table) symbolise = symbolise.split(de).join(vers);
      const ms = JSON.parse(symbolise) as ModeleMetier;
      expect(validerModele(ms), nom).toEqual([]);
      // surfaces re-symbolisées à l'inverse = surfaces d'origine, champ à champ.
      let sortie = JSON.stringify(surfacesDe(ms));
      for (const [de, vers] of table) {
        sortie = sortie.split(vers.slice(1, -1)).join(de.slice(1, -1));
      }
      const attendu = JSON.stringify(surfacesDe(m)).replace(/"surfaceId":"[^"]+"/g, "");
      const obtenu = sortie.replace(/"surfaceId":"[^"]+"/g, "");
      expect(obtenu, nom).toBe(attendu);
    }
  });
});
