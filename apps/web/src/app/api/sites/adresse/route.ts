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
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { nomValide, DOMAINE_PUBLIC } from '@/lib/apps/sous-domaine'
import { adresseDuSite, attribuerNomSite } from '@/lib/sites/adresse-site'

export const runtime = 'nodejs'

/**
 * GET — L'ADRESSE PUBLIQUE DÉJÀ ATTRIBUÉE (tableau de bord, 2026-11-12).
 *
 * L'accueil du projet affiche le lien réel du site (`cpa-tchad.deribfy.app`),
 * pas le chemin technique. Le mapping vit dans `sites_sous_domaines`, que le
 * navigateur ne lit pas : cette lecture est réservée au PROPRIÉTAIRE du site
 * (`requireSiteOwner`, par `owner_id`). `lien: null` = aucune adresse encore.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug') ?? ''
  if (!slug) return NextResponse.json({ error: 'slug manquant' }, { status: 400 })
  const garde = await requireSiteOwner(req, slug)
  if (!garde.ok) return garde.response
  // LA PLUS RÉCENTE (2026-11-19) : après un changement de nom, c'est la
  // nouvelle qui s'affiche — l'ordre alphabétique montrait l'ancienne.
  return NextResponse.json({ lien: await adresseDuSite(slug) })
}

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

  // ── LE NOM, LES COLLISIONS, LE DNS, LE MAPPING : une seule fonction,
  //    la même que celle qui donne l'adresse à la publication (2026-11-19).
  //    Les règles de collision sont décrites dans lib/sites/adresse-site.ts.
  const a = await attribuerNomSite(slug, nom)
  if (!a.ok) return NextResponse.json({ error: a.erreur }, { status: a.status })

  return NextResponse.json(
    { lien: `https://${nom}.${DOMAINE_PUBLIC}` },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
