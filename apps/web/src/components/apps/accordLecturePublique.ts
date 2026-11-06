/**
 * L'ACCORD POUR UNE LECTURE PUBLIQUE — un seul module, trois écrans.
 *
 * ── UN MUR SANS PORTE, MESURÉ LE 2026-11-06.
 *
 * `/api/generateur/publier` refuse net (409) toute œuvre dont une table est
 * lisible sans compte, tant que l'appel ne porte pas `lecturePubliqueAcceptee`.
 * La garde est juste — « un secret dans une page publiée ne se rattrape pas :
 * elle est déjà servie ». Mais AUCUN écran n'envoyait ce drapeau : mesuré,
 * zéro occurrence hors de la route et de ses tests.
 *
 * Elle ne s'était jamais vue parce qu'aucune œuvre n'avait jamais de table
 * publique — zéro sur cinquante-quatre. Le jour où la déclaration devient
 * exprimable (fusion au champ près, 2026-11-06), publier échouerait sur un
 * 409 que les trois écrans affichent en cul-de-sac.
 *
 * ── POURQUOI UN MODULE, ET PAS TROIS `window.confirm`.
 *
 * La même raison qu'`IdentifiantsOeuvre` : trois écrans doivent dire
 * EXACTEMENT la même chose, et la première copie à divergence serait celle
 * qu'on ne regarde pas. Ici l'enjeu est plus lourd qu'un libellé — c'est la
 * liste des tables que n'importe qui pourra lire.
 *
 * ── ET LA LISTE SE NOMME, ELLE NE SE RÉSUME PAS.
 *
 * « Une liste affichée à côté d'un bouton qu'on peut presser sans la lire
 * n'est pas une garde. » La route nomme chaque table ; cet écran les répète
 * une par une. Un « des tables seront publiques » ne laisserait personne
 * décider.
 */

/** Ce que la route rend quand elle refuse pour cause de lecture publique. */
export type RefusLecturePublique = {
  readonly lecturePublique?: unknown
  readonly tables?: unknown
  readonly error?: unknown
  readonly quoiFaire?: unknown
}

/** Ce refus EST-il celui de la lecture publique, et pas un autre ? */
export function estRefusLecturePublique(d: RefusLecturePublique): boolean {
  return d.lecturePublique === true && Array.isArray(d.tables) && d.tables.length > 0
}

/**
 * POSE LA QUESTION. Rend `true` seulement si la personne a accepté.
 *
 * Le corps à renvoyer est `{ lecturePubliqueAcceptee: true }` — c'est lui qui
 * PROUVE à la route que la liste est passée devant quelqu'un.
 */
export function accordLecturePublique(d: RefusLecturePublique): boolean {
  if (!estRefusLecturePublique(d)) return false
  const tables = (d.tables as unknown[]).map((t) => String(t))
  const liste = tables.map((t) => `  • ${t}`).join('\n')
  const titre =
    tables.length > 1
      ? 'Ces listes seront lisibles PAR TOUT LE MONDE, sans compte :'
      : 'Cette liste sera lisible PAR TOUT LE MONDE, sans compte :';
  return window.confirm(
    `${titre}\n\n${liste}\n\n` +
      'Personne ne pourra y écrire ; tout le monde pourra y lire.\n\n' +
      'Si l’une de ces listes contient quelque chose qui ne doit pas être lu ' +
      'par n’importe qui, annulez et demandez une modification AVANT de ' +
      'publier — une page servie ne se rattrape pas.\n\n' +
      'Publier quand même ?',
  )
}

/** Le corps qui porte l'accord. Les trois écrans l'envoient à l'identique. */
export const CORPS_ACCORD = JSON.stringify({ lecturePubliqueAcceptee: true })

/**
 * L'en-tête qui va avec. MESURÉ : il n'est PAS ce qui rend l'accord lisible.
 *
 * J'avais écrit « sans `content-type`, la route ne lit rien ». Faux, et
 * éprouvé : `Request.json()` lit le corps quel que soit l'en-tête — les deux
 * formes rendent `{"lecturePubliqueAcceptee":true}`. On le pose parce que
 * c'est juste, pas parce que ça décide.
 */
export const ENTETES_ACCORD: Readonly<Record<string, string>> = {
  'content-type': 'application/json',
}

/**
 * PUBLIE, ET SI LA LISTE PUBLIQUE ARRÊTE L'APPEL, POSE LA QUESTION.
 *
 * ── POURQUOI LA RELANCE VIT ICI, et pas dans les trois écrans.
 *
 * Trois copies de « lis le refus, demande, repose l'appel avec l'accord »
 * divergeraient sur le détail qui compte : oublier le CORPS suffit pour que
 * la route ne voie aucun accord et refuse une seconde fois, sans que rien ne
 * dise pourquoi. (Ce n'est pas l'en-tête : mesuré, `Request.json()` s'en
 * passe. C'est le corps.)
 *
 * ── ET UN REFUS DÉCLINÉ REVIENT TEL QUEL.
 *
 * Si la personne annule, on rend la PREMIÈRE réponse : l'écran affiche
 * alors le message de la route, qui nomme les tables. Rendre une erreur
 * inventée ici effacerait la seule information utile.
 */
export async function publierAvecAccord(url: string, autorisation: string): Promise<Response> {
  const premier = await fetch(url, { method: 'POST', headers: { Authorization: autorisation } })
  if (premier.ok) return premier
  // On lit une COPIE : l'appelant doit pouvoir relire le corps lui-même.
  const d = (await premier
    .clone()
    .json()
    .catch(() => ({}))) as RefusLecturePublique
  if (!estRefusLecturePublique(d)) return premier
  if (!accordLecturePublique(d)) return premier
  return fetch(url, {
    method: 'POST',
    headers: { Authorization: autorisation, ...ENTETES_ACCORD },
    body: CORPS_ACCORD,
  })
}
