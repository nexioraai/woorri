/**
 * TEST OU RÉEL — LA RÈGLE DU PASSAGE AU RÉEL (lot L3 2026-11-23, ouvert à tous le 2026-11-24).
 *
 * Le réglage `mobile_money` décide, à condition que la clé live
 * `MONERAILS_CLE_LIVE` (`mr_live_…`) soit présente dans Vercel :
 *   · « tous »            → TOUS les comptes connectés paient en RÉEL ;
 *   · un courriel listé    → ce compte en réel, s'il est aussi dans
 *                            `COMPTES_REEL` (écrit ici, par un commit nommé) ;
 *   · vide                 → personne en réel.
 * Sans clé live, ou sans compte connecté : TEST, toujours. Ce fichier ne
 * change pas le réglage : c'est le propriétaire qui l'écrit.
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

/** Le réglage vaut-il « tous » (casse et espaces ignorés, comme l'interrupteur) ? */
export function reglageOuvreATous(valeur: string | null): boolean {
  return (valeur ?? '').trim().toLowerCase() === 'tous'
}

export function decideRegime(c: { readonly email: string | null; readonly cleLive: string | undefined; readonly reglage: string | null }): RegimeMobileMoney {
  if (c.email === null) return 'test'
  if (cleDuRegime('reel', c.cleLive) === null) return 'test'
  if (reglageOuvreATous(c.reglage)) return 'reel'
  const e = c.email.trim().toLowerCase()
  return COMPTES_REEL.includes(e) && reglageNommeLeCourriel(c.reglage, e) ? 'reel' : 'test'
}
