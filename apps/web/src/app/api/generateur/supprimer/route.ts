/**
 * SUPPRIMER UNE APPLICATION — doucement, et sans recycler son nom.
 *
 * ── CE QUE CETTE ROUTE RÉSOUT, ET QUI A ÉTÉ VÉCU.
 *
 * Le propriétaire a dû VIDER LE STOCKAGE DE SON NAVIGATEUR à la main pour
 * se débarrasser d'une ligne morte. Une application qu'on ne peut pas
 * supprimer est une application qui s'accumule.
 *
 * ── QUATRE DÉCISIONS, ET CHACUNE VIENT D'UN RISQUE NOMMÉ.
 *
 * ① UN NOM PUBLIÉ NE SE RECYCLE PAS (A1, 2026-11-01). Libérer
 *   `publication_slug` rendrait `nom.deribfy.app` disponible : quelqu'un
 *   d'autre le prend, et les anciens liens — partagés par courriel, en
 *   signature, sur une carte de visite — résolvent vers l'application d'un
 *   INCONNU. Ce n'est pas un 404, c'est une SUBSTITUTION SILENCIEUSE, et
 *   c'est pire. La ligne survit donc en PIERRE TOMBALE : son slug reste
 *   posé, et les contrôles d'unicité le voient (mesuré : ni `publier` ni
 *   `sites/adresse` ne filtrent par statut).
 *
 * ② LA SUPPRESSION EFFACE DE L'ARGENT (A2). Chaque œuvre a coûté un vrai
 *   paiement. La suppression est donc DOUCE : l'écran n'en voit plus rien
 *   et le lien répond 404 IMMÉDIATEMENT, mais les fichiers survivent
 *   TRENTE JOURS. Pourquoi trente : c'est le délai au bout duquel une
 *   suppression par erreur a forcément été remarquée — on garde assez
 *   longtemps pour rattraper, assez peu pour ne pas stocker indéfiniment
 *   ce que personne ne réclame. Passé ce délai, seuls l'identifiant et le
 *   nom restent : la pierre tombale ne pèse rien et protège pour toujours.
 *
 * ③ UNE GÉNÉRATION EN VOL NE SE SUPPRIME PAS SANS S'ARRÊTER. Un
 *   travailleur qui écrit dans une ligne effacée est un défaut silencieux
 *   garanti. MESURÉ : le travailleur saisit par compare-and-set
 *   (`UPDATE … WHERE id = X AND statut = 'en_attente'`) — passer le statut
 *   à `annulee` suffit donc à le neutraliser, et c'est ce que fait
 *   `confirmerArret`. Sans ce drapeau, la route REFUSE et le dit.
 *
 * ④ ÉCHOUER SANS EFFACER. Si le DNS refuse de retirer l'adresse, on
 *   n'efface RIEN : un nom resté pointé sur du vide, sans propriétaire
 *   connu, serait pire que l'échec.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { retirerSousDomaine } from '@/lib/apps/sous-domaine'

export const runtime = 'nodejs'

/** Le statut d'une œuvre supprimée — invisible à l'écran, encore en base. */
export const STATUT_SUPPRIMEE = 'supprimee'
/** Combien de jours les fichiers survivent avant la purge. Voir ② ci-dessus. */
export const JOURS_AVANT_PURGE = 30

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => ({}))) as {
    id?: unknown
    confirmerArret?: unknown
  }
  const id = typeof corps.id === 'string' ? corps.id : ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  // ── LA PROPRIÉTÉ SE FILTRE DANS LA REQUÊTE MÊME (dette 6a : owner_id,
  // jamais le courriel — lire d'abord puis comparer laisserait une fenêtre
  // où l'on détient déjà la donnée d'autrui).
  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('id, statut, publication_slug, sections_acquises')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) {
    return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  }
  if (lu.data.statut === STATUT_SUPPRIMEE) {
    // Supprimer deux fois ne doit pas être une erreur : l'état voulu est
    // déjà atteint, on le dit sans rien refaire.
    return NextResponse.json({ ok: true, deja: true }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (lu.data.statut === 'en_attente' && corps.confirmerArret !== true) {
    return NextResponse.json(
      {
        error:
          'Cette génération travaille encore. Arrêtez-la d’abord : la supprimer ' +
          'maintenant laisserait un travailleur écrire dans une ligne effacée.',
        doitArreter: true,
      },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  if (lu.data.statut === 'en_attente') {
    // Le compare-and-set du travailleur exige `en_attente` : en sortir
    // SUFFIT à le neutraliser, sans course ni verrou supplémentaire.
    const arret = await supabaseAdmin
      .from(TABLE_GENERATIONS)
      .update({ statut: 'annulee', jeton_travailleur: null })
      .eq('id', id)
      .eq('statut', 'en_attente')
    if (arret.error !== null) {
      return NextResponse.json({ error: 'l’arrêt a échoué — rien n’a été supprimé' }, { status: 502 })
    }
  }

  // ── ④ L'ADRESSE D'ABORD, ET SON ÉCHEC ARRÊTE TOUT.
  const slug = lu.data.publication_slug
  if (typeof slug === 'string' && slug !== '') {
    const clefs = {
      cloudflareToken: process.env.CLOUDFLARE_API_TOKEN ?? '',
      vercelToken: process.env.VERCEL_API_TOKEN ?? '',
      vercelProjectId: process.env.VERCEL_PROJECT_ID ?? '',
    }
    if (Object.values(clefs).some((v) => v === '')) {
      return NextResponse.json(
        { error: 'clés de sous-domaine absentes du serveur — rien n’a été supprimé' },
        { status: 500 },
      )
    }
    const r = await retirerSousDomaine(slug, clefs)
    if (!r.ok) {
      return NextResponse.json(
        { error: `${r.erreur} — rien n’a été supprimé, réessayez` },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }

  // ── LE LIEN CESSE DE RÉPONDRE TOUT DE SUITE : /p/[jeton] et /a/[sous]
  // exigent tous deux un jeton non nul (mesuré). Le SLUG, lui, RESTE —
  // c'est la quarantaine du nom.
  const efface = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .update({
      statut: STATUT_SUPPRIMEE,
      publication_jeton: null,
      publie_le: null,
      sections_acquises: {
        ...((lu.data.sections_acquises as Record<string, unknown> | null) ?? {}),
        supprimeeLe: new Date().toISOString(),
      },
    })
    .eq('id', id)
    .eq('owner_id', garde.userId)
  if (efface.error !== null) {
    return NextResponse.json({ error: 'la suppression a échoué — rien n’a changé' }, { status: 502 })
  }

  return NextResponse.json(
    { ok: true, nomEnQuarantaine: slug ?? null, joursAvantPurge: JOURS_AVANT_PURGE },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
