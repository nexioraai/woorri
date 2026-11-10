import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'

// LOT 14.3 — LIRE LE JOURNAL D'AUDIT. Le propriétaire seul, son site seul.
// Lecture uniquement : la base refuse toute modification (42501), et cette
// route n'en propose aucune. Un fournisseur ne doit pas apprendre qu'un
// concurrent a été qualifié la veille.

type Params = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  const { data, error } = await supabaseAdmin
    .from('journal_audit').select('id,le,acteur,via_admin,action,cible,details')
    .eq('site_id', garde.site.id)
    .order('le', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entrees: data ?? [] })
}
