import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { journaliser } from '@/lib/audit/journaliser'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { nomPropre } from '@/lib/fichiers/nomPropre'
import { ouvreDesComptes } from '@/app/sites/[slug]/acces/ouvreDesComptes'

// ============================================================================
// LOT 13.1 — POSTULER À UN APPEL D'OFFRES.
//
// ── CE QUE LE PROPRIÉTAIRE A DÉCRIT, 2026-11-09.
//
// « les fournisseurs proposent leur prix, upload leur pdf, un champ de leur
// nom, contact, puis postuler et cpa reçoit, cpa analyse et choisis un ou 2
// ou selon son choix, et répond. »
//
// ── POSTULER EXIGE UN COMPTE ACTIF.
//
// Arbitrage du même jour : « postuler doit exiger création d'un compte
// auprès de cpa, car cpa doit savoir c'est qui. » Une session ne suffit
// pas : s'inscrire est à la portée de n'importe qui, répondre à un marché
// public demande d'avoir été ADMIS.
//
// ── ON NE DÉPOSE PAS APRÈS LA DATE LIMITE.
//
// Cette règle-là n'a pas été énoncée, et je l'applique quand même : une
// date limite qui n'arrête rien n'est pas une date limite, et une offre
// arrivée après coup rendrait la procédure attaquable par tous les autres.
// Le refus dit l'heure, pour qu'on sache qu'on est en retard et non refusé
// pour une autre raison.
//
// ── ET UN AVIS EN PRÉPARATION NE REÇOIT RIEN.
//
// `etat = 'preparation'` veut dire que la Centrale n'a pas fini de le
// rédiger. Accepter une offre dessus ferait répondre à des conditions qui
// peuvent encore changer.
//
// ── CE QUE CETTE ROUTE NE FAIT PAS, PAR DÉCISION DU PROPRIÉTAIRE.
//
// Elle n'empêche pas la Centrale de lire une offre avant l'ouverture des
// plis. Arbitrage du 2026-11-09 : « cpa ne mettra pas avant heure, si ça
// arrive c'est leur responsabilité, pas la nôtre. » Le secret des plis
// repose sur sa discipline. Voir PLAN §13.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

const SEAU = 'offres'
const VU = 'id,avis_id,compte_id,nom,contact,prix,devise,chemin,nom_fichier,octets,type_mime,etat,reponse,repondu_le,depose_le'
/** Soixante secondes : le temps de cliquer, pas celui de faire suivre. */
const SIGNATURE_SECONDES = 60
/** Ce que la Centrale peut décider d'une offre. Fermé, comme en base. */
const ETATS = ['recue', 'retenue', 'non_retenue'] as const

const REFUS = () => NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

type Qui =
  | { role: 'centrale'; siteId: string; email?: string; viaAdmin?: boolean }
  | { role: 'fournisseur'; siteId: string; compteId: string }

/** Le jeton du porteur, et l'identité que l'authentification lui reconnaît. */
async function porteur(req: Request): Promise<{ userId: string } | null> {
  const brut = req.headers.get('authorization') ?? ''
  const jeton = brut.startsWith('Bearer ') ? brut.slice(7).trim() : ''
  if (!jeton) return null
  const lecteur = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jeton}` } } },
  )
  const { data } = await lecteur.auth.getUser()
  return data?.user?.id ? { userId: data.user.id } : null
}

/**
 * QUI APPELLE, et à quel titre.
 *
 * Le propriétaire d'abord : il peut aussi avoir un compte sur son site, et
 * c'est alors son rôle le plus fort qui doit décider.
 */
async function quiAppelle(req: Request, slug: string): Promise<Qui | null> {
  const proprietaire = await requireSiteOwner(req, slug)
  if (!('response' in proprietaire)) {
    return { role: 'centrale', siteId: proprietaire.site.id, email: proprietaire.email, viaAdmin: proprietaire.viaAdmin }
  }

  const moi = await porteur(req)
  if (!moi) return null

  const { data: site } = await supabaseAdmin
    .from('sites_public').select('id').eq('slug', slug).maybeSingle()
  const siteId = (site as { id: string } | null)?.id
  if (!siteId) return null
  if (!(await ouvreDesComptes(siteId))) return null

  const { data: compte } = await supabaseAdmin
    .from('site_comptes').select('id,etat')
    .eq('site_id', siteId).eq('user_id', moi.userId).maybeSingle()
  const c = compte as { id: string; etat: string } | null
  // UN COMPTE NON ACTIF N'EST PAS UN COMPTE. Une demande en attente d'examen
  // ne donne pas le droit de répondre à un marché public.
  if (!c || c.etat !== 'actif') return null

  return { role: 'fournisseur', siteId, compteId: c.id }
}

/** Ce qu'on rend d'une offre. `chemin` ne sort JAMAIS : c'est la clé du seau. */
function vue(d: Record<string, unknown>, parMoi: boolean) {
  return {
    id: d.id, avis_id: d.avis_id, nom: d.nom, contact: d.contact,
    prix: d.prix, devise: d.devise, nom_fichier: d.nom_fichier,
    octets: d.octets, type_mime: d.type_mime, etat: d.etat,
    reponse: d.reponse, repondu_le: d.repondu_le, depose_le: d.depose_le,
    parMoi,
  }
}

/** GET — la liste des offres d'un avis, ou un lien signé pour une pièce. */
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const qui = await quiAppelle(req, slug)
  if (!qui) return REFUS()

  const url = new URL(req.url)

  const aTelecharger = url.searchParams.get('telecharger')
  if (aTelecharger) {
    const { data } = await supabaseAdmin
      .from('offres').select(VU + ',site_id')
      .eq('id', aTelecharger)
      // LE SITE, TOUJOURS : un identifiant deviné ne traverse pas les sites.
      .eq('site_id', qui.siteId)
      .maybeSingle()
    const o = data as Record<string, unknown> | null
    if (!o) return REFUS()
    // UN FOURNISSEUR NE SIGNE QUE SA PROPRE OFFRE. Sans cette ligne, il
    // lirait le prix de ses concurrents.
    if (qui.role === 'fournisseur' && o.compte_id !== qui.compteId) return REFUS()

    const { data: signe, error } = await supabaseAdmin.storage
      .from(SEAU).createSignedUrl(String(o.chemin), SIGNATURE_SECONDES)
    if (error || !signe?.signedUrl) {
      return NextResponse.json({ error: 'Lien indisponible.' }, { status: 503 })
    }
    return NextResponse.json({ url: signe.signedUrl, expireDans: SIGNATURE_SECONDES })
  }

  const avis = url.searchParams.get('avis')
  let q = supabaseAdmin.from('offres').select(VU)
    .eq('site_id', qui.siteId)
    .order('depose_le', { ascending: false })
    .limit(300)
  if (avis) q = q.eq('avis_id', avis)
  // LE FOURNISSEUR NE VOIT QUE LES SIENNES, sur tous les avis à la fois.
  if (qui.role === 'fournisseur') q = q.eq('compte_id', qui.compteId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lignes = (data ?? []) as Record<string, unknown>[]

  // ── DE QUEL AVIS RELÈVE CHAQUE OFFRE.
  //
  // Sans cette lecture, l'écran afficherait une liste d'IDENTIFIANTS : la
  // Centrale ne saurait pas à quel marché elle répond. On la fait en UNE
  // requête sur les avis réellement présents, pas une par offre.
  //
  // ON LIT LA TABLE, PAS LA VUE PUBLIQUE : un avis dépublié après coup
  // garderait ses offres, et la Centrale doit pouvoir les retrouver. Le
  // filtre par site reste, lui.
  const ids = [...new Set(lignes.map((d) => String(d.avis_id)))]
  const titres = new Map<string, { reference: string; objet: string }>()
  if (ids.length > 0) {
    const { data: avis } = await supabaseAdmin
      .from('appels_offres').select('id,reference,objet')
      .eq('site_id', qui.siteId)
      .in('id', ids)
    // UN TITRE EST UNE COMMODITÉ : son absence ne doit pas casser la liste.
    // Premier jet : `for (const a of (avis ?? []))` — qui lève si la lecture
    // rend autre chose qu'un tableau, et fait tomber TOUT l'écran des offres
    // pour un libellé manquant.
    for (const a of (Array.isArray(avis) ? avis : []) as Record<string, unknown>[]) {
      titres.set(String(a.id), { reference: String(a.reference ?? ''), objet: String(a.objet ?? '') })
    }
  }

  const offres = lignes.map((d) => ({
    ...vue(d, qui.role === 'fournisseur' || d.compte_id === undefined),
    avis: titres.get(String(d.avis_id)) ?? null,
  }))
  return NextResponse.json({ offres, role: qui.role })
}

/** POST — déposer une offre. */
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const qui = await quiAppelle(req, slug)
  if (!qui) return REFUS()
  // LA CENTRALE NE POSTULE PAS À SES PROPRES MARCHÉS. Le dire ici plutôt
  // que de le supposer : elle a un compte sur son site, et rien d'autre ne
  // l'en empêcherait.
  if (qui.role !== 'fournisseur') return REFUS()

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 })
  }

  const avisId = typeof form.get('avis') === 'string' ? String(form.get('avis')) : ''
  if (!avisId) return NextResponse.json({ error: 'Avis non désigné.' }, { status: 400 })

  const { data: avis } = await supabaseAdmin
    .from('appels_offres').select('id,etat,publie,remise_le,objet')
    .eq('id', avisId).eq('site_id', qui.siteId).maybeSingle()
  const a = avis as { id: string; etat: string; publie: boolean; remise_le: string | null } | null
  if (!a) return REFUS()

  // UN AVIS EN PRÉPARATION OU NON PUBLIÉ NE REÇOIT RIEN : on répondrait à
  // des conditions qui peuvent encore changer.
  if (!a.publie || a.etat !== 'ouvert') {
    return NextResponse.json({ error: 'Cet avis n’est pas ouvert aux offres.' }, { status: 409 })
  }

  // LA DATE LIMITE ARRÊTE VRAIMENT. Une offre arrivée après coup rendrait
  // la procédure attaquable par tous les autres soumissionnaires.
  if (a.remise_le && new Date(a.remise_le).getTime() < Date.now()) {
    return NextResponse.json({
      error: `La date limite de remise était le ${a.remise_le.slice(0, 10)}. Les offres ne sont plus reçues.`,
    }, { status: 409 })
  }

  const fichier = form.get('fichier')
  if (!(fichier instanceof File) || fichier.size === 0) {
    return NextResponse.json({ error: 'Joignez votre offre en fichier.' }, { status: 400 })
  }

  const nom = typeof form.get('nom') === 'string' ? String(form.get('nom')).trim() : ''
  const contact = typeof form.get('contact') === 'string' ? String(form.get('contact')).trim() : ''
  if (nom.length < 2 || contact.length < 3) {
    return NextResponse.json({ error: 'Indiquez un nom et un contact pour cette offre.' }, { status: 400 })
  }

  // LE PRIX EST FACULTATIF, et un prix illisible vaut absence. Refuser
  // l'offre entière parce qu'un chiffre est mal tapé ferait perdre un
  // dossier recevable.
  const prixBrut = typeof form.get('prix') === 'string' ? String(form.get('prix')).replace(/\s/gu, '').replace(',', '.') : ''
  const prix = prixBrut !== '' && Number.isFinite(Number(prixBrut)) && Number(prixBrut) >= 0
    ? Number(prixBrut) : null
  const devise = typeof form.get('devise') === 'string' && String(form.get('devise')).trim().length >= 3
    ? String(form.get('devise')).trim().slice(0, 8) : null

  // UN CHEMIN UNIQUE PAR DÉPÔT : deux offres du même nom ne s'écrasent pas.
  const tampon = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const chemin = `sites/${qui.siteId}/avis/${avisId}/${tampon}-${nomPropre(fichier.name)}`

  const { error: eDepot } = await supabaseAdmin.storage
    .from(SEAU).upload(chemin, fichier, { contentType: fichier.type || undefined, upsert: false })
  if (eDepot) {
    const m = eDepot.message.toLowerCase()
    const lisible =
      m.includes('mime') || m.includes('type')
        ? 'Ce type de fichier n’est pas accepté. Formats admis : PDF, Word, Excel, ZIP.'
        : m.includes('size') || m.includes('large')
          ? 'Fichier trop lourd. La limite est de 25 Mo.'
          : eDepot.message
    return NextResponse.json({ error: lisible }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('offres')
    .insert({
      site_id: qui.siteId, avis_id: avisId,
      // L'IDENTITÉ VIENT DU JETON, jamais du formulaire : c'est ce qui fait
      // que la Centrale sait à qui elle a affaire.
      compte_id: qui.compteId,
      nom, contact, prix, devise,
      chemin, nom_fichier: fichier.name.slice(0, 200),
      octets: fichier.size, type_mime: fichier.type || 'application/octet-stream',
      // `etat` N'EST PAS ENVOYÉ : une offre arrive `recue`, la Centrale n'a
      // encore rien décidé.
    })
    .select(VU)
    .single()

  if (error || !data) {
    // LE FICHIER EST DÉJÀ DANS LE SEAU : sans ce retrait il resterait
    // orphelin, un octet payé que plus rien ne nomme.
    await supabaseAdmin.storage.from(SEAU).remove([chemin])
    return NextResponse.json({ error: error?.message ?? 'Dépôt non confirmé.' }, { status: 500 })
  }

  return NextResponse.json({ offre: vue(data as Record<string, unknown>, true) }, { status: 201 })
}

/** PATCH — la Centrale analyse, choisit, et répond. */
export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params
  const qui = await quiAppelle(req, slug)
  if (!qui) return REFUS()
  // SEULE LA CENTRALE DÉCIDE. Un fournisseur qui retiendrait sa propre
  // offre serait exactement le défaut que ce dépôt refuse ailleurs :
  // s'admettre soi-même.
  if (qui.role !== 'centrale') return REFUS()

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch {
    return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 })
  }

  const id = typeof corps.id === 'string' ? corps.id : ''
  if (!id) return NextResponse.json({ error: 'Offre non désignée.' }, { status: 400 })

  const changements: Record<string, unknown> = {}
  if (typeof corps.etat === 'string') {
    if (!(ETATS as readonly string[]).includes(corps.etat)) {
      return NextResponse.json({ error: 'État inconnu.' }, { status: 400 })
    }
    changements.etat = corps.etat
  }
  if (typeof corps.reponse === 'string') {
    const texte = corps.reponse.trim()
    // LA RÉPONSE ET SA DATE PARTENT ENSEMBLE, et s'effacent ensemble : la
    // base refuserait l'une sans l'autre, et une réponse sans date décrit
    // un échange que personne ne peut raconter.
    changements.reponse = texte === '' ? null : texte
    changements.repondu_le = texte === '' ? null : new Date().toISOString()
  }
  if (Object.keys(changements).length === 0) {
    return NextResponse.json({ error: 'Rien à modifier.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('offres').update(changements)
    .eq('id', id)
    // LE FILTRE PAR SITE RESTE, MÊME AVEC UN `id`.
    .eq('site_id', qui.siteId)
    .select(VU)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Offre introuvable.' }, { status: 404 })
  await journaliser({ siteId: qui.siteId, acteur: qui.email, viaAdmin: qui.viaAdmin,
    action: 'reponse' in changements ? 'offre.repondre' : 'offre.decider',
    cible: String((data as { nom?: string }).nom ?? id), details: { etat: changements.etat, offre: id } })
  return NextResponse.json({ offre: vue(data as Record<string, unknown>, false) })
}
