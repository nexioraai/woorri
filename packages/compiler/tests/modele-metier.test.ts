// FERMETURE F1/F4/F5/F7 (confrontation #9, 2026-09-11) — le contrat P0.
//
// F1 : couverture AU contrat (traçable, raisons fermées, ambigu bloquant) ;
// P1 = forme + références + SUFFISANCE déterministe. La fixture de stress
// reproduit le PATRON kaviva-attempt1 (parcours riches, matière absente) :
// elle doit être REFUSÉE — sans réparer Kaviva, sans règle sectorielle.
// F4 : `visuel` DÉRIVÉ d'un attribut média (le champ déclaré est refusé).
// F5 : GRILLE ⇔ visuel ∧ accès catalogue — le producteur n'est PAS un
// discriminant. F7 : état vide obligatoire si vide-né OU vidable (retirer).
import { describe, expect, it } from "vitest";
import {
  estVisuel,
  etatVideObligatoire,
  mailleDe,
  producteurDe,
  strategieInitiale,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

// Modèle SUFFISANT de référence — réservation de soins, écrit à la main.
// (Un modèle du MÊME domaine que kaviva : la différence entre passer et
// être refusé est STRUCTURELLE, jamais sectorielle.)
const SOINS: ModeleMetier = {
  version: "modele-metier/1.0.0",
  couverture: {
    couverts: [
      { terme: "soins", noeuds: ["cpt_soin"] },
      { terme: "rendez-vous", noeuds: ["cpt_rendez_vous", "par_reserver"] },
      { terme: "compte cliente", noeuds: ["act_cliente"] },
    ],
    nonRetenus: [{ terme: "ambiance du salon", raison: "expression_visuelle" }],
  },
  acteurs: [{ id: "act_cliente", nom: "Cliente" }],
  concepts: [
    {
      id: "cpt_soin",
      nom: "Soin",
      donnees: true,
      attributs: [
        { id: "att_photo", nature: "media", requis: true },
        { id: "att_prix", nature: "nombre", requis: true },
      ],
    },
    { id: "cpt_creneau", nom: "Créneau", donnees: true },
    {
      id: "cpt_rendez_vous",
      nom: "Rendez-vous",
      donnees: true,
      etats: ["a_venir", "passe"],
    },
  ],
  relations: [
    { de: "cpt_rendez_vous", vers: "cpt_soin", nature: "reference" },
    { de: "cpt_rendez_vous", vers: "cpt_creneau", nature: "reference" },
  ],
  parcours: [
    {
      id: "par_reserver",
      besoin: "réserver un soin",
      acteur: "act_cliente",
      etapes: [
        { concept: "cpt_soin", geste: "decouvrir" },
        { concept: "cpt_soin", geste: "chercher" },
        { concept: "cpt_soin", geste: "consulter" },
        { concept: "cpt_creneau", geste: "choisir" },
        { concept: "cpt_rendez_vous", geste: "saisir" },
        { concept: "cpt_rendez_vous", geste: "confirmer" },
      ],
    },
    {
      id: "par_retrouver",
      besoin: "retrouver ses rendez-vous",
      acteur: "act_cliente",
      etapes: [
        { concept: "cpt_rendez_vous", geste: "consulter_historique", etat: "a_venir" },
        { concept: "cpt_rendez_vous", geste: "consulter_historique", etat: "passe" },
      ],
    },
  ],
};

describe("F1 — P1 valide forme + références + SUFFISANCE, déterministe", () => {
  it("le modèle suffisant de référence passe P1 sans diagnostic", () => {
    expect(validerModele(SOINS)).toEqual([]);
  });

  it("STRESS kaviva-attempt1 — des parcours riches sur une matière absente : REFUS", () => {
    // Le patron mesuré : la compréhension existe (les étapes NOMMENT soin,
    // créneau, rendez-vous) mais les concepts n'existent pas. P1 refuse par
    // RÉFÉRENCES — un modèle pauvre bien formé ne passe plus.
    const creux = {
      ...SOINS,
      concepts: [{ id: "cpt_profil", nom: "Profil", donnees: true }],
      relations: [],
      couverture: { couverts: [{ terme: "profil", noeuds: ["cpt_profil"] }], nonRetenus: [] },
    };
    const diags = validerModele(creux);
    expect(diags.some((x) => x.code === "MODELE_REFERENCE_INCONNUE")).toBe(true);
    // Et le profil, que RIEN ne traverse dans ce squelette, est un concept mort.
    expect(diags.some((x) => x.code === "MODELE_CONCEPT_MORT")).toBe(true);
  });

  it("le blocage sur « ambigu » est EXPLICITE", () => {
    const m = {
      ...SOINS,
      couverture: {
        ...SOINS.couverture,
        nonRetenus: [{ terme: "gestion", raison: "ambigu" }],
      },
    };
    expect(validerModele(m).some((x) => x.code === "MODELE_TERME_AMBIGU")).toBe(true);
  });

  it("les raisons de non-rétention sont FERMÉES (hors liste = refus de forme)", () => {
    const m = {
      ...SOINS,
      couverture: {
        ...SOINS.couverture,
        nonRetenus: [{ terme: "x", raison: "pas_envie" }],
      },
    };
    expect(validerModele(m).some((x) => x.code === "MODELE_SCHEMA")).toBe(true);
  });

  it("une entrée couverte doit être TRAÇABLE (nœud connu, liste non vide)", () => {
    const inconnu = {
      ...SOINS,
      couverture: {
        ...SOINS.couverture,
        couverts: [...SOINS.couverture.couverts, { terme: "paniers", noeuds: ["cpt_panier"] }],
      },
    };
    expect(validerModele(inconnu).some((x) => x.code === "MODELE_REFERENCE_INCONNUE")).toBe(true);
    const vide = {
      ...SOINS,
      couverture: { ...SOINS.couverture, couverts: [{ terme: "soins", noeuds: [] }] },
    };
    expect(validerModele(vide).some((x) => x.code === "MODELE_SCHEMA")).toBe(true);
  });

  it("suffisance : parcours sans preuve observable et acteur muet sont refusés", () => {
    const sansPreuve = {
      ...SOINS,
      parcours: [
        {
          ...SOINS.parcours[0],
          etapes: [
            { concept: "cpt_soin", geste: "decouvrir" },
            { concept: "cpt_rendez_vous", geste: "saisir" },
          ],
        },
      ],
    };
    const diags = validerModele(sansPreuve);
    expect(diags.some((x) => x.code === "MODELE_PARCOURS_SANS_PREUVE")).toBe(true);
    const muet = { ...SOINS, acteurs: [...SOINS.acteurs, { id: "act_gerant", nom: "Gérant" }] };
    expect(validerModele(muet).some((x) => x.code === "MODELE_ACTEUR_MUET")).toBe(true);
  });
});

describe("F4 — `visuel` est DÉRIVÉ, jamais déclaré", () => {
  it("attribut média requis présent → visuel ; absent → non", () => {
    const soin = SOINS.concepts[0];
    const creneau = SOINS.concepts[1];
    expect(soin && estVisuel(soin)).toBe(true);
    expect(creneau && estVisuel(creneau)).toBe(false);
    // média NON requis → pas visuel (les trois conjonctions comptent).
    expect(
      estVisuel({
        id: "cpt_x", nom: "X", donnees: true,
        attributs: [{ id: "att_m", nature: "media", requis: false }],
      }),
    ).toBe(false);
  });

  it("MUTATION — un champ `visuel` déclaré est REFUSÉ par le schéma strict", () => {
    const declare = {
      ...SOINS,
      concepts: [{ ...SOINS.concepts[0], visuel: true }, ...SOINS.concepts.slice(1)],
    };
    expect(validerModele(declare).some((x) => x.code === "MODELE_SCHEMA")).toBe(true);
  });
});

describe("F5 — GRILLE ⇔ visuel ∧ accès catalogue ; le producteur N'EST PAS un discriminant", () => {
  const posteVisuel: ModeleMetier["concepts"][number] = {
    id: "cpt_poste", nom: "Publication", donnees: true,
    attributs: [{ id: "att_image", nature: "media", requis: true }],
  };
  it("les trois cas exigés : publications d'un profil, mes annonces, mes véhicules → GRILLE", () => {
    // Trois objets PRODUITS PAR L'ACTEUR, consultés en accès catalogue.
    for (const geste of ["decouvrir", "chercher"] as const) {
      expect(mailleDe(posteVisuel, geste)).toBe("grille");
    }
  });
  it("le fil/historique reste en LIGNES par son GESTE, pas par le producteur", () => {
    expect(mailleDe(posteVisuel, "consulter_historique")).toBe("lignes");
  });
  it("MUTATIONS — visuel faux → lignes ; accès non catalogue → lignes ; producteur=utilisateur n'empêche RIEN", () => {
    expect(mailleDe({ id: "cpt_t", nom: "T", donnees: true }, "decouvrir")).toBe("lignes");
    expect(mailleDe(posteVisuel, "consulter")).toBe("lignes");
    // Producteur utilisateur (le poste est saisi en app) : la GRILLE reste.
    const social: ModeleMetier = {
      ...SOINS,
      concepts: [posteVisuel],
      relations: [],
      couverture: { couverts: [{ terme: "publications", noeuds: ["cpt_poste"] }], nonRetenus: [] },
      parcours: [
        {
          id: "par_publier", besoin: "publier", acteur: "act_cliente",
          etapes: [
            { concept: "cpt_poste", geste: "saisir" },
            { concept: "cpt_poste", geste: "confirmer" },
          ],
        },
        {
          id: "par_galerie", besoin: "voir ses publications", acteur: "act_cliente",
          etapes: [
            { concept: "cpt_poste", geste: "decouvrir" },
            { concept: "cpt_poste", geste: "consulter" },
          ],
        },
      ],
    };
    expect(producteurDe(social, "cpt_poste")).toBe("act_cliente");
    expect(mailleDe(posteVisuel, "decouvrir")).toBe("grille");
    expect(validerModele(social)).toEqual([]);
  });
});

describe("F7 — état vide obligatoire : vide-né OU vidable ; stratégie DÉRIVÉE", () => {
  it("dérivations : rendez-vous (saisi en app) → vide ; soin (amorcé) → seed", () => {
    expect(strategieInitiale(SOINS, "cpt_rendez_vous")).toBe("vide");
    expect(strategieInitiale(SOINS, "cpt_soin")).toBe("seed");
    expect(etatVideObligatoire(SOINS, "cpt_rendez_vous")).toBe(true);
    expect(etatVideObligatoire(SOINS, "cpt_soin")).toBe(false);
  });

  it("FIXTURE — collection AMORCÉE mais VIDABLE (retirer) : état vide OBLIGATOIRE", () => {
    const favoris: ModeleMetier = {
      ...SOINS,
      concepts: [...SOINS.concepts, { id: "cpt_favori", nom: "Favori", donnees: true }],
      parcours: [
        ...SOINS.parcours,
        {
          id: "par_gerer_favoris", besoin: "gérer ses favoris", acteur: "act_cliente",
          etapes: [
            { concept: "cpt_favori", geste: "retirer" },
            { concept: "cpt_favori", geste: "consulter_historique" },
          ],
        },
      ],
    };
    // Amorcée (aucun saisir) MAIS réductible : le vide est atteignable.
    expect(strategieInitiale(favoris, "cpt_favori")).toBe("seed");
    expect(etatVideObligatoire(favoris, "cpt_favori")).toBe(true);
  });

  it("MUTATION — sans étape réductrice, une collection amorcée n'exige pas l'état vide", () => {
    expect(etatVideObligatoire(SOINS, "cpt_creneau")).toBe(false);
  });
});
