/**
 * LE JUGE DE COUVERTURE — le silence est interdit.
 *
 * ── LE DÉFAUT FONDATEUR, MESURÉ LE 2026-10-31 (tir eb7b62b5).
 *
 * Même cahier (22 866 caractères), application « livrée » : paiement
 * 2 occurrences au code pour 34 au cahier ; anglais, arabe, RTL, connexion,
 * notifications : ZÉRO. Le critère d'acceptation de la boucle était « ça
 * s'assemble » — jamais « ça couvre ». L'analyse qui a trouvé ça a été faite
 * À LA MAIN ; ce module EST cette analyse, automatisée.
 *
 * ── LA RÈGLE (du propriétaire) : chaque exigence du cahier est COUVERTE,
 * ou DÉCLARÉE HORS PÉRIMÈTRE avec un motif (fichier PERIMETRE.md écrit par
 * le générateur). Une exigence absente des deux est un DÉFAUT. Un rapport
 * chiffré accompagne chaque génération — et sans lui, « livrée » ne se dit
 * pas.
 *
 * ── CE QUE CE JUGE EST, ET N'EST PAS.
 *
 * Un LEXIQUE MÉTIER, pas une compréhension : il compte des familles de
 * termes dans le cahier et les cherche dans le code. Il attrape les absences
 * CRIANTES (paiement 34→0), pas les nuances. Zéro appel de modèle, zéro
 * centime, déterministe — rejouable sur tout tir passé.
 */

import { exigencesDeLaDemande, motifTerme, texteCherchable } from './exigences-demande'

export type ExigenceJugee = {
  readonly exigence: string
  readonly cahier: number
  readonly code: number
  /**
   * `couverte` — un écran portant cette exigence a été ATTEINT et EXERCÉ.
   * `nommee` — le code en parle, mais aucun écran ouvert ne la porte : une
   *   MENTION n'est pas une couverture (mesuré : « réservation » couverte
   *   avec 2 occurrences pour 59 au cahier).
   * `declaree-hors-perimetre` — dite, avec motif.
   * `absente` — ni l'un ni l'autre : le silence, interdit.
   * `declaree-mais-centrale` — déclarée alors que le cahier y insiste
   *   au-delà du verrou : le modèle ne peut pas clore seul.
   */
  readonly statut:
    | 'couverte'
    | 'nommee'
    | 'declaree-hors-perimetre'
    | 'absente'
    | 'declaree-mais-centrale'
  /**
   * D'OÙ VIENT CETTE EXIGENCE — et ça décide si elle peut coûter de l'argent.
   *
   * `famille` : une des dix-neuf familles nommées. Éprouvées depuis le
   *   31 octobre ; elles REPROCHENT, donc elles relancent un tour payant.
   * `demande` : un terme tiré de la demande elle-même (②β). Elle MESURE et
   *   RAPPORTE, elle ne reproche pas — arbitrage du propriétaire, le
   *   2026-11-06 : « tant que je n'ai pas lu la distribution réelle, le
   *   chiffre voyage dans le rapport, il ne relance aucun tour. »
   */
  readonly source: 'famille' | 'demande'
}

export type RapportCouverture = {
  readonly exigences: readonly ExigenceJugee[]
  /**
   * LES ABSENTES QUI REPROCHENT — familles nommées seulement.
   *
   * Ce champ pilote le reproche de la boucle, donc il coûte de l'argent.
   * Les termes dérivés de la demande n'y entrent PAS : ils vivent dans
   * `muettesDerivees`, qui n'est lu par aucun reproche.
   */
  readonly absentes: readonly ExigenceJugee[]
  /**
   * LES MUETTES DÉRIVÉES DE LA DEMANDE — mesurées, rapportées, gratuites.
   *
   * C'est ici que « fournisseur ×56 au cahier → 0 dans le code » apparaît.
   * Aucun tour ne se relance pour elles tant que la distribution réelle
   * n'a pas fixé la barre.
   */
  readonly muettesDerivees: readonly ExigenceJugee[]
  /**
   * couvertes + déclarées, sur le total retenu. Entre 0 et 1 — ou `null`.
   *
   * ── `null` N'EST PAS UN DÉTAIL DE TYPE, C'EST UN AVEU.
   *
   * Ce champ valait `1` quand AUCUNE famille du lexique ne se trouvait dans
   * la demande : une couverture parfaite rendue sans avoir rien mesuré.
   * Mesuré le 2026-11-06 sur le module réel, code = `<div>bonjour</div>` :
   *
   *   salon de coiffure        0 famille → taux 1,00
   *   site institutionnel CPA  0 famille → taux 1,00
   *   boutique simple          0 famille → taux 1,00
   *   carnet de notes          0 famille → taux 1,00
   *
   * Quatre demandes ordinaires sur quatre, dont celle qu'on s'apprête à
   * construire. Et au seuil 1 au lieu de 3 : toujours zéro. Les dix-neuf
   * familles sont l'INDEX D'UN SEUL DOCUMENT — le cahier fondateur en
   * déclenche treize, une demande ordinaire aucune.
   *
   * `null` veut dire : CE CONTRÔLE N'A RIEN PU MESURER. Quiconque le lit
   * doit le dire — pas le remplacer par un chiffre (voir EP-366).
   */
  readonly taux: number | null
  /**
   * COMBIEN DE TERMES LE PLAFOND A ÉCARTÉS — jamais tu (②β).
   *
   * Un cahier de 22 866 caractères rend 672 termes. En juger 25 est un
   * choix ; le taire ferait lire « tout est couvert » là où on a regardé
   * une partie.
   */
  readonly ecartes: number
}

/** Une exigence n'est RETENUE que si le cahier y insiste. */
const SEUIL_CAHIER = 3

/**
 * LE VERROU PAR INSISTANCE — au-delà, le modèle ne peut plus déclarer seul.
 *
 * MESURÉ LE 2026-11-01 sur le tir 52f34017 : « recherche », citée ONZE fois
 * dans un cahier de plateforme de réservation, a été déclarée hors
 * périmètre — une fonction centrale abandonnée poliment. Sept exigences sur
 * treize hors périmètre, et l'œuvre appelée « livrée ».
 *
 * J'avais DÉCRIT ce verrou le 31 octobre sans jamais l'écrire : il n'a pas
 * mordu parce qu'il n'existait pas. Mesuré : zéro occurrence dans le juge
 * vivant comme dans le module d'extraction.
 *
 * CE QU'IL FAIT, ET CE QU'IL NE FAIT PAS. Il n'EXIGE pas la livraison — un
 * cahier peut réclamer trois langues et une application ne pas les tenir en
 * un tour ; exiger l'impossible ferait boucler le modèle sur de l'argent
 * réel. Il retire au MODÈLE le droit de clore seul : l'exigence redevient
 * RÉCLAMÉE au tour suivant, et si elle reste déclarée au dernier tour,
 * l'œuvre est acceptée mais le rapport DIT qu'une exigence centrale a été
 * écartée sans validation humaine.
 */
export const SEUIL_VERROU = 10

/**
 * Le lexique : une exigence = une famille de termes. Les motifs s'appliquent
 * au texte en minuscules. Chaque entrée vient d'une famille d'applications
 * réelle — pas d'un inventaire théorique.
 */
const LEXIQUE: readonly (readonly [string, RegExp])[] = [
  // ② DU TIR DE VALIDATION 88c94164 : le cahier disait « Application mobile
  // Android et iPhone », le modèle a TENTÉ react-native au tour 1 (refusé
  // par le fail-closed) — et ce juge, sans famille correspondante, n'a rien
  // exigé en retour. Le système savait, et se taisait. Plus maintenant.
  ['application native (Android/iPhone)', /\bandroid\b|\biphone\b|\bios\b|app store|google play|application mobile|application native/gu],
  ['paiement', /paiement|payer\b|payeur/gu],
  ['mobile money', /mobile money|airtel|moov|orange money|mtn\b|wave\b/gu],
  ['carte bancaire', /carte bancaire|visa\b|mastercard|stripe|paypal/gu],
  ['connexion et comptes', /connexion|se connecter|authentifi|mot de passe|inscription/gu],
  ['multilingue', /anglais|arabe|english|multilingue|plusieurs langues/gu],
  ['interface RTL', /\brtl\b|droite [àa] gauche/gu],
  ['notifications', /notification/gu],
  ['agences', /agence/gu],
  ['entreprises', /entreprise/gu],
  ['agent IA', /agent (?:d['’]\s*)?(?:intelligence|ia\b)|assistant (?:ia|intelligent)|chatbot/gu],
  ['réservation', /r[ée]servation|r[ée]server/gu],
  ['recherche', /recherche|rechercher/gu],
  ['administration', /\badmin/gu],
  ['tableau de bord', /statistique|tableau de bord|dashboard/gu],
  ['facturation', /facture/gu],
  ['abonnement', /abonnement/gu],
  ['livraison', /livraison|livrer\b/gu],
  ['messagerie', /messagerie|\bchat\b/gu],
]

const compte = (texte: string, motif: RegExp): number => {
  motif.lastIndex = 0
  let n = 0
  while (motif.exec(texte) !== null) n += 1
  return n
}

/** Le fichier où le générateur déclare ce qu'il NE couvre pas, et pourquoi. */
export const FICHIER_PERIMETRE = 'PERIMETRE.md'

export function jugerCouverture(
  demande: string,
  fichiers: ReadonlyMap<string, string>,
  /** Les écrans RÉELLEMENT ouverts par le juge d'exécution, avec leur texte. */
  ecrans: readonly { readonly texte: string; readonly exerce: boolean }[] = [],
): RapportCouverture {
  const cahier = demande.toLowerCase()
  const perimetre = (fichiers.get(FICHIER_PERIMETRE) ?? '').toLowerCase()
  const codeEntier = [...fichiers.entries()]
    // La bibliothèque injectée est à DERIBFY : ses mots (« recherche » d'une
    // icône…) ne couvrent pas une exigence du cahier à la place du modèle.
    .filter(([n]) => n !== FICHIER_PERIMETRE && !n.startsWith('systeme/'))
    .map(([, c]) => c)
    .join('\n')
    .toLowerCase()

  // ── LES FAMILLES NOMMÉES, PUIS LES TERMES DE LA DEMANDE ELLE-MÊME.
  //
  // Les dix-neuf gardent leur valeur : une famille réunit des mots qu'un
  // radical ne rapproche pas (« airtel », « moov », « orange money » = un
  // seul moyen de paiement). Mais elles ne suffisaient pas, et ne pouvaient
  // pas : elles sont l'index d'un seul document. Les termes dérivés
  // viennent de la demande, donc la disjonction se ferme par construction.
  const derives = exigencesDeLaDemande(demande)
  const cahierNu = texteCherchable(demande)
  const codeNu = texteCherchable(codeEntier)
  const familles: (readonly [string, RegExp])[] = [...LEXIQUE]
  for (const t of derives.termes) {
    // Pas deux fois la même chose : si une famille nommée reconnaît déjà ce
    // terme, elle le dit mieux — elle réunit ses synonymes.
    if (LEXIQUE.some(([, m]) => { m.lastIndex = 0; return m.test(t.terme) })) continue
    familles.push([t.terme, motifTerme(t.terme)])
  }

  const exigences: ExigenceJugee[] = []
  for (const [exigence, motif] of familles) {
    const nomme = LEXIQUE.some(([e]) => e === exigence)
    // ── UN TERME DÉRIVÉ SE CHERCHE DANS LE TEXTE NORMALISÉ COMME LUI.
    //
    // Les radicaux sortent sans accent : chercher `communique` dans un texte
    // accentué ne trouve jamais « communiqué ». Les familles nommées, elles,
    // portent leurs accents dans leurs motifs et gardent le texte brut.
    const dansCahier = compte(nomme ? cahier : cahierNu, motif)
    // ── LE SEUIL ABSOLU NE VAUT QUE POUR LES FAMILLES NOMMÉES.
    //
    // Les termes dérivés ont DÉJÀ passé le seuil relatif de la demande
    // (`exigencesDeLaDemande`). Leur réappliquer 3 ici les éliminerait tous
    // sur une demande de trois phrases — c'est-à-dire referait exactement
    // le défaut qu'on ferme.
    if (nomme && dansCahier < SEUIL_CAHIER) continue
    if (dansCahier === 0) continue
    const dansCode = compte(nomme ? codeEntier : codeNu, motif)
    const declaree = compte(nomme ? perimetre : texteCherchable(perimetre), motif) > 0
    // ATTEINTE ET EXERCÉE : un écran OUVERT porte cette exigence, et un de
    // ses contrôles a servi. C'est la définition à trois niveaux du
    // 2026-10-31, enfin branchée — elle ne vivait que dans un rapport.
    const atteinteEtExercee = ecrans.some(
      (e) => e.exerce && compte(nomme ? e.texte.toLowerCase() : texteCherchable(e.texte), motif) > 0,
    )
    const statut: ExigenceJugee['statut'] = atteinteEtExercee
      ? 'couverte'
      : declaree
        ? dansCahier >= SEUIL_VERROU
          ? 'declaree-mais-centrale'
          : 'declaree-hors-perimetre'
        : dansCode > 0 && ecrans.length === 0
          ? 'couverte'
          : dansCode > 0
            ? 'nommee'
            : 'absente'
    exigences.push({
      exigence,
      cahier: dansCahier,
      code: dansCode,
      statut,
      source: nomme ? 'famille' : 'demande',
    })
  }
  // Une MENTION et une exigence centrale déclarée seule comptent comme
  // non réglées : elles reviennent au modèle, elles ne se taisent pas.
  const muette = (e: ExigenceJugee): boolean =>
    e.statut === 'absente' || e.statut === 'nommee' || e.statut === 'declaree-mais-centrale'
  // ── LE REPROCHE NE VOIT QUE LES FAMILLES NOMMÉES, ET C'EST VOULU.
  //
  // Brancher les termes dérivés ici ferait reprocher sur dix-sept exigences
  // une demande qui n'en reprochait aucune : `TOURS_MAX = 3`, donc jusqu'à
  // deux tours payants de plus PAR GÉNÉRATION. Le propriétaire a tranché :
  // on mesure d'abord la distribution réelle sur le corpus, on fixe la barre
  // ensuite. « Pas une intuition. »
  const absentes = exigences.filter((e) => e.source === 'famille' && muette(e))
  const muettesDerivees = exigences.filter((e) => e.source === 'demande' && muette(e))
  // AUCUNE FAMILLE RETENUE = RIEN MESURÉ, et ça ne se dit pas « 1 ».
  // ── LE TAUX COMPTE TOUTES LES MUETTES, LE REPROCHE N'EN COMPTE QU'UNE PART.
  //
  // Ma première forme divisait par `absentes` seul. Comme `absentes` ne
  // retient plus que les familles nommées, le salon de coiffure est repassé
  // à 18/18 = 1,00 : LE MENSONGE EST REVENU PAR UNE AUTRE PORTE, dix minutes
  // après l'avoir fermé. Séparer ce qui REPROCHE de ce qui MESURE ne veut pas
  // dire cesser de mesurer.
  const total = absentes.length + muettesDerivees.length
  const taux = exigences.length === 0 ? null : (exigences.length - total) / exigences.length
  return { exigences, absentes, muettesDerivees, taux, ecartes: derives.ecartes }
}
