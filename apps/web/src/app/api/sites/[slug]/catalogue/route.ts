import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ============================================================
// LOT 6 — L'ECRITURE DU CATALOGUE.
//
// ── UNE SEULE PORTE, comme pour les pages et les fichiers.
// `catalogue_produits` ne rend AUCUN privilege a `anon` ni a
// `authenticated` (mesure : 42501). Seul `service_role` ecrit, et seulement
// apres que `requireSiteOwner` a dit oui.
//
// ── `site_id` N'EST JAMAIS LU DU CORPS. Il vient de la garde. Un `site_id`
// accepte du client permettrait d'ecrire dans le catalogue d'un AUTRE
// locataire avec une session legitime.
//
// ── LA LISTE BLANCHE NE CONTIENT NI PRIX NI STOCK, et ce n'est meme pas
// une precaution : ces colonnes N'EXISTENT PAS en base. La liste decrit ce
// qu'un client peut ecrire ; la base decide ce qui peut exister.
//
// ── LES BORNES NE SONT PAS RECOPIEES. Longueurs et unicite vivent dans les
// contraintes CHECK et UNIQUE. Cette route laisse la base refuser et
// traduit son code -- deux verites divergeraient.
// ============================================================

type Params = { params: Promise<{ slug: string }> }

/** Les seuls champs ecrivables. Aucun prix, aucun stock : ils n'existent pas. */
const CHAMPS = [
  'reference', 'denomination', 'famille',
  'forme', 'dosage', 'conditionnement',
  'chaine_du_froid', 'note', 'publie', 'ordre',
] as const

const COLS = 'id,reference,denomination,famille,forme,dosage,conditionnement,chaine_du_froid,note,publie,ordre,maj_le'

function net(corps: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const c of CHAMPS) if (c in corps) out[c] = corps[c]
  return out
}

const LISIBLE: Record<string, string> = {
  '23514': 'Référence ou dénomination invalide : la référence fait 1 à 60 caractères, la dénomination 1 à 300.',
  '23505': 'Cette référence existe déjà dans votre catalogue.',
  '23502': 'Référence et dénomination sont obligatoires.',
}

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  const { data, error } = await supabaseAdmin
    .from('catalogue_produits')
    .select(COLS)
    .eq('site_id', garde.site.id)
    .order('ordre', { ascending: true })
    .order('denomination', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produits: data ?? [] })
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const { data, error } = await supabaseAdmin
    .from('catalogue_produits')
    // `site_id` vient de la GARDE, jamais du corps.
    .insert({ ...net(corps), site_id: garde.site.id })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: LISIBLE[error.code] ?? error.message }, { status: 400 })
  return NextResponse.json({ produit: data }, { status: 201 })
}

export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const id = typeof corps.id === 'string' ? corps.id : ''
  if (!id) return NextResponse.json({ error: 'Produit non désigné.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('catalogue_produits')
    .update({ ...net(corps), maj_le: new Date().toISOString() })
    .eq('id', id)
    // LE FILTRE PAR SITE RESTE, MÊME AVEC UN `id` : un identifiant deviné
    // ne doit pas suffire a modifier le catalogue d'un autre locataire.
    .eq('site_id', garde.site.id)
    .select(COLS)
    .maybeSingle()

  if (error) return NextResponse.json({ error: LISIBLE[error.code] ?? error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
  return NextResponse.json({ produit: data })
}

export async function DELETE(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'Produit non désigné.' }, { status: 400 })

  // `.select()` sur la suppression : annoncer un retrait sans le relire,
  // c'est annoncer un resultat qu'on n'a pas mesure (GEN-D044).
  const { data, error } = await supabaseAdmin
    .from('catalogue_produits')
    .delete()
    .eq('id', id)
    .eq('site_id', garde.site.id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
  return NextResponse.json({ retire: data[0].id })
}
