import { NextResponse } from 'next/server'
import { requireGestionClients } from '@/lib/auth/require-gestion-clients'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { tableAbsente } from '@/lib/commandes/commandes'
import { lireTexte, resumerFils, VU_MESSAGE } from '@/lib/commandes/messages'

// ============================================================================
// LES FILS DE TOUS LES CLIENTS — côté Division DDM (CPA, 2026-11-19).
//
// Propriétaire du site OU agent du service `ddm` (requireGestionClients).
//   · GET            → la liste des clients avec leur dernier message et leurs
//                      non-lus ;
//   · GET ?compte=id → le fil de ce client, ses messages marqués « lus » ;
//   · POST {compte, texte} → la Centrale écrit à ce client.
// Le client visé doit être un compte `structure` DE CE SITE : un identifiant
// d'un autre site, ou d'un fournisseur, ne mène à rien.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

async function clientDuSite(siteId: string, compte: string) {
  const { data } = await supabaseAdmin.from('site_comptes').select('id')
    .eq('id', compte).eq('site_id', siteId).eq('role', 'structure').maybeSingle()
  return Boolean(data)
}

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireGestionClients(req, slug)
  if (!garde.ok) return garde.response
  const siteId = garde.g.siteId
  const compte = new URL(req.url).searchParams.get('compte')

  if (compte) {
    if (!(await clientDuSite(siteId, compte))) return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 })
    const { data, error } = await supabaseAdmin.from('messages_clients').select(VU_MESSAGE)
      .eq('site_id', siteId).eq('compte_id', compte).order('cree_le', { ascending: true }).limit(500)
    if (error) {
      if (tableAbsente(error)) return NextResponse.json({ messages: [], ouvert: false })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const nonLus = ((data ?? []) as { id: string; de: string; lu_le: string | null }[]).filter((m) => m.de === 'client' && !m.lu_le).map((m) => m.id)
    if (nonLus.length) {
      await supabaseAdmin.from('messages_clients').update({ lu_le: new Date().toISOString() })
        .in('id', nonLus).eq('site_id', siteId).eq('compte_id', compte)
    }
    return NextResponse.json({ messages: data ?? [], ouvert: true })
  }

  const { data, error } = await supabaseAdmin.from('messages_clients').select('compte_id,de,texte,cree_le,lu_le')
    .eq('site_id', siteId).order('cree_le', { ascending: false }).limit(3000)
  if (error) {
    if (tableAbsente(error)) return NextResponse.json({ fils: {}, ouvert: false })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const fils = Object.fromEntries(resumerFils((data ?? []) as never))
  return NextResponse.json({ fils, ouvert: true })
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireGestionClients(req, slug)
  if (!garde.ok) return garde.response
  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }
  const compte = typeof corps.compte === 'string' ? corps.compte : ''
  const t = lireTexte(corps.texte)
  if ('erreur' in t) return NextResponse.json({ error: t.erreur }, { status: 400 })
  if (!compte || !(await clientDuSite(garde.g.siteId, compte))) return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 })

  const { data, error } = await supabaseAdmin.from('messages_clients')
    .insert({ site_id: garde.g.siteId, compte_id: compte, de: 'centrale', auteur: garde.g.acteur ?? null, texte: t.texte })
    .select(VU_MESSAGE).single()
  if (error) {
    if (tableAbsente(error)) return NextResponse.json({ error: 'La messagerie n’est pas encore ouverte.' }, { status: 503 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ message: data }, { status: 201 })
}
