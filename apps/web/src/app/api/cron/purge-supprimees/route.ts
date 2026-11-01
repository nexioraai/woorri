/**
 * LA PURGE — les fichiers partent, la PIERRE TOMBALE reste.
 *
 * ── POURQUOI UNE PURGE, ET POURQUOI PAS UNE SUPPRESSION.
 *
 * Chaque œuvre a coûté un vrai paiement : une suppression par erreur est
 * de l'argent perdu. La suppression est donc DOUCE — l'écran n'en voit
 * plus rien, le lien répond 404 tout de suite — et les fichiers survivent
 * TRENTE JOURS pour qu'une erreur puisse être rattrapée.
 *
 * Passé ce délai, ce cron efface le DOCUMENT (le gros) et laisse la ligne :
 * identifiant, nom publié, date. Cette ligne est une PIERRE TOMBALE, et
 * elle a une raison d'être permanente — elle garde le nom RÉSERVÉ.
 *
 * Libérer un nom publié serait pire qu'un 404 : quelqu'un d'autre le
 * prend, et les anciens liens — partagés par courriel, en signature, sur
 * une carte de visite — résolvent vers l'application d'un INCONNU. Une
 * SUBSTITUTION SILENCIEUSE. Mesuré : ni `publier` ni `sites/adresse` ne
 * filtrent par statut, donc la pierre tombale suffit à tenir la
 * quarantaine, sans table ni mécanisme de plus.
 *
 * Elle ne coûte rien : quelques dizaines d'octets contre un nom qui ne
 * trahira jamais personne.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { JOURS_AVANT_PURGE, STATUT_SUPPRIMEE } from '../../generateur/supprimer/route'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lues = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('id, sections_acquises, document')
    .eq('statut', STATUT_SUPPRIMEE)
  if (lues.error !== null) {
    return NextResponse.json({ error: 'lecture impossible' }, { status: 502 })
  }

  const limite = Date.now() - JOURS_AVANT_PURGE * 24 * 60 * 60 * 1000
  const purgees: string[] = []
  for (const l of lues.data ?? []) {
    if (l.document === null) continue
    const quand = (l.sections_acquises as { supprimeeLe?: string } | null)?.supprimeeLe
    // SANS DATE, ON NE PURGE PAS. Une ligne dont on ignore quand elle a été
    // supprimée est une ligne qu'on ne sait pas dater : l'effacer serait
    // deviner, et ce dépôt ne devine pas sur de l'irréversible.
    if (typeof quand !== 'string' || Number.isNaN(Date.parse(quand))) continue
    if (Date.parse(quand) > limite) continue
    const e = await supabaseAdmin
      .from(TABLE_GENERATIONS)
      .update({ document: null })
      .eq('id', l.id)
      .eq('statut', STATUT_SUPPRIMEE)
    if (e.error === null) purgees.push(String(l.id))
  }

  return NextResponse.json(
    { purgees: purgees.length, joursAvantPurge: JOURS_AVANT_PURGE },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
