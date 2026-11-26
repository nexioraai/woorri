import 'server-only'
/**
 * APRÈS L'ÉCHÉANCE, LE CONTENU D'UN SITE NE SE MODIFIE PLUS (2026-11-26).
 *
 * Décision du propriétaire : un site payé en mobile money dont l'échéance est
 * passée RESTE en ligne ; ses commandes, ses clients, ses messages, son
 * paiement et son renouvellement marchent. Seules s'arrêtent les
 * modifications de CONTENU : pages, produits, articles, catalogue, images,
 * logo, assistant de l'éditeur.
 *
 * Le navigateur est arrêté par la base (déclencheur `sites_refuser_si_echu`,
 * n° 10). Les routes serveur écrivent avec `service_role`, que ce
 * déclencheur ne voit pas : chaque route de contenu appelle ceci juste après
 * `requireSiteOwner`. La règle est la MÊME fonction que le déclencheur
 * (`site_modifications_permises`) : une seule définition de « échu ».
 *
 * Une lecture ratée LAISSE PASSER : bloquer un propriétaire sur son propre
 * site à cause d'un incident de lecture serait pire que laisser passer une
 * modification. L'opérateur (`viaAdmin`) n'est jamais arrêté.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CODE_SITE_ECHU, PHRASE_SITE_ECHU } from './site-echu'

export { CODE_SITE_ECHU, PHRASE_SITE_ECHU }

/** `true` permis, `false` échu, `null` lecture ratée. */
export type LirePermission = (siteId: string) => Promise<boolean | null>

const lireParLaBase: LirePermission = async (siteId) => {
  const { data, error } = await supabaseAdmin.rpc('site_modifications_permises', { p_site: siteId })
  if (error !== null || typeof data !== 'boolean') return null
  return data
}

/** La réponse 403 à rendre, ou `null` si la modification est permise. */
export async function refuserSiEchu(
  auth: { readonly site?: unknown; readonly viaAdmin?: boolean },
  o: { readonly lire?: LirePermission } = {},
): Promise<NextResponse | null> {
  if (auth.viaAdmin === true) return null
  const id = (auth.site as { id?: unknown } | null | undefined)?.id
  if (typeof id !== 'string' || id === '') return null
  let permis: boolean | null
  try {
    permis = await (o.lire ?? lireParLaBase)(id)
  } catch {
    permis = null
  }
  if (permis !== false) return null
  return NextResponse.json({ error: PHRASE_SITE_ECHU, code: CODE_SITE_ECHU, renouveler: true }, { status: 403 })
}
