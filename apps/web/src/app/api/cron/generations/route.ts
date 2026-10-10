/**
 * ETAGE 4 — LE CRON PORTEUR. Une tranche par minute : saisir une ligne
 * (CAS + jeton de cloture), travailler dans le budget, consigner, lacher.
 * Supprimez tout le reste : ce cron suffit a terminer — c'est la condition
 * posee par le proprietaire a l'etage 3.
 *
 * ── LA GARANTIE DE DEPENSE, AVANT TOUT LE RESTE.
 * GO_EMISSION_IA est verifie EN PREMIER (service, prouve par comptage
 * d'appels) : desarme — l'etat LIVRE — cette route rend `desarme` sans
 * toucher ni la base ni le moteur. Meme deployee et cadencee, elle ne PEUT
 * pas depenser tant que le proprietaire n'arme pas.
 *
 * ── CE FICHIER EST LE SECOND DES DEUX SEULS AUTORISES a l'option de
 * production (cliquet d'isolation, liste fermee).
 *
 * ── RESERVE D'INFRA, CONSIGNEE (cadrage du 2026-10-10) : maxDuration 300 s
 * est plus court qu'un appel ecrans streame long (10-20 min). Le pli et les
 * reprises encaissent les coupures SANS perte (prouve au feu), mais la
 * convergence d'appels tres longs en serverless pur reste A MESURER —
 * arbitrage (duree etendue / travailleur heberge) au moment de vouloir un
 * vrai livree depuis l'interface.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { creerTravailleur, type BaseGeneration } from '@/lib/apps/travailleur'
import { TABLE_GENERATIONS, journaliserOrphelin } from '@/lib/apps/journal'
import { poursuivreEmissionDuSite } from '@/lib/apps/moteur'
import { tournerUneTranche } from '@/lib/apps/service-generations'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: Request) {
  // Fail-closed, comme tout le lot crons : secret absent = refus.
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const r = await tournerUneTranche({
    travailleur: creerTravailleur({
      table: TABLE_GENERATIONS,
      production: true,
      base: supabaseAdmin as unknown as BaseGeneration,
      moteur: { poursuivreEmission: poursuivreEmissionDuSite },
      // Appariement budget <= maxDuration - marge : aucune NOUVELLE
      // ouverture d'appel apres 240 s. (Reserve d'infra ci-dessus.)
      budgetTrancheMs: 240_000,
      battementPerimeMs: 600_000,
      // Trou comptable n°2 : le cout d'une tranche depossedee part au total
      // de la plateforme — jamais sur la ligne d'un autre travailleur.
      journaliserOrphelin,
    }),
    env: process.env,
  })
  return NextResponse.json(
    r.desarme
      ? { desarme: true, note: 'GO_EMISSION_IA non arme : aucune tranche, aucune depense.' }
      : { desarme: false, rapports: r.rapports },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
