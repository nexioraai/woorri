import { NextResponse } from 'next/server'
import { requireSiteCompte } from '@/lib/auth/require-site-compte'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { journaliser } from '@/lib/audit/journaliser'
import {
  lireLignes, lireNote, nouvelleReference, tableAbsente, PAS_ENCORE_OUVERT,
} from '@/lib/commandes/commandes'

// ============================================================================
// MES COMMANDES — LE CLIENT (structure sanitaire) PASSE ET SUIT SES BONS DE
// COMMANDE (CPA, 2026-11-19).
//
// ── SEUL UN COMPTE « structure » ACTIF COMMANDE.
//
// `requireSiteCompte(…, ['structure'])` : sans session, sans compte, compte
// suspendu, ou compte fournisseur → le MÊME 403. Un fournisseur n'achète pas
// à la Centrale ; il lui vend.
//
// ── LE COMPTE VIENT DE LA GARDE, JAMAIS DU CORPS.
//
// `compte_id` et `site_id` sont ceux que la garde a vérifiés. Les accepter du
// client permettrait de commander au nom d'un autre hôpital.
//
// ── ON NE LIT QUE SES PROPRES COMMANDES.
//
// Le filtre porte sur `compte_id` ET `site_id` : un même compte n'a qu'une
// ligne par site, mais garder les deux filtres coûte moins qu'expliquer une
// fuite entre sites.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

const VU = 'id,reference,etat,note,reponse,repondu_le,cree_le,maj_le'
const VU_LIGNES = 'commande_id,rang,produit_reference,designation,quantite,unite'

/** GET — mes commandes, avec leurs lignes, et le catalogue pour en passer une. */
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteCompte(req, slug, ['structure'])
  if (!garde.ok) return garde.response

  const { data, error } = await supabaseAdmin
    .from('commandes').select(VU)
    .eq('site_id', garde.site.id)
    .eq('compte_id', garde.compte.id)
    .order('cree_le', { ascending: false })
    .limit(200)
  if (error) {
    if (tableAbsente(error)) return NextResponse.json({ commandes: [], catalogue: [], ouvert: false })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const commandes = (data ?? []) as { id: string }[]

  let lignes: Record<string, unknown>[] = []
  if (commandes.length > 0) {
    const { data: l, error: e2 } = await supabaseAdmin
      .from('commande_lignes').select(VU_LIGNES)
      .in('commande_id', commandes.map((c) => c.id))
      .order('rang', { ascending: true })
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    lignes = (l ?? []) as Record<string, unknown>[]
  }

  // Le CATALOGUE PUBLIÉ, pour proposer des désignations. Vide aujourd'hui à la
  // CPA — la saisie libre reste toujours possible.
  const { data: cat } = await supabaseAdmin
    .from('catalogue_produits_public').select('reference,denomination,forme,dosage,conditionnement')
    .eq('site_id', garde.site.id)
    .order('denomination', { ascending: true })
    .limit(1000)

  return NextResponse.json({
    ouvert: true,
    organisation: garde.compte.organisation,
    commandes: commandes.map((c) => ({ ...c, lignes: lignes.filter((l) => l.commande_id === c.id) })),
    catalogue: cat ?? [],
  })
}

/** POST — passer un bon de commande. */
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteCompte(req, slug, ['structure'])
  if (!garde.ok) return garde.response

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const l = lireLignes(corps.lignes)
  if ('erreur' in l) return NextResponse.json({ error: l.erreur }, { status: 400 })
  const n = lireNote(corps.note)
  if ('erreur' in n) return NextResponse.json({ error: n.erreur }, { status: 400 })

  // L'EN-TÊTE, puis les LIGNES. Une collision de référence (contrainte
  // unique, code 23505) se rejoue avec une autre référence.
  let commande: { id: string; reference: string } | null = null
  for (let essai = 0; essai < 3 && !commande; essai++) {
    const { data, error } = await supabaseAdmin
      .from('commandes')
      .insert({
        site_id: garde.site.id, compte_id: garde.compte.id,
        reference: nouvelleReference(), note: n.note,
      })
      .select('id,reference').single()
    if (error) {
      if (tableAbsente(error)) return NextResponse.json({ error: PAS_ENCORE_OUVERT }, { status: 503 })
      if ((error as { code?: string }).code === '23505') continue
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    commande = data as { id: string; reference: string }
  }
  if (!commande) return NextResponse.json({ error: 'Commande non enregistrée, réessayez.' }, { status: 500 })

  const { error: eL } = await supabaseAdmin.from('commande_lignes').insert(
    l.lignes.map((x, rang) => ({ commande_id: commande!.id, rang, ...x })),
  )
  if (eL) {
    // PAS DE COMMANDE SANS LIGNES : on retire l'en-tête plutôt que de laisser
    // à la Centrale un bon vide qu'elle ne saurait pas traiter.
    await supabaseAdmin.from('commandes').delete().eq('id', commande.id).eq('site_id', garde.site.id)
    return NextResponse.json({ error: 'Commande non enregistrée, réessayez.' }, { status: 500 })
  }

  await journaliser({
    siteId: garde.site.id, acteur: garde.compte.email, action: 'commande.passer',
    cible: commande.reference, details: { lignes: l.lignes.length },
  })
  return NextResponse.json({ commande: { ...commande, etat: 'recue' } }, { status: 201 })
}
