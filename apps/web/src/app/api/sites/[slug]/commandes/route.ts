import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { journaliser } from '@/lib/audit/journaliser'
import { ETATS_COMMANDE, MAX_REPONSE, tableAbsente } from '@/lib/commandes/commandes'

// ============================================================================
// LES COMMANDES REÇUES — LA CENTRALE LES TRAITE (CPA, 2026-11-19).
//
// « C'est cool qu'ils reçoivent leurs commandes depuis le dashboard. » Le
// propriétaire du site voit chaque bon de commande, le fait avancer (reçue →
// en cours → validée → livrée, ou annulée) et peut répondre ; la réponse
// s'affiche dans l'espace du client.
//
// ── LE FILTRE PAR SITE RESTE, MÊME AVEC UN `id`.
//
// `site_id` est celui que la garde a vérifié : connaître l'identifiant d'une
// commande d'un autre site ne doit rien permettre.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

const VU = 'id,reference,etat,note,reponse,repondu_le,cree_le,maj_le,compte_id'

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response
  const siteId = (garde.site as { id: string }).id

  const { data, error } = await supabaseAdmin
    .from('commandes').select(VU)
    .eq('site_id', siteId)
    .order('cree_le', { ascending: false })
    .limit(300)
  if (error) {
    if (tableAbsente(error)) return NextResponse.json({ commandes: [], ouvert: false })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const commandes = (data ?? []) as { id: string; compte_id: string }[]
  if (commandes.length === 0) return NextResponse.json({ commandes: [], ouvert: true })

  const [{ data: lignes, error: eL }, { data: comptes, error: eC }] = await Promise.all([
    supabaseAdmin.from('commande_lignes')
      .select('commande_id,rang,produit_reference,designation,quantite,unite')
      .in('commande_id', commandes.map((c) => c.id))
      .order('rang', { ascending: true }),
    supabaseAdmin.from('site_comptes')
      .select('id,organisation,nom,email,telephone')
      .eq('site_id', siteId)
      .in('id', [...new Set(commandes.map((c) => c.compte_id))]),
  ])
  if (eL || eC) return NextResponse.json({ error: (eL ?? eC)!.message }, { status: 500 })

  const parCompte = new Map(((comptes ?? []) as { id: string }[]).map((c) => [c.id, c]))
  const toutes = (lignes ?? []) as { commande_id: string }[]
  return NextResponse.json({
    ouvert: true,
    commandes: commandes.map((c) => ({
      ...c,
      client: parCompte.get(c.compte_id) ?? null,
      lignes: toutes.filter((l) => l.commande_id === c.id),
    })),
  })
}

export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response
  const siteId = (garde.site as { id: string }).id

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const id = typeof corps.id === 'string' ? corps.id : ''
  if (!id) return NextResponse.json({ error: 'Commande non désignée.' }, { status: 400 })

  const changements: Record<string, unknown> = {}
  if ('etat' in corps) {
    if (!(ETATS_COMMANDE as readonly unknown[]).includes(corps.etat)) {
      return NextResponse.json({ error: 'État inconnu.' }, { status: 400 })
    }
    changements.etat = corps.etat
  }
  if (typeof corps.reponse === 'string') {
    const texte = corps.reponse.trim()
    if (texte.length > MAX_REPONSE) {
      return NextResponse.json({ error: `La réponse fait au plus ${MAX_REPONSE} caractères.` }, { status: 400 })
    }
    // Une réponse et sa date vont ensemble ; effacer l'une efface l'autre.
    changements.reponse = texte === '' ? null : texte
    changements.repondu_le = texte === '' ? null : new Date().toISOString()
  }
  if (Object.keys(changements).length === 0) {
    return NextResponse.json({ error: 'Rien à modifier.' }, { status: 400 })
  }
  changements.maj_le = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('commandes').update(changements)
    .eq('id', id)
    .eq('site_id', siteId)
    .select('id,reference,etat,reponse,repondu_le,maj_le').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })

  await journaliser({
    siteId, acteur: garde.email, viaAdmin: garde.viaAdmin,
    action: 'reponse' in changements ? 'commande.repondre' : 'commande.etat',
    cible: (data as { reference: string }).reference, details: { etat: changements.etat },
  })
  return NextResponse.json({ commande: data })
}
