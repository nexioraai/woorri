// EP-136 — LA PROJECTION INTERROGATIVE ET L'ADDENDUM.
//
// Le moteur savait déjà refuser ; il sait maintenant demander. Ces tests
// tiennent les cinq comportements exigés, le cliquet régional, et les chemins
// par lesquels une question pourrait naître ailleurs.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as mm from "../../../benchmarks/air-emission/modele-metier.mjs";
import * as el from "../../../benchmarks/air-emission/elicitation.mjs";
import type { DiagnosticModele, Intention } from "../../../benchmarks/air-emission/elicitation.d.mts";

import { requis } from "./helpers.ts";
const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");

type Modele = Record<string, unknown>;
const charger = (chemin: string): Modele =>
  mm.migrerModele(JSON.parse(readFileSync(chemin, "utf8"))) as Modele;

// DEUX TAILLES : la fixture métier versionnée, et un modèle de run réel.
const PETIT = charger(join(R, "slices", "kaviva", "kaviva-modele.json"));
const GRAND = (() => {
  const brut = JSON.parse(readFileSync(join(R, "benchmarks", "air-emission", "results",
    "marketplace-africain.2026-09-12T15-27-32-324Z.modele-p0-t1.air.json"), "utf8")) as { modele?: unknown };
  return mm.migrerModele(brut.modele ?? brut) as Modele;
})();

// EP-139 — le modèle de run « grand » exige un compte avant de rien montrer
// (5.1.1(iv)) : il n'est plus vert, et c'est un RÉSULTAT. Ces tests portent
// sur l'élicitation ; ils écartent ce diagnostic-là, nommément — et il est
// de classe `faute_de_production`, donc il ne produit aucune question, ce
// que le test « une faute de production ne demande rien » vérifie déjà.
const diagnostics = (m: Modele): DiagnosticModele[] =>
  (mm.validerModele(m) as DiagnosticModele[]).filter(
    (x) => x.code !== "MODELE_COEUR_EXIGE_CONNEXION",
  );

/** Mutation : un parcours paie, et le fait `commerce` manque. */
const sansCommerce = (base: Modele): Modele => {
  const m = structuredClone(base);
  delete m.commerce;
  const parcours = requis((m.parcours as { etapes: { concept: string; geste: string }[] }[])[0], "arcoursasetapesconceptstringgestestring0");
  const derniere = requis(parcours.etapes[parcours.etapes.length - 1], "parcours.etapesparcours.etapes.length1");
  parcours.etapes.splice(parcours.etapes.length - 1, 0, { concept: derniere.concept, geste: "payer" });
  return m;
};

describe("EP-136 · base verte, deux tailles", () => {
  it("un modèle complet ne pose AUCUNE question", () => {
    for (const [nom, m] of [["petit", PETIT], ["grand", GRAND]] as const) {
      expect(diagnostics(m), nom).toEqual([]);
      expect(el.elicitationDe(diagnostics(m), { interlocuteur: true }).statut, nom)
        .toBe("aucune_question");
    }
  });
});

describe("EP-136 · ① un diagnostic « intention manquante » produit sa question", () => {
  it("sur les deux tailles, le fait manquant devient une question lisible", () => {
    for (const [nom, base] of [["petit", PETIT], ["grand", GRAND]] as const) {
      const codes = diagnostics(sansCommerce(base)).map((x) => x.code);
      expect(codes, nom).toContain("MODELE_COMMERCE_ABSENT");
      const r = el.elicitationDe(diagnostics(sansCommerce(base)), { interlocuteur: true });
      expect(r.statut, nom).toBe("questions");
      expect(r.questions, nom).toHaveLength(1);
      const q = requis(r.questions[0], "r.questions0");
      expect(q.destination).toBe("commerce");
      // Compréhensible sans connaître le moteur : ni code, ni chemin.
      expect(q.texte).not.toMatch(/MODELE_|couverture\.|parcours\[/);
      expect(q.texte).toContain("?");
    }
  });

  it("un terme que le moteur a lui-même dit ambigu revient à son auteur", () => {
    const m = structuredClone(PETIT);
    (m.couverture as { nonRetenus: { terme: string; raison: string }[] }).nonRetenus
      .push({ terme: "réalité africaine", raison: "ambigu" });
    const r = el.elicitationDe(diagnostics(m), { interlocuteur: true });
    expect(r.questions.map((q) => q.code)).toContain("MODELE_TERME_AMBIGU");
    // La formulation REND ses mots à l'humain — c'est son texte, pas une
    // connaissance régionale du moteur.
    expect(r.questions.find((q) => q.code === "MODELE_TERME_AMBIGU")?.texte)
      .toContain("réalité africaine");
  });
});

describe("EP-136 · ② une faute de production ne produit AUCUNE question", () => {
  it("un modèle cassé se re-tire, il ne se demande pas", () => {
    const m = structuredClone(PETIT);
    const parcours = requis((m.parcours as { etapes: { concept: string }[] }[])[0], "m.parcoursasetapesconceptstring0");
    requis(parcours.etapes[0], "parcours.etapes0").concept = "cpt_fantome";
    const d = diagnostics(m);
    expect(d.map((x) => x.code)).toContain("MODELE_REFERENCE_INCONNUE");
    expect(el.elicitationDe(d, { interlocuteur: true }).statut).toBe("aucune_question");
  });

  it("aucune question n'existe hors de la classe qui la fonde", () => {
    for (const code of Object.keys(el.QUESTIONS)) {
      expect((mm.DIAGNOSTICS as Record<string, { classe: string }>)[code]?.classe, code)
        .toBe("intention_manquante");
    }
  });
});

describe("EP-136 · ③ une réponse enrichit l'addendum, JAMAIS le brief", () => {
  const BRIEF = "une application mobile pour un marché en ligne";

  it("le brief est identique avant et après, et l'addendum ordonné", () => {
    const depart: Intention = el.creerIntention(BRIEF);
    const apres = el.repondre(depart, {
      code: "MODELE_COMMERCE_ABSENT",
      texte: "Le paiement se conclut-il dans l'application ?",
      reponse: "hors de l'application",
    });
    expect(apres.brief).toBe(BRIEF);
    expect(depart.addendum).toHaveLength(0); // l'intention d'origine est intacte
    expect(apres.addendum).toHaveLength(1);
    expect(requis(apres.addendum[0], "apres.addendum0").rang).toBe(0);
    expect(requis(apres.addendum[0], "apres.addendum0").destination).toBe("commerce");
  });

  it("le gel n'est pas décoratif : écrire dans le brief est impossible", () => {
    const intention = el.creerIntention(BRIEF);
    expect(() => {
      (intention as { brief: string }).brief = "autre chose";
    }).toThrow();
    expect(intention.brief).toBe(BRIEF);
  });

  it("l'addendum est REDEVABLE : ses termes entrent dans l'inventaire", () => {
    const intention = el.repondre(el.creerIntention(BRIEF), {
      code: "MODELE_COMMERCE_ABSENT",
      texte: "Comment le paiement se conclut-il ?",
      reponse: "remise en main propre au vendeur",
    });
    const inventaire = el.inventaireDIntention(intention);
    // Sans cela, l'addendum serait un canal de texte non jugé.
    expect(inventaire).toContain("vendeur");
    expect(el.texteDIntention(intention)).toContain(BRIEF);
  });

  it("répondre à ce qui n'est pas une question projetée JETTE", () => {
    expect(() =>
      el.repondre(el.creerIntention(BRIEF), {
        code: "MODELE_REFERENCE_INCONNUE",
        texte: "?",
        reponse: "x",
      }),
    ).toThrow(/EP-136/);
  });
});

describe("EP-136 · ④ une réponse stérile n'ouvre pas un tour de plus", () => {
  it("un périmètre inchangé est stérile", () => {
    const avant = ["MODELE_COMMERCE_ABSENT"];
    expect(el.reponseSterile(avant, ["MODELE_COMMERCE_ABSENT"])).toBe(true);
  });

  it("un périmètre réduit est un progrès", () => {
    expect(el.reponseSterile(["MODELE_COMMERCE_ABSENT", "MODELE_TERME_AMBIGU"],
      ["MODELE_TERME_AMBIGU"])).toBe(false);
  });

  it("un périmètre qui CHANGE de nature est stérile aussi — sinon on tourne", () => {
    // Répondre a fait disparaître une question et en a fait naître une autre :
    // le compte est le même, le problème a seulement bougé.
    expect(el.reponseSterile(["MODELE_COMMERCE_ABSENT"], ["MODELE_TERME_AMBIGU"])).toBe(true);
  });

  it("le périmètre ne retient QUE les questions ouvertes", () => {
    const m = sansCommerce(PETIT);
    (m.couverture as { nonRetenus: { terme: string; raison: string }[] }).nonRetenus
      .push({ terme: "quelque chose", raison: "ambigu" });
    expect(el.perimetreDElicitation(diagnostics(m)))
      .toEqual(["MODELE_COMMERCE_ABSENT", "MODELE_TERME_AMBIGU"]);
  });
});

describe("EP-136 · ⑤ R-5 — sans interlocuteur, REFUS EXPLICITE", () => {
  it("une exécution non interactive refuse au lieu de supposer", () => {
    const d = diagnostics(sansCommerce(PETIT));
    const r = el.elicitationDe(d); // aucun interlocuteur : le défaut
    expect(r.statut).toBe("refus");
    expect(r.statut === "refus" && r.raison).toMatch(/INCOMPLET|ne suppose pas/);
    // Les questions restent VISIBLES : le rapport dit ce qui manquait.
    expect(r.questions).toHaveLength(1);
  });

  it("le défaut est le refus — il faut DÉCLARER un interlocuteur", () => {
    const d = diagnostics(sansCommerce(PETIT));
    expect(el.elicitationDe(d, {}).statut).toBe("refus");
    expect(el.elicitationDe(d, { interlocuteur: false }).statut).toBe("refus");
    expect(el.elicitationDe(d, { interlocuteur: true }).statut).toBe("questions");
  });
});

describe("EP-136 · CLIQUET RÉGIONAL — la région n'entre pas dans la règle", () => {
  it("deux briefs de régions différentes posent la MÊME question, mot pour mot", () => {
    const a = el.elicitationDe(diagnostics(sansCommerce(PETIT)), { interlocuteur: true });
    const b = el.elicitationDe(diagnostics(sansCommerce(GRAND)), { interlocuteur: true });
    // Les deux modèles viennent de domaines et de régions différents ; la
    // question posée est strictement identique. Toute divergence prouverait
    // qu'une table régionale s'est glissée quelque part.
    expect(requis(a.questions[0], "a.questions0").texte).toBe(requis(b.questions[0], "b.questions0").texte);
    expect(requis(a.questions[0], "a.questions0").destination).toBe(requis(b.questions[0], "b.questions0").destination);
  });

  it("la même réponse structurelle produit le même addendum, quelle que soit la région", () => {
    const faire = (brief: string): unknown =>
      el.repondre(el.creerIntention(brief), {
        code: "MODELE_COMMERCE_ABSENT",
        texte: requis(el.QUESTIONS.MODELE_COMMERCE_ABSENT, "el.QUESTIONS.MODELE_COMMERCE_ABSENT").demande({ code: "", path: "", message: "" }),
        reponse: "hors de l'application",
      }).addendum;
    expect(faire("un marché en ligne au Tchad")).toEqual(faire("un marché en ligne en Norvège"));
  });

  it("aucun nom de région ni de service dans les formulations du moteur", () => {
    const textes = Object.values(el.QUESTIONS)
      .map((q) => q.demande({ code: "", path: "", message: "«TERME»" }))
      .join(" ")
      .toLocaleLowerCase();
    for (const mot of ["afrique", "africain", "tchad", "sahel", "europe", "france",
      "whatsapp", "mobile money", "orange money", "carte bancaire", "paypal"]) {
      expect(textes.includes(mot), `« ${mot} »`).toBe(false);
    }
  });
});

describe("EP-136 · LES CHEMINS (règle d'EP-132)", () => {
  it("la projection est EXHAUSTIVE dans les deux sens — vérifié au CHARGEMENT", () => {
    expect(Object.keys(el.QUESTIONS).sort())
      .toEqual((mm.diagnosticsDeClasse("intention_manquante")).sort());
    const source = readFileSync(join(R, "benchmarks", "air-emission", "elicitation.mjs"), "utf8");
    // Le cliquet n'attend pas qu'un test tourne : le module refuse d'exister.
    expect(source).toContain("throw new Error(");
    expect(source).toContain("EP-136 — projection incomplète");
  });

  it("aucune question n'est écrite ailleurs dans le banc", () => {
    // Le chemin de contournement : un texte de question en dur dans un autre
    // module, qui n'aurait ni diagnostic ni destination.
    for (const fichier of ["modele-metier.mjs", "acceptation.mjs", "passe0.mjs"]) {
      const source = readFileSync(join(R, "benchmarks", "air-emission", fichier), "utf8");
      expect(source, fichier).not.toContain("se conclut-il");
      expect(source, fichier).not.toContain("Qu'entendez-vous");
    }
  });
});
