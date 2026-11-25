import { NextResponse } from 'next/server'
import { requireSiteCompte } from '@/lib/auth/require-site-compte'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { tableAbsente } from '@/lib/commandes/commandes'
import { lireTexte, VU_MESSAGE_CLIENT } from '@/lib/commandes/messages'

// ============================================================================
// MES MESSAGES — le fil du CLIENT avec la Division DDM (CPA, 2026-11-19).
//
// Seul un compte client (`structure`) ACTIF entre ; il ne lit que SON fil :
// le compte vient de la garde, jamais du corps ni de l'adresse.
// GET rend le fil et marque « lus » les messages de la Centrale ;
// `?compter=1` ne rend que le nombre de non-lus, SANS rien marquer (pour la
// barre latérale). POST envoie un message.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteCompte(req, slug, ['structure'])
  if (!garde.ok) return garde.response
  if (new URL(req.url).searchParams.get('compter') === '1') {
    const { data, error } = await supabaseAdmin.from('messages_clients').select('id')
      .eq('site_id', garde.site.id).eq('compte_id', garde.compte.id).eq('de', 'centrale').is('lu_le', null)
    if (error) return NextResponse.json({ nonLus: 0, ouvert: !tableAbsente(error) })
    return NextResponse.json({ nonLus: (data ?? []).length, ouvert: true })
  }

  const { data, error } = await supabaseAdmin.from('messages_clients').select(VU_MESSAGE_CLIENT)
    .eq('site_id', garde.site.id).eq('compte_id', garde.compte.id)
    .order('cree_le', { ascending: true }).limit(500)
  if (error) {
    if (tableAbsente(error)) return NextResponse.json({ messages: [], ouvert: false })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  // LU : les messages de la Centrale que le client vient d'ouvrir.
  const nonLus = ((data ?? []) as { id: string; de: string; lu_le: string | null }[]).filter((m) => m.de === 'centrale' && !m.lu_le).map((m) => m.id)
  if (nonLus.length) {
    await supabaseAdmin.from('messages_clients').update({ lu_le: new Date().toISOString() })
      .in('id', nonLus).eq('site_id', garde.site.id).eq('compte_id', garde.compte.id)
  }
  return NextResponse.json({ messages: data ?? [], ouvert: true })
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteCompte(req, slug, ['structure'])
  if (!garde.ok) return garde.response
  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }
  const t = lireTexte(corps.texte)
  if ('erreur' in t) return NextResponse.json({ error: t.erreur }, { status: 400 })

  const { data, error } = await supabaseAdmin.from('messages_clients')
    .insert({ site_id: garde.site.id, compte_id: garde.compte.id, de: 'client', auteur: garde.compte.email, texte: t.texte })
    .select(VU_MESSAGE_CLIENT).single()
  if (error) {
    if (tableAbsente(error)) return NextResponse.json({ error: 'La messagerie n’est pas encore ouverte.' }, { status: 503 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ message: data }, { status: 201 })
}
