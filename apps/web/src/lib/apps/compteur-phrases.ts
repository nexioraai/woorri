/**
 * LES MOTS DU COMPTEUR, DANS L'ATELIER (étape ③, 2026-11-19).
 *
 * Décision 5A du propriétaire : le commerçant voit des MODIFICATIONS, jamais
 * des dollars — « il vous reste 37 modifications », pas « au plus 0,03 $ ».
 * Les montants restent pour le propriétaire (comptes exemptés).
 *
 * Fonctions pures : aucun appel, aucun état. L'écran les appelle, les tests
 * les tiennent.
 */
/** L'état du compteur tel que le serveur le rend à l'atelier. */
export type EtatCompteur =
  | { readonly exempte: true }
  | {
      readonly exempte: false
      /** Gratuite ou abonnée (colonne `statut` d'app_compteurs). */
      readonly formule: 'gratuite' | 'abonnee'
      /** Ce qu'il reste dans la période en cours (gratuite : au total). */
      readonly restantes: number
      /** Abonnée : jusqu'à quand c'est payé (ISO). Gratuite : null. */
      readonly payeJusquAu: string | null
      /** Abonnée ET payée à l'heure de la lecture (le serveur le dit : l'écran ne lit pas l'horloge). */
      readonly actif: boolean
    }

const dateCourte = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso))

const pluriel = (n: number, un: string, plusieurs: string): string => (n === 1 ? un : plusieurs)

/** Le bouton peut-il partir ? Fermé à zéro — l'appli, elle, reste en ligne. */
export function boutonOuvert(etat: EtatCompteur | null): boolean {
  return etat === null || etat.exempte || etat.restantes > 0
}

/** Le libellé du bouton « Modifier ». */
export function libelleBouton(etat: EtatCompteur | null, plafond: string): string {
  if (etat === null) return 'Modifier'
  if (etat.exempte) return plafond === '' ? 'Modifier' : `Modifier — ${plafond}`
  const n = etat.restantes
  if (etat.formule === 'gratuite') {
    return n > 0
      ? `Modifier — ${String(n)} ${pluriel(n, 'modification gratuite restante', 'modifications gratuites restantes')}`
      : 'Plus de modification gratuite'
  }
  if (n === 0) return 'Plus de modification sur cette période'
  const jusqua = etat.payeJusquAu === null ? '' : ` jusqu’au ${dateCourte(etat.payeJusquAu)}`
  return `Modifier — ${String(n)} ${pluriel(n, 'modification restante', 'modifications restantes')}${jusqua}`
}

/** Pourquoi le bouton est fermé, et ce qui le rouvre. `null` = ouvert. */
export function raisonFermeture(etat: EtatCompteur | null): string | null {
  if (boutonOuvert(etat) || etat === null || etat.exempte) return null
  return etat.formule === 'gratuite'
    ? 'Vos modifications gratuites sont utilisées. Abonnez cette application pour continuer à la faire évoluer — elle reste en ligne en attendant.'
    : 'Les modifications de cette période sont utilisées. Le compteur repart au prochain paiement, ou avec un lot de modifications. L’application reste en ligne et ses données ne bougent pas.'
}

/** Ce que l'écran dit après une retouche. */
export function phraseApresRetouche(etat: EtatCompteur | null, livree: boolean, restantes: number | undefined): string {
  if (etat === null || etat.exempte) return ''
  if (!livree) return ' Non décomptée.'
  if (restantes === undefined) return ''
  return restantes === 0 ? ' C’était votre dernière modification.' : ` Il vous en reste ${String(restantes)}.`
}

/** Les montants en dollars : pour le propriétaire seul. */
export function voitLesCouts(etat: EtatCompteur | null): boolean {
  return etat !== null && etat.exempte
}

// ── PUBLIER DEMANDE L'ABONNEMENT (2026-11-20).
//
// Décision du propriétaire : un compte non exempté ne publie qu'une appli
// abonnée et payée. Le bouton bloqué ne laisse personne sans issue : le prix
// (lu dans le réglage `prix_mensuel_xaf`, jamais écrit ici) et comment payer.

/** Le contact pour payer à la main — donné par le propriétaire le 2026-11-20. */
export const WHATSAPP_PAIEMENT = '+235 68 36 41 35'
/** Le même, en lien (wa.me n'accepte que les chiffres). */
export const LIEN_WHATSAPP_PAIEMENT = `https://wa.me/${WHATSAPP_PAIEMENT.replace(/[^0-9]/gu, '')}`

/**
 * L'écran laisse-t-il publier ? Exempté ou abonné et payé : oui. Compteur
 * illisible (`null`) : l'écran ne bloque pas — le SERVEUR tranche, et dit
 * pourquoi s'il refuse.
 */
export function publicationOuverte(etat: EtatCompteur | null): boolean {
  return etat === null || etat.exempte || etat.actif
}

const fcfa = (n: number): string => `${new Intl.NumberFormat('fr-FR').format(n).replace(/[\u202f\u00a0]/gu, ' ')} FCFA`

/** « Publier demande l'abonnement — 12 000 FCFA par mois ». Prix vide : sans montant, jamais « 0 ». */
export function libellePublicationBloquee(prixMensuelXaf: number | null): string {
  return prixMensuelXaf === null
    ? 'Publier demande l’abonnement'
    : `Publier demande l’abonnement — ${fcfa(prixMensuelXaf)} par mois`
}

/**
 * Les moyens de paiement à la main, quand le réglage `moyens_paiement_manuel`
 * est absent ou vide (2026-11-21) : seulement ce que le propriétaire peut
 * ENCAISSER aujourd'hui. Pas de numéro mobile money pour recevoir : pas
 * d'« Airtel Money » promis.
 */
export const MOYENS_PAIEMENT_DEFAUT: readonly string[] = ['espèces']

/** La liste lue dans le réglage (séparée par des virgules) ; vide → le défaut. */
export function moyensDePaiement(valeur: string | null | undefined): readonly string[] {
  const l = (valeur ?? '').split(',').map((x) => x.trim()).filter((x) => x !== '')
  return l.length > 0 ? l : MOYENS_PAIEMENT_DEFAUT
}

/** Comment payer, en une phrase : « Pour payer : WhatsApp … (espèces). » */
export function phraseCommentPayer(moyens: readonly string[]): string {
  return `Pour payer : WhatsApp ${WHATSAPP_PAIEMENT} (${moyens.join(', ')}).`
}

/** Ce que la route rend quand elle refuse : les deux, ensemble. */
export function phrasePublicationBloquee(prixMensuelXaf: number | null, moyens: readonly string[]): string {
  return `${libellePublicationBloquee(prixMensuelXaf)}. ${phraseCommentPayer(moyens)}`
}
