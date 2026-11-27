import 'server-only'
// LE PROPRIÉTAIRE REGARDE-T-IL SON SITE ? (lot 4c, 2026-11-26) — tous les thèmes.
//
// Vérifié, pas supposé : un cookie d'aperçu ne suffit pas ; son jeton doit être
// celui du PROPRIÉTAIRE de ce site (service d'authentification + `owner_id`).
// Un visiteur qui poserait son propre jeton reste un visiteur. Une requête par
// page au plus (`cache`), et aucune sans cookie d'aperçu.
// Seuls les appelants SERVEUR l'importent (pages, routes) : jamais un thème.
import { cache } from 'react'
import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { jetonDApercu } from '@/lib/lecteurDuSite'

/**
 * LA VUE VISITEUR DU PROPRIÉTAIRE. Un site non publié ne se montre qu'à son
 * propriétaire : un vrai visiteur reçoit 404. Avec ce cookie, le propriétaire
 * voit son site EXACTEMENT comme le verra un visiteur une fois publié (aucune
 * case « À compléter », aucun avis « visible par vous seul »). Il ne donne
 * aucun droit : il ne peut que RETIRER ce que le propriétaire voit en plus.
 */
export const COOKIE_VUE = 'deribfy_vue'

async function vueVisiteur(): Promise<boolean> {
  try {
    return (await cookies()).get(COOKIE_VUE)?.value === 'visiteur'
  } catch (e) {
    unstable_rethrow(e)
    return false
  }
}

export const estProprietaireDuSite = cache(async (siteId: string): Promise<boolean> => {
  if (await vueVisiteur()) return false
  const jeton = await jetonDApercu()
  if (jeton === null || siteId === '') return false
  try {
    // Import tardif : une page qui importe ce module ne charge pas la clé de service au démarrage.
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const [{ data: u }, { data: site }] = await Promise.all([
      supabase.auth.getUser(jeton),
      supabaseAdmin.from('sites').select('owner_id').eq('id', siteId).maybeSingle(),
    ])
    const id = u?.user?.id
    return typeof id === 'string' && id !== '' && (site as { owner_id?: string | null } | null)?.owner_id === id
  } catch {
    return false
  }
})
