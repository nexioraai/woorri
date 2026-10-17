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
//
// EP-201 — ET UNE SECONDE FAMILLE, DE NATURE DIFFÉRENTE : LA CONFIGURATION.
// Les questions ci-dessus PROJETTENT un diagnostic : le juge a refusé, on
// demande. Celles de `QUESTIONS_DE_CONFIGURATION` ne projettent rien — elles
// recueillent ce que l'humain SEUL peut fournir avant qu'un juge n'existe :
// son marché, sa logistique, le numéro qui reçoit son argent. Les deux
// familles sont séparées parce que leurs cliquets diffèrent : la première doit
// correspondre EXACTEMENT aux diagnostics, la seconde n'en a aucun.
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

// ───────────────────────────────────────────────────────────────────────────
// EP-201 — LA TABLE PAYS → DEVISE, ET LE TEST QUI DÉCIDE DE SA LÉGITIMITÉ.
//
// LE TEST DU CLIQUET, ÉNONCÉ POUR QU'UNE RELECTURE PUISSE L'APPLIQUER SEULE :
//
//   « Une table pays→X n'est admise dans la couche d'élicitation que si X est
//     une norme publique citable (ISO 4217, indicatifs E.164, etc.).
//     Pays→devise et pays→indicatif PASSENT.
//     Pays→moyen de paiement, pays→fiscalité, pays→logistique NE PASSENT PAS. »
//
// POURQUOI CETTE TABLE EST ICI ET NON DANS LE MOTEUR. Elle ne décide de RIEN :
// elle PRÉ-REMPLIT un champ que l'humain peut changer. Le rôle est celui d'un
// sélecteur de date qui connaît le calendrier grégorien — le moteur, lui,
// n'apprend jamais quel jour on est dans quel pays. Ce que le moteur reçoit
// est `{ currency: "XAF" }` : un code ISO, une donnée structurelle, sans le
// nom du pays ni la moindre trace de la table qui l'a suggéré.
//
// ET CE QUI N'Y EST PAS, DÉLIBÉRÉMENT : aucune correspondance pays → moyen de
// paiement. Un marchand tchadien peut encaisser par carte, un marchand
// français de la main à la main. Déduire le moyen de paiement du pays serait
// décider à la place de l'humain — précisément ce que l'élicitation existe
// pour empêcher, et ce que le cliquet anti-secteur interdit au moteur.
//
// Source de la colonne de droite : ISO 4217 (codes de devise), norme publique.
// La liste des pays n'a pas vocation à être exhaustive : un pays absent laisse
// simplement la devise VIDE, et l'humain la saisit. Aucun défaut n'est inventé.
export const DEVISES_PAR_PAYS = Object.freeze({
  // Afrique centrale — franc CFA BEAC
  tchad: "XAF",
  cameroun: "XAF",
  gabon: "XAF",
  congo: "XAF",
  centrafrique: "XAF",
  "guinee equatoriale": "XAF",
  // Afrique de l'Ouest — franc CFA BCEAO
  senegal: "XOF",
  "cote d ivoire": "XOF",
  mali: "XOF",
  "burkina faso": "XOF",
  benin: "XOF",
  togo: "XOF",
  niger: "XOF",
  "guinee-bissau": "XOF",
  // Autres marchés africains
  maroc: "MAD",
  tunisie: "TND",
  algerie: "DZD",
  nigeria: "NGN",
  ghana: "GHS",
  kenya: "KES",
  "afrique du sud": "ZAR",
  rdc: "CDF",
  // Europe
  france: "EUR",
  belgique: "EUR",
  allemagne: "EUR",
  espagne: "EUR",
  italie: "EUR",
  portugal: "EUR",
  "pays-bas": "EUR",
  suisse: "CHF",
  "royaume-uni": "GBP",
  // Amérique du Nord
  canada: "CAD",
  "etats-unis": "USD",
  // Moyen-Orient
  "emirats arabes unis": "AED",
  "arabie saoudite": "SAR",
  qatar: "QAR",
});

/** Normalisation tolérante — accents, casse et ponctuation ne doivent pas
 *  faire échouer une réponse humaine parfaitement claire. */
const normaliserPays = (texte) =>
  String(texte ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * LA DEVISE SUGGÉRÉE — un DÉFAUT, jamais un verrou (EP-201 ③).
 *
 * Le pays pré-remplit, l'humain dispose : un commerçant de la diaspora vend
 * depuis N'Djaména en euros, et rien ne doit l'en empêcher. Un pays inconnu
 * de la table ne produit AUCUN défaut — la devise reste à saisir, et le
 * moteur ne recevra que ce que l'humain aura dit.
 */
export function deviseSuggeree(pays) {
  return DEVISES_PAR_PAYS[normaliserPays(pays)] ?? null;
}

/**
 * EP-201 A — CE QUE L'HUMAIN SEUL PEUT FOURNIR.
 *
 * Ces questions ne projettent aucun diagnostic : elles précèdent tout juge.
 * Elles sont posées AVANT la génération, et leurs réponses deviennent une
 * configuration STRUCTURELLE — jamais un nom de pays transmis au moteur.
 *
 * `structure` dit ce que la réponse devient une fois le dialogue terminé.
 * C'est ce champ qui rend le cliquet vérifiable : si une question produisait
 * autre chose qu'une donnée structurelle, elle se verrait ici.
 */
export const QUESTIONS_DE_CONFIGURATION = {
  // ── EP-255 B — LA QUESTION QUI AIGUILLE, ET POURQUOI ELLE PASSE EN PREMIER.
  //
  // DÉFAUT MESURÉ LE 2026-10-17 : les quatre questions de configuration
  // étaient formulées pour une BOUTIQUE — « votre boutique », « vos
  // produits », « vos acheteurs ». Deribfy émet aussi des tontines, des
  // lignes de bus, des restaurants. Les poser telles quelles demandait à un
  // propriétaire de tontine quel numéro reçoit l'argent de ses ACHETEURS.
  //
  // CE QU'ON NE FAIT PAS POUR LE RÉSOUDRE : deviner le domaine depuis le
  // texte de la demande. Ce serait la devinette de produit que tout ce
  // module existe pour interdire — et l'erreur exacte de v0, qui a déduit
  // « France » de la langue française puis affiché un tarif EDF.
  //
  // CE QU'ON FAIT : L'HUMAIN DÉCIDE. Un choix FERMÉ, posé avant tout appel
  // payant, répondable sans connaître le moteur (critère EP-135), et dont la
  // réponse décide des questions suivantes. Une tontine répond « elle
  // affiche seulement des montants » et le dialogue s'arrête là.
  ARGENT_DANS_APP: {
    structure: "encaissement",
    /** LES RÉPONSES SONT DES DONNÉES, PAS UNE PHRASE À ANALYSER.
     *
     *  L'écran les rend en choix fermés — un clic — et le moteur ne reçoit
     *  que `valeur`, jamais le texte que l'humain a lu. C'est ce qui rend
     *  l'aiguillage vérifiable : il n'y a rien à interpréter.
     *
     *  L'ORDRE EST CROISSANT : chaque palier ajoute ce que le précédent
     *  n'exigeait pas. « produits » implique « paiements ». */
    choix: Object.freeze([
      { valeur: "aucun", texte: "Elle affiche seulement des montants" },
      { valeur: "paiements", texte: "Elle encaisse des paiements" },
      { valeur: "produits", texte: "Elle vend des produits à livrer" },
    ]),
    demande: () =>
      `Que fait votre application avec l'argent ? Votre réponse décide des ` +
      `questions suivantes — et si aucune ne correspond, dites-le.`,
  },
  MARCHE_VISE: {
    structure: "currency",
    // FORMULATION NEUTRE EN DOMAINE (défaut du 2026-10-17). Elle disait
    // « votre boutique vend-elle » : une tontine n'a pas de boutique, et
    // une ligne de bus ne vend rien au sens où l'entendait cette phrase.
    // La devise, elle, vaut pour TOUTE application qui affiche un montant.
    demande: () =>
      `Dans quel pays votre application sera-t-elle utilisée ? Cela me sert ` +
      `à proposer la devise d'affichage — vous pourrez la changer si vos ` +
      `montants sont dans une autre monnaie.`,
  },
  DEVISE_RETENUE: {
    structure: "currency",
    // Le pays a pré-rempli ; cette question CONFIRME ou CORRIGE. Elle porte
    // la suggestion dans son texte, ce qui évite à l'humain de connaître les
    // codes ISO sans que le moteur, lui, n'en apprenne davantage.
    demande: (suggestion) =>
      suggestion === null || suggestion === undefined
        ? `Dans quelle monnaie affichez-vous vos prix ? Indiquez son code ` +
          `international à trois lettres (par exemple EUR, USD, XAF).`
        : `J'afficherai vos prix en ${suggestion}. Si vous vendez dans une ` +
          `autre monnaie, indiquez son code à trois lettres.`,
  },
  LOGISTIQUE_PROPRE: {
    structure: "logistiqueParLeMarchand",
    demande: () =>
      `Gérez-vous vous-même le stock et la livraison de vos produits, ou ` +
      `passez-vous par quelqu'un d'autre ?`,
  },
  NUMERO_ENCAISSEUR: {
    structure: "numeroEncaisseur",
    // AUCUN moyen de paiement n'est nommé ici : la question vaut pour un
    // transfert mobile, un virement ou un appel. C'est le moyen CHOISI par
    // l'humain à la question du commerce qui décidera de l'usage.
    demande: () =>
      `Quel numéro de téléphone reçoit les paiements de vos acheteurs ? Ce ` +
      `numéro sera le même pour tous vos produits, et servira aussi à vous ` +
      `joindre. Indiquez-le au format international (indicatif compris).`,
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

// CLIQUET AU CHARGEMENT (EP-201) — toute question de configuration DOIT
// déclarer ce que sa réponse devient. Une question sans destination
// structurelle serait un canal par lequel du texte libre — un nom de pays,
// un nom de fournisseur — atteindrait le moteur sans être vu.
{
  const nues = Object.entries(QUESTIONS_DE_CONFIGURATION)
    .filter(([, q]) => typeof q.structure !== "string" || q.structure.length === 0)
    .map(([c]) => c);
  if (nues.length > 0) {
    throw new Error(
      `EP-201 — question(s) de configuration sans destination structurelle : ${nues.join(", ")}.`,
    );
  }
}

// CLIQUET AU CHARGEMENT — UN CHOIX FERMÉ QUI N'OFFRE RIEN EST UN PIÈGE.
//
// Une question déclarant `choix` promet à l'écran une liste à cliquer, et à
// `configurationDe` une table de valeurs admises. Vide, dupliquée, ou sans
// texte, elle rend la question IMPOSSIBLE À RÉPONDRE : l'aiguillage
// n'aiguille plus rien et le dialogue tourne sans que personne ne le voie.
// Le module refuse alors d'exister, comme pour les deux cliquets au-dessus.
{
  const fautifs = [];
  for (const [code, q] of Object.entries(QUESTIONS_DE_CONFIGURATION)) {
    if (q.choix === undefined) continue;
    const valeurs = q.choix.map((c) => c?.valeur);
    if (q.choix.length < 2) fautifs.push(`${code} (moins de deux choix)`);
    if (valeurs.some((v) => typeof v !== "string" || v.length === 0)) {
      fautifs.push(`${code} (valeur vide)`);
    }
    if (new Set(valeurs).size !== valeurs.length) fautifs.push(`${code} (valeurs en double)`);
    if (q.choix.some((c) => typeof c?.texte !== "string" || c.texte.length === 0)) {
      fautifs.push(`${code} (choix sans texte lisible)`);
    }
  }
  if (fautifs.length > 0) {
    throw new Error(`EP-201 — choix fermé(s) inutilisable(s) : ${fautifs.join(", ")}.`);
  }
}

/**
 * LES TROIS PALIERS D'ENCAISSEMENT, LUS DEPUIS LA TABLE DES QUESTIONS.
 *
 * Recopier les valeurs ici créerait deux vérités : un palier ajouté au
 * choix et oublié dans cette liste serait refusé en silence. On les DÉRIVE.
 */
const ENCAISSEMENTS = Object.freeze(
  QUESTIONS_DE_CONFIGURATION.ARGENT_DANS_APP.choix.map((c) => c.valeur),
);

/**
 * EP-201 B — LA RÉPONSE STRUCTURELLE, ET RIEN D'AUTRE.
 *
 * C'est LA frontière de cette passe. Le dialogue a pu parler de « Tchad » ;
 * ce que cette fonction rend ne contient ni ce mot ni la table qui l'a
 * traduit — seulement `{ currency, logistiqueParLeMarchand, numeroEncaisseur }`.
 *
 * LE MOYEN DE PAIEMENT N'EST PAS ICI, ET C'EST VOULU : il vient de la réponse
 * à `MODELE_COMMERCE_ABSENT`, c'est-à-dire d'un choix EXPLICITE de l'humain.
 * Aucune ligne de ce module ne le déduit d'un pays.
 */
export function configurationDe(reponses = {}) {
  const pays = reponses.MARCHE_VISE;
  // ── L'AIGUILLAGE EST UN FAIT, PAS UN AIGUILLAGE SEULEMENT.
  //
  // Il ne sert pas qu'à choisir les questions suivantes : il DIT si
  // l'application encaisse, et le moteur a besoin de le savoir. Seule une
  // valeur de la table sort — un texte libre arrivé par ce canal ne
  // produirait aucun fait, donc la question resterait ouverte et serait
  // re-posée. Visible, plutôt que supposé.
  const encaissement = ENCAISSEMENTS.includes(reponses.ARGENT_DANS_APP)
    ? reponses.ARGENT_DANS_APP
    : null;
  const suggeree = pays === undefined ? null : deviseSuggeree(pays);
  const saisie = reponses.DEVISE_RETENUE;
  // L'humain prime TOUJOURS sur la suggestion (EP-201 C).
  const devise =
    typeof saisie === "string" && saisie.trim() !== ""
      ? saisie.trim().toUpperCase()
      : suggeree;
  const logistique = reponses.LOGISTIQUE_PROPRE;
  const numero = reponses.NUMERO_ENCAISSEUR;
  const out = {};
  if (encaissement !== null) out.encaissement = encaissement;
  if (devise !== null && devise !== undefined) out.currency = devise;
  if (typeof logistique === "boolean") out.logistiqueParLeMarchand = logistique;
  if (typeof numero === "string" && numero.trim() !== "") {
    out.numeroEncaisseur = numero.trim();
  }
  return Object.freeze(out);
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
 * EP-201 A — LE DIALOGUE DE CONFIGURATION, DANS L'ORDRE.
 *
 * Le pays AVANT la devise : sans cet ordre, la suggestion n'existerait pas et
 * l'humain devrait connaître son code ISO. Même garde-fou qu'au-dessus : sans
 * interlocuteur, on REFUSE au lieu de supposer.
 */
export function configurationADemander({ interlocuteur = false, reponses = {} } = {}) {
  const suggeree =
    reponses.MARCHE_VISE === undefined ? null : deviseSuggeree(reponses.MARCHE_VISE);

  // ── UNE RÉPONSE HORS TABLE N'EST PAS UNE RÉPONSE.
  //
  // `reponses[code] === undefined` ne suffit pas pour un choix fermé : un
  // texte libre arrivé là serait compté comme répondu, et l'aiguillage
  // partirait sur rien. La question reste alors OUVERTE — elle revient à
  // l'écran, ce qui est visible, au lieu d'être supposée.
  const repondu = (code) => {
    const v = reponses[code];
    if (v === undefined) return false;
    const choix = QUESTIONS_DE_CONFIGURATION[code].choix;
    return choix === undefined || choix.some((c) => c.valeur === v);
  };

  // ── L'AIGUILLAGE. Ce que l'humain a répondu décide de la suite.
  //
  // DEUX QUESTIONS POUR TOUT LE MONDE : ce que l'application fait de
  // l'argent, et où elle est utilisée — la devise vaut pour toute
  // application qui affiche un montant, y compris une tontine.
  //
  // LA DEVISE N'EST RE-DEMANDÉE QUE SI LE PAYS NE LA DONNE PAS. Quand la
  // table ISO 4217 suggère, l'écran montre la suggestion et l'humain la
  // corrige s'il veut : `configurationDe` honore toujours `DEVISE_RETENUE`,
  // répondue ou non. Un pays inconnu, lui, ne suggère RIEN — la question
  // devient alors indispensable, et elle est posée.
  //
  // LES DEUX DERNIÈRES NE CONCERNENT QUE CEUX QU'ELLES CONCERNENT.
  const encaissement = repondu("ARGENT_DANS_APP") ? reponses.ARGENT_DANS_APP : null;
  const ordre = ["ARGENT_DANS_APP", "MARCHE_VISE"];
  if (repondu("MARCHE_VISE") && suggeree === null) ordre.push("DEVISE_RETENUE");
  if (encaissement === "paiements" || encaissement === "produits") {
    ordre.push("NUMERO_ENCAISSEUR");
  }
  if (encaissement === "produits") ordre.push("LOGISTIQUE_PROPRE");

  const questions = ordre
    .filter((code) => !repondu(code))
    .map((code) => {
      const q = QUESTIONS_DE_CONFIGURATION[code];
      return {
        code,
        structure: q.structure,
        texte: q.demande(suggeree),
        // Les choix VOYAGENT avec la question : sans eux l'écran devrait les
        // recopier, et une table recopiée est une seconde vérité.
        ...(q.choix === undefined ? {} : { choix: q.choix }),
        // La suggestion est dite À PART du texte : l'écran peut la montrer
        // comme un défaut modifiable plutôt que comme une phrase à lire.
        ...(code === "MARCHE_VISE" && suggeree !== null ? { suggestion: suggeree } : {}),
      };
    });
  if (questions.length === 0) {
    return { statut: "aucune_question", questions: [], configuration: configurationDe(reponses) };
  }
  if (!interlocuteur) {
    return {
      statut: "refus",
      questions,
      raison:
        `${String(questions.length)} question(s) de configuration sans interlocuteur : ` +
        `cette exécution n'est pas interactive. Le moteur ne suppose ni devise, ni ` +
        `logistique, ni numéro — relancer avec quelqu'un pour répondre.`,
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
