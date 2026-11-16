/**
 * L'INTERRUPTEUR DE « RÉGÉNÉRER » — séparé de la génération neuve (2026-11-16).
 *
 * Jusqu'ici, la pause du 2026-11-14 (27e83891) fermait la génération neuve ET
 * la régénération avec UN SEUL interrupteur, `NEXT_PUBLIC_GENERATION_ASYNC`.
 * Ouvrir l'une rouvrait l'autre. Décision du propriétaire (2026-11-16) :
 * « Régénérer » a son propre interrupteur, FERMÉ PAR DÉFAUT ; sa réouverture
 * vient après les manques 1 à 3.
 *
 * ── UNE SEULE VARIABLE, DEUX LECTEURS.
 *
 * L'écran (le bouton du tableau de bord) ET la route `POST
 * /api/generateur/direct?id=…` lisent la MÊME variable. Avant ce lot, la
 * route n'avait AUCUN verrou : la pause ne fermait que le bouton, et une
 * requête forgée régénérait encore. Une seule variable ne peut pas diverger
 * d'un miroir.
 *
 * Seule la valeur exacte `1` ouvre. Absente, vide, `0`, `true` : fermé.
 *
 * Le nom est écrit EN TOUTES LETTRES aux deux lecteurs
 * (`process.env.NEXT_PUBLIC_REGENERATION_OUVERTE`) : Next n'injecte une
 * variable publique dans le navigateur que sous cette forme littérale.
 */
export const VARIABLE_REGENERATION = 'NEXT_PUBLIC_REGENERATION_OUVERTE'

export function regenerationOuverte(valeur: string | undefined): boolean {
  return valeur === '1'
}
