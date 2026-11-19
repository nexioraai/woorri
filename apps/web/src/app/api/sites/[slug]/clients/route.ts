import { NextResponse } from 'next/server'
import { requireGestionClients } from '@/lib/auth/require-gestion-clients'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { journaliser } from '@/lib/audit/journaliser'

// ============================================================================
// LES COMPTES CLIENTS — gérés par la division DDM (CPA, 2026-11-19).
//
// « L'espace client est dédié à un service de la DDM. » La DDM voit les
// structures sanitaires inscrites et peut suspendre ou réactiver un compte.
//
// ── SEULEMENT LES CLIENTS.
//
// Les fournisseurs et les agents ne sont PAS de son ressort : le filtre
// `role = 'structure'` est posé en lecture ET en écriture. Un agent DDM ne
// peut donc ni suspendre un fournisseur, ni se suspendre lui-même, ni
// toucher un autre agent — ces gestes restent au propriétaire.
//
// ── SEUL L'ÉTAT CHANGE, comme dans la route du propriétaire : le rôle ne se
// modifie pas.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

const COLS = 'id,email,etat,organisation,nom,telephone,reference,cree_le'
const ETATS = ['actif', 'suspendu'] as const

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireGestionClients(req, slug)
  if (!garde.ok) return garde.response

  // Le TYPE (structure sanitaire / ONG) se lit s'il existe ; sans la
  // colonne, la liste se rend quand même.
  const lire = (cols: string) => supabaseAdmin
    .from('site_comptes').select(cols)
    .eq('site_id', garde.g.siteId)
    .eq('role', 'structure')
    .order('cree_le', { ascending: false })
    .limit(500)
  let { data, error } = await lire(`${COLS},type_client`)
  if (error && /type_client/.test(error.message)) ({ data, error } = await lire(COLS))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data ?? [], qui: garde.g.qui })
}

export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireGestionClients(req, slug)
  if (!garde.ok) return garde.response

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const id = typeof corps.id === 'string' ? corps.id : ''
  if (!id) return NextResponse.json({ error: 'Compte non désigné.' }, { status: 400 })
  if (!(ETATS as readonly unknown[]).includes(corps.etat)) {
    return NextResponse.json({ error: 'État inconnu : « actif » ou « suspendu ».' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('site_comptes')
    .update({ etat: corps.etat, maj_le: new Date().toISOString() })
    .eq('id', id)
    .eq('site_id', garde.g.siteId)
    // UN CLIENT, ET RIEN D'AUTRE — même si l'`id` désigne un fournisseur.
    .eq('role', 'structure')
    .select(COLS).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Compte client introuvable.' }, { status: 404 })

  await journaliser({
    siteId: garde.g.siteId, acteur: garde.g.acteur, viaAdmin: garde.g.viaAdmin,
    action: 'client.etat', cible: (data as { email: string }).email, details: { etat: corps.etat, par: garde.g.qui },
  })
  return NextResponse.json({ client: data })
}
