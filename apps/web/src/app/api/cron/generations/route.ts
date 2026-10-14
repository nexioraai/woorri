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
// ── 800 s, ET C'EST L'ARBITRAGE QUE CE FICHIER ANNONÇAIT (2026-10-14).
//
// La réserve d'infra ci-dessus le disait : « arbitrage (durée étendue /
// travailleur hébergé) AU MOMENT DE VOULOIR UN VRAI LIVRÉ DEPUIS
// L'INTERFACE ». Ce moment est arrivé, et la mesure l'a tranché.
//
// MESURE, sur une vraie demande du propriétaire (cahier Conterak, 24 000
// caractères) : un seul tirage P0 produit 27 000 jetons et dure ~8 minutes.
// Le budget de tranche valait 4 minutes. Le moteur suspendait donc ENTRE
// deux tirages — proprement, sans rien perdre — et redemandait le feu vert.
// Chaque « Continuer » relançait une tranche de 4 minutes, un tirage, une
// suspension. Deux tours, 1,72 $, ZÉRO section écrite.
//
// Ce n'était ni un défaut du moteur ni une demande trop grosse : la tranche
// était plus courte que le travail qu'elle devait porter.
//
// 800 s est le plafond STANDARD de l'offre Pro (1 800 s existe, en bêta —
// on ne bâtit pas une production sur une bêta). La durée étendue l'emporte
// sur le travailleur hébergé parce qu'elle ne change AUCUNE architecture :
// le pli, les reprises et la reprise par cron restent identiques.
export const maxDuration = 800

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
      // ouverture d'appel apres 740 s, soit 800 s moins la MEME marge de 60 s
      // qu'avant. Un tirage P0 mesure a ~480 s y tient largement.
      budgetTrancheMs: 740_000,
      // ── LE CHIEN DE GARDE DOIT RESTER AU-DESSUS DU BUDGET.
      //
      // Il valait 600 s. Avec une tranche qui peut desormais travailler
      // 740 s, il aurait reclame une tranche VIVANTE en pleine ecriture — et
      // j'aurais introduit un defaut pire que celui que je corrige. Le
      // battement ne se rafraichit PAS pendant un appel : mesure, 9 minutes
      // de silence sur un seul tirage.
      //
      // 900 s laisse 160 s au-dela du budget : de quoi encaisser un appel
      // long sans jamais accuser a tort un travailleur qui travaille.
      battementPerimeMs: 900_000,
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
