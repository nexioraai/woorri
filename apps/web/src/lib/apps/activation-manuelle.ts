/**
 * L'ÉCART ENTRE CE QUI A ÉTÉ REÇU ET LE PRIX RÉGLÉ (activation à la main, 2026-11-20).
 *
 * Prix décidés par le propriétaire : abonnement d'un mois 12 000 FCFA, lot de
 * 50 modifications 3 000 FCFA — réglages `prix_mensuel_xaf` et `lot_prix_xaf`.
 * Chaque objet se compare à SON prix. Un prix vide bloque (« un réglage vide
 * ne vaut pas zéro ») ; un montant différent est SIGNALÉ, pas refusé : le
 * propriétaire sait pourquoi il a reçu autre chose (remise, appoint).
 *
 * Fonction pure, sans import serveur : l'écran et la route la partagent.
 */
export type ReglagesActivation = { readonly prixMensuelXaf: string; readonly lotPrixXaf: string }
export type Objet = 'abonnement' | 'lot'

const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/ | /gu, ' ')} FCFA`

/** Le prix réglé pour cet objet, ou `null` s'il est vide. */
export function prixRegle(objet: Objet, r: ReglagesActivation): number | null {
  const v = (objet === 'lot' ? r.lotPrixXaf : r.prixMensuelXaf).trim()
  return /^[0-9]+$/u.test(v) ? Number(v) : null
}

/** Pourquoi l'activation est impossible, ou `null`. */
export function blocage(objet: Objet, r: ReglagesActivation): string | null {
  if (prixRegle(objet, r) !== null) return null
  return objet === 'lot'
    ? 'Le prix du lot en FCFA n’est pas encore réglé : aucun lot ne peut être activé à la main tant qu’il est vide.'
    : 'Le prix mensuel en FCFA n’est pas encore réglé : aucune activation à la main n’est possible tant qu’il est vide.'
}

/** L'écart à signaler avant de confirmer, ou `null` si le montant est le prix réglé. */
export function ecart(objet: Objet, recu: number, r: ReglagesActivation): string | null {
  const prix = prixRegle(objet, r)
  if (prix === null || recu === prix) return null
  return `Attention : le prix réglé est ${fcfa(prix)}, le montant reçu est ${fcfa(recu)}.`
}
