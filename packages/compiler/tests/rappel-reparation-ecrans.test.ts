// ============================================================
// LA RÉPARATION NE SUPPRIME PAS — ET ON LE DIT À CHAQUE BOUCHÉE.
//
// MESURÉ (reprise a8b12457, tour 2) : face à 79 diagnostics d'un coup, la
// réparation a SUPPRIMÉ 19 nœuds — dont les écrans d'identité posés au tour
// précédent. La gate a rejeté le tour (6,27 $ de tours consignés en pure
// perte sur ce tir). Cette fixture prouve que les prescriptions d'écrans —
// le canal que CHAQUE appel de réparation reçoit (EP-073 ②) — nomment les
// écrans d'identité et déclarent la suppression comme AMPUTATION rejetée.
// ============================================================
import { describe, expect, it } from "vitest";
import * as derivationsModele from "../../../benchmarks/air-emission/modele-metier.mjs";
import type { ModeleMetier } from "../../../benchmarks/air-emission/modele-metier.mjs";

// ── LA FIXTURE DU DÉFAUT : « noter mes dépenses » AVEC le concept compte et
// le geste s_identifier — la forme exacte dont le tour 2 a supprimé l'écran.
const MODELE: ModeleMetier = {
  version: "modele-metier/1.2.0",
  acteurs: [{ id: "act_moi", nom: "Moi" }],
  concepts: [
    {
      id: "ent_depense",
      nom: "Dépense",
      donnees: true,
      attributs: [
        { id: "att_libelle", nature: "texte", requis: true },
        { id: "att_montant", nature: "nombre", requis: true },
      ],
    },
    {
      id: "ent_compte",
      nom: "Compte",
      donnees: true,
      attributs: [{ id: "att_email", nature: "texte", requis: true }],
    },
  ],
  relations: [],
  parcours: [
    {
      id: "par_noter",
      besoin: "noter une dépense",
      acteur: "act_moi",
      etapes: [
        { concept: "ent_depense", geste: "saisir" },
        { concept: "ent_depense", geste: "confirmer" },
      ],
    },
    {
      id: "par_connexion",
      besoin: "retrouver mes dépenses",
      acteur: "act_moi",
      etapes: [
        { concept: "ent_compte", geste: "s_identifier" },
        { concept: "ent_depense", geste: "consulter_historique" },
      ],
    },
  ],
  couverture: {
    couverts: [
      { terme: "dépenses", noeuds: ["ent_depense"] },
      { terme: "noter", noeuds: ["par_noter"] },
      { terme: "compte", noeuds: ["ent_compte"] },
    ],
    nonRetenus: [],
  },
} as unknown as ModeleMetier;

describe("le rappel anti-suppression des prescriptions d'écrans", () => {
  const plan = derivationsModele.ecransDe(MODELE);
  const texte = derivationsModele.obligationsPrescriptives("ecrans", MODELE, plan, 3);

  it("la clause est dite : les écrans EXISTENT, les retirer est une AMPUTATION rejetée", () => {
    expect(texte).toContain("EN RÉPARATION");
    expect(texte).toContain("AMPUTATION détectée et REJETÉE");
    expect(texte).toContain("n'efface jamais ce qu'un diagnostic ne nomme pas");
  });

  it("les écrans d'identité sont NOMMÉS un par un — celui que le tour 2 a supprimé en tête", () => {
    // Le même chemin de dérivation que `prescriptifDe` (moteur) : le prédicat
    // partagé décide, la prescription énumère — jamais une liste recopiée.
    const conceptsIdentite = (MODELE as unknown as { concepts: { id: string }[] }).concepts
      .map((c) => c.id)
      .filter((id) => derivationsModele.estConceptIdentite(MODELE, id));
    expect(conceptsIdentite).toContain("ent_compte");
    const surfaces = derivationsModele.surfacesDe(MODELE) as {
      surfaceId: string;
      concept: string;
    }[];
    const ecransIdentite = (plan as unknown as { ecrans: { ecranId: string; surfaces?: string[] }[] }).ecrans
      .filter((e) =>
        (e.surfaces ?? []).some((sid) =>
          conceptsIdentite.includes(surfaces.find((sf) => sf.surfaceId === sid)?.concept ?? ""),
        ),
      )
      .map((e) => derivationsModele.ecranAirDe(e.ecranId));
    expect(ecransIdentite.length).toBeGreaterThan(0);
    for (const id of ecransIdentite) expect(texte).toContain(id);
    expect(texte).toContain("écrans d'identité");
  });

  it("sans concept d'identité, la clause reste — sans la parenthèse d'identité", () => {
    const sansCompte = JSON.parse(JSON.stringify(MODELE)) as ModeleMetier;
    (sansCompte as unknown as { concepts: unknown[] }).concepts = (
      sansCompte as unknown as { concepts: { id: string }[] }
    ).concepts.filter((c) => c.id !== "ent_compte");
    (sansCompte as unknown as { parcours: unknown[] }).parcours = (
      sansCompte as unknown as { parcours: { id: string }[] }
    ).parcours.filter((pr) => pr.id !== "par_connexion");
    const t2 = derivationsModele.obligationsPrescriptives(
      "ecrans", sansCompte, derivationsModele.ecransDe(sansCompte), 3,
    );
    expect(t2).toContain("AMPUTATION détectée et REJETÉE");
    expect(t2).not.toContain("écrans d'identité");
  });
});
