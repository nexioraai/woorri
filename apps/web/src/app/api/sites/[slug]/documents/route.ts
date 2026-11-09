import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { nomPropre } from '@/lib/fichiers/nomPropre'
import { ouvreDesComptes } from '@/app/sites/[slug]/acces/ouvreDesComptes'
import { lirePieces } from '@/app/sites/[slug]/espace/piecesFournisseur'

// ============================================================================
// LOT 12.1 — LES DOCUMENTS D'UN COMPTE, DANS LES DEUX SENS.
//
// ── CE QUE LE PROPRIÉTAIRE A TRANCHÉ, 2026-11-09.
//
// « le cpa depose les documents et les fournisseurs ou les etablissement ou
// hopitaux peuvent upload, et de leur coté fournisseurs et les
// etablissements peuvent upload pour le cpa, c de 2 cotés pas un coté. »
//
// DEUX AUDIENCES, UNE ROUTE. La Centrale et le titulaire voient le MÊME
// dossier — c'est leur conversation. Deux routes auraient produit deux
// lectures de la même règle, et c'est celle qu'on ne regarde pas qui finit
// par en dire une de trop.
//
// ── LE SENS SE DÉDUIT DE QUI DÉPOSE, IL NE SE DEMANDE PAS.
//
// Laisser l'appelant annoncer son sens permettrait à un fournisseur de
// déposer une pièce « de la part de la Centrale ». Le sens est calculé.
//
// ── ON NE TÉLÉCHARGE QUE PAR LIEN SIGNÉ, ET COURT.
//
// Le seau est PRIVÉ (`public = false`, zéro politique) : il n'existe aucune
// URL devinable. Le lien est émis APRÈS la garde, pour soixante secondes.
// Un lien permanent transmis une fois ferait fuir la pièce pour toujours.
//
// ── RETIRER N'EST PAS EFFACER.
//
// La LIGNE reste avec sa date et son auteur ; le FICHIER part du seau. Dans
// un marché public, « ce document a existé et a été retiré le 12 » est une
// information, et une disparition sans trace permettrait de nier un dépôt.
// Et chacun ne retire QUE ce qu'il a déposé : la Centrale ne fait pas
// disparaître l'agrément qu'un fournisseur lui a remis.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

const SEAU = 'comptes-documents'
const VU = 'id,compte_id,sens,depose_par,nom,chemin,octets,type_mime,depose_le,retire_le,retire_par,piece'
/** Soixante secondes : le temps de cliquer, pas celui de faire suivre. */
const SIGNATURE_SECONDES = 60

const REFUS = () => NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

type Qui =
  | { role: 'centrale'; siteId: string; userId: string }
  | { role: 'titulaire'; siteId: string; userId: string; compteId: string }

/**
 * QUI APPELLE, et à quel titre.
 *
 * On essaie D'ABORD le propriétaire, puis le titulaire. L'ordre n'est pas
 * une optimisation : le propriétaire d'un site peut aussi y avoir un compte,
 * et c'est alors son rôle le plus fort qui doit décider.
 */
async function quiAppelle(req: Request, slug: string): Promise<Qui | null> {
  const proprietaire = await requireSiteOwner(req, slug)
  if (!('response' in proprietaire)) {
    const brut = req.headers.get('authorization') ?? ''
    const jeton = brut.startsWith('Bearer ') ? brut.slice(7).trim() : ''
    const lecteur = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jeton}` } } },
    )
    const { data } = await lecteur.auth.getUser()
    if (!data?.user?.id) return null
    return { role: 'centrale', siteId: proprietaire.site.id, userId: data.user.id }
  }

  const brut = req.headers.get('authorization') ?? ''
  const jeton = brut.startsWith('Bearer ') ? brut.slice(7).trim() : ''
  if (!jeton) return null

  const lecteur = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jeton}` } } },
  )
  const { data: auth } = await lecteur.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return null

  const { data: site } = await supabaseAdmin
    .from('sites_public').select('id').eq('slug', slug).maybeSingle()
  const siteId = (site as { id: string } | null)?.id
  if (!siteId) return null
  // La capacité décide ici aussi : un site qui n'ouvre pas de comptes n'a
  // pas de dossiers de comptes, et la route le refuse comme une absence.
  if (!(await ouvreDesComptes(siteId))) return null

  const { data: compte } = await supabaseAdmin
    .from('site_comptes').select('id,etat')
    .eq('site_id', siteId).eq('user_id', userId).maybeSingle()
  const c = compte as { id: string; etat: string } | null
  // UN COMPTE NON ACTIF N'EST PAS UN COMPTE : un dossier en attente d'examen
  // ne donne aucun accès aux pièces.
  if (!c || c.etat !== 'actif') return null

  return { role: 'titulaire', siteId, userId, compteId: c.id }
}

/** Le compte visé : celui qu'on demande si l'on est la Centrale, le sien sinon. */
function compteVise(qui: Qui, url: URL): string | null {
  if (qui.role === 'titulaire') return qui.compteId
  const demande = url.searchParams.get('compte')
  return demande && demande.length > 0 ? demande : null
}

/** GET — la liste, ou un lien signé pour UN document. */
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const qui = await quiAppelle(req, slug)
  if (!qui) return REFUS()

  const url = new URL(req.url)

  // ── UN LIEN SIGNÉ POUR UNE PIÈCE PRÉCISE.
  const aTelecharger = url.searchParams.get('telecharger')
  if (aTelecharger) {
    const { data } = await supabaseAdmin
      .from('comptes_documents').select(VU)
      .eq('id', aTelecharger)
      // LE SITE, TOUJOURS : un identifiant deviné ne doit pas traverser les sites.
      .eq('site_id', qui.siteId)
      .maybeSingle()
    const doc = data as Record<string, unknown> | null
    if (!doc) return REFUS()
    // Le titulaire ne signe que SON dossier. La Centrale signe ceux de son site.
    if (qui.role === 'titulaire' && doc.compte_id !== qui.compteId) return REFUS()
    // UN DOCUMENT RETIRÉ NE SE TÉLÉCHARGE PLUS. Sa ligne reste lisible, son
    // contenu non — c'est tout le sens du retrait.
    if (doc.retire_le) return NextResponse.json({ error: 'Ce document a été retiré.' }, { status: 410 })

    const { data: signe, error } = await supabaseAdmin.storage
      .from(SEAU).createSignedUrl(String(doc.chemin), SIGNATURE_SECONDES)
    if (error || !signe?.signedUrl) {
      return NextResponse.json({ error: 'Lien indisponible.' }, { status: 503 })
    }
    return NextResponse.json({ url: signe.signedUrl, expireDans: SIGNATURE_SECONDES })
  }

  // ── LA LISTE.
  const compte = compteVise(qui, url)
  if (!compte) return NextResponse.json({ error: 'Compte non désigné.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('comptes_documents').select(VU)
    .eq('site_id', qui.siteId)
    .eq('compte_id', compte)
    .order('depose_le', { ascending: false })
    .limit(300)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // `chemin` NE SORT PAS. C'est la clé dans le seau : la rendre n'apporte
  // rien à l'écran et donne une prise à qui chercherait à deviner.
  const documents = ((data ?? []) as Record<string, unknown>[]).map((d) => ({
    id: d.id, sens: d.sens, nom: d.nom, octets: d.octets, type_mime: d.type_mime,
    depose_le: d.depose_le, retire_le: d.retire_le, piece: d.piece ?? null,
    // « est-ce moi qui l'ai déposé ? » — l'écran en a besoin pour savoir
    // s'il peut proposer le retrait, et ça ne révèle l'identité de personne.
    parMoi: d.depose_par === qui.userId,
  }))
  return NextResponse.json({ documents, role: qui.role })
}

/** POST — déposer une pièce dans le dossier d'un compte. */
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const qui = await quiAppelle(req, slug)
  if (!qui) return REFUS()

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 })
  }

  const fichier = form.get('fichier')
  if (!(fichier instanceof File) || fichier.size === 0) {
    return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
  }

  const compte = qui.role === 'titulaire'
    ? qui.compteId
    : (typeof form.get('compte') === 'string' ? String(form.get('compte')) : '')
  if (!compte) return NextResponse.json({ error: 'Compte non désigné.' }, { status: 400 })

  // LE COMPTE DOIT APPARTENIR À CE SITE. Sans cette lecture, la Centrale
  // d'un site pourrait déposer dans le dossier d'un compte d'un autre.
  const { data: ligneCompte } = await supabaseAdmin
    .from('site_comptes').select('id').eq('id', compte).eq('site_id', qui.siteId).maybeSingle()
  if (!ligneCompte) return REFUS()

  // LE SENS SE DÉDUIT DE QUI DÉPOSE. Le demander permettrait à un
  // fournisseur de déposer « de la part de la Centrale ».
  const sens = qui.role === 'centrale' ? 'vers_le_compte' : 'vers_la_centrale'

  // ── LA PIÈCE HONORÉE, VALIDÉE CONTRE CE QUE LE SITE EXIGE VRAIMENT.
  //
  // Le vocabulaire est FERMÉ, mais il n'est pas écrit dans ce fichier : il
  // est DÉCLARÉ par la Centrale. Accepter une clé inconnue poserait un
  // rattachement qui n'honore rien — le dossier resterait incomplet pour
  // toujours, et personne ne comprendrait pourquoi.
  const pieceDemandee = typeof form.get('piece') === 'string' ? String(form.get('piece')) : ''
  let piece: string | null = null
  if (pieceDemandee) {
    const { data: siteLigne } = await supabaseAdmin
      .from('sites').select('pieces_fournisseur').eq('id', qui.siteId).maybeSingle()
    const exigees = lirePieces((siteLigne as { pieces_fournisseur?: unknown } | null)?.pieces_fournisseur)
    if (!exigees.some((x) => x.cle === pieceDemandee)) {
      // RIEN À RETIRER : cette vérification passe AVANT le dépôt, exprès.
      // Refuser après avoir écrit dans le seau laisserait un octet payé que
      // plus rien ne nomme, à chaque clé mal tapée.
      return NextResponse.json({ error: 'Cette pièce n’est pas demandée.' }, { status: 400 })
    }
    piece = pieceDemandee
  }

  // UN CHEMIN UNIQUE PAR DÉPÔT. Deux fichiers du même nom ne doivent pas
  // s'écraser : le second effacerait silencieusement le premier, dont la
  // ligne continuerait de prétendre qu'il existe.
  const tampon = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const chemin = `sites/${qui.siteId}/comptes/${compte}/${tampon}-${nomPropre(fichier.name)}`

  const { error: eDepot } = await supabaseAdmin.storage
    .from(SEAU).upload(chemin, fichier, { contentType: fichier.type || undefined, upsert: false })

  if (eDepot) {
    // On TRADUIT le refus du stockage plutôt que de recopier ses bornes :
    // deux vérités, et celle qu'on lit n'est pas celle qui décide.
    const m = eDepot.message.toLowerCase()
    const lisible =
      m.includes('mime') || m.includes('type')
        ? 'Ce type de fichier n’est pas accepté. Formats admis : PDF, Word, Excel, CSV, JPEG, PNG, WebP, AVIF.'
        : m.includes('size') || m.includes('large')
          ? 'Fichier trop lourd. La limite est de 25 Mo.'
          : eDepot.message
    return NextResponse.json({ error: lisible }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('comptes_documents')
    .insert({
      site_id: qui.siteId, compte_id: compte, sens,
      depose_par: qui.userId,
      nom: fichier.name.slice(0, 200),
      chemin, octets: fichier.size, type_mime: fichier.type || 'application/octet-stream',
      piece,
    })
    .select(VU)
    .single()

  if (error || !data) {
    // LE FICHIER EST DÉJÀ DANS LE SEAU : si la ligne échoue, il resterait
    // orphelin — un octet payé que plus rien ne nomme. On le retire.
    await supabaseAdmin.storage.from(SEAU).remove([chemin])
    return NextResponse.json({ error: error?.message ?? 'Dépôt non confirmé.' }, { status: 500 })
  }

  const d = data as Record<string, unknown>
  return NextResponse.json({
    document: {
      id: d.id, sens: d.sens, nom: d.nom, octets: d.octets,
      type_mime: d.type_mime, depose_le: d.depose_le, retire_le: null,
      piece: d.piece ?? null, parMoi: true,
    },
  }, { status: 201 })
}

/** DELETE — retirer une pièce QUE J'AI DÉPOSÉE. */
export async function DELETE(req: Request, { params }: Params) {
  const { slug } = await params
  const qui = await quiAppelle(req, slug)
  if (!qui) return REFUS()

  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'Document non désigné.' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('comptes_documents').select(VU)
    .eq('id', id).eq('site_id', qui.siteId).maybeSingle()
  const doc = data as Record<string, unknown> | null
  if (!doc) return REFUS()

  // CHACUN NE RETIRE QUE CE QU'IL A DÉPOSÉ. La Centrale ne fait pas
  // disparaître l'agrément qu'un fournisseur lui a remis, et réciproquement.
  if (doc.depose_par !== qui.userId) return REFUS()
  if (doc.retire_le) return NextResponse.json({ document: { id: doc.id, retire_le: doc.retire_le } })

  // LA LIGNE RESTE, LE FICHIER PART. Les deux dans cet ordre : si le retrait
  // du fichier échoue, la ligne ne doit pas déjà prétendre qu'il est parti.
  const { error: eFichier } = await supabaseAdmin.storage.from(SEAU).remove([String(doc.chemin)])
  if (eFichier) return NextResponse.json({ error: 'Retrait non confirmé.' }, { status: 503 })

  const { data: maj, error } = await supabaseAdmin
    .from('comptes_documents')
    .update({ retire_le: new Date().toISOString(), retire_par: qui.userId })
    .eq('id', id).eq('site_id', qui.siteId)
    .select('id,retire_le')
    .maybeSingle()

  if (error || !maj) return NextResponse.json({ error: 'Retrait non confirmé.' }, { status: 500 })
  return NextResponse.json({ document: maj })
}
