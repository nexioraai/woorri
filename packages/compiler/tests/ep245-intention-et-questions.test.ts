/**
 * EP-245 · DERIBFY QUESTIONNE AU LIEU DE DEVINER — CE QUI EST VRAI, ET
 * JUSQU'OÙ.
 *
 * ── CE QUE LE PROPRIÉTAIRE DEMANDE DE PROUVER.
 *
 * (a) que l'intention de l'utilisateur est LUE ;
 * (b) qu'une demande imprécise déclenche des QUESTIONS, pas une invention.
 *
 * ── CE QUE CE FICHIER ÉTABLIT, ET CE QU'IL NE CACHE PAS.
 *
 * Le mécanisme existe et il est net : `elicitationDe` transforme en questions
 * les diagnostics classés `intention_manquante`, et REFUSE de supposer quand
 * personne ne peut répondre. Deux gardes, pas une.
 *
 * MAIS IL EST ÉTROIT, et le dire vaut mieux que de l'habiller : la table ne
 * classe que DEUX codes comme « intention manquante » — un terme ambigu, et
 * un commerce absent. Tout le reste est classé `faute_de_production` (au
 * générateur de corriger) ou `defaut_de_brief`. Autrement dit : Deribfy
 * questionne sur ce qu'il sait nommer, pas sur tout ce qu'il ignore. Une
 * demande vague qui ne déclenche AUCUN de ces deux codes ne produira AUCUNE
 * question.
 *
 * Ce test mesure donc la frontière, au lieu de promettre un dialogue général.
 */
import { describe, expect, it } from "vitest";
import {
  diagnosticsDeClasse,
  DIAGNOSTICS,
} from "../../../benchmarks/air-emission/modele-metier.mjs";
import {
  elicitationDe,
  creerIntention,
  repondre,
  texteDIntention,
} from "../../../benchmarks/air-emission/elicitation.mjs";

describe("EP-245 · l intention est lue, l ambiguïté est questionnée", () => {
  it("(a) L INTENTION EST LUE — le brief reste intact, les réponses s y ajoutent", () => {
    // Le brief ne se réécrit JAMAIS : les réponses s'ajoutent en addendum.
    // Sans ça, répondre à une question écraserait la demande d'origine.
    const i = creerIntention("une application de tontine pour mon quartier");
    const apres = repondre(i, {
      code: "MODELE_TERME_AMBIGU",
      texte: "que veut dire « tontine » ici ?",
      reponse: "une cotisation tournante entre voisins",
    });
    expect(apres.brief, "le brief d origine a été réécrit").toBe(i.brief);
    expect(texteDIntention(apres), "la réponse n atteint pas P0").toMatch(/cotisation tournante/u);
    expect(texteDIntention(apres), "le brief a disparu du texte lu par P0").toMatch(/tontine/u);
  });

  it("(b) DEMANDE AMBIGUË → QUESTIONS, pas un modèle inventé", () => {
    const ambigu = [
      { code: "MODELE_TERME_AMBIGU", path: "couverture", message: "« tontine » : sens non tranché" },
    ];
    // `questions` est READONLY dans le module : le declarer mutable ici
    // forcerait une conversion par `unknown`, qui ne protege rien et masque
    // les vraies incompatibilites. On respecte le contrat tel qu il est.
    const r = elicitationDe(ambigu, { interlocuteur: true }) as {
      statut: string
      questions: readonly { code: string; texte: string }[]
    };
    expect(r.statut, "une demande ambiguë n a produit aucune question").toBe("questions");
    expect(r.questions.length).toBeGreaterThan(0);
    expect(r.questions[0]?.texte, "la question est vide").toBeTruthy();
  });

  it("(b bis) DEMANDE PRÉCISE → il procède, sans question de politesse", () => {
    // Poser une question quand rien ne manque ferait perdre un tour à
    // l'utilisateur et coûterait un aller-retour payant.
    const r = elicitationDe([], { interlocuteur: true }) as { statut: string };
    expect(r.statut).toBe("aucune_question");
  });

  it("SANS INTERLOCUTEUR, il REFUSE au lieu de supposer", () => {
    // Le chemin campagne n'a personne à qui demander. Deviner y serait pire
    // que refuser : on livrerait une application fondée sur une supposition.
    const ambigu = [
      { code: "MODELE_TERME_AMBIGU", path: "couverture", message: "sens non tranché" },
    ];
    const r = elicitationDe(ambigu) as { statut: string };
    expect(r.statut, "il a supposé au lieu de refuser").not.toBe("questions");
  });

  it("LA FRONTIÈRE, mesurée et non promise : SEULS deux codes questionnent", () => {
    // ── CE QUE CE CONTRÔLE DIT AU PROPRIÉTAIRE.
    //
    // Deribfy ne questionne pas « quand la demande est vague » en général.
    // Il questionne quand un juge nomme précisément un manque d'INTENTION.
    // La table en compte deux. Si demain on en ajoute, ce test le dira — et
    // si on en retire, aussi.
    const codes = diagnosticsDeClasse("intention_manquante");
    expect(codes.sort()).toEqual(["MODELE_COMMERCE_ABSENT", "MODELE_TERME_AMBIGU"]);

    // Et le reste est classé : rien n'est laissé sans propriétaire.
    const classes = new Set(
      Object.values(DIAGNOSTICS as Record<string, { classe: string }>).map((d) => d.classe),
    );
    expect(classes.size, "une seule classe : plus personne ne distingue les responsabilités")
      .toBeGreaterThan(1);
  });
});
