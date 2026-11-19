import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { requireSiteCompte } from '@/lib/auth/require-site-compte'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ============================================================================
// QUI GÈRE L'ESPACE CLIENT ? (CPA, 2026-11-19)
//
// « Donner à la division DDM la gestion de l'espace client. » Deux personnes
// peuvent traiter les commandes et les comptes clients :
//   · le PROPRIÉTAIRE du site (tableau de bord Deribfy) ;
//   · un AGENT de la Centrale rattaché au service `ddm` (son compte de site).
//
// Personne d'autre. Un client ne voit que SES commandes (`mes-commandes`) ;
// un fournisseur n'en voit aucune.
//
// ── LE SERVICE SE LIT À PART, ET UNE LECTURE RATÉE REFUSE.
//
// `requireSiteCompte` ne lit pas `service` : l'y ajouter ferait échouer la
// garde de TOUS les comptes tant que la colonne n'existe pas. On la lit ici,
// pour les seuls agents ; si la lecture échoue, c'est un refus.
// ============================================================================

export type Gestionnaire = {
  siteId: string
  acteur: string | undefined
  viaAdmin: boolean
  /** `proprietaire` ou `ddm` : l'écran peut dire qui agit, le journal aussi. */
  qui: 'proprietaire' | 'ddm'
}

const REFUS = () => NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

export async function requireGestionClients(
  req: Request,
  slug: string,
): Promise<{ ok: true; g: Gestionnaire } | { ok: false; response: NextResponse }> {
  const proprio = await requireSiteOwner(req, slug)
  if (!('response' in proprio)) {
    return { ok: true, g: { siteId: (proprio.site as { id: string }).id, acteur: proprio.email, viaAdmin: proprio.viaAdmin === true, qui: 'proprietaire' } }
  }

  const agent = await requireSiteCompte(req, slug, ['agent'])
  if (!agent.ok) return { ok: false, response: REFUS() }

  const { data, error } = await supabaseAdmin
    .from('site_comptes').select('service')
    .eq('id', agent.compte.id)
    .eq('site_id', agent.site.id)
    .maybeSingle()
  if (error || (data as { service?: string | null } | null)?.service !== 'ddm') return { ok: false, response: REFUS() }

  return { ok: true, g: { siteId: agent.site.id, acteur: agent.compte.email, viaAdmin: false, qui: 'ddm' } }
}
