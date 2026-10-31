/**
 * L'ADRESSE PUBLIQUE D'UN SITE — <nom>.deribfy.app.
 *
 * ── POURQUOI CETTE ROUTE, 2026-10-30.
 *
 * Les applications ont reçu leur adresse (cpa.deribfy.app, prouvée en
 * production). Les sites, eux, n'avaient que deux formes : le chemin
 * deribfy.com/sites/<slug-avec-horodatage> et le domaine personnalisé payant.
 * Entre les deux, rien — alors que c'est l'étage GRATUIT du modèle que tous
 * les concurrents offrent (boutique.myshopify.com, site.webflow.io).
 *
 * Cette route attribue le nom : validation, collisions, DNS chez Cloudflare,
 * domaine chez Vercel, mapping en base. Même machinerie que les applications
 * (`creerSousDomaine`), même règle d'échec : tout refus est DIT, jamais avalé.
 *
 * ── LA PROPRIÉTÉ SE VÉRIFIE PAR `owner_id`, ET UN CLIQUET ME L'A RAPPELÉ.
 *
 * J'avais écrit `owner_email` — « la convention de la table sites » — et le
 * cliquet de dette 6a (`ownerIdentityRatchets`) a refusé la gate : un
 * courriel n'est pas une identité, il se change, se réassigne, se fait
 * usurper ; l'id du jeton, non. La dette existe dans les VIEILLES routes et
 * tient une liste EXACTE pour qu'aucune nouvelle ne s'y ajoute. Mesuré avant
 * de céder : les 36 sites portent tous `owner_id` — aucune excuse.
 *
 * C'est la DEUXIÈME fois que ce cliquet me corrige (la première : la route
 * directe, le 2026-10-18). Il gagne à chaque fois, et c'est très bien.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { creerSousDomaine, nomValide, DOMAINE_PUBLIC } from '@/lib/apps/sous-domaine'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const params = new URL(req.url).searchParams
  const slug = params.get('slug') ?? ''
  const nom = params.get('nom')?.toLowerCase().trim() ?? ''
  if (slug === '' || nom === '') {
    return NextResponse.json({ error: 'slug et nom requis' }, { status: 400 })
  }
  if (!nomValide(nom)) {
    return NextResponse.json(
      { error: 'Nom invalide : minuscules, chiffres et tirets, 3 à 40 signes, sans nom réservé.' },
      { status: 400 },
    )
  }

  // ── LE SITE EST À LA PERSONNE, filtré dans la requête même.
  const site = await supabaseAdmin
    .from('sites')
    .select('slug')
    .eq('slug', slug)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (site.error !== null || site.data === null) {
    return NextResponse.json({ error: 'site inconnu' }, { status: 404 })
  }

  // ── LES COLLISIONS, TOUTES : un nom ne désigne qu'UNE œuvre.
  //
  //   · une autre entrée de la table des noms (sauf la sienne : republier
  //     le même nom reste possible) ;
  //   · le nom public d'une APPLICATION (le proxy sert les sites d'abord —
  //     prendre le nom d'une app l'éclipserait) ;
  //   · le slug brut d'un autre site (servi en ②).
  const [parNom, parApp, parSlug] = await Promise.all([
    supabaseAdmin.from('sites_sous_domaines').select('site_slug').eq('nom', nom).maybeSingle(),
    supabaseAdmin.from(TABLE_GENERATIONS).select('id').eq('publication_slug', nom).maybeSingle(),
    supabaseAdmin.from('sites').select('slug').eq('slug', nom).neq('slug', slug).maybeSingle(),
  ])
  if (parNom.data !== null && parNom.data.site_slug !== slug) {
    return NextResponse.json({ error: `« ${nom} » est déjà pris par un autre site.` }, { status: 409 })
  }
  if (parApp.data !== null) {
    return NextResponse.json({ error: `« ${nom} » est déjà pris par une application.` }, { status: 409 })
  }
  if (parSlug.data !== null) {
    return NextResponse.json({ error: `« ${nom} » est déjà pris.` }, { status: 409 })
  }

  // ── LE SOUS-DOMAINE : DNS + Vercel, idempotent.
  const clefs = {
    cloudflareToken: process.env.CLOUDFLARE_API_TOKEN ?? '',
    vercelToken: process.env.VERCEL_API_TOKEN ?? '',
    vercelProjectId: process.env.VERCEL_PROJECT_ID ?? '',
  }
  if (Object.values(clefs).some((v) => v === '')) {
    return NextResponse.json({ error: 'clés de sous-domaine absentes du serveur' }, { status: 500 })
  }
  const sd = await creerSousDomaine(nom, clefs)
  if (!sd.ok) {
    return NextResponse.json({ error: sd.erreur }, { status: 502 })
  }

  // ── LE MAPPING : un nom par site — republier remplace, jamais ne duplique.
  const ecrit = await supabaseAdmin
    .from('sites_sous_domaines')
    .upsert({ nom, site_slug: slug }, { onConflict: 'nom' })
  if (ecrit.error !== null) {
    return NextResponse.json(
      { error: 'adresse créée mais non enregistrée — réessayez' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { lien: `https://${nom}.${DOMAINE_PUBLIC}` },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
