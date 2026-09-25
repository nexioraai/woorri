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
import { faviconIcoDuSite, iconeDuSite, sourceLogoAutorisee } from '@/lib/images/favicon'
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
    .select('name, primary_color, logo_url')
    .eq('slug', slug)
    .maybeSingle()

  if (!site) return new Response('Not found', { status: 404 })

  const nom = (site as { name: string | null }).name
  const couleur = (site as { primary_color: string | null }).primary_color
  const logo = await chargerLogo((site as { logo_url: string | null }).logo_url)

  const brut = Number(new URL(req.url).searchParams.get('t'))
  const format = new URL(req.url).searchParams.get('f')

  // ── LE CACHE A GARDÉ L'ANCIENNE ICÔNE PENDANT VINGT-QUATRE HEURES.
  //
  // MESURÉ SUR `chanorfie.com` LE 2026-09-24, après le dépôt d'un vrai logo :
  //
  //     /favicon.ico                 -> monogramme (écart-type 10,9 = aplat)
  //     /favicon.ico?<autre requête> -> LE LOGO     (écart-type 34,3 = détaillé)
  //
  // Les deux URL frappent cette route ; seule la seconde avait une clé de
  // cache neuve. L'URL canonique — celle que Google et les navigateurs
  // demandent — servait encore l'icône d'avant, à cause de `s-maxage=86400`.
  //
  // J'avais écrit « un cache long est correct » en supposant qu'une marque ne
  // change pas. C'est vrai dans la durée, et FAUX à la minute qui compte : le
  // marchand dépose son logo, enregistre, regarde son onglet — et voit
  // l'ancien. Il conclut que ça ne marche pas, et il a raison de le conclure.
  //
  // Cinq minutes au lieu d'un jour. Une icône pèse quelques kilo-octets ;
  // `stale-while-revalidate` continue de servir instantanément pendant le
  // rafraîchissement, donc personne n'attend jamais. Le coût est nul, le
  // délai devient humain.
  const entetes = (type: string) => ({
    'Content-Type': type,
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=604800',
  })

  if (format === 'ico') {
    const ico = await faviconIcoDuSite(nom, couleur, logo)
    return new Response(new Uint8Array(ico), { headers: entetes('image/x-icon') })
  }

  const taille = TAILLES.has(brut) ? brut : 512
  const png = await iconeDuSite(logo, nom, couleur, taille)
  return new Response(new Uint8Array(png), { headers: entetes('image/png') })
}

/**
 * Va chercher le logo du marchand, ou rend `null`.
 *
 * DEUX GARDES, ET AUCUNE N'EST DÉCORATIVE :
 *
 *   · `sourceLogoAutorisee` — `logo_url` est une colonne TEXTE écrite par le
 *     marchand. Sans ce filtre, il ferait émettre à notre serveur une requête
 *     vers l'adresse de son choix, y compris interne : une SSRF offerte par un
 *     champ de formulaire.
 *   · le délai — le stockage est un service tiers. Sans plafond, une lenteur
 *     là-bas ferait attendre l'icône de TOUTES les boutiques.
 *
 * Toute anomalie rend `null`, et l'appelant retombe sur le monogramme. Une
 * boutique sans icône est un défaut visible dans chaque onglet ; un repli ne
 * l'est pas.
 */
async function chargerLogo(logoUrl: string | null): Promise<Buffer | null> {
  if (!sourceLogoAutorisee(logoUrl, process.env.NEXT_PUBLIC_SUPABASE_URL)) return null
  try {
    const r = await fetch(logoUrl!, { signal: AbortSignal.timeout(4000) })
    if (!r.ok) return null
    return Buffer.from(await r.arrayBuffer())
  } catch {
    return null
  }
}
