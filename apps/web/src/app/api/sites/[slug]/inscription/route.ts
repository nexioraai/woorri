import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ouvreDesComptes } from '@/app/sites/[slug]/acces/ouvreDesComptes'
import { journaliser } from '@/lib/audit/journaliser'

// ============================================================================
// LOT 17 — L'INSCRIPTION DIRECTE, EN UN SEUL GESTE.
//
// Décision du propriétaire, 2026-11-10 : « la création de compte ne devrait
// pas être compliquée […] ça ne devrait pas être confirmé par la CPA. Quand
// un utilisateur crée un compte, ça doit juste être visible sur le tableau
// de bord de la CPA. »
//
// ── AVANT : trois étapes et deux attentes. Créer un accès, OUVRIR UN
// COURRIEL qui n'arrivait pas (mesuré le 2026-11-10 : le service d'envoi
// par défaut de l'authentification ne distribue pas aux adresses
// extérieures), puis demander un rattachement que la Centrale devait
// examiner.
//
// ── MAINTENANT : un formulaire. Nom, organisation, type, téléphone,
// adresse, mot de passe. L'accès est créé CONFIRMÉ, le compte de site naît
// ACTIF (défaut de la colonne depuis `site_comptes_inscription_directe.sql`),
// et la personne est connectée dans la foulée. La Centrale VOIT le compte
// sur son tableau de bord et garde la main : elle peut le suspendre.
//
// ── CE QUE LA CONFIRMATION PAR COURRIEL PROTÉGEAIT, ET QU'ON ACCEPTE DE
// PERDRE : la preuve que l'adresse appartient à celui qui s'inscrit. C'est
// la décision du propriétaire ; elle est consignée au PLAN §17.
//
// ── UNE ADRESSE DÉJÀ CONNUE N'EST JAMAIS REPRISE. On répond « connectez-
// vous », on ne change ni son mot de passe ni rien d'autre. Reprendre un
// accès existant — même jamais confirmé — donnerait à n'importe qui le
// moyen de s'installer dans l'accès d'un autre.
//
// ── LE PIÈGE À ROBOTS. Un champ invisible (`site_web`) qu'un humain ne
// remplit jamais : rempli, la réponse est un succès apparent et rien n'est
// créé. Ce n'est pas un plafond ; c'est le minimum contre le remplissage
// automatique, et le tableau de bord permet de suspendre le reste.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }

export const ROLES_INSCRIPTION = ['fournisseur', 'structure'] as const
const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const TELEPHONE = /^[+0-9 ().-]{6,30}$/

const NON = (error: string, status = 400) => NextResponse.json({ error }, { status })
const texte = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params

  const { data: s } = await supabaseAdmin
    .from('sites_public').select('id').eq('slug', slug).maybeSingle()
  const site = s as { id: string } | null
  // LA CAPACITÉ SE LIT ICI, PAS SEULEMENT À L'ÉCRAN : un site qui n'ouvre
  // pas de comptes refuse, même appelé à la main.
  if (!site || !(await ouvreDesComptes(site.id))) return NON('Inscription indisponible.', 404)

  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return NON('Envoi illisible.') }

  if (texte(corps.site_web)) return NextResponse.json({ ok: true }, { status: 201 })

  const nom = texte(corps.nom)
  const organisation = texte(corps.organisation)
  const role = texte(corps.role)
  const telephone = texte(corps.telephone)
  const email = texte(corps.email).toLowerCase()
  const motDePasse = typeof corps.motDePasse === 'string' ? corps.motDePasse : ''

  if (nom.length < 2 || nom.length > 120) return NON('Indiquez votre nom complet.')
  if (organisation.length < 2 || organisation.length > 300) return NON('Indiquez l’organisation que vous représentez.')
  if (!(ROLES_INSCRIPTION as readonly string[]).includes(role)) return NON('Choisissez « fournisseur » ou « structure sanitaire ».')
  if (!TELEPHONE.test(telephone)) return NON('Indiquez un numéro de téléphone valable.')
  if (!COURRIEL.test(email)) return NON('Indiquez une adresse électronique valable.')
  if (motDePasse.length < 8 || motDePasse.length > 72) return NON('Le mot de passe doit faire au moins huit caractères.')

  // 1. L'ACCÈS — créé confirmé : aucun courriel à attendre.
  const { data: cree, error: eAcces } = await supabaseAdmin.auth.admin.createUser({
    email, password: motDePasse, email_confirm: true, user_metadata: { nom },
  })
  const userId = cree?.user?.id
  if (eAcces || !userId) {
    const { data: existant } = await supabaseAdmin.rpc('identifiant_par_courriel', { courriel: email })
    if (typeof existant === 'string' && existant) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cette adresse. Connectez-vous.', code: 'deja' }, { status: 409 })
    }
    console.error('[inscription] création de l’accès refusée', eAcces?.message)
    return NON('Création impossible pour le moment. Réessayez plus tard.', 500)
  }

  // 2. LE COMPTE DE SITE — colonnes nommées ; `etat` n'est pas envoyé, la
  // base le pose (défaut `actif`).
  const { error: eCompte } = await supabaseAdmin.from('site_comptes').insert({
    site_id: site.id, user_id: userId, email, role, organisation, nom, telephone,
  })
  if (eCompte && eCompte.code !== '23505') {
    // L'accès vient d'être créé pour CE compte : on ne laisse pas un accès
    // orphelin qui bloquerait la prochaine tentative avec « déjà connu ».
    await supabaseAdmin.auth.admin.deleteUser(userId)
    console.error('[inscription] compte de site refusé', eCompte.message)
    return NON('Création impossible pour le moment. Réessayez plus tard.', 500)
  }

  await journaliser({ siteId: site.id, acteur: email, action: 'compte.inscrire', cible: email, details: { role, organisation } })
  return NextResponse.json({ ok: true }, { status: 201 })
}
