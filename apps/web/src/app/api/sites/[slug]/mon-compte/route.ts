import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ouvreDesComptes } from '@/app/sites/[slug]/acces/ouvreDesComptes'

// ============================================================================
// LOT 11 — « OÙ EN EST MON COMPTE ? »
//
// ── POURQUOI CETTE ROUTE EXISTE, ALORS QUE `/comptes` EXISTE DÉJÀ.
//
// `requireSiteCompte` refuse UNIFORMÉMENT quatre causes : pas de session,
// pas de compte, compte en attente, compte suspendu. C'est juste pour tout
// ce qui protège une donnée — un inconnu ne doit pas apprendre qu'un compte
// existe à une adresse.
//
// Mais appliqué à l'ÉCRAN, ce refus enferme : une personne dont le compte
// attend l'examen de la Centrale ne peut rien apprendre, donc elle
// redemande. Et redemande. Elle finirait par écrire au standard.
//
// ── CE QUI CHANGE ICI, ET CE QUI NE CHANGE PAS.
//
// Un INCONNU n'apprend toujours rien : sans jeton valable, la réponse est
// la même pour tout le monde. Une personne AUTHENTIFIÉE apprend l'état de
// SON PROPRE compte, et de lui seul — la ligne est cherchée par
// l'identifiant du jeton, jamais par un paramètre reçu. Elle a prouvé qui
// elle est ; lui cacher sa propre situation ne protège personne.
//
// ── DEMANDER N'EST PAS OBTENIR, ET REDEMANDER N'EFFACE RIEN.
//
// POST crée une DEMANDE. Le déclencheur de base force `en_attente`. Et si
// une ligne existe déjà, elle n'est pas touchée : sans cette règle, un
// compte SUSPENDU redeviendrait « en attente » en redemandant, et le
// propriétaire pourrait le réactiver sans jamais savoir qu'il avait été
// suspendu. Une sanction qui s'efface en recliquant n'est pas une sanction.
//
// ── ON NE PEUT PAS SE DÉCLARER AGENT.
//
// La base connaît trois rôles ; seuls DEUX se demandent publiquement.
// `agent` est un rôle de la Centrale : il s'accorde, il ne se réclame pas.
// La liste est fermée ICI parce que c'est ici qu'est le risque — la CHECK
// de la base, elle, accepterait `agent` sans broncher.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

/** Les rôles qu'une personne peut DEMANDER. Strictement plus petit que la base. */
const ROLES_DEMANDABLES = ['structure', 'fournisseur'] as const
type RoleDemandable = (typeof ROLES_DEMANDABLES)[number]

/** Le même refus pour un inconnu, quelle qu'en soit la cause. */
const REFUS = () => NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

/** Ce qu'on rend d'un compte. Jamais `user_id` : le porteur le connaît déjà. */
const VU = 'id,email,role,etat,organisation,reference,cree_le,qualification,qualification_le'

/**
 * Qui appelle, d'après SON jeton.
 *
 * Le lecteur est construit avec le jeton du porteur, jamais avec le rôle de
 * service : c'est l'authentification qui dit qui il est, pas nous.
 */
async function quiAppelle(req: Request): Promise<{ userId: string; email: string } | null> {
  const brut = req.headers.get('authorization') ?? ''
  const jeton = brut.startsWith('Bearer ') ? brut.slice(7).trim() : ''
  if (!jeton) return null

  const lecteur = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jeton}` } } },
  )
  const { data } = await lecteur.auth.getUser()
  const u = data?.user
  if (!u?.id || !u.email) return null
  return { userId: u.id, email: u.email }
}

/**
 * Le site, par son slug PUBLIC, ET SEULEMENT S'IL OUVRE DES COMPTES.
 *
 * Les deux conditions rendent le MÊME `null`, donc le même refus. Un site
 * non publié, un slug inventé et une boutique qui n'ouvre pas de comptes
 * sont indiscernables de l'extérieur — c'est la règle de `fetchPage`.
 *
 * LA CAPACITÉ SE LIT ICI, PAS SEULEMENT À L'ÉCRAN. Cacher la page sans
 * fermer la route laisserait poser une ligne dans `site_comptes` sur
 * n'importe lequel des 42 sites, à la main, en une requête.
 */
async function siteDe(slug: string): Promise<{ id: string } | null> {
  const { data } = await supabaseAdmin
    .from('sites_public').select('id').eq('slug', slug).maybeSingle()
  const site = (data as { id: string } | null) ?? null
  if (!site) return null
  return (await ouvreDesComptes(site.id)) ? site : null
}

/** GET — l'état de MON compte sur ce site, ou `null` si je n'en ai pas. */
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const moi = await quiAppelle(req)
  if (!moi) return REFUS()

  const site = await siteDe(slug)
  if (!site) return REFUS()

  const { data, error } = await supabaseAdmin
    .from('site_comptes')
    .select(VU)
    .eq('site_id', site.id)
    // L'IDENTIFIANT VIENT DU JETON. Accepter un `user_id` en paramètre
    // transformerait cette route en annuaire des comptes du site.
    .eq('user_id', moi.userId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ compte: data ?? null, courriel: moi.email })
}

/** POST — je DEMANDE un accès. Le compte naît en attente, et ne renaît jamais. */
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const moi = await quiAppelle(req)
  if (!moi) return REFUS()

  const site = await siteDe(slug)
  if (!site) return REFUS()

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch {
    return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 })
  }

  const role = corps.role
  if (typeof role !== 'string' || !ROLES_DEMANDABLES.includes(role as RoleDemandable)) {
    return NextResponse.json({ error: 'Choisissez « structure » ou « fournisseur ».' }, { status: 400 })
  }

  const organisation = typeof corps.organisation === 'string' ? corps.organisation.trim() : ''
  if (organisation.length < 2) {
    return NextResponse.json({ error: 'Indiquez l’organisation que vous représentez.' }, { status: 400 })
  }

  // UNE LIGNE EXISTANTE NE SE TOUCHE PAS — surtout pas une suspendue.
  // On la REND, pour que l'écran dise où en est la demande.
  const { data: deja } = await supabaseAdmin
    .from('site_comptes').select(VU)
    .eq('site_id', site.id).eq('user_id', moi.userId).maybeSingle()
  if (deja) return NextResponse.json({ compte: deja, nouvelle: false })

  const { data, error } = await supabaseAdmin
    .from('site_comptes')
    .insert({
      site_id: site.id,
      // NI `user_id` NI `email` NE VIENNENT DU CORPS. C'est exactement la
      // dette §10, fermée ici : l'identité est celle du jeton, donc elle
      // existe nécessairement dans `auth.users`.
      user_id: moi.userId,
      email: moi.email,
      role,
      organisation,
      // `etat` n'est pas envoyé ; le déclencheur le forcerait de toute façon.
    })
    .select(VU)
    .single()

  if (error) {
    // 23505 : deux demandes parties en même temps. Ce n'est pas une erreur
    // pour le demandeur — sa demande EST enregistrée.
    if (error.code === '23505') {
      const { data: course } = await supabaseAdmin
        .from('site_comptes').select(VU)
        .eq('site_id', site.id).eq('user_id', moi.userId).maybeSingle()
      return NextResponse.json({ compte: course, nouvelle: false })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ compte: data, nouvelle: true }, { status: 201 })
}

/**
 * PATCH — je corrige MON organisation, tant que ma demande attend.
 *
 * ── POURQUOI ELLE SE FIGE À L'ACTIVATION.
 *
 * L'organisation est ce que la Centrale a EXAMINÉ avant d'admettre. La
 * laisser changer après coup déplacerait silencieusement qui l'on
 * représente, sans nouvel examen — exactement la raison pour laquelle le
 * RÔLE ne se modifie jamais. Avant l'examen, c'est une faute de frappe qu'on
 * corrige ; après, c'est un changement de nature, et il se demande.
 *
 * ── CE REFUS-LÀ DIT POURQUOI, ET C'EST VOULU.
 *
 * La personne est authentifiée et c'est SA ligne : lui cacher la raison la
 * ferait réessayer sans comprendre. Un inconnu, lui, n'arrive jamais ici.
 */
export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params
  const moi = await quiAppelle(req)
  if (!moi) return REFUS()

  const site = await siteDe(slug)
  if (!site) return REFUS()

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch {
    return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 })
  }

  const organisation = typeof corps.organisation === 'string' ? corps.organisation.trim() : ''
  if (organisation.length < 2) {
    return NextResponse.json({ error: 'Indiquez l’organisation que vous représentez.' }, { status: 400 })
  }

  const { data: deja } = await supabaseAdmin
    .from('site_comptes').select('id,etat')
    .eq('site_id', site.id).eq('user_id', moi.userId).maybeSingle()
  const ligne = deja as { id: string; etat: string } | null
  if (!ligne) return REFUS()

  if (ligne.etat !== 'en_attente') {
    return NextResponse.json({
      error: 'Votre compte a déjà été examiné : l’organisation ne se modifie plus ici. Écrivez à la Centrale.',
    }, { status: 409 })
  }

  // NI `role`, NI `etat`, NI `reference` : la liste des colonnes écrites est
  // posée ici, en entier. Reprendre `corps` tel quel laisserait passer
  // n'importe quelle colonne qu'on ajouterait un jour.
  const { data, error } = await supabaseAdmin
    .from('site_comptes')
    .update({ organisation, maj_le: new Date().toISOString() })
    .eq('id', ligne.id)
    // LE FILTRE PAR PERSONNE RESTE, MÊME AVEC UN `id` : il vient de notre
    // propre lecture, mais l'écrire dit que cette route ne touche jamais la
    // ligne d'autrui.
    .eq('user_id', moi.userId)
    .select(VU)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return REFUS()
  return NextResponse.json({ compte: data })
}
