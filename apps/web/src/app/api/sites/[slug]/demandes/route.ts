import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { journaliser } from '@/lib/audit/journaliser'

// ============================================================================
// LOT 14.2 — LA CENTRALE TRAITE LES DEMANDES ET RÉCLAMATIONS.
//
// `messages.etat` existait (recu · en_cours · repondu · clos) et RIEN ne
// l'écrivait : chaque demande restait « reçue » pour toujours, et le suivi
// par référence affichait un état qui ne bougeait jamais.
//
// ── RÉPONDRE PASSE L'ÉTAT À « RÉPONDU », ET LA DATE SUIT LE TEXTE.
//
// Une réponse et sa date vont ensemble — la base le refuse sinon. Effacer la
// réponse efface la date. Et répondre sans changer l'état laisserait une
// demande « reçue » avec une réponse dedans : deux vérités contradictoires.
//
// ── `messages` EST INDEXÉ PAR `site_slug`, PAS PAR `site_id`.
//
// Le filtre porte donc sur le SLUG RÉSOLU PAR LA GARDE, jamais sur celui de
// l'URL lu tel quel : la garde a vérifié que ce site est au propriétaire.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

const ETATS = ['recu', 'en_cours', 'repondu', 'clos'] as const
const TYPES = ['demande', 'reclamation'] as const
const VU = 'id,reference,name,email,message,type,etat,reponse,repondu_le,created_at,maj_le'

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  const type = new URL(req.url).searchParams.get('type')
  let q = supabaseAdmin.from('messages').select(VU)
    .eq('site_slug', garde.site.slug)
    .order('created_at', { ascending: false })
    .limit(300)
  if ((TYPES as readonly (string | null)[]).includes(type)) q = q.eq('type', type as string)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ demandes: data ?? [] })
}

export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const id = typeof corps.id === 'string' ? corps.id : ''
  if (!id) return NextResponse.json({ error: 'Demande non désignée.' }, { status: 400 })

  const changements: Record<string, unknown> = {}
  if ('etat' in corps) {
    if (!(ETATS as readonly unknown[]).includes(corps.etat)) {
      return NextResponse.json({ error: 'État inconnu.' }, { status: 400 })
    }
    changements.etat = corps.etat
  }
  if (typeof corps.reponse === 'string') {
    const texte = corps.reponse.trim()
    changements.reponse = texte === '' ? null : texte
    changements.repondu_le = texte === '' ? null : new Date().toISOString()
    // RÉPONDRE, C'EST AVOIR RÉPONDU — sauf si l'état est donné explicitement.
    if (texte !== '' && !('etat' in changements)) changements.etat = 'repondu'
  }
  if (Object.keys(changements).length === 0) {
    return NextResponse.json({ error: 'Rien à modifier.' }, { status: 400 })
  }
  changements.maj_le = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('messages').update(changements)
    .eq('id', id)
    // LE FILTRE PAR SITE RESTE, MÊME AVEC UN `id`.
    .eq('site_slug', garde.site.slug)
    .select(VU).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
  await journaliser({ siteId: garde.site.id, acteur: garde.email, viaAdmin: garde.viaAdmin,
    action: 'reponse' in changements ? 'demande.repondre' : 'demande.etat',
    cible: (data as { reference?: string | null }).reference ?? id, details: { etat: changements.etat } })
  return NextResponse.json({ demande: data })
}
