// ============================================================================
// L'APERÇU EST LE SITE LUI-MÊME — règles du cookie d'aperçu. 2026-11-15.
//
// LE DÉFAUT MESURÉ. L'aperçu d'un site non publié était une COPIE rendue dans
// le navigateur sous `/preview/<slug>`, sans aucune sous-page. Depuis les
// LOT 18 et 21 (2026-11-10), le menu mène à de vraies pages `/sites/<slug>/…`
// — servies par le serveur, qui ne lit que les sites PUBLIÉS : chaque entrée
// du menu tombait sur un 404 (Goura Doula, 2026-11-15).
//
// LA RÈGLE. Il n'y a plus qu'UN rendu : `/sites/<slug>`. Le propriétaire d'un
// site non publié y accède avec un cookie d'aperçu qui porte SON jeton de
// session ; le serveur lit alors la base avec son identité, et la vue
// `sites_public` laisse passer « publié OU appartenant à l'utilisateur »
// (supabase/sql/sites_public_apercu_proprietaire.sql). Toutes les pages
// existent donc, et tout lien ajouté plus tard aussi.
//
// Ce fichier n'a AUCUNE dépendance serveur : le navigateur (éditeur, page
// /preview) et le serveur (route, lecteur) en partagent les constantes.
// ============================================================================

/** Nom du cookie. Sa portée (`path`) est `/sites/<slug>` : un cookie par site. */
export const COOKIE_APERCU = 'deribfy_apercu'

/** Durée maximale d'un cookie d'aperçu, en secondes, même si le jeton vit plus longtemps. */
export const DUREE_MAX_APERCU = 3600

/** Chemin auquel le cookie d'un site est limité. */
export function cheminDuCookie(slug: string): string {
  return `/sites/${slug}`
}

/** Date d'expiration (secondes epoch) d'un JWT, sans vérifier sa signature. `null` si illisible. */
export function expirationDuJeton(jeton: string): number | null {
  const morceaux = jeton.split('.')
  if (morceaux.length !== 3) return null
  try {
    const b64 = morceaux[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = typeof atob === 'function'
      ? atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))
      : Buffer.from(b64, 'base64').toString('utf8')
    const exp = (JSON.parse(json) as { exp?: unknown }).exp
    return typeof exp === 'number' && Number.isFinite(exp) ? exp : null
  } catch {
    return null
  }
}

/**
 * Le jeton est-il encore utilisable ? Un jeton expiré enverrait PostgREST en
 * 401 ; on retombe alors sur la lecture anonyme (le site non publié redevient
 * un 404, exactement comme pour un visiteur). La marge évite d'envoyer un
 * jeton qui expire pendant la requête.
 */
export function jetonEncoreValable(jeton: string, maintenant = Date.now() / 1000, marge = 15): boolean {
  const exp = expirationDuJeton(jeton)
  return exp !== null && exp - marge > maintenant
}

/** Durée de vie à donner au cookie : celle du jeton, plafonnée. 0 si le jeton est inutilisable. */
export function dureeDuCookie(jeton: string, maintenant = Date.now() / 1000): number {
  const exp = expirationDuJeton(jeton)
  if (exp === null) return 0
  return Math.max(0, Math.min(DUREE_MAX_APERCU, Math.floor(exp - maintenant)))
}

/** Adresse de l'API qui pose le cookie d'aperçu d'un site. */
export function routeDuCookie(slug: string): string {
  return `/api/sites/${encodeURIComponent(slug)}/apercu`
}
