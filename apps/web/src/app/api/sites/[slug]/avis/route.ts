import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { journaliser } from '@/lib/audit/journaliser'

// ============================================================================
// LOT 14.1 — LA CENTRALE ÉCRIT SES AVIS ELLE-MÊME.
//
// ── LE TROU QUE CE LOT FERME.
//
// Mesuré le 2026-11-10 : AUCUN fichier du dépôt n'écrivait dans
// `appels_offres`. La liste, la fiche, l'archive, le dépôt d'offre et
// l'écran des plis existaient — et la Centrale n'avait aucun moyen de
// publier un avis sans passer par nous. Zéro avis en base n'était pas un
// hasard : c'était la seule issue possible.
//
// ── UN AVIS NAÎT EN PRÉPARATION, ET NON PUBLIÉ.
//
// Même forme qu'un compte qui naît en attente. Publier est un geste
// distinct, visible, daté par celui qui le fait : un avis qui partirait en
// ligne à la création exposerait un brouillon à des fournisseurs réels.
//
// ── LES COLONNES ÉCRITES SONT NOMMÉES, UNE PAR UNE.
//
// Reprendre le corps tel quel laisserait écrire `site_id` — donc déplacer un
// avis chez un autre site — ou n'importe quelle colonne ajoutée demain.
//
// ── PAS DE SUPPRESSION, ET C'EST VOULU.
//
// `offres.avis_id` est `on delete cascade` : supprimer un avis EFFACERAIT
// les offres reçues, c'est-à-dire la trace d'un marché public. On dépublie.
// Si une suppression devient nécessaire, elle se décidera avec sa règle —
// pas par un bouton.
//
// ── L'ATTRIBUTION SUIT L'INVARIANT DE LA BASE.
//
// `attributaire`, `montant_attribue` et `attribue_le` n'ont de sens que si
// `etat = 'attribue'` — la base le refuse sinon. Quitter cet état les
// efface donc ici, plutôt que de laisser la contrainte rendre un 23514 que
// personne ne saurait lire.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

const TEXTES = [
  'objet', 'description', 'methode', 'methode_detail', 'devise',
  'criteres_elim', 'criteres_notes', 'soumission', 'allotissement',
  'local_prix_dossier', 'local_caution', 'canal_officiel_url', 'document_url',
  'attributaire',
] as const
const DATES = ['remise_le', 'questions_avant', 'ouverture_plis', 'attribue_le'] as const
const NOMBRES = ['valeur', 'montant_attribue', 'local_validite_jours'] as const
const ETATS = ['preparation', 'ouvert', 'attribue'] as const
const PORTEES = ['national', 'international', 'tous'] as const

const COLS = ['id', 'reference', 'reference_slug', 'etat', 'publie', 'portee', 'cree_le', 'pieces',
  ...TEXTES, ...DATES, ...NOMBRES].join(',')

const LISIBLE: Record<string, string> = {
  '23505': 'Cette référence existe déjà sur ce site.',
  '23514': 'Valeur refusée par la base : état, portée ou attribution incohérente.',
}

/** La référence, rendue utilisable dans une adresse. */
function slugDe(reference: string): string {
  return reference
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Les champs modifiables lus dans un corps — et RIEN d'autre. */
function champs(corps: Record<string, unknown>): Record<string, unknown> | string {
  const out: Record<string, unknown> = {}
  for (const k of TEXTES) {
    if (!(k in corps)) continue
    const v = corps[k]
    out[k] = typeof v === 'string' && v.trim() !== '' ? v.trim() : null
  }
  for (const k of DATES) {
    if (!(k in corps)) continue
    const v = corps[k]
    if (v === null || v === '') { out[k] = null; continue }
    // UNE DATE ILLISIBLE EST REFUSÉE, pas mise à vide : effacer en silence la
    // date limite d'un marché parce qu'elle est mal tapée le rendrait ouvert
    // sans échéance.
    if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) return `Date illisible : ${k}.`
    out[k] = v
  }
  for (const k of NOMBRES) {
    if (!(k in corps)) continue
    const v = corps[k]
    if (v === null || v === '') { out[k] = null; continue }
    const n = Number(v)
    if (!Number.isFinite(n) || n < 0) return `Nombre illisible : ${k}.`
    out[k] = n
  }
  if ('portee' in corps) {
    if (!(PORTEES as readonly unknown[]).includes(corps.portee)) return 'Portée inconnue.'
    out.portee = corps.portee
  }
  if ('etat' in corps) {
    if (!(ETATS as readonly unknown[]).includes(corps.etat)) return 'État inconnu.'
    out.etat = corps.etat
    // QUITTER « ATTRIBUÉ » EFFACE L'ATTRIBUTION : la base refuserait un
    // attributaire sur un avis qui n'est pas attribué.
    if (corps.etat !== 'attribue') {
      out.attributaire = null; out.montant_attribue = null; out.attribue_le = null
    }
  }
  if ('publie' in corps) {
    if (typeof corps.publie !== 'boolean') return 'Publication : vrai ou faux.'
    out.publie = corps.publie
  }
  return out
}

/** GET — tous les avis du site, brouillons compris. Le propriétaire seul. */
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  const { data, error } = await supabaseAdmin
    .from('appels_offres').select(COLS)
    .eq('site_id', garde.site.id)
    .order('cree_le', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ avis: data ?? [] })
}

/** POST — créer un avis. Il naît en préparation, non publié. */
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const reference = typeof corps.reference === 'string' ? corps.reference.trim() : ''
  const objet = typeof corps.objet === 'string' ? corps.objet.trim() : ''
  if (reference.length < 2 || objet.length < 3) {
    return NextResponse.json({ error: 'Une référence et un objet sont obligatoires.' }, { status: 400 })
  }
  const reference_slug = slugDe(reference)
  if (!reference_slug) return NextResponse.json({ error: 'Référence inutilisable dans une adresse.' }, { status: 400 })

  const lus = champs(corps)
  if (typeof lus === 'string') return NextResponse.json({ error: lus }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('appels_offres')
    .insert({
      ...lus,
      site_id: garde.site.id,
      reference, reference_slug, objet,
      // QUOI QUE DISE LE CORPS : en préparation, non publié, sans attribution.
      etat: 'preparation', publie: false,
      attributaire: null, montant_attribue: null, attribue_le: null,
    })
    .select(COLS).single()

  if (error) return NextResponse.json({ error: LISIBLE[error.code] ?? error.message }, { status: 400 })
  await journaliser({ siteId: garde.site.id, acteur: garde.email, viaAdmin: garde.viaAdmin,
    action: 'avis.creer', cible: reference })
  return NextResponse.json({ avis: data }, { status: 201 })
}

/** PATCH — corriger, ouvrir, publier, attribuer. Jamais déplacer. */
export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const id = typeof corps.id === 'string' ? corps.id : ''
  if (!id) return NextResponse.json({ error: 'Avis non désigné.' }, { status: 400 })

  const lus = champs(corps)
  if (typeof lus === 'string') return NextResponse.json({ error: lus }, { status: 400 })
  // L'OBJET NE SE VIDE PAS : un avis sans objet ne dit pas ce qu'on achète.
  if ('objet' in lus && lus.objet === null) {
    return NextResponse.json({ error: 'L’objet ne peut pas être vide.' }, { status: 400 })
  }
  if (Object.keys(lus).length === 0) return NextResponse.json({ error: 'Rien à modifier.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('appels_offres').update(lus)
    .eq('id', id)
    // LE FILTRE PAR SITE RESTE, MÊME AVEC UN `id`.
    .eq('site_id', garde.site.id)
    .select(COLS).maybeSingle()

  if (error) return NextResponse.json({ error: LISIBLE[error.code] ?? error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Avis introuvable.' }, { status: 404 })
  await journaliser({ siteId: garde.site.id, acteur: garde.email, viaAdmin: garde.viaAdmin,
    action: 'publie' in lus ? 'avis.publier' : 'etat' in lus ? 'avis.etat' : 'avis.modifier',
    cible: (data as { reference?: string }).reference ?? id, details: lus })
  return NextResponse.json({ avis: data })
}
