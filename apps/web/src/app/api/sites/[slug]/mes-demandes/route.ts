import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ============================================================================
// LOT 11 — MES DEMANDES, ET MES RÉCLAMATIONS.
//
// ── L'ADRESSE VIENT DU JETON, JAMAIS D'UN PARAMÈTRE.
//
// `/demandes/suivi` du lot 8 demandait une RÉFÉRENCE et une adresse, et
// refusait les deux échecs du même message : sans référence, connaître une
// adresse ne devait rien ouvrir. Ici la personne est AUTHENTIFIÉE : elle n'a
// plus à prouver qu'elle est elle-même, et la liste se construit sur
// l'adresse de son jeton. Accepter une adresse en paramètre transformerait
// cette route en annuaire des demandes du site.
//
// ── IL FAUT UN COMPTE ACTIF, PAS SEULEMENT UNE SESSION.
//
// Une session Supabase s'obtient en s'inscrivant, ce que n'importe qui peut
// faire. Lire les échanges d'une centrale d'achats publique demande d'avoir
// été ADMIS. `requireSiteCompte` dit exactement cela, et refuse
// uniformément les quatre causes.
//
// ── CE QUE CETTE ROUTE NE PEUT PAS VOIR, ET QUI SE DIT À L'ÉCRAN.
//
// `messages.email` est l'adresse SAISIE dans le formulaire de contact. Une
// demande envoyée depuis une autre adresse n'apparaîtra pas — ce n'est pas
// une perte, c'est une limite, et la page le dit plutôt que de laisser
// croire à un effacement.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

/** Les types qu'on sait filtrer. Fermé : la base n'en connaît pas d'autres. */
const TYPES = ['demande', 'reclamation'] as const

/**
 * Ce qu'on lit en base.
 *
 * MESURÉ LE 2026-11-09 SUR LES 37 LIGNES RÉELLES : `subject` n'est rempli
 * NULLE PART (0/37) et `reference` non plus — ces lignes précèdent le lot 8
 * qui a posé les références. Une liste bâtie sur `subject` aurait été vide,
 * et une liste bâtie sur `reference` aurait montré 37 cases blanches.
 *
 * On prend donc le MESSAGE, dont on ne rend qu'un extrait. C'est le sien :
 * le lui cacher ne protège personne. Ce qu'on évite en le coupant, c'est
 * d'envoyer deux cents corps entiers pour afficher une liste.
 */
const VU = 'id,reference,subject,type,etat,created_at,maj_le,message'

/** Cent signes suffisent à reconnaître son propre message dans une liste. */
const EXTRAIT = 100

const REFUS = () => NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params

  const brut = req.headers.get('authorization') ?? ''
  const jeton = brut.startsWith('Bearer ') ? brut.slice(7).trim() : ''
  if (!jeton) return REFUS()

  const lecteur = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jeton}` } } },
  )
  const { data: auth } = await lecteur.auth.getUser()
  const userId = auth?.user?.id
  const courriel = auth?.user?.email
  if (!userId || !courriel) return REFUS()

  const { data: site } = await supabaseAdmin
    .from('sites_public').select('id,slug').eq('slug', slug).maybeSingle()
  if (!site) return REFUS()

  // LE COMPTE DOIT ÊTRE ACTIF. On relit ici plutôt que d'appeler
  // `requireSiteCompte` : cette route a déjà résolu l'identité, et refaire
  // l'appel ferait DEUX interrogations de l'authentification pour une seule
  // question.
  const { data: compte } = await supabaseAdmin
    .from('site_comptes').select('etat')
    .eq('site_id', (site as { id: string }).id)
    .eq('user_id', userId)
    .maybeSingle()
  if ((compte as { etat?: string } | null)?.etat !== 'actif') return REFUS()

  const demande = new URL(req.url).searchParams.get('type')
  const type = TYPES.includes(demande as (typeof TYPES)[number]) ? demande : null

  let q = supabaseAdmin
    .from('messages')
    .select(VU)
    // LE SITE, TOUJOURS. Sans ce filtre, une personne ayant un compte sur un
    // site verrait ses échanges avec tous les autres.
    .eq('site_slug', slug)
    // L'ADRESSE DU JETON, en minuscules des deux côtés : le formulaire de
    // contact enregistre ce qui a été tapé, l'authentification normalise.
    .eq('email', courriel.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(200)

  if (type) q = q.eq('type', type)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // L'EXTRAIT SE COUPE ICI, PAS À L'ÉCRAN. Envoyer deux cents corps entiers
  // pour n'en afficher que cent signes, c'est payer la bande passante de
  // quelqu'un qui est peut-être sur un téléphone, au Tchad.
  const demandes = ((data ?? []) as Record<string, unknown>[]).map((d) => {
    const corps = typeof d.message === 'string' ? d.message.trim() : ''
    // On RECONSTRUIT ce qu'on rend, au lieu de retirer `message` par une
    // variable inutilisée : une liste explicite dit ce qui sort, et le jour
    // où une colonne s'ajoute en base elle ne sort pas par accident.
    return {
      id: d.id,
      reference: d.reference,
      subject: d.subject,
      type: d.type,
      etat: d.etat,
      created_at: d.created_at,
      maj_le: d.maj_le,
      extrait: corps.length > EXTRAIT ? corps.slice(0, EXTRAIT).trimEnd() + '…' : corps,
    }
  })

  return NextResponse.json({ demandes, courriel })
}
