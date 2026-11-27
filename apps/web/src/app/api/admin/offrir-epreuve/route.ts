/**
 * « OFFRIR (ÉPREUVE) » — fondateur seul (2026-11-27, option O2).
 *
 * POST { appId } : l'appli devient publiable SANS paiement, pour éprouver le
 * générateur en production sans déclencher Stripe à chaque vérification.
 *
 * ── CE QUE ÇA N'EST PAS : une vente. La ligne écrite au registre porte
 *    fournisseur `offert`, montant 0, référence `epreuve-<id>` et le nom du
 *    fondateur dans `saisi_par` — jamais espèces, Airtel ou Moov, jamais un
 *    montant reçu. C'est pourquoi ce geste N'EST PAS dans `paiements-manuels`.
 *
 * ── CE QUI NE CHANGE PAS (décision A1, 2026-11-24). Aucun compte n'est
 *    exempté de la publication : seule l'appli marquée ici l'est. Une appli
 *    non marquée passe par la fenêtre Carte / Mobile money, pour le fondateur
 *    aussi. Le prix affiché et le chemin Stripe ne sont pas touchés.
 *
 * ── DÉCIDÉ PAR LE SERVEUR. L'administrateur est l'adresse du jeton vérifié
 *    (`estAdmin`), jamais un champ du corps ; le propriétaire de l'appli est
 *    lu en base, jamais reçu.
 *
 * Une seule fois par appli (la référence est unique au registre). Une appli
 * déjà payée et en cours n'a rien à recevoir : refus, rien n'est écrit.
 */
import { NextResponse } from 'next/server'
import { estAdmin } from '@/lib/admin-emails'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'

export const runtime = 'nodejs'

/** La référence d'une épreuve : reconnaissable partout où le registre se lit. */
export const referenceEpreuve = (appId: string): string => `epreuve-${appId}`

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  if (!estAdmin(garde.email)) return NextResponse.json({ error: 'Réservé au fondateur.' }, { status: 403 })

  const corps = (await req.json().catch(() => ({}))) as { appId?: unknown }
  const appId = typeof corps.appId === 'string' ? corps.appId : ''
  if (!/^[0-9a-f-]{36}$/u.test(appId)) return NextResponse.json({ error: 'appId requis' }, { status: 400 })

  const app = await supabaseAdmin.from(TABLE_GENERATIONS).select('id, owner_id, statut').eq('id', appId).maybeSingle()
  if (app.error !== null || app.data === null) return NextResponse.json({ error: 'Application introuvable.' }, { status: 404 })
  const { owner_id: proprietaire, statut } = app.data as { owner_id: string | null; statut: string }
  if (proprietaire === null) return NextResponse.json({ error: 'Application sans propriétaire.' }, { status: 409 })
  if (statut !== 'livree') return NextResponse.json({ error: 'Seule une application livrée peut être offerte.' }, { status: 409 })

  const c = await supabaseAdmin.from('app_compteurs').select('statut, paye_jusqu_au').eq('app_id', appId).maybeSingle()
  if (c.error !== null) return NextResponse.json({ error: 'Le compteur ne répond pas : rien n’a été écrit.' }, { status: 503 })
  const compteur = c.data as { statut: string; paye_jusqu_au: string | null } | null
  if (compteur?.statut === 'abonnee' && compteur.paye_jusqu_au !== null && Date.parse(compteur.paye_jusqu_au) > Date.now()) {
    return NextResponse.json({ error: 'Cette application est déjà payée et en cours : rien à offrir.' }, { status: 409 })
  }

  const r = await supabaseAdmin.rpc('enregistrer_paiement', {
    p_source: 'manuelle', p_fournisseur: 'offert', p_reference: referenceEpreuve(appId),
    p_app: appId, p_owner: proprietaire, p_objet: 'abonnement',
    p_montant: 0, p_devise: 'USD', p_jusqu_au: null, p_saisi_par: garde.email,
  })
  if (r.error !== null) return NextResponse.json({ error: 'L’offre n’a pas été enregistrée.', motif: r.error.message }, { status: 500 })
  const d = r.data as { statut: string; jusqu_au: string | null }
  if (d.statut === 'deja_enregistre') {
    return NextResponse.json({ error: 'Cette application a déjà été offerte une fois pour épreuve : rien n’a été écrit.', dejaOfferte: true }, { status: 409 })
  }
  return NextResponse.json({ ok: true, jusquAu: d.jusqu_au }, { headers: { 'Cache-Control': 'no-store' } })
}
