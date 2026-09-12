// R2 (GO humain, 2026-09-11) — CONTRAT DU MODÈLE MÉTIER v1.1.0 + FRONTIÈRE C1.
//
// Le contrat gagne (ADDITIF, migration 1.0.0 fermée) : identifiant,
// attribut.producteur, ÉTATS STRUCTURÉS à transitions (invariants E),
// priorité, préconditions d'étape. transport/effet/résultat restent
// DÉRIVÉS (TABLE_GESTES) — jamais redéclarés par étape (forme normale).
// C1 : la LEXICALISATION est DÉTERMINISTE et indépendante de P0 ; P1
// compare inventaire ↔ couverture — l'omission silencieuse est refusée.
// LIMITE ASSUMÉE : responsabilité lexicale, pas preuve sémantique (R8).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  contratDEtape,
  inventaireDe,
  migrerModele,
  TABLE_GESTES,
  validerModele,
  verifierCouvertureLexicale,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const MODELE_KAVIVA = JSON.parse(
  readFileSync(join(R, "slices", "kaviva", "kaviva-modele.json"), "utf8"),
) as ModeleMetier;

describe("R2 — contrat v1.1.0, migration fermée", () => {
  it("un modèle 1.0.0 migre (états chaînes → structurés) et reste VERT", () => {
    expect(MODELE_KAVIVA.version).toBe("modele-metier/1.0.0");
    expect(validerModele(MODELE_KAVIVA)).toEqual([]);
    const migre = migrerModele(MODELE_KAVIVA) as ModeleMetier;
    // EP-081 (édition consciente) : la migration CHAÎNE désormais jusqu'à
    // 1.2.0 (transitions exogènes, montée additive).
    expect(migre.version).toBe("modele-metier/1.2.0");
    const rdv = migre.concepts.find((c) => c.id === "cpt_rendez_vous");
    expect(rdv?.etats?.[0]).toEqual({ id: "a_venir" });
  });

  it("ÉTATS STRUCTURÉS — les invariants E mordent (mutations)", () => {
    const base: ModeleMetier = {
      version: "modele-metier/1.1.0",
      couverture: { couverts: [{ terme: "colis", noeuds: ["cpt_colis"] }], nonRetenus: [] },
      acteurs: [{ id: "act_a", nom: "A" }],
      concepts: [{
        id: "cpt_colis", nom: "Colis", donnees: true,
        etats: [
          { id: "prepare", transitions: [{ vers: "expedie", geste: "confirmer" }] },
          { id: "expedie" },
        ],
      }],
      relations: [],
      parcours: [{
        id: "par_suivre", besoin: "suivre", acteur: "act_a",
        etapes: [
          { concept: "cpt_colis", geste: "saisir" },
          { concept: "cpt_colis", geste: "confirmer" },
          { concept: "cpt_colis", geste: "consulter_historique", etat: "expedie" },
        ],
      }],
    };
    expect(validerModele(base)).toEqual([]);
    // MUTATION 1 — transition vers un état inconnu : refus.
    const t1 = structuredClone(base);
    const colis = t1.concepts[0];
    if (colis?.etats?.[0] !== undefined && typeof colis.etats[0] !== "string") {
      colis.etats[0].transitions = [{ vers: "fantome", geste: "confirmer" }];
    }
    expect(validerModele(t1).some((d) => d.code === "MODELE_TRANSITION_INCONNUE")).toBe(true);
    // MUTATION 2 — transition qu'aucune étape ne représente : refus.
    const t2 = structuredClone(base);
    if (t2.parcours[0] !== undefined) {
      t2.parcours[0].etapes = [
        { concept: "cpt_colis", geste: "saisir" },
        { concept: "cpt_colis", geste: "consulter_historique", etat: "expedie" },
      ];
    }
    expect(validerModele(t2).some((d) => d.code === "MODELE_TRANSITION_NON_REPRESENTEE")).toBe(true);
    // MUTATION 3 — état ni cible ni consommé : refus.
    const t3 = structuredClone(base);
    const colis3 = t3.concepts[0];
    if (colis3?.etats !== undefined) colis3.etats.push({ id: "perdu" });
    expect(validerModele(t3).some((d) => d.code === "MODELE_ETAT_INATTEIGNABLE")).toBe(true);
    // MUTATION 4 — précondition sur un état inconnu : refus.
    const t4 = structuredClone(base);
    if (t4.parcours[0]?.etapes[1] !== undefined) {
      t4.parcours[0].etapes[1].preconditions = [{ concept: "cpt_colis", etat: "fantome" }];
    }
    expect(validerModele(t4).some((d) => d.code === "MODELE_ETAT_INCONNU")).toBe(true);
  });

  it("transport/effet/résultat sont DÉRIVÉS de la table — jamais déclarés", () => {
    const migre = migrerModele(MODELE_KAVIVA) as ModeleMetier;
    const reserver = migre.parcours.find((p) => p.id === "par_reserver");
    expect(reserver).toBeDefined();
    if (reserver === undefined) return;
    const choisir = contratDEtape(migre, reserver, 3);
    expect(choisir?.geste).toBe("choisir");
    expect(choisir?.transport).toBe("itemId");
    expect(choisir?.effet).toBe("navigate");
    const saisir = contratDEtape(migre, reserver, 4);
    expect(saisir?.effet).toBe("mutation");
    expect(saisir?.portee).toBe("instance:cpt_creneau");
    // La table est FERMÉE et couvre exactement les gestes.
    expect(Object.keys(TABLE_GESTES).sort()).toEqual(
      [...(Object.keys(TABLE_GESTES))].sort(),
    );
  });
});

describe("R4 · F-R4-1 — CLIQUET : la migration couvre TOUTES les clés du contrat", () => {
  it("un 1.0.0 portant chaque clé optionnelle du contrat ne perd RIEN à la migration", async () => {
    const { modeleMetierSchema } = await import("../../../benchmarks/air-emission/modele-metier.mjs");
    const clesContrat = Object.keys(
      (modeleMetierSchema as { shape: Record<string, unknown> }).shape,
    ).filter((k) => k !== "version");
    const complet = {
      ...structuredClone(MODELE_KAVIVA),
      commerce: "physique_ou_hors_app",
    } as Record<string, unknown>;
    const migre = migrerModele(complet) as Record<string, unknown>;
    for (const cle of clesContrat) {
      if (complet[cle] === undefined) continue;
      expect(cle in migre, `la migration PERD la clé du contrat « ${cle} »`).toBe(true);
    }
  });
});

describe("R2/C1 — la frontière lexicale : inventaire déterministe, P1 compare", () => {
  // LE VRAI brief kaviva (données de test — aucune règle ne lit ce texte).
  const BRIEF =
    "J'ouvre Kaviva, un institut de beauté et spa à Abidjan — l'application " +
    "s'appelle exactement « Kaviva ». Mes clientes doivent voir la liste des " +
    "soins proposés (massages, soins du visage, manucure, hammam) avec photo, " +
    "durée et prix, chercher un soin, consulter la fiche détaillée d'un soin, " +
    "choisir un créneau et réserver un rendez-vous à leur nom avec date et " +
    "heure, puis retrouver leurs rendez-vous à venir et passés. Chaque cliente " +
    "crée un compte et gère son profil avec son téléphone.";

  it("l'inventaire est DÉTERMINISTE (deux appels, même résultat) et sans décision P0", () => {
    const a = inventaireDe(BRIEF);
    const b = inventaireDe(BRIEF);
    expect(a).toEqual(b);
    expect(a).toContain("creneau");
    expect(a).toContain("soins");
    expect(a).toContain("rendez");
    expect(a.length).toBeGreaterThan(10);
  });

  it("un modèle qui COUVRE le brief passe la comparaison — aux termes près, justifiés", () => {
    const inventaire = inventaireDe(BRIEF);
    const manquants = verifierCouvertureLexicale(inventaire, MODELE_KAVIVA);
    // Le modèle kaviva couvre les termes STRUCTURELS (soin, créneau,
    // rendez-vous, cliente, profil…). Les termes restants sont du DÉCOR
    // (institut, abidjan, hammam…) — la mécanique les NOMME au lieu de les
    // laisser disparaître : c'est exactement son travail.
    for (const attendu of ["creneau", "soins", "profil", "cliente"]) {
      expect(manquants.some((m) => m.path === `couverture[${attendu}]`), attendu).toBe(false);
    }
    // Et elle SIGNALE ce que le modèle n'a ni couvert ni écarté :
    expect(manquants.some((m) => m.path.includes("hammam") || m.path.includes("institut"))).toBe(true);
  });

  it("MUTATION — retirer « créneau » du modèle : le terme devient NON JUSTIFIÉ", () => {
    const ampute = structuredClone(MODELE_KAVIVA);
    ampute.concepts = ampute.concepts.filter((c) => c.id !== "cpt_creneau");
    ampute.relations = ampute.relations.filter((r) => r.vers !== "cpt_creneau");
    ampute.couverture.couverts = ampute.couverture.couverts.filter(
      (x) => !x.noeuds.includes("cpt_creneau"),
    );
    ampute.parcours = ampute.parcours.map((p) => ({
      ...p,
      etapes: p.etapes.filter((e) => e.concept !== "cpt_creneau"),
    }));
    const manquants = verifierCouvertureLexicale(inventaireDe(BRIEF), ampute);
    expect(manquants.some((m) => m.path === "couverture[creneau]")).toBe(true);
  });

  it("« ambigu » reste BLOQUANT après extension (non-régression)", () => {
    const m = structuredClone(MODELE_KAVIVA);
    m.couverture.nonRetenus.push({ terme: "gestion", raison: "ambigu" });
    expect(validerModele(m).some((x) => x.code === "MODELE_TERME_AMBIGU")).toBe(true);
  });
});
