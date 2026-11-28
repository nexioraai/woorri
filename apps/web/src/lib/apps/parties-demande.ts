/**
 * LES PARTIES D'UNE DEMANDE, ET CE QUI EN EST FAIT (2026-11-28).
 *
 * ── LE DÉFAUT QUI L'A FAIT ÉCRIRE.
 *
 * Retouche v3 de « Suivi de colis » : la demande avait trois parties (numéro
 * attribué, page publique de suivi, recherche par numéro). L'écran a dit
 * « Ajouté : numero_suivi » — UNE partie — et la page publique, elle, ne
 * marchait pas dans Chrome. Le message ne montrait que ce que la migration
 * savait dire. Décision du fondateur : « Plus jamais un message qui ne
 * montre qu'une partie. »
 *
 * ── DEUX SOURCES, JAMAIS CONFONDUES.
 *
 * `modele` : le modèle découpe la demande et dit, partie par partie, ce qu'il
 *   a fait (`PARTIES.json`, retiré des fichiers livrés). C'est une
 *   DÉCLARATION, pas une preuve : le robot de test (point 4 du fondateur)
 *   la vérifiera en agissant sur la page servie. Le message le dit.
 * `deribfy` : ce que NOS contrôles ont MESURÉ — un juge resté rouge après les
 *   essais de réparation. Une mesure l'emporte sur une déclaration : elle
 *   rend la livraison partielle même si le modèle a tout coché.
 *
 * ── PAS DE LISTE = PAS « FAIT ».
 *
 * Sans `PARTIES.json` lisible (après une relance), on ne sait pas ce qui est
 * fait. Le mandat interdit d'afficher « Modifié » et de facturer une demande
 * qui n'est pas faite en entier : une demande dont on ne sait rien ne l'est
 * pas. On le dit, et on ne décompte pas.
 */
import { extraireJson } from './declaration-en-route'

export const FICHIER_PARTIES = 'PARTIES.json'

export type Partie = {
  readonly partie: string
  readonly faite: boolean
  readonly pourquoi: string | null
  readonly source: 'modele' | 'deribfy'
}

/** Les lignes de consigne : la retouche et la génération les composent. */
export const REGLE_PARTIES: readonly string[] = [
  'TA DEMANDE SE RAPPORTE PARTIE PAR PARTIE. Rends TOUJOURS ce fichier EN PLUS',
  '(il ne part pas dans l’application) : chaque chose que la personne a',
  'demandée, dans SES mots, une par ligne — aucune oubliée, aucune fusionnée —,',
  'et si tu l’as faite. Une partie que tu n’as pas pu faire : "faite": false',
  'et "pourquoi" en une phrase, dans ses mots.',
  '',
  `   === ${FICHIER_PARTIES} ===`,
  '   [{"partie":"un numéro de suivi attribué à chaque colis","faite":true},',
  '    {"partie":"une page publique où le client tape son numéro","faite":true},',
  '    {"partie":"un SMS au client","faite":false,"pourquoi":"l’envoi de SMS n’est pas encore branché"}]',
]

/** La consigne de la relance quand la liste manque ou ne se lit pas. */
export function messageRelanceParties(probleme: string): string {
  return [
    `Ton fichier ${FICHIER_PARTIES} ${probleme}.`,
    `Rends SEULEMENT ${FICHIER_PARTIES}, aucun autre fichier : la liste de`,
    'TOUTES les parties de la demande, et pour chacune si tu l’as faite.',
    '',
    ...REGLE_PARTIES.slice(REGLE_PARTIES.indexOf('') + 1),
  ].join('\n')
}

export type PartiesLues =
  | { readonly ok: true; readonly parties: readonly Partie[] }
  | { readonly ok: false; readonly probleme: string }

/** Lit `PARTIES.json` (tolérant : bloc de code, texte autour). Ne lève jamais. */
export function lireParties(contenu: string | undefined): PartiesLues {
  if (contenu === undefined) return { ok: false, probleme: 'manque' }
  const lu = extraireJson(contenu)
  if (!lu.ok) return { ok: false, probleme: `ne se lit pas (${lu.erreur})` }
  const brut = Array.isArray(lu.valeur)
    ? lu.valeur
    : typeof lu.valeur === 'object' && lu.valeur !== null && Array.isArray((lu.valeur as { parties?: unknown }).parties)
      ? (lu.valeur as { parties: unknown[] }).parties
      : null
  if (brut === null) return { ok: false, probleme: 'n’est pas une liste' }
  const parties: Partie[] = []
  for (const x of brut) {
    if (typeof x !== 'object' || x === null) return { ok: false, probleme: 'contient un élément qui n’est pas une partie' }
    const o = x as { partie?: unknown; faite?: unknown; pourquoi?: unknown }
    if (typeof o.partie !== 'string' || o.partie.trim() === '') {
      return { ok: false, probleme: 'contient une partie sans "partie"' }
    }
    if (typeof o.faite !== 'boolean') {
      return { ok: false, probleme: `ne dit pas si « ${o.partie.trim()} » est faite ("faite": true ou false)` }
    }
    parties.push({
      partie: o.partie.trim(),
      faite: o.faite,
      pourquoi: typeof o.pourquoi === 'string' && o.pourquoi.trim() !== '' ? o.pourquoi.trim() : null,
      source: 'modele',
    })
  }
  if (parties.length === 0) return { ok: false, probleme: 'est vide' }
  return { ok: true, parties }
}

/** La demande est-elle faite en entier ? Sans liste : non (on ne sait pas). */
export function faiteEnEntier(parties: readonly Partie[] | null, constats: readonly Partie[] = []): boolean {
  return parties !== null && parties.length > 0 && [...parties, ...constats].every((p) => p.faite)
}

export const PHRASE_PARTIES_INCONNUES =
  'Je n’ai pas pu établir, partie par partie, ce qui a été fait : vérifiez l’application.'

export const PHRASE_NON_DECOMPTEE = 'Cette modification n’est pas décomptée.'

/**
 * LE MESSAGE, TOUTES LES PARTIES. Une ligne par partie, faite ou non, et la
 * raison de chaque « non faite ». Les mesures de Deribfy après celles du
 * modèle. Jamais « Modifié » si une partie manque.
 */
export function phraseParties(
  parties: readonly Partie[] | null,
  constats: readonly Partie[] = [],
  /** La phrase du compteur : celle d'une modification par défaut ; `null` pour une génération. */
  nonDecomptee: string | null = PHRASE_NON_DECOMPTEE,
): string {
  const suite = nonDecomptee === null ? '' : ` ${nonDecomptee}`
  const ligne = (p: Partie): string =>
    p.faite
      ? `✓ ${p.partie}`
      : `✗ ${p.partie} — non faite${p.pourquoi === null ? '' : ` : ${p.pourquoi}`}`
  if (parties === null || parties.length === 0) {
    return [`${PHRASE_PARTIES_INCONNUES}${suite}`, ...constats.map(ligne)].join('\n')
  }
  const toutes = [...parties, ...constats]
  const faites = toutes.filter((p) => p.faite).length
  const tete = faiteEnEntier(parties, constats)
    ? `Fait — ${String(toutes.length)} partie(s) sur ${String(toutes.length)} :`
    : `Fait en partie — ${String(faites)} partie(s) sur ${String(toutes.length)}.${suite}`
  return [tete, ...toutes.map(ligne)].join('\n')
}
