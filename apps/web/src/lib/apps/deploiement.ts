/**
 * LE COMMIT DU DÉPLOIEMENT QUI SERT — une seule dérivation, deux lecteurs.
 *
 * ── POURQUOI (étape 2, 2026-11-13).
 *
 * Une ligne de preuve (`c4522e43`) portait `configuration = {}` et
 * `nom = null`, et PERSONNE ne pouvait dire quel déploiement l'avait servie :
 * la base ne l'enregistrait pas, les logs de l'hébergeur n'écrivent rien
 * sur succès. « Déploiement d'origine INCONNU » a coûté une génération.
 *
 * Le serveur connaît pourtant son commit : `/api/version` le prouve depuis
 * `VERCEL_GIT_COMMIT_SHA`. Cette fonction est CETTE dérivation, et la route
 * de génération l'écrit dans chaque ligne, en succès comme en échec. Elle
 * est partagée avec `/api/version` : ce que la ligne dit et ce que la
 * version affiche ne peuvent pas diverger.
 *
 * ── CE QU'ELLE NE DIT PAS.
 * Elle identifie le DÉPLOIEMENT SERVEUR qui a reçu la requête — pas le
 * paquet client qui l'a envoyée. Un onglet resté ouvert sur une ancienne
 * prévisualisation parle à SON serveur, donc sa ligne portera SON commit :
 * c'est précisément ce qu'on veut lire.
 */

/** 7 signes, comme `/api/version` ; `inconnu` hors hébergeur. */
export function commitDuDeploiement(env: Readonly<Record<string, string | undefined>>): string {
  const sha = env.VERCEL_GIT_COMMIT_SHA ?? ''
  return sha === '' ? 'inconnu' : sha.slice(0, 7)
}

export type Deploiement = {
  readonly commit: string
  /** `production` | `preview` | `development` chez l'hébergeur ; `inconnu` ailleurs. */
  readonly environnement: string
  /** La branche git du déploiement, si l'hébergeur la donne. */
  readonly branche: string
}

export function deploiementQuiSert(env: Readonly<Record<string, string | undefined>>): Deploiement {
  return {
    commit: commitDuDeploiement(env),
    environnement: env.VERCEL_ENV ?? 'inconnu',
    branche: env.VERCEL_GIT_COMMIT_REF ?? 'inconnu',
  }
}
