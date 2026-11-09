import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ============================================================================
// LOT 10 — « QUI ÊTES-VOUS SUR CE SITE ? »
//
// ── CE N'EST PAS `requireSiteOwner`, ET IL NE FAUT PAS LES CONFONDRE.
//
// `requireSiteOwner` protège 46 routes et répond à « ce site est-il à
// vous ? ». Celle-ci répond à « quel rôle avez-vous SUR ce site ? ».
// Confondre les deux donnerait au premier fournisseur venu les droits du
// propriétaire — c'est-à-dire le droit de publier des avis de marché.
//
// ── UN COMPTE NON ACTIF N'EST PAS UN COMPTE.
//
// `en_attente` et `suspendu` sont refusés comme une absence. Un compte en
// attente d'examen qui entrerait quand même rendrait l'examen décoratif.
//
// ── LE REFUS NE DIT PAS POURQUOI.
//
// Session absente, compte inexistant, compte suspendu, mauvais rôle : le
// MÊME 403. Distinguer « vous n'avez pas de compte » de « votre compte est
// suspendu » apprend à un inconnu qu'un compte existe à cette adresse.
// C'est la règle de `fetchPage` et du suivi de demande, appliquée ici.
// ============================================================================

export type RoleSite = 'fournisseur' | 'structure' | 'agent'

export type CompteSite = {
  id: string
  site_id: string
  user_id: string
  email: string
  role: RoleSite
  etat: 'en_attente' | 'actif' | 'suspendu'
  organisation: string | null
  reference: string | null
}

type Resultat =
  | { ok: true; compte: CompteSite; site: { id: string; slug: string } }
  | { ok: false; response: NextResponse }

/** Le MÊME refus pour tous les cas. Il ne dit jamais lequel s'est produit. */
const REFUS = () =>
  NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

/**
 * Vérifie que le porteur du jeton a un compte ACTIF sur ce site, et —
 * si `roles` est fourni — qu'il porte l'un de ces rôles.
 *
 * `roles` vide signifie « n'importe quel rôle actif » : c'est explicite,
 * jamais un défaut qu'on subit.
 */
export async function requireSiteCompte(
  req: Request,
  slug: string,
  roles: readonly RoleSite[] = [],
): Promise<Resultat> {
  const brut = req.headers.get('authorization') ?? ''
  const jeton = brut.startsWith('Bearer ') ? brut.slice(7).trim() : ''
  if (!jeton) return { ok: false, response: REFUS() }

  // On interroge l'authentification avec le jeton DU PORTEUR, jamais avec
  // le rôle de service : c'est elle, et elle seule, qui dit qui il est.
  const lecteur = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jeton}` } } },
  )
  const { data: auth } = await lecteur.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return { ok: false, response: REFUS() }

  // Le site, par son slug public. Un site non publié n'a pas de comptes
  // qui entrent : la vue applique déjà l'invariant.
  const { data: site } = await supabaseAdmin
    .from('sites_public')
    .select('id,slug')
    .eq('slug', slug)
    .maybeSingle()
  if (!site) return { ok: false, response: REFUS() }

  const { data: compte } = await supabaseAdmin
    .from('site_comptes')
    .select('id,site_id,user_id,email,role,etat,organisation,reference')
    .eq('site_id', (site as { id: string }).id)
    .eq('user_id', userId)
    .maybeSingle()

  // UN SEUL REFUS pour quatre causes. L'ordre n'y change rien, et c'est
  // voulu : le temps de réponse ne doit pas les distinguer non plus.
  if (!compte) return { ok: false, response: REFUS() }
  const c = compte as CompteSite
  if (c.etat !== 'actif') return { ok: false, response: REFUS() }
  if (roles.length > 0 && !roles.includes(c.role)) return { ok: false, response: REFUS() }

  return { ok: true, compte: c, site: site as { id: string; slug: string } }
}
