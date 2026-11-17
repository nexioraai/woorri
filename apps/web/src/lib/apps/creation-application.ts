/**
 * L'INTERRUPTEUR DE LA CRÉATION D'APPLICATIONS — le bouton « Application »
 * de l'accueil et l'aiguillage de la conversation (renommé le 2026-11-17).
 *
 * ── POURQUOI CE NOM, ET POURQUOI PLUS L'ANCIEN.
 *
 * Il s'appelait `NEXT_PUBLIC_GENERATION_ASYNC`. Ce nom venait d'octobre : il
 * armait l'écran de suivi du travailleur asynchrone du moteur AIR. Depuis le
 * moteur `direct`, ce suivi est inerte (`ConversationApplication.tsx`, garde
 * `moteurChoisi(...) === 'air'`) ; la variable ne faisait plus qu'UNE chose,
 * ouvrir ou fermer le bouton « Application ». Personne ne savait donc
 * pourquoi la remettre à `0` — décision 2 du propriétaire, 2026-11-17 : lui
 * donner le nom de ce qu'elle fait.
 *
 * ── CE QU'ELLE NE FAIT PAS.
 *
 * Elle ne ferme PAS la route : `POST /api/generateur/direct` ne la lit pas.
 * À `0`, elle cache la porte, elle ne la verrouille pas. Le verrou serveur
 * d'une dépense est le quota, pas cet interrupteur
 * (`docs/elite-protocol/GENERATION_OUVERTE_ET_QUOTA.md`).
 *
 * Seule la valeur exacte `1` ouvre. Absente, vide, `0`, `true` : fermé.
 *
 * Le nom est écrit EN TOUTES LETTRES au lecteur
 * (`process.env.NEXT_PUBLIC_CREATION_APPLICATION_OUVERTE`) : Next n'injecte
 * une variable publique dans le navigateur que sous cette forme littérale, et
 * la FIGE AU BUILD — un push rebâtit avec la valeur stockée dans Vercel.
 */
export const VARIABLE_CREATION_APPLICATION = 'NEXT_PUBLIC_CREATION_APPLICATION_OUVERTE'

/** L'ancien nom : il ne doit plus commander le bouton de l'accueil. */
export const ANCIEN_NOM_CREATION_APPLICATION = 'NEXT_PUBLIC_GENERATION_ASYNC'

export function creationApplicationOuverte(valeur: string | undefined): boolean {
  return valeur === '1'
}
