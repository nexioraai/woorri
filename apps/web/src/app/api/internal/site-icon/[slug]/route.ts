// ============================================================
// ICÔNE D'UN SITE MARCHAND — servie par slug, dérivée de sa marque.
//
// PLACÉE SOUS `/api/internal/`, ET C'EST DÉLIBÉRÉ. Un dossier portant un nom
// réservé par les conventions de métadonnées de Next (`icon`, `favicon.ico`,
// `sitemap.xml`) placé sous `src/app/sites/[slug]/`, qui a un catch-all frère,
// provoque un 404/500 en production Vercel — jamais reproduit en local. Le
// sitemap par site a dû être déplacé ici pour cette raison exacte
// (`api/internal/site-sitemap/`) ; l'icône suit le même chemin éprouvé.
//
// L'URL publique n'est jamais celle-ci : `proxy.ts` y réécrit `/favicon.ico`,
// et `generateMetadata` y pointe les balises `<link rel="icon">`.
// ============================================================
import { faviconIcoDuSite, monogrammePng } from '@/lib/images/favicon'
import { supabase } from '@/lib/supabase'

// `sharp` est un binaire natif : il exige l'exécution Node, jamais l'Edge.
export const runtime = 'nodejs'

/** Tailles servies. Liste FERMÉE : `?t=` est une entrée, pas une consigne. */
const TAILLES = new Set([16, 32, 48, 96, 180, 192, 512])

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // `sites_public` applique déjà `published = true AND archived_at IS NULL` :
  // un site retiré ne doit pas continuer à servir son icône.
  const { data: site } = await supabase
    .from('sites_public')
    .select('name, primary_color')
    .eq('slug', slug)
    .maybeSingle()

  if (!site) return new Response('Not found', { status: 404 })

  const nom = (site as { name: string | null }).name
  const couleur = (site as { primary_color: string | null }).primary_color

  const brut = Number(new URL(req.url).searchParams.get('t'))
  const format = new URL(req.url).searchParams.get('f')

  // Une icône ne change qu'avec la marque du marchand : un cache long est
  // correct, et il évite de redessiner à chaque visite. `stale-while-revalidate`
  // pour qu'un changement de couleur se propage sans jamais faire attendre.
  const entetes = (type: string) => ({
    'Content-Type': type,
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
  })

  if (format === 'ico') {
    const ico = await faviconIcoDuSite(nom, couleur)
    return new Response(new Uint8Array(ico), { headers: entetes('image/x-icon') })
  }

  const taille = TAILLES.has(brut) ? brut : 512
  const png = await monogrammePng(nom, couleur, taille)
  return new Response(new Uint8Array(png), { headers: entetes('image/png') })
}
