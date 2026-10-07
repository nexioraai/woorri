/**
 * GÉNÉRER L'APPLICATION D'UNE BOUTIQUE — LE BRANCHEMENT.
 *
 * ── CE QUI MANQUAIT, ET DEPUIS QUAND.
 *
 * Le moteur produisait trente et une applications web dans une porte de
 * vérification, et `apps/web` — le site qui est censé les livrer — n'avait
 * AUCUNE dépendance vers lui. Le générateur existait ; personne ne pouvait
 * s'en servir. Cette route est le chaînon.
 *
 * ── CE QU'ELLE REND, ET CE QU'ELLE NE REND PAS.
 *
 * Une archive ZIP : l'application web complète de la boutique, prête à
 * déballer et à héberger. Le marchand la reçoit, point final — on ne déploie
 * rien en son nom.
 *
 * LES DONNÉES SONT CELLES DE L'APERÇU. Le format AIR ne transporte pas les
 * lignes, par décision (D-013) : un `dataset` ne porte qu'une empreinte et un
 * nombre de lignes. L'application montre donc un catalogue de la BONNE TAILLE,
 * avec la bonne identité, et des articles d'aperçu. Brancher les vraies
 * données demande le protocole serveur (`backend.kind: "externe"`), qui
 * existe et n'est pas câblé ici.
 *
 * On le dit dans la réponse ET dans l'archive, parce qu'un marchand qui
 * déballe son application et y trouve des articles qu'il ne reconnaît pas doit
 * comprendre pourquoi en dix secondes, pas écrire au support.
 */
import { NextResponse } from 'next/server'
import { compileWeb } from '@deribfy/compiler'
import { projectAirSchema } from '@deribfy/air-schema'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { documentDeLaBoutique } from '@/lib/apps/document'
import { zipper } from '@/lib/apps/zip'

// Le moteur est du TypeScript transpilé par Next ; `zlib` est natif. Node, donc.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug')
  if (slug === null || slug.trim() === '') {
    return NextResponse.json({ error: 'Boutique manquante.' }, { status: 400 })
  }

  // PROPRIÉTÉ D'ABORD. On ne génère l'application de personne d'autre.
  const garde = await requireSiteOwner(req, slug, 'id, slug, name, primary_color, slogan')
  if (!garde.ok) return garde.response
  const site = garde.site as unknown as {
    id: string
    slug: string
    name: string | null
    primary_color: string | null
    slogan: string | null
  }

  // Le NOMBRE d'articles, pas les articles : c'est tout ce que le document
  // peut porter, et c'est ce qui donne à l'aperçu la taille du vrai catalogue.
  const { count } = await supabaseAdmin
    .from('shop_products')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', site.id)

  const air = documentDeLaBoutique({
    slug: site.slug,
    nom: site.name ?? site.slug,
    couleur: site.primary_color,
    description: site.slogan,
    nombreArticles: count ?? 0,
  })

  // LE DOCUMENT EST VALIDÉ AVANT D'ÊTRE COMPILÉ, et par le schéma STRICT.
  // Mesuré pendant l'écriture de ce lot : le contrôle sémantique rendait
  // « 0 erreur » sur un document que le schéma refusait — une clé `label` sur
  // une entité, que seul le parseur strict voit. Deux contrôles, deux portées.
  const juge = projectAirSchema.safeParse(air)
  if (!juge.success) {
    return NextResponse.json(
      {
        error: 'Document invalide — la boutique n’a pas pu être traduite.',
        details: juge.error.issues.slice(0, 5).map((i) => `${i.path.join('.')} : ${i.message}`),
      },
      { status: 422 },
    )
  }

  try {
    const projet = compileWeb(juge.data)
    const fichiers = new Map<string, string | Buffer>(projet.files)
    fichiers.set('LISEZ-MOI.txt', lisezMoi(site.name ?? site.slug, count ?? 0))
    const archive = zipper(fichiers)

    return new Response(new Uint8Array(archive), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${site.slug}-app-web.zip"`,
        'Content-Length': String(archive.length),
        // Une génération ne se met pas en cache : la boutique change.
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Compilation impossible.' },
      { status: 500 },
    )
  }
}

/** La note qui part AVEC l'application. Elle dit ce qu'on n'a pas fait. */
function lisezMoi(nom: string, articles: number): string {
  return [
    `APPLICATION WEB — ${nom}`,
    '',
    'Générée par Deribfy. Pour la lancer :',
    '',
    '    npm install',
    '    npm run dev',
    '',
    'Pour la publier :  npm run build  — le dossier `dist/` se dépose chez',
    'n’importe quel hébergeur de fichiers.',
    '',
    '── CE QUE VOUS VERREZ, ET POURQUOI',
    '',
    `Votre boutique compte ${String(articles)} article(s). L’application en montre`,
    'autant, MAIS avec des articles d’aperçu — pas encore les vôtres.',
    '',
    'Ce n’est pas un oubli : le format qui décrit votre application transporte',
    'sa STRUCTURE, jamais ses données. Brancher votre catalogue réel demande',
    'un serveur, et ce chemin existe — il n’est pas encore relié ici.',
    '',
    'Votre nom, votre description et la taille de votre catalogue, eux, sont',
    'bien les vôtres.',
    '',
  ].join('\n')
}
