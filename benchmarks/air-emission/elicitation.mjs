// EP-136 — LA PROJECTION INTERROGATIVE ET L'ADDENDUM.
//
// Troisième et dernière passe de la séquence EP-133. Ce module rend
// INTERROGATIVE la classe « intention manquante » posée en EP-135, et pose
// l'intention comme couple { brief scellé, addendum ordonné }.
//
// CE QU'IL N'EST PAS : un cerveau. Aucune décision de modèle n'est prise ici,
// aucun appel payant n'est émis, aucun texte n'est inventé. P0 reste l'unique
// lecteur du brief (EP-133 ①) ; ce module ne fait que retourner en question un
// refus que le juge a DÉJÀ prononcé.
//
// DEUX QUESTIONS AUJOURD'HUI. C'est le résultat de la mesure d'EP-135 — deux
// diagnostics sur dix-neuf passent le critère « un humain peut y répondre sans
// connaître le moteur » — et non une limite de conception : la table grandira
// quand un fait du modèle attendra une réponse de plus.
import { DIAGNOSTICS, diagnosticsDeClasse, inventaireDe } from "./modele-metier.mjs";

/**
 * LA PROJECTION — une question est la forme interrogative d'un diagnostic,
 * et RIEN D'AUTRE n'a le droit d'en produire.
 *
 * `demande` reçoit le diagnostic et rend un texte compréhensible SANS
 * connaître le moteur : jamais un code, jamais un chemin de document.
 *
 * LA RÉGION, ET LA FRONTIÈRE D'EP-133 ⑤ : une formulation peut citer les
 * MOTS DE L'HUMAIN — le terme ambigu EST son propre texte, le lui rendre
 * l'aide à répondre. Ce qu'elle ne fait jamais, c'est porter une connaissance
 * régionale du MOTEUR : aucune liste de pays, aucun moyen de paiement local
 * écrit en dur ici. Le moteur ne connaît que la réponse structurelle.
 */
export const QUESTIONS = {
  MODELE_TERME_AMBIGU: {
    /** Le fait du modèle qui attend la réponse — une question sans
     *  destination structurelle serait impossible à consommer. */
    destination: "couverture.nonRetenus",
    demande: (diagnostic) =>
      `Dans votre demande, « ${diagnostic.message} » peut s'entendre de plusieurs ` +
      `façons, et je ne veux pas choisir à votre place. Qu'entendez-vous ` +
      `précisément par là ?`,
  },
  MODELE_COMMERCE_ABSENT: {
    destination: "commerce",
    // Formulation CONSTANTE : elle ne dépend d'aucun texte, donc d'aucune
    // région. C'est ce qui rend le cliquet régional vérifiable.
    demande: () =>
      `Votre application fait payer quelque chose. Le paiement se conclut-il ` +
      `DANS l'application, ou HORS d'elle — de la main à la main, ou par un ` +
      `moyen que vous utilisez déjà ?`,
  },
};

// CLIQUET AU CHARGEMENT — fail-closed, comme le registre de capacités. Un
// diagnostic « intention manquante » sans question projetée est une classe
// qui promet un dialogue que personne ne sait tenir ; une question sans
// diagnostic est une question inventée. Le module refuse alors d'exister.
{
  const aDemander = diagnosticsDeClasse("intention_manquante");
  const projetes = Object.keys(QUESTIONS);
  const sansQuestion = aDemander.filter((c) => !projetes.includes(c));
  const sansDiagnostic = projetes.filter((c) => !aDemander.includes(c));
  if (sansQuestion.length > 0 || sansDiagnostic.length > 0) {
    throw new Error(
      `EP-136 — projection incomplète. Sans question : ${sansQuestion.join(", ") || "aucun"} · ` +
        `sans diagnostic : ${sansDiagnostic.join(", ") || "aucun"}.`,
    );
  }
}

/**
 * LE PÉRIMÈTRE D'ÉLICITATION — motif emprunté au périmètre de jugement
 * (EP-102) : deux états se comparent par leur périmètre, jamais par un
 * compte. Ici, l'ensemble des questions encore ouvertes.
 */
export function perimetreDElicitation(diagnostics) {
  return [
    ...new Set(
      diagnostics
        .map((x) => x.code)
        .filter((code) => DIAGNOSTICS[code]?.classe === "intention_manquante"),
    ),
  ].sort();
}

/** Une réponse qui ne RÉDUIT pas le périmètre est stérile : elle n'ouvre pas
 *  un tour de plus. Sans cela, l'élicitation tournerait sans fin. */
export function reponseSterile(avant, apres) {
  return !apres.every((c) => avant.includes(c)) || apres.length >= avant.length;
}

/**
 * CE QUE LE MOTEUR DOIT DEMANDER, ou pourquoi il ne le peut pas.
 *
 * R-5 — LA QUESTION SANS INTERLOCUTEUR, le garde-fou le plus important :
 * en campagne, en cron, dans toute exécution non interactive, une question
 * n'a personne pour y répondre. Elle dégrade alors en REFUS EXPLICITE —
 * jamais en supposition. Supposer serait décider à la place de l'humain,
 * exactement ce que l'élicitation existe pour empêcher.
 */
export function elicitationDe(diagnostics, { interlocuteur = false } = {}) {
  const aDemander = diagnostics.filter(
    (x) => DIAGNOSTICS[x.code]?.classe === "intention_manquante",
  );
  if (aDemander.length === 0) {
    return { statut: "aucune_question", questions: [] };
  }
  const questions = aDemander.map((diagnostic) => ({
    code: diagnostic.code,
    destination: QUESTIONS[diagnostic.code].destination,
    texte: QUESTIONS[diagnostic.code].demande(diagnostic),
  }));
  if (!interlocuteur) {
    return {
      statut: "refus",
      questions,
      raison:
        `${String(questions.length)} question(s) sans interlocuteur : cette exécution ` +
        `n'est pas interactive. Le besoin est INCOMPLET et le moteur ne suppose pas — ` +
        `relancer avec quelqu'un pour répondre, ou compléter le brief.`,
    };
  }
  return { statut: "questions", questions };
}

/**
 * L'INTENTION — { brief scellé, addendum ordonné }.
 *
 * LE BRIEF NE SE RÉÉCRIT JAMAIS. Trois raisons, dont deux sont des
 * obligations déjà contractées : le hold-out exige un brief non modifié
 * (charte #6 §8) ; une empreinte qui couvrirait un texte évolutif ne
 * prouverait plus rien. La troisième est la seule mesure qui dira si
 * l'élicitation sert : distinguer ce que l'humain a dit SPONTANÉMENT de ce
 * qu'il a répondu SOUS QUESTION.
 */
export function creerIntention(brief) {
  return Object.freeze({ brief, addendum: Object.freeze([]) });
}

/** Ajoute une réponse. L'intention d'origine est INCHANGÉE — le gel n'est pas
 *  décoratif : il rend le contournement impossible, pas seulement interdit. */
export function repondre(intention, { code, texte, reponse }) {
  if (!(code in QUESTIONS)) {
    throw new Error(`EP-136 — réponse à « ${code} », qui n'est pas une question projetée.`);
  }
  return Object.freeze({
    brief: intention.brief,
    addendum: Object.freeze([
      ...intention.addendum,
      Object.freeze({
        rang: intention.addendum.length,
        code,
        destination: QUESTIONS[code].destination,
        question: texte,
        reponse,
      }),
    ]),
  });
}

/**
 * LE TEXTE QUE P0 LIT — brief PUIS réponses, dans l'ordre. C'est aussi ce
 * qui rend l'addendum REDEVABLE à `couverture` : les termes apportés par une
 * réponse entrent dans l'inventaire au même titre que ceux du brief. Sans
 * cela, l'addendum serait un canal de texte non jugé.
 */
export function texteDIntention(intention) {
  if (intention.addendum.length === 0) return intention.brief;
  const precisions = intention.addendum
    .map((e) => `- ${e.question}\n  ${e.reponse}`)
    .join("\n");
  return `${intention.brief}\n\nPrécisions demandées et obtenues :\n${precisions}`;
}

/** L'inventaire lexical de l'intention COMPLÈTE — brief et addendum. */
export function inventaireDIntention(intention) {
  return inventaireDe(texteDIntention(intention));
}
