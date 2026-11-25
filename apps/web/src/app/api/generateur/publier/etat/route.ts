import 'server-only'
/**
 * CE QUE « PUBLIER » VA FAIRE, LU AVANT LE CLIC (2026-11-22).
 *
 * GET ?id=<appli> → { action, nom, adresse, nomModifiable, publicationAuto, lecturePublique }
 *   action  — 'publier' | 'payer' | 'fermee' (decisionDePublication) ;
 *   moyens  — ['carte'] / ['mobile_money'] / les deux : ce que la fenêtre propose (2026-11-24) ;
 *   nom     — le nom d'adresse déjà ENREGISTRÉ pour cette appli, ou null :
 *             l'écran ne le redemande pas ;
 *   adresse — l'adresse EN LIGNE, ou null : un nom enregistré sans
 *             publication n'en a pas ;
 *   nomModifiable   — « Changer l'adresse » est permis (nom enregistré,
 *             appli jamais en ligne) ;
 *   publicationAuto — 'echec' si la publication après paiement a échoué dans
 *             l'heure (alerte `stripe_publication_application` notée pour
 *             cette appli) et que l'appli n'est toujours pas en ligne ; sinon null.
 * Lecture seule. Restreinte au propriétaire par la requête.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { adressePubliee } from '@/lib/apps/sous-domaine'
import { decisionEtMoyens, PHRASE_DECISION_ILLISIBLE } from '@/lib/apps/decision-publication'
import { nomModifiable } from '@/lib/apps/nom-enregistre'
import { adresseLibreProposee } from '@/lib/apps/adresse-libre'
import { listesPubliques } from '@/lib/apps/contenu-public'
import { accordCouvre, accordGarde } from '@/lib/apps/accord-stripe'
import { lecturePubliqueDe, nomTable, type EntiteDeclaree } from '@/lib/apps/entites-declarees'
import { TYPE_ALERTE_PUBLICATION } from '@/lib/payments/publier-apres-paiement'

/** Une alerte plus ancienne ne dit plus rien du retour de paiement en cours. */
const FENETRE_ECHEC_MS = 60 * 60 * 1000

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('nom, demande, publication_slug, publication_jeton, publie_le, document, sections_acquises')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) return NextResponse.json({ error: 'generation inconnue' }, { status: 404 })

  const decision = await decisionEtMoyens(id, garde.userId, garde.email)
  if (decision === null) return NextResponse.json({ error: PHRASE_DECISION_ILLISIBLE }, { status: 503 })
  const { action, moyens } = decision
  const l = lu.data as { nom?: string | null; demande?: string | null; publication_slug: string | null; publication_jeton: string | null; publie_le: string | null; document: unknown; sections_acquises: unknown }
  // LES LISTES QUE TOUT LE MONDE POURRA LIRE, en mots simples, et l'accord
  // déjà donné pour CETTE liste : la fenêtre ne la remontre pas pour rien.
  const entites = ((l.document as { entites?: readonly EntiteDeclaree[] } | null)?.entites ?? [])
  const listes = listesPubliques(entites)
  const acceptee = listes.length > 0 && accordCouvre(accordGarde(l.sections_acquises), entites.filter(lecturePubliqueDe).map(nomTable))
  // L'ÉCHEC DE LA PUBLICATION AUTOMATIQUE se lit dans les alertes, là où le
  // webhook l'a dit : le client n'attend pas une publication qui ne viendra pas.
  let publicationAuto: 'echec' | null = null
  if (l.publication_jeton === null) {
    const a = await supabaseAdmin
      .from('checkout_anomalies')
      .select('id')
      .eq('type', TYPE_ALERTE_PUBLICATION)
      .eq('details->>app', id)
      .gte('created_at', new Date(Date.now() - FENETRE_ECHEC_MS).toISOString())
      .limit(1)
      .maybeSingle()
    if (a.error === null && a.data !== null) publicationAuto = 'echec'
  }
  return NextResponse.json(
    {
      action,
      moyens,
      nom: typeof l.publication_slug === 'string' && l.publication_slug !== '' ? l.publication_slug : null,
      // Sans nom enregistré : la première adresse LIBRE tirée du nom (2026-11-24) — jamais une adresse prise.
      adresseProposee: typeof l.publication_slug === 'string' && l.publication_slug !== '' ? null : await adresseLibreProposee(id, l.nom ?? l.demande ?? ''),
      adresse: adressePubliee(l.publication_slug, l.publication_jeton),
      nomModifiable: nomModifiable(l),
      publicationAuto,
      lecturePublique: { listes, acceptee },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
