/**
 * L'ATTENTE DE LA COMPREHENSION — CE QU'ON DIT, ET QUAND ON REND LA MAIN.
 *
 * NE DECRIT PAS UN ECRAN : decide un TEXTE et un DELAI. Aucune dependance au
 * navigateur, donc tout est prouvable sans en ouvrir un.
 *
 * Pose le 2026-10-10 apres un defaut vu en vrai : une comprehension partie
 * avec 8 220 caracteres de cahier des charges n'est jamais revenue, et
 * l'ecran est reste sur trois points POUR TOUJOURS — sans minuterie, sans
 * message, sans issue, et avec le texte de l'utilisateur perdu. Tant que la
 * demande tenait en une phrase, trois points suffisaient ; le televersement
 * a rendu l'attente longue sans que l'attente suive.
 */

import { ecouleDepuis } from './suivi-generation'

/** Au-dela, ce n'est plus une phrase tapee : c'est un cahier des charges. */
export const SEUIL_CAHIER = 2_000

/**
 * LE DELAI AU BOUT DUQUEL ON REND LA MAIN — 45 MINUTES, ET POURQUOI.
 *
 * PREMIERE VERSION : 6 MINUTES, ET C'ETAIT FAUX. Je l'avais deduite de
 * `maxDuration = 300` — une valeur de CONFIGURATION, pas une mesure. Le
 * filet a coupe une lecture qui a abouti a 7,2 min : une comprehension
 * entiere, payee, jetee 1,2 min avant d'arriver.
 *
 * LA MESURE, relevee dans le journal du serveur le 2026-10-10, sur le meme
 * cahier des charges de 8 220 caracteres :
 *     POST /api/generateur/comprendre 200 in 23.0min
 *     POST /api/generateur/comprendre 200 in  7.2min
 * Les DEUX ont repondu 200. Rien n'avait plante : c'est simplement long.
 *
 * 45 min, soit environ le double du pire releve. Un filet se pose au-dessus
 * de ce qu'on a MESURE, jamais au-dessus de ce qu'on imagine. Et il est
 * devenu beaucoup moins critique depuis que l'ecran affiche l'ecoule reel :
 * le piege n'etait pas la duree, c'etait le SILENCE.
 *
 * ⚠ CONSEQUENCE HORS PERIMETRE, A TRAITER : `maxDuration = 300` (5 min) sur
 * la route signifie qu'en PRODUCTION cette lecture ne peut PAS aboutir sur
 * un cahier de cette taille. Signale, pas corrige ici.
 */
export const DELAI_MAX_MS = 2_700_000

/** Le pire temps de lecture MESURE. Le filet doit rester au-dessus. */
export const PIRE_LECTURE_MESUREE_MS = 1_380_000

/** 8220 → « 8 220 ». Espace fine insecable : le nombre ne se coupe pas. */
export function grouper(n: number): string {
  const chiffres = String(Math.max(0, Math.trunc(n)))
  let sortie = ''
  for (let i = 0; i < chiffres.length; i++) {
    if (i > 0 && (chiffres.length - i) % 3 === 0) sortie += ' '
    sortie += chiffres[i]
  }
  return sortie
}

/**
 * CE QU'ON DIT PENDANT QU'ON LIT — la verite, et rien de plus.
 *
 * Pas de pourcentage, pas de barre, pas de compte a rebours : on ne sait pas
 * combien de temps ca prend, et l'inventer serait mentir. Meme discipline que
 * le triptyque du suivi de generation. L'ECOULE REEL est ajoute par l'appelant.
 */
export function libelleLecture(longueur: number): string {
  return longueur >= SEUIL_CAHIER
    ? `Je lis votre cahier des charges (${grouper(longueur)} caractères)`
    : 'Je lis votre demande'
}

/**
 * CE QU'ON DIT QUAND ON A RENDU LA MAIN.
 *
 * Le nombre de minutes est DERIVE du delai, jamais recopie : si le delai
 * change, la phrase change avec lui et ne peut pas mentir.
 */
export function messageInterrompu(delaiMs: number = DELAI_MAX_MS): string {
  const min = Math.max(1, Math.round(delaiMs / 60_000))
  return `La lecture s’est interrompue au bout de ${String(min)} minutes. Votre texte est revenu dans le champ — vous pouvez le renvoyer.`
}

/** L'echec franc : le serveur a repondu non. Le texte revient aussi. */
export const MESSAGE_ILLISIBLE = 'Lecture impossible. Votre texte est revenu dans le champ.'

/**
 * LA PHRASE ENTIERE, telle qu'elle s'affiche sous les trois points.
 *
 * Composee ICI et pas dans l'ecran : c'est le texte que l'utilisateur LIT,
 * donc c'est lui qu'il faut pouvoir prouver.
 */
export function phraseAttente(longueur: number, debutIso: string, maintenant: number): string {
  const phrase = `${libelleLecture(longueur)} ${ecouleDepuis(debutIso, maintenant)}…`
  // SUR UN CAHIER, ON PREVIENT. Mesure le 2026-10-10 : 7,2 min et 23,0 min
  // pour 8 220 caracteres. Sans cette ligne, quelqu'un qui attend vingt
  // minutes croit que c'est casse — et il aurait eu raison de le croire.
  return longueur >= SEUIL_CAHIER ? `${phrase} Une lecture complète prend plusieurs minutes.` : phrase
}

/**
 * QUEL MESSAGE POUR QUEL ECHEC.
 *
 * Le filet qui mord et une panne franche ne disent PAS la meme chose, et
 * c'est le genre de choix qu'on croit evident jusqu'a ce qu'il parte de
 * travers. Il vit donc ici, sous preuve, pas dans un `catch`.
 */
export function messageDeLEchec(e: unknown): string {
  return e instanceof Error && e.name === 'AbortError' ? messageInterrompu() : MESSAGE_ILLISIBLE
}

/**
 * EFFACER LA TRACE D'UN TOUR QUI N'A PAS EU LIEU.
 *
 * Le tour a echoue : sa bulle part, pour que le texte puisse revenir dans le
 * champ sans apparaitre DEUX fois a l'ecran. On ne retire que si la derniere
 * bulle est bien celle-la — jamais la reponse de Deribfy, jamais la bulle
 * d'un tour precedent. Une suppression qui se trompe de cible est pire que
 * pas de suppression du tout.
 */
export function retirerDernierEcho<T extends { role: string; texte?: string }>(
  messages: readonly T[],
  texte: string,
): readonly T[] {
  const dernier = messages[messages.length - 1]
  return dernier !== undefined && dernier.role === 'moi' && dernier.texte === texte
    ? messages.slice(0, -1)
    : messages
}
