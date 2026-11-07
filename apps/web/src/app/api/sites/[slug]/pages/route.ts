import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ============================================================
// LOT 3 -- L'ECRITURE DES PAGES D'UN SITE.
//
// ── POURQUOI UNE ROUTE SERVEUR, ET PAS UNE ECRITURE DEPUIS LE NAVIGATEUR.
//
// Donner `insert/update/delete` a `authenticated` sur `site_pages` exigerait
// des policies RLS rejoignant `sites.owner_email` a chaque requete : une
// SECONDE AUTORITE sur la propriete, a cote de celle que `requireSiteOwner`
// applique deja pour quatre routes. Deux autorites divergent toujours, et
// celle qu'on lit n'est jamais celle qui decide.
//
// Ici, UNE SEULE porte : `requireSiteOwner`. La table ne rend aucun privilege
// a `anon` ni a `authenticated` (mesure : 42501) -- seul `service_role`
// ecrit, et seulement apres que la garde a dit oui.
//
// ── CE QUE LA GARDE NE COUVRE PAS, ET QUI EST COUVERT EN BASE.
//
// `requireSiteOwner` dit QUI. Elle ne dit rien du CONTENU. Les bornes du
// chemin -- minuscules, pas de barre initiale ni finale, pas de point, pas de
// double barre, 200 caracteres -- vivent dans la contrainte CHECK de
// `site_pages`, et c'est la seule place qui survive a la suppression d'une
// validation applicative. Cette route ne les recopie pas : elle laisse la
// base refuser et rend son code.
//
// ── `site_id` N'EST JAMAIS LU DU CORPS DE LA REQUETE.
//
// Il vient de la garde. Un `site_id` accepte du client permettrait d'ecrire
// une page chez un AUTRE locataire avec une session legitime -- la faille que
// le filtre par site ferme partout ailleurs dans ce depot.
// ============================================================

type Params = { params: Promise<{ slug: string }> }

/** Les seuls champs qu'un client peut ecrire. Liste BLANCHE : un champ ajoute
 *  a la table n'est pas ecrivable tant qu'il n'est pas nomme ici. */
// `blocs` est dans la liste blanche, mais sa FORME n'est pas recopiee ici :
// la CHECK `site_pages_blocs_valides` la tient en base. Recopier le
// vocabulaire dans la route creerait deux verites qui divergeraient.
// La route se contente de traduire le 23514 en message lisible.
const CHAMPS = ['chemin', 'parent', 'titre', 'chapeau', 'corps', 'ordre', 'menu', 'publie', 'blocs'] as const

function filtrer(corps: Record<string, unknown>): Record<string, unknown> {
  const net: Record<string, unknown> = {}
  for (const c of CHAMPS) if (c in corps) net[c] = corps[c]
  return net
}

/** Traduit une erreur de la base en message lisible, sans masquer son code. */
function refus(error: { code?: string; message: string }) {
  const map: Record<string, string> = {
    '23514': 'Adresse ou titre invalide. L’adresse ne prend que des minuscules, des chiffres et des tirets, séparés par des barres.',
    '23505': 'Une page existe déjà à cette adresse sur ce site.',
    '23503': 'Site introuvable.',
    '23502': 'Un champ obligatoire manque.',
  }
  return NextResponse.json(
    { error: map[error.code ?? ''] ?? error.message, code: error.code },
    { status: 400 }
  )
}

/** Les pages d'un site, TOUTES -- brouillons compris. C'est l'editeur. */
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug, 'id')
  if (!garde.ok) return garde.response

  const { data, error } = await supabaseAdmin
    .from('site_pages')
    .select('id,chemin,parent,titre,chapeau,corps,ordre,menu,publie,maj_le,blocs')
    .eq('site_id', garde.site.id)
    .order('ordre', { ascending: true })
    .order('titre', { ascending: true })
  if (error) return refus(error)
  return NextResponse.json({ pages: data ?? [] })
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug, 'id')
  if (!garde.ok) return garde.response

  const corps = filtrer(await req.json().catch(() => ({})))
  const { data, error } = await supabaseAdmin
    .from('site_pages')
    // `site_id` vient de la GARDE, jamais du corps.
    .insert({ ...corps, site_id: garde.site.id })
    .select('id,chemin,titre')
    .maybeSingle()
  if (error) return refus(error)
  return NextResponse.json({ page: data }, { status: 201 })
}

export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug, 'id')
  if (!garde.ok) return garde.response

  const { id, ...reste } = await req.json().catch(() => ({} as Record<string, unknown>))
  if (typeof id !== 'string') return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('site_pages')
    .update({ ...filtrer(reste), maj_le: new Date().toISOString() })
    .eq('id', id)
    // LE FILTRE PAR SITE EST OBLIGATOIRE, meme avec un `id` : sans lui, une
    // session legitime d'un site pourrait modifier la page d'un autre.
    .eq('site_id', garde.site.id)
    .select('id,chemin,titre')
    .maybeSingle()
  if (error) return refus(error)
  if (!data) return NextResponse.json({ error: 'Page introuvable.' }, { status: 404 })
  return NextResponse.json({ page: data })
}

export async function DELETE(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug, 'id')
  if (!garde.ok) return garde.response

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  // `.select()` sur la suppression : annoncer un retrait sans le relire est
  // exactement l'affirmation que ce depot interdit (GEN-D037).
  const { data, error } = await supabaseAdmin
    .from('site_pages')
    .delete()
    .eq('id', id)
    .eq('site_id', garde.site.id)
    .select('id')
  if (error) return refus(error)
  if (!data?.length) return NextResponse.json({ error: 'Page introuvable.' }, { status: 404 })
  return NextResponse.json({ supprime: data.length })
}
