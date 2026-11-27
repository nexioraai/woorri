// L'ENSEIGNE VUE PAR LE PROPRIÉTAIRE (lot 4c, 2026-11-26).
//
// Le cookie d'aperçu est limité au chemin `/sites/<slug>` : il n'atteint jamais
// `/api/internal/site-logo/<slug>`. Un site NON publié avait donc un logo cassé
// dans son propre aperçu. Cette route vit sous le chemin du site : elle lit avec
// le jeton du propriétaire (`lecteurDuSite`), et un visiteur sans cookie reçoit
// 404 pour un site non publié — la vue `sites_public` en décide, pas ce code.
// Réponse en cache PRIVÉ : jamais resservie par le CDN à quelqu'un d'autre.
import { lecteurDuSite } from '@/lib/lecteurDuSite'
import { reponseEnseigne, type SiteEnseigne } from '@/lib/images/reponseEnseigne'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const lecteur = await lecteurDuSite()
  const { data: site } = await lecteur
    .from('sites_public')
    .select('name, primary_color, logo_url')
    .eq('slug', slug)
    .maybeSingle()
  if (!site) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
  return reponseEnseigne(site as SiteEnseigne, 'prive')
}
