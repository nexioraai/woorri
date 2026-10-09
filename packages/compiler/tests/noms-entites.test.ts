// ============================================================
// LES NOMS D'ENTITÉS SE DÉRIVENT, ILS NE SE TRADUISENT PAS.
//
// MESURÉ (tirs réels 4 et db22481a) : l'émission copiait les noms FRANÇAIS
// du modèle — « Dépense », « Compte utilisateur » — comme `entities[].name`,
// là où le schéma exige ^[a-z][a-z0-9_]*$. Trois concepts, trois
// SCHEMA@entities.N.name, à chaque tir. La fixture prouve la chaîne entière :
// concepts nommés en français → `nomAirDe` → identifiants valides → le
// SCHÉMA STRICT lui-même est silencieux.
// ============================================================
import { describe, expect, it } from "vitest";
import { projectAirSchema } from "@deribfy/air-schema";
import * as derivationsModele from "../../../benchmarks/air-emission/modele-metier.mjs";
import type { ModeleMetier } from "../../../benchmarks/air-emission/modele-metier.mjs";

const AIR_NAME = /^[a-z][a-z0-9_]*$/;

// ── LA FIXTURE DU DÉFAUT : les trois concepts du tir db22481a, noms
// français, accents et espaces compris.
const MODELE: ModeleMetier = {
  version: "modele-metier/1.2.0",
  acteurs: [{ id: "act_client", nom: "Client" }],
  concepts: [
    { id: "ent_depense", nom: "Dépense", donnees: true, attributs: [
      { id: "att_libelle", nature: "texte", requis: true },
      { id: "att_montant", nature: "nombre", requis: true },
    ] },
    { id: "ent_compte_utilisateur", nom: "Compte utilisateur", donnees: true, attributs: [
      { id: "att_email", nature: "texte", requis: true },
    ] },
    { id: "ent_categorie_depense", nom: "Catégorie de dépense", donnees: true, attributs: [
      { id: "att_nom_categorie", nature: "texte", requis: true },
    ] },
  ],
  relations: [],
  // Un parcours réel : `obligationsPrescriptives` dérive la navigation du
  // plan en tête de fonction — un plan bouchonné ne suffit pas.
  parcours: [
    { id: "par_consulter", besoin: "consulter mes dépenses", acteur: "act_client", etapes: [
      { concept: "ent_depense", geste: "decouvrir" },
      { concept: "ent_depense", geste: "choisir" },
      { concept: "ent_depense", geste: "consulter" },
    ] },
  ],
  couverture: { couverts: [{ terme: "dépenses", noeuds: ["ent_depense"] }], nonRetenus: [] },
} as unknown as ModeleMetier;

describe("nomAirDe — la dérivation mécanique", () => {
  it("chaque concept français donne un identifiant valide pour le schéma", () => {
    for (const c of MODELE.concepts) {
      const nom = derivationsModele.nomAirDe((c as { id: string }).id);
      expect(nom, (c as { id: string }).id).toMatch(AIR_NAME);
    }
    expect(derivationsModele.nomAirDe("ent_depense")).toBe("depense");
    expect(derivationsModele.nomAirDe("ent_compte_utilisateur")).toBe("compte_utilisateur");
    expect(derivationsModele.nomAirDe("att_montant")).toBe("montant");
  });

  it("garde fail-closed : un reste qui ne tient pas seul rend l'id entier — toujours valide", () => {
    // `ent_2024` passe le regex ID (commence par « e ») mais son reste
    // commencerait par un chiffre ; un id sans préfixe de famille reste lui-même.
    expect(derivationsModele.nomAirDe("ent_2024")).toBe("ent_2024");
    expect(derivationsModele.nomAirDe("commande")).toBe("commande");
    expect(derivationsModele.nomAirDe("ent_2024")).toMatch(AIR_NAME);
  });

  it("LE SCHÉMA STRICT LUI-MÊME est silencieux sur une entité ainsi nommée", () => {
    const entites = MODELE.concepts.map((c) => ({
      id: (c as { id: string }).id,
      name: derivationsModele.nomAirDe((c as { id: string }).id),
      fields: ((c as { attributs: { id: string }[] }).attributs ?? []).map((a) => ({
        id: `fld_${derivationsModele.nomAirDe((c as { id: string }).id)}_${derivationsModele.nomAirDe(a.id)}`,
        name: derivationsModele.nomAirDe(a.id),
        label: [{ locale: "fr", text: "Libellé" }],
        type: "string",
        required: true,
      })),
    }));
    const juge = projectAirSchema.pick({ entities: true }).safeParse({ entities: entites });
    expect(
      juge.success,
      juge.success ? "" : JSON.stringify(juge.error.issues.slice(0, 3)),
    ).toBe(true);
  });
});

describe("la prescription porte les noms — le modèle n'a plus rien à traduire", () => {
  it("la passe entites prescrit `name` EXACTEMENT, concept par concept", () => {
    const texte = derivationsModele.obligationsPrescriptives(
      "entites",
      MODELE,
      derivationsModele.ecransDe(MODELE), // le VRAI plan, pas un bouchon
      3,
    );
    expect(texte).toContain('name EXACTEMENT "depense"');
    expect(texte).toContain('name EXACTEMENT "compte_utilisateur"');
    expect(texte).toContain('name EXACTEMENT "categorie_depense"');
    // Les attributs aussi — même famille de défaut, même prescription.
    expect(texte).toContain('att_montant (name "montant")');
    // Et la règle est dite : les libellés humains vont dans `label`.
    expect(texte).toContain("JAMAIS une traduction");
  });
});
