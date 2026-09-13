// EP-143 — LES OBLIGATIONS DU PROPRIÉTAIRE, LIVRÉES.
//
// EP-142 les avait DÉRIVÉES ; elles n'atteignaient personne — une connaissance
// du moteur, pas une information de celui qui publie. Le fichier voyage avec
// le code et survit à la session.
import { describe, expect, it } from "vitest";
import { obligationsDuProprietaire, rendrePublicationMd } from "../src/index.ts";
import { L, P, air } from "./fixtures.ts";

type Air = ReturnType<typeof air>;

function document(compliance: Partial<Air["compliance"]>, nom = "Essai"): Air {
  return air({
    app: {
      name: nom,
      slug: "essai",
      locales: {
        userLanguage: "fr-FR",
        appLocales: ["fr-FR"],
        defaultAppLocale: "fr-FR",
        contentLocales: ["fr-FR"],
        rtlSupported: false,
      },
    },
    screens: [
      {
        id: "scr_a",
        title: L("A"),
        blocks: [{ id: "blk_a", blockType: "header", props: P({ title: "A" }) }],
      },
    ],
    compliance: {
      commerceClass: "none",
      accountDeletionRequired: false,
      dataCollected: [],
      ...compliance,
    },
  });
}

const AVEC_COMPTE = document({ accountDeletionRequired: true, dataCollected: ["identifiers"] });
const SANS_COMPTE = document({ accountDeletionRequired: false, dataCollected: [] });

describe("EP-143 · ① dérivé, jamais listé", () => {
  it("une application AVEC compte porte la suppression et le compte de démonstration", () => {
    const md = rendrePublicationMd(AVEC_COMPTE);
    expect(md).toContain("suppression de compte");
    expect(md).toContain("compte de démonstration");
  });

  it("une application SANS compte ne les porte PAS", () => {
    const md = rendrePublicationMd(SANS_COMPTE);
    expect(md).not.toContain("suppression de compte");
    expect(md).not.toContain("compte de démonstration");
  });

  it("une application sans collecte n'a pas de section Data safety", () => {
    expect(rendrePublicationMd(SANS_COMPTE)).not.toContain("Data safety");
    const avec = rendrePublicationMd(AVEC_COMPTE);
    expect(avec).toContain("Data safety");
    expect(avec).toContain("`identifiers`");
  });

  it("le fichier parle de CETTE application, par son nom", () => {
    expect(rendrePublicationMd(document({}, "Mon Marché"))).toContain("Publier « Mon Marché »");
  });

  it("une application plus simple porte MOINS de lignes", () => {
    const compter = (md: string): number => (md.match(/- \[ \]/g) ?? []).length;
    expect(compter(rendrePublicationMd(SANS_COMPTE)))
      .toBeLessThan(compter(rendrePublicationMd(AVEC_COMPTE)));
  });
});

describe("EP-143 · ② écrit pour un humain qui n'a jamais lu le protocole", () => {
  it("aucun code de diagnostic, aucun vocabulaire interne", () => {
    const md = rendrePublicationMd(AVEC_COMPTE);
    for (const jargon of [
      "PRESENTATION_", "MODELE_", "AIR_", "EP-1", "L-13", "purpose",
      "airSchemaVersion", "compliance.", "diagnostic", "cliquet", "juge",
    ]) {
      expect(md.includes(jargon), `« ${jargon} » n'a rien à faire ici`).toBe(false);
    }
  });

  it("chaque ligne cite sa source et se coche", () => {
    const md = rendrePublicationMd(AVEC_COMPTE);
    const taches = (md.match(/- \[ \]/g) ?? []).length;
    const sources = (md.match(/\*Exigé par :/g) ?? []).length;
    expect(taches).toBeGreaterThan(0);
    expect(sources).toBe(taches);
  });

  it("les trois lieux sont des sections lisibles, pas des étiquettes", () => {
    const md = rendrePublicationMd(AVEC_COMPTE);
    expect(md).toContain("## Ce que vous devez fournir");
    expect(md).toContain("## Ce que vous devez faire en console");
    expect(md).toContain("## Ce que vous devez posséder");
    // La valeur INTERNE ne doit pas transparaître. « fournir » et « console »
    // sont des mots français légitimes dans un titre ; « posseder » sans
    // accent ne peut venir que du code.
    expect(md.includes("posseder")).toBe(false);
  });
});

describe("EP-143 · ③ le fichier ne remplace pas les politiques", () => {
  it("il dit ce qu'il faut écrire, et dit qu'il ne l'écrit pas", () => {
    const md = rendrePublicationMd(AVEC_COMPTE);
    expect(md).toContain("il ne l'écrit pas");
    expect(md).toContain("vous engage");
  });

  it("aucun texte de politique n'est fourni — pas même un modèle", () => {
    const md = rendrePublicationMd(AVEC_COMPTE).toLocaleLowerCase();
    for (const amorce of ["nous collectons", "en utilisant cette application", "conformément au rgpd"]) {
      expect(md.includes(amorce), amorce).toBe(false);
    }
  });
});

describe("EP-143 · CLIQUET (règle d'EP-132)", () => {
  it("AUCUNE obligation dérivée ne reste dans le moteur sans être rendue", () => {
    // Le chemin de fuite : une obligation ajoutée à la dérivation et oubliée
    // dans le rendu. Elle existerait pour le moteur, pas pour le propriétaire.
    for (const doc of [AVEC_COMPTE, SANS_COMPTE]) {
      const md = rendrePublicationMd(doc);
      for (const o of obligationsDuProprietaire(doc)) {
        expect(md.includes(o.quoi), `non rendue : ${o.quoi.slice(0, 50)}`).toBe(true);
        expect(md.includes(o.source), `source non rendue : ${o.source}`).toBe(true);
      }
    }
  });

  it("toute MATIÈRE préparée est rendue, valeur par valeur", () => {
    const doc = document({ dataCollected: ["location", "purchases", "diagnostics"] });
    const md = rendrePublicationMd(doc);
    for (const o of obligationsDuProprietaire(doc)) {
      for (const m of o.matiere ?? []) expect(md).toContain(m);
    }
  });

  it("un lieu sans obligation ne laisse pas de section vide", () => {
    // Une section vide ferait croire à un oubli plutôt qu'à une absence.
    const md = rendrePublicationMd(SANS_COMPTE);
    expect(md).not.toMatch(/##[^\n]*\n\n[^\n]*\n\n##/);
  });
});

// EP-177 ① — LA STRUCTURE N'EST PAS LE TEXTE.
describe("EP-177 · le sommaire d'une politique, jamais son texte", () => {
  it("le fichier dit ce que la politique doit COUVRIR", () => {
    const md = rendrePublicationMd(AVEC_COMPTE);
    expect(md).toContain("## Ce que votre politique doit couvrir");
    for (const sujet of ["Quelles données", "Avec qui", "Combien de temps", "Où le texte est hébergé"]) {
      expect(md, `sujet manquant : ${sujet}`).toContain(sujet);
    }
  });

  it("ET TOUJOURS AUCUN TEXTE DE POLITIQUE — l'interdiction d'EP-143 tient", () => {
    // VÉRIFIÉ avant d'écrire : l'interdiction porte sur des AMORCES DE PHRASE
    // juridique, pas sur la liste des sujets qu'une plateforme exige. On la
    // re-vérifie ici plutôt que de s'en remettre au test d'origine.
    const md = rendrePublicationMd(AVEC_COMPTE).toLocaleLowerCase();
    for (const amorce of [
      "nous collectons",
      "en utilisant cette application",
      "conformément au rgpd",
      "le présent document",
      "vous acceptez",
    ]) {
      expect(md.includes(amorce), amorce).toBe(false);
    }
  });

  it("LE SOMMAIRE NE REDOUBLE PAS UNE SOURCE — il précise une tâche existante", () => {
    // Le cliquet d'EP-143 exige autant de sources que de tâches cochables.
    // Un sommaire qui citerait sa propre source ferait mentir ce compte, et
    // laisserait croire à une obligation de plus.
    const md = rendrePublicationMd(AVEC_COMPTE);
    expect((md.match(/\*Exigé par :/g) ?? []).length).toBe((md.match(/- \[ \]/g) ?? []).length);
    expect(md).toContain("Ils ne s'ajoutent pas à votre liste");
  });
});
