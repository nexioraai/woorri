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
// 800 s etait le plafond STANDARD de l'offre Pro. L'arbitrage precedent
// ecartait les 1 800 s parce qu'ils sont en BETA — « on ne batit pas une
// production sur une beta ». CE QUI A CHANGE, et qui rouvre la decision :
//
//   · le chemin a 800 s a ECHOUE QUATRE FOIS le 2026-10-15 sur une vraie
//     demande. Un seul tirage P0 mesure 28 000 jetons a 47 jetons/s, soit
//     ~10 min — et la sonde passe AVANT. Le budget n'y suffit pas ;
//   · la machinerie de secours (pli, reprise, echeance) existe desormais ET
//     est eprouvee a cout nul (EP-230). Si la beta se derobe, on retombe
//     exactement sur le comportement d'avant, pas sur un trou ;
//   · conditions de la beta VERIFIEES sur ce compte, pas supposees : offre
//     Pro, `nodeVersion` 24.x (nodejs24.x est supporte), aucun Secure
//     Compute ni IP statique, et la configuration est POSEE PAR FONCTION —
//     la seule forme que la beta accepte.
//
// La duree etendue ne change toujours AUCUNE architecture : c'est un
// chiffre, et les trois lignes ci-dessous bougent avec lui.
export const maxDuration = 1800

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
      // ouverture d'appel apres 1 700 s, soit 1 800 s moins 100 s. La marge
      // passe de 60 a 100 s parce qu'une tranche plus longue a plus de
      // choses a ecrire quand elle rend la main.
      budgetTrancheMs: 1_700_000,
      // ── LE CHIEN DE GARDE DOIT RESTER AU-DESSUS DU BUDGET.
      //
      // Il valait 600 s. Avec une tranche qui peut desormais travailler
      // 740 s, il aurait reclame une tranche VIVANTE en pleine ecriture — et
      // j'aurais introduit un defaut pire que celui que je corrige. Le
      // battement ne se rafraichit PAS pendant un appel : mesure, 9 minutes
      // de silence sur un seul tirage.
      //
      // ── ET IL BOUGE AVEC LE BUDGET, SINON IL DEVIENT UN VOLEUR.
      //
      // A 900 s, il serait desormais PLUS COURT qu'une tranche (1 700 s) :
      // un travailleur parfaitement vivant, en plein appel, aurait ete
      // declare mort au bout de 15 minutes et sa ligne volee par un autre —
      // qui serait reparti de zero. Exactement la boucle a vide du
      // 2026-10-15, mais fabriquee par nous.
      //
      // 2 000 s laisse 300 s au-dela du budget. L'invariant qui compte, et
      // qu'un cliquet tient maintenant : battement > budget > 0, et
      // budget < maxDuration.
      battementPerimeMs: 2_000_000,
      // Trou comptable n°2 : le cout d'une tranche depossedee part au total
      // de la plateforme — jamais sur la ligne d'un autre travailleur.
      journaliserOrphelin,
    }),
    env: process.env,
  })
  // ── « NOUS AVONS ETE PREVENUS » DEVIENT VRAI (defaut 2026-10-15).
  //
  // L'ecran promettait, sur CHAQUE echec : « Nous avons été prévenus et
  // regardons ce qui s'est passé. » MESURE : `alerter` n'etait appele que
  // depuis les routes du chemin SYNCHRONE. Sur le chemin de l'interface —
  // le seul que le proprietaire utilise — PERSONNE n'etait prevenu, jamais.
  //
  // Mesure a l'appui : le 2026-10-15 a 14:54, une generation est morte sur
  // un refus de l'API (credit epuise). Aucun message n'est parti. Le
  // proprietaire ne l'a su qu'en me le demandant, trois heures plus tard.
  //
  // L'alerte vit ICI, a la frontiere, et non dans le travailleur : celui-ci
  // reste pur et testable sans reseau. Un envoi qui echoue ne fait jamais
  // echouer la tranche — le travail est deja ecrit en base.
  const echecs = r.desarme ? [] : r.rapports.filter((x) => x.issue === 'refusee' || x.issue === 'erreur')
  if (echecs.length > 0) {
    try {
      const { alerter } = await import('@/lib/apps/surveillance')
      await alerter({
        demande: `generation(s) en echec : ${echecs.map((x) => String(x.id ?? '?')).join(', ')}`,
        // `NomPhase` est une union FERMEE, et on ne l'elargit pas pour une
        // alerte : l'etape du moteur se TRADUIT dans son vocabulaire.
        // `p0` comprend la demande ; tout le reste ecrit l'application.
        traces: echecs.map((x) => ({
          phase: (x.etape === 'p0' ? 'comprehension' : 'emission') as 'comprehension' | 'emission',
          ms: 0,
          ok: false,
          ...(x.detail === undefined ? {} : { detail: x.detail }),
        })),
        // Le code est lui aussi une union FERMEE : `echec` est le seul qui
        // dise la verite ici. L'issue precise voyage dans le message, que
        // l'alerte affiche en entier.
        anomalies: echecs.map((x) => ({
          phase: (x.etape === 'p0' ? 'comprehension' : 'emission') as 'comprehension' | 'emission',
          code: 'echec' as const,
          message: `${x.issue} · ${String(x.id ?? '?')} — ${x.detail ?? 'sans detail'}`,
        })),
        msTotal: 0,
        saine: false,
      })
    } catch {
      // Prevenir est un CONFORT, jamais une condition : une alerte qui
      // echoue ne doit pas faire croire au cron que la tranche a rate.
    }
  }
  return NextResponse.json(
    r.desarme
      ? { desarme: true, note: 'GO_EMISSION_IA non arme : aucune tranche, aucune depense.' }
      : { desarme: false, rapports: r.rapports },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
