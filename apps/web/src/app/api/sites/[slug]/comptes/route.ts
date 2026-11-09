import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { requireSiteCompte, type RoleSite } from '@/lib/auth/require-site-compte'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ============================================================
// LOT 10 — LES COMPTES D'UN SITE.
//
// ── DEUX GARDES, DEUX QUESTIONS.
//
// `requireSiteOwner` dit « ce site est-il a vous ? » : c'est le
// PROPRIETAIRE qui admet, active et suspend.
// `requireSiteCompte` dit « qui etes-vous sur ce site ? » : c'est le
// TITULAIRE qui lit son propre compte.
//
// Les confondre donnerait au premier fournisseur venu le droit d'activer
// son propre compte -- c'est-a-dire de s'admettre lui-meme.
//
// ── DEMANDER UN COMPTE N'EST PAS EN AVOIR UN.
//
// POST cree une demande. Le declencheur de base force `en_attente`, meme
// si l'appelant demande autre chose. Activer est un geste du
// proprietaire, et de lui seul.
//
// ── LE ROLE N'EST PAS RECOPIE ICI.
//
// Les trois valeurs vivent dans la CHECK de `site_comptes`. Les recopier
// creerait une seconde verite qui divergerait au premier role ajoute.
// La route laisse la base refuser et traduit son code.
// ============================================================

type Params = { params: Promise<{ slug: string }> }

const COLS = 'id,user_id,email,role,etat,organisation,reference,cree_le,maj_le'

const LISIBLE: Record<string, string> = {
  '23514': 'Rôle ou état inconnu, ou adresse électronique invalide.',
  '23505': 'Cette personne a déjà un compte sur ce site.',
  '23502': 'Identité, adresse et rôle sont obligatoires.',
}

/** GET — le propriétaire voit TOUS les comptes ; un titulaire, le sien. */
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params

  const proprietaire = await requireSiteOwner(req, slug)
  if (!('response' in proprietaire)) {
    const { data, error } = await supabaseAdmin
      .from('site_comptes')
      .select(COLS)
      .eq('site_id', proprietaire.site.id)
      .order('cree_le', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ comptes: data ?? [] })
  }

  // PAS PROPRIETAIRE : peut-etre titulaire. Il ne voit que LUI.
  const titulaire = await requireSiteCompte(req, slug)
  if ('response' in titulaire) return titulaire.response
  const { compte } = titulaire
  return NextResponse.json({
    comptes: [{
      id: compte.id, user_id: compte.user_id, email: compte.email,
      role: compte.role, etat: compte.etat,
      organisation: compte.organisation, reference: compte.reference,
    }],
  })
}

/** POST — le propriétaire ADMET quelqu'un. Le compte naît en attente. */
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const user_id = typeof corps.user_id === 'string' ? corps.user_id : ''
  const email = typeof corps.email === 'string' ? corps.email.trim().toLowerCase() : ''
  if (!user_id || !email) return NextResponse.json({ error: LISIBLE['23502'] }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('site_comptes')
    .insert({
      site_id: garde.site.id,
      user_id,
      email,
      role: corps.role,
      organisation: typeof corps.organisation === 'string' ? corps.organisation : null,
      reference: typeof corps.reference === 'string' ? corps.reference : null,
      // `etat` N'EST PAS ENVOYE, et le declencheur le forcerait de toute
      // facon : un compte naît en attente, sans exception.
    })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: LISIBLE[error.code] ?? error.message }, { status: 400 })
  return NextResponse.json({ compte: data }, { status: 201 })
}

/** PATCH — activer ou suspendre. Rien d'autre n'est modifiable ici. */
export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const id = typeof corps.id === 'string' ? corps.id : ''
  if (!id) return NextResponse.json({ error: 'Compte non désigné.' }, { status: 400 })

  // SEUL L'ETAT CHANGE. Le role ne se modifie pas : changer le role d'un
  // compte actif deplacerait ses droits sans nouvel examen. On suspend, on
  // supprime, on recree -- trois gestes visibles plutot qu'un invisible.
  const { data, error } = await supabaseAdmin
    .from('site_comptes')
    .update({ etat: corps.etat, maj_le: new Date().toISOString() })
    .eq('id', id)
    // LE FILTRE PAR SITE RESTE, MEME AVEC UN `id`.
    .eq('site_id', garde.site.id)
    .select(COLS)
    .maybeSingle()

  if (error) return NextResponse.json({ error: LISIBLE[error.code] ?? error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 })
  return NextResponse.json({ compte: data })
}

/** DELETE — retirer un compte. Relu avant d'être annoncé. */
export async function DELETE(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'Compte non désigné.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('site_comptes')
    .delete()
    .eq('id', id)
    .eq('site_id', garde.site.id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 })
  return NextResponse.json({ retire: data[0].id })
}

export type { RoleSite }
