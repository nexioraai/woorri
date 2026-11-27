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

/**
 * CE QUE LA LISTE DE /admin DIT D'UNE APPLI (2026-11-27).
 *
 * « offerte » quand le DERNIER abonnement inscrit au registre est `offert`
 * (les 4 du lancement, les épreuves) : une offre n'est pas une vente, l'écran
 * ne dit pas « payée ». Un vrai paiement arrivé après l'offre redevient
 * « payée ». Le reste est inchangé : pas abonnée ou sans date → « gratuite ».
 */
export type FormuleListee = { readonly formule: string; readonly payeJusquAu: string | null; readonly offerte: boolean }

export function formuleLisible(a: FormuleListee, jour: (d: Date) => string): string {
  if (a.formule !== 'abonnee' || a.payeJusquAu === null) return 'gratuite'
  return `${a.offerte ? 'offerte' : 'payée'} jusqu’au ${jour(new Date(a.payeJusquAu))}`
}

/** Le dernier abonnement de chaque appli est-il une offre ? (lignes triées du plus récent au plus ancien) */
export function appliesOffertes(lignes: readonly { readonly app_id: string; readonly fournisseur: string }[]): Set<string> {
  const vu = new Set<string>()
  const offertes = new Set<string>()
  for (const l of lignes) {
    if (vu.has(l.app_id)) continue
    vu.add(l.app_id)
    if (l.fournisseur === 'offert') offertes.add(l.app_id)
  }
  return offertes
}
