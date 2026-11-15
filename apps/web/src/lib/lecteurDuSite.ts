import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { COOKIE_APERCU, jetonEncoreValable } from '@/lib/apercu'

// ============================================================================
// LE LECTEUR D'UN SITE, CÔTÉ SERVEUR — un par requête. 2026-11-15.
//
// Toute lecture serveur d'une vue `*_public` passe par ICI, jamais par le
// client anonyme partagé directement. Sans cookie d'aperçu : c'est le client
// anonyme, rien ne change. Avec un cookie d'aperçu valable : un client qui
// porte le jeton du propriétaire — la vue `sites_public` lui rend alors SON
// site non publié, et les quatre vues qui la joignent suivent.
//
// Ce que ce lecteur NE change PAS : les filtres « publié » des pages, articles,
// produits et avis. Ils sont écrits dans les vues et dans les requêtes ; le
// propriétaire voit exactement ce que verra le public une fois le site publié.
//
// `cache` : un seul client par requête, quel que soit le nombre de lecteurs.
// Hors requête (tests, scripts), `cookies()` lève : on retombe sur le client
// anonyme. `unstable_rethrow` relance les erreurs INTERNES de Next (rendu
// dynamique), qu'il ne faut jamais avaler.
// ============================================================================

/**
 * UN JETON REFUSÉ VAUT « PAS DE COOKIE ». Mesuré le 2026-11-15 : un cookie au
 * jeton invalide (signature fausse, clés tournées) faisait répondre 401 à la
 * base, et un site PUBLIÉ tombait en 404. Sur un 401, la même requête est
 * rejouée en anonyme : le visiteur voit exactement ce que voit le public.
 */
export function fetchRepliAnonyme(cleAnonyme: string, fetchDeBase: typeof fetch = fetch): typeof fetch {
  return async (entree, init) => {
    const reponse = await fetchDeBase(entree, init)
    if (reponse.status !== 401) return reponse
    const entetes = new Headers(init?.headers)
    entetes.set('Authorization', `Bearer ${cleAnonyme}`)
    return fetchDeBase(entree, { ...init, headers: entetes })
  }
}

function clientDuProprietaire(jeton: string): SupabaseClient {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anon, {
    global: { headers: { Authorization: `Bearer ${jeton}` }, fetch: fetchRepliAnonyme(anon) },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/** Le jeton d'aperçu de la requête en cours, s'il existe et vit encore. */
export const jetonDApercu = cache(async (): Promise<string | null> => {
  try {
    const jeton = (await cookies()).get(COOKIE_APERCU)?.value
    return jeton && jetonEncoreValable(jeton) ? jeton : null
  } catch (e) {
    unstable_rethrow(e)
    return null
  }
})

/** Le client de lecture de la requête en cours. */
export const lecteurDuSite = cache(async (): Promise<SupabaseClient> => {
  const jeton = await jetonDApercu()
  return jeton ? clientDuProprietaire(jeton) : supabase
})

/**
 * Ce site est-il montré en APERÇU — c'est-à-dire lu avec le jeton du
 * propriétaire alors qu'un visiteur ne le verrait pas ? Une seule requête
 * anonyme, et seulement quand un cookie d'aperçu est présent.
 */
export const estEnApercu = cache(async (slug: string): Promise<boolean> => {
  if (!(await jetonDApercu())) return false
  const { data, error } = await supabase.from('sites_public').select('id').eq('slug', slug).maybeSingle()
  return !error && !data
})
