// ============================================================
// MANIFESTE D'UN SITE MARCHAND — SON NOM, SES ICÔNES, SA COULEUR.
//
// LE DÉFAUT, MESURÉ LE 2026-09-24 :
//
//     curl https://chanorfie.com/manifest.webmanifest
//     -> <!DOCTYPE html> … __next_error__
//
// Chaque page marchande déclarait `<link rel="manifest">` vers un fichier qui
// répondait une PAGE D'ERREUR. Deux conséquences, aucune visible à l'œil :
//
//   · « Ajouter à l'écran d'accueil » sur Android n'avait ni nom ni icône à
//     lire — le seul endroit où un commerçant tchadien voit sa boutique
//     devenir une application ;
//   · la couleur de barre et le mode plein écran ne s'appliquaient pas.
//
// Et s'il avait répondu, c'eût été PIRE : il aurait servi le manifeste de la
// plateforme, et la boutique du marchand se serait installée sous le nom et
// l'icône de Deribfy. C'est exactement le défaut que `favicon.ts` documente —
// « un marchand marqué à l'enseigne de son fournisseur ».
//
// PLACÉ SOUS `/api/internal/`, comme l'icône et le plan de site : un dossier
// portant un nom réservé par les conventions de métadonnées de Next, sous
// `src/app/sites/[slug]/` qui a un catch-all frère, provoque un 404/500 en
// production Vercel — jamais reproduit en local.
// ============================================================
import { supabase } from '@/lib/supabase'
import { couleurDe, empreinteDuLogo } from '@/lib/images/favicon'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  // `sites_public` applique déjà `published = true AND archived_at IS NULL` :
  // un site retiré ne doit pas continuer à s'installer sur des téléphones.
  const { data: site } = await supabase
    .from('sites_public')
    .select('name, slogan, primary_color, lang, logo_url')
    .eq('slug', slug)
    .maybeSingle()

  if (!site) return new Response('Not found', { status: 404 })

  const s = site as {
    name: string | null
    slogan: string | null
    primary_color: string | null
    lang: string | null
    logo_url: string | null
  }

  const origine = new URL(req.url).origin
  // MÊME EMPREINTE QUE LES BALISES D'ICÔNE : quand le marchand change de logo,
  // l'URL change, et le téléphone cesse d'afficher l'ancienne.
  const v = empreinteDuLogo(s.logo_url)
  const icone = (t: number) =>
    `${origine}/api/internal/site-icon/${slug}?t=${String(t)}&v=${v}`

  const manifeste = {
    name: s.name ?? slug,
    short_name: (s.name ?? slug).slice(0, 12),
    description: s.slogan ?? undefined,
    start_url: '/',
    display: 'standalone',
    // La couleur du marchand, jamais celle de la plateforme.
    theme_color: couleurDe(s.primary_color),
    background_color: '#ffffff',
    lang: s.lang ?? 'fr',
    icons: [
      { src: icone(192), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icone(512), sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }

  return new Response(JSON.stringify(manifeste), {
    headers: {
      'Content-Type': 'application/manifest+json',
      // Même raison que l'icône : un changement de marque doit se voir en
      // minutes, pas en jours.
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=604800',
    },
  })
}
