import { supabase } from '@/lib/supabase'
import { routeDuCookie } from '@/lib/apercu'

export type ResultatApercu =
  | { ok: true; adresse: string }
  | { ok: false; statut: number; erreur: string }

/**
 * NAVIGATEUR — pose le cookie d'aperçu d'un site (voir src/lib/apercu.ts) avec
 * le jeton de la session en cours. À rappeler avant chaque chargement de
 * l'aperçu : le jeton vit une heure, `getSession` rend un jeton rafraîchi.
 */
export async function poserCookieApercu(slug: string): Promise<ResultatApercu> {
  const jeton = (await supabase.auth.getSession()).data.session?.access_token ?? null
  if (!jeton) return { ok: false, statut: 401, erreur: 'Connectez-vous pour voir l’aperçu.' }
  const r = await fetch(routeDuCookie(slug), {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}` },
    cache: 'no-store',
  })
  const d = (await r.json().catch(() => ({}))) as { adresse?: string; error?: string }
  if (!r.ok || !d.adresse) return { ok: false, statut: r.status, erreur: d.error ?? 'Aperçu indisponible.' }
  return { ok: true, adresse: d.adresse }
}
