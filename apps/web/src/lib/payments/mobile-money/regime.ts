/**
 * TEST OU RÉEL — LA RÈGLE DU PASSAGE AU RÉEL (lot L3, 2026-11-23).
 *
 * Décision du propriétaire : le RÉEL est limité à SON compte. Un compte paie en
 * réel seulement si les TROIS conditions tiennent ensemble :
 *   ① son courriel est dans `COMPTES_REEL` (écrit ici, par un commit nommé) ;
 *   ② la clé live `MONERAILS_CLE_LIVE` est présente dans Vercel (`mr_live_…`) ;
 *   ③ le réglage `mobile_money` contient CE courriel, écrit en toutes lettres
 *      (« tous » ne suffit pas : il ouvre le TEST à tous, jamais le réel).
 * Une seule manque → TEST. Tous les autres comptes : TEST, toujours.
 *
 * Fichier PUR (aucun import serveur) : la décision se teste sans base.
 */

export type RegimeMobileMoney = 'test' | 'reel'

/** Les seuls comptes qui peuvent payer en réel. */
export const COMPTES_REEL: readonly string[] = ['contact@deribfy.com']

/** Une clé du bon mode : `mr_test_…` pour le test, `mr_live_…` pour le réel. */
export function cleDuRegime(regime: RegimeMobileMoney, cle: string | undefined): string | null {
  const k = (cle ?? '').trim()
  return k.startsWith(regime === 'reel' ? 'mr_live_' : 'mr_test_') ? k : null
}

/** Le réglage `mobile_money` nomme-t-il ce courriel, en toutes lettres ? */
export function reglageNommeLeCourriel(valeur: string | null, email: string): boolean {
  const e = email.trim().toLowerCase()
  if (e === '' || valeur === null) return false
  return valeur.split(',').map((x) => x.trim().toLowerCase()).includes(e)
}

export function decideRegime(c: { readonly email: string | null; readonly cleLive: string | undefined; readonly reglage: string | null }): RegimeMobileMoney {
  if (c.email === null) return 'test'
  const e = c.email.trim().toLowerCase()
  const permis = COMPTES_REEL.includes(e)
  const cle = cleDuRegime('reel', c.cleLive) !== null
  return permis && cle && reglageNommeLeCourriel(c.reglage, e) ? 'reel' : 'test'
}
