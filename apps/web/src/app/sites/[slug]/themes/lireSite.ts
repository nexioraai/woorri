import 'server-only'
import { lecteurDuSite } from '@/lib/lecteurDuSite'
import { fetchSite, type Site } from './shared'

/**
 * `fetchSite` lu par le lecteur de la REQUÊTE (2026-11-15).
 *
 * Toutes les pages serveur de `/sites/[slug]` lisent le site par ici : avec un
 * cookie d'aperçu valable, le propriétaire voit son site non publié — accueil
 * ET sous-pages. Sans cookie, c'est exactement `fetchSite` avec le client
 * anonyme. `shared.tsx` ne peut pas le faire lui-même : il est aussi chargé
 * par le navigateur, qui ne doit jamais embarquer un module serveur.
 */
export async function lireSite(slug: string, allowUnpublished = false, diagnostics?: string[]): Promise<Site | null> {
  return fetchSite(slug, allowUnpublished, diagnostics, await lecteurDuSite())
}
