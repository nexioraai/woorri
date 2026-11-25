import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { journaliser } from '@/lib/audit/journaliser'
import { adresseDuSite } from '@/lib/sites/adresse-site'

// ============================================================================
// LES AGENTS DE LA DIVISION DDM — nommés par le propriétaire (CPA, 2026-11-19).
//
// « L'espace client est dédié à un service de la DDM. » Le propriétaire
// désigne, depuis son tableau de bord, les personnes de la DDM qui gèrent les
// commandes et les comptes clients. Personne ne se nomme agent soi-même :
// `agent` n'est pas un rôle d'inscription.
//
// ── UNE ADRESSE SANS ACCÈS REÇOIT UN ACCÈS.
//
// L'accès est créé confirmé, avec un mot de passe aléatoire que personne ne
// connaît : l'agent choisit le sien par « Mot de passe oublié » sur la page
// « Se connecter » du site. Aucun mot de passe ne transite par ici.
//
// ── UNE ADRESSE QUI EST DÉJÀ CLIENT OU FOURNISSEUR EST REFUSÉE.
//
// Le rôle d'un compte ne change pas (règle du lot 10) : transformer un client
// en agent déplacerait ses droits sans geste visible. Le propriétaire supprime
// d'abord ce compte, ou utilise une autre adresse.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const COLS = 'id,email,nom,etat,service,cree_le'

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  const { data, error } = await supabaseAdmin
    .from('site_comptes').select(COLS)
    .eq('site_id', (garde.site as { id: string }).id)
    .eq('role', 'agent')
    .order('cree_le', { ascending: true })
  if (error) {
    // Colonne `service` absente : le fichier SQL n'est pas encore passé.
    if (/service/.test(error.message)) return NextResponse.json({ agents: [], ouvert: false })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  // L'ADRESSE DE LA PORTE DES AGENTS : elle n'est plus affichée sur le site
  // public (CPA, 2026-11-25), le propriétaire la transmet à ses agents.
  const s = garde.site as { slug?: string; custom_domain?: string | null }
  const racine = s.custom_domain ? `https://${s.custom_domain}` : await adresseDuSite(slug).catch(() => null)
  return NextResponse.json({ agents: data ?? [], ouvert: true, connexionAgent: racine ? `${racine}/connexion?pour=agent` : null })
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response
  const siteId = (garde.site as { id: string }).id

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }
  const email = typeof corps.email === 'string' ? corps.email.trim().toLowerCase() : ''
  const nom = typeof corps.nom === 'string' ? corps.nom.trim() : ''
  if (!COURRIEL.test(email)) return NextResponse.json({ error: 'Indiquez une adresse électronique valable.' }, { status: 400 })
  if (nom.length < 2 || nom.length > 120) return NextResponse.json({ error: 'Indiquez le nom de l’agent.' }, { status: 400 })

  // 1. L'ACCÈS — retrouvé, ou créé (mot de passe aléatoire, jamais montré).
  let nouvelAcces = false
  const { data: existant } = await supabaseAdmin.rpc('identifiant_par_courriel', { courriel: email })
  let userId = typeof existant === 'string' ? existant : ''
  if (!userId) {
    const { data: cree, error } = await supabaseAdmin.auth.admin.createUser({
      email, email_confirm: true, password: randomBytes(24).toString('base64url'), user_metadata: { nom },
    })
    if (error || !cree?.user?.id) return NextResponse.json({ error: 'Création de l’accès impossible pour le moment.' }, { status: 500 })
    userId = cree.user.id
    nouvelAcces = true
  }

  // 2. LE COMPTE DE SITE — refus si cette personne est déjà client ou fournisseur.
  const { data: deja } = await supabaseAdmin
    .from('site_comptes').select('id,role')
    .eq('site_id', siteId).eq('user_id', userId).maybeSingle()
  const d = deja as { id: string; role: string } | null
  if (d && d.role !== 'agent') {
    return NextResponse.json({
      error: `Cette adresse a déjà un compte ${d.role === 'structure' ? 'client' : 'fournisseur'} sur ce site. Utilisez une autre adresse, ou supprimez d’abord ce compte.`,
    }, { status: 409 })
  }

  const ecriture = d
    ? supabaseAdmin.from('site_comptes').update({ service: 'ddm', nom, maj_le: new Date().toISOString() }).eq('id', d.id).eq('site_id', siteId)
    : supabaseAdmin.from('site_comptes').insert({
        site_id: siteId, user_id: userId, email, role: 'agent', service: 'ddm', nom,
        organisation: 'Centrale — Service clients',
      })
  const { data: agent, error } = await ecriture.select(COLS).single()
  if (error) {
    if (nouvelAcces) await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await journaliser({
    siteId, acteur: garde.email, viaAdmin: garde.viaAdmin,
    action: 'agent.nommer', cible: email, details: { service: 'ddm', nouvelAcces },
  })
  return NextResponse.json({ agent, nouvelAcces }, { status: 201 })
}
