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

// ── « PUBLIER » MÈNE AU PAIEMENT (décision du propriétaire, 2026-11-21).
//
// Plus de cadenas ni de bandeau WhatsApp : un client qui peut payer par carte
// ne doit pas être bloqué. Un seul chemin : « Publier ». Non abonné, il
// l'envoie au paiement Stripe de l'abonnement de l'appli ; au retour, la
// publication se relance en un clic. Le SERVEUR garde la règle : sans période
// payée, la route de publication refuse toujours (402).

/**
 * L'écran laisse-t-il publier ? Exempté ou abonné et payé : oui. Compteur
 * illisible (`null`) : l'écran ne bloque pas — le SERVEUR tranche, et dit
 * pourquoi s'il refuse.
 */
export function publicationOuverte(etat: EtatCompteur | null): boolean {
  return etat === null || etat.exempte || etat.actif
}

/** Le prix de l'abonnement par carte, LU CHEZ STRIPE (montant, devise ISO). */
export type PrixCarte = { readonly montant: number; readonly devise: string }

/** « 20 $ US / mois » — le prix tel que Stripe le facturera. */
export function prixLisible(p: PrixCarte): string {
  const n = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(p.montant).replace(/[\u202f\u00a0]/gu, ' ')
  return p.devise === 'USD' ? `${n} $ US / mois` : `${n} ${p.devise} / mois`
}

/** Ce que fait un clic sur « Publier ». */
export type ActionPublier = 'publier' | 'payer' | 'fermee'

/**
 * Payé (ou exempté, ou compteur illisible) : publier. Sinon : payer par carte
 * si le paiement est ouvert pour ce compte ET que son prix est connu (on
 * n'envoie personne chez Stripe sans lui avoir montré le prix) ; sinon, dire
 * que le paiement en ligne n'est pas encore ouvert — jamais une erreur brute.
 */
export function actionPublier(etat: EtatCompteur | null, carteOuverte: boolean, prix: PrixCarte | null): ActionPublier {
  if (publicationOuverte(etat)) return 'publier'
  return carteOuverte && prix !== null ? 'payer' : 'fermee'
}

/** Le libellé du bouton : le prix est visible AVANT le départ chez Stripe. */
export function libellePublier(action: ActionPublier, prix: PrixCarte | null): string {
  return action === 'payer' && prix !== null ? `Publier — ${prixLisible(prix)}` : 'Publier'
}

/** Ce que dit l'écran quand le paiement en ligne n'est pas ouvert pour ce compte. */
export const PHRASE_PUBLIER_FERMEE =
  'Publier demande un abonnement pour cette application. Le paiement en ligne n’est pas encore ouvert pour votre compte.'

/** Ce que rend la route `publier` quand la période n'est pas payée (402). */
export const PHRASE_ABONNEMENT_REQUIS = 'Publier demande un abonnement en cours pour cette application.'
