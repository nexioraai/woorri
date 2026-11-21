/**
 * LE PREMIER TOUR TIENT DANS LE PLAFOND (option B du propriétaire, 2026-11-21).
 *
 * Le plafond de coût (0,50 $) se vérifie AVANT chaque tour suivant, à partir
 * du coût déjà dépensé. Rien ne bornait le PREMIER tour : avec le fournisseur
 * de secours (Anthropic, 32 000 jetons de sortie à 25 $/M = 0,80 $), un seul
 * appel pouvait dépasser le plafond à lui seul.
 *
 * La règle : avant le premier appel, on estime l'entrée (signes envoyés ÷ 3 —
 * PRUDENT : on surestime le nombre de jetons) au tarif de POINTE, et la
 * sortie maximale devient ce qui tient dans le reste du plafond, sans jamais
 * dépasser celle du fournisseur. Si l'entrée seule ne laisse pas la place
 * d'une sortie utile, la génération est refusée AVANT tout appel.
 *
 * DeepSeek (production, 65 536 jetons à 3,96 $/M = 0,2595 $) : inchangé tant
 * que l'entrée estimée reste sous ~182 000 jetons (~546 000 signes).
 *
 * Fonction PURE : le tarif et les signes sont des paramètres.
 */

/** Signes par jeton, PRUDENT (on compte large) — le français en fait ~3,5 à 4. */
export const SIGNES_PAR_JETON_PRUDENT = 3
/** En dessous, une réponse ne peut pas contenir une application : on refuse. */
export const SORTIE_MINIMALE_UTILE = 4096

export const PHRASE_TROP_LONG =
  'Ce cahier des charges est trop long pour être traité en une seule génération. Raccourcissez-le ou découpez-le, puis relancez. Rien n’a été décompté.'

export type SortiePremierTour =
  | { readonly refus: false; readonly sortie: number; readonly estimationUsd: number }
  | { readonly refus: true; readonly estimationEntreeUsd: number }

export function sortiePremierTour(o: {
  readonly signes: number
  readonly plafondUsd: number
  /** Tarif de POINTE, par million de jetons. */
  readonly tarif: { readonly entree: number; readonly sortie: number }
  /** La sortie maximale du fournisseur. */
  readonly sortieMax: number
}): SortiePremierTour {
  const jetonsEntree = Math.ceil(o.signes / SIGNES_PAR_JETON_PRUDENT)
  const entreeUsd = (jetonsEntree * o.tarif.entree) / 1e6
  const place = Math.floor(((o.plafondUsd - entreeUsd) * 1e6) / o.tarif.sortie)
  const sortie = Math.min(o.sortieMax, place)
  if (sortie < SORTIE_MINIMALE_UTILE) return { refus: true, estimationEntreeUsd: entreeUsd }
  return { refus: false, sortie, estimationUsd: entreeUsd + (sortie * o.tarif.sortie) / 1e6 }
}
