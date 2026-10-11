/**
 * LE TRAVAILLEUR HEBERGE — le porteur du moteur HORS serverless.
 *
 * POURQUOI IL EXISTE (arbitrage proprietaire, 2026-10-10) : l'appel ecrans
 * est un appel UNIQUE de 15-30 min ; aucune duree serverless ne le porte
 * (300-800 s, beta 1800 s trop juste), et les tranches courtes relanceraient
 * la boucle payante mesuree. Ce service est LE mode deja prouve au feu :
 * celui des harnais locaux (tranches 3600 s, appels longs aboutis).
 *
 * CE FICHIER NE FAIT QUE COUDRE — zero reecriture :
 *   creerTravailleur (CAS + fencing + pli)  ·  tournerUneTranche (la serrure
 *   GO_EMISSION_IA, prouvee par comptage)  ·  TABLE_GENERATIONS (jamais de
 *   nom nu)  ·  creerMoteur (benchmarks, streaming + 128k + 45 min/0 retry).
 * La cohabitation avec le cron Vercel est sure PAR CONSTRUCTION : la saisie
 * est un UPDATE conditionnel atomique, chaque ecriture porte le jeton de
 * cloture — V1/V2 de la batterie jumelle le prouvent contre la vraie base.
 *
 * GARANTIE DE DEPENSE : GO_EMISSION_IA absent (livraison) = desarme — la
 * ronde rend `desarme` SANS toucher ni la base ni le moteur. Et tant que ce
 * service n'est PAS deploye, il n'est que du texte dans le depot : 0 $.
 *
 * SEUL fichier de ce dossier autorise a `production: true` (cliquet, liste
 * fermee a 4 emplacements, balayage recursif de `services/` compris).
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import {
  creerTravailleur,
  type BaseGeneration,
  type MoteurContinuation,
} from '../../apps/web/src/lib/apps/travailleur.ts'
import { TABLE_GENERATIONS, journaliserOrphelin } from '../../apps/web/src/lib/apps/journal.ts'
import { tournerUneTranche } from '../../apps/web/src/lib/apps/service-generations.ts'
import {
  executerRondes,
  plafondDeLaTranche,
  plafondParLigne,
  prochaineAttenteMs,
  secretsManquants,
} from '../../apps/web/src/lib/apps/ronde-generation.ts'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const manquants = secretsManquants(process.env)
if (manquants.length > 0) {
  console.error(`REFUS DE DEMARRER — secret(s) manquant(s), nomme(s) : ${manquants.join(', ')}`)
  process.exit(1)
}

const base = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
)

// UN moteur par tranche, comme partout : un processus de tranche est neuf,
// l'etat ne survit QUE par la table.
const PLAFOND_LIGNE = plafondParLigne(process.env)

const moteurParTranche: MoteurContinuation = {
  poursuivreEmission: async (o) => {
    const { creerMoteur } = (await import(join(RACINE, 'benchmarks/air-emission/moteur.mjs'))) as {
      creerMoteur: (x: { cleApi: string; plafondUsd?: number }) => Promise<{
        poursuivreEmission: MoteurContinuation['poursuivreEmission']
      }>
    }
    // LE FREIN DE COUT : ce qui RESTE a la ligne, pas un plafond par
    // tranche — `etatDepense` est par processus et le runner cree un moteur
    // neuf a chaque tranche. Les deux gardes du coeur scelle font le reste :
    // refus AVANT l'appel qui franchirait, recompte APRES.
    const plafondUsd = plafondDeLaTranche(PLAFOND_LIGNE, o.etat)
    const m = await creerMoteur({ cleApi: process.env.ANTHROPIC_API_KEY ?? '', plafondUsd })
    return m.poursuivreEmission(o)
  },
}

const travailleur = creerTravailleur({
  table: TABLE_GENERATIONS,
  production: true,
  base: base as unknown as BaseGeneration,
  moteur: moteurParTranche,
  // ── CINQ MINUTES, ET NON PLUS UNE HEURE. Corrige le 2026-10-11.
  //
  // CE QUI NE MARCHAIT PAS. Le mode plan et le pas-a-pas reposent sur la
  // SUSPENSION du moteur, et le moteur ne suspend que quand ce budget est
  // epuise. Avec une heure, et une generation mesuree a 53 minutes, il ne
  // suspendait JAMAIS : la ligne allait jusqu'au bout sans jamais demander
  // son accord au proprietaire. Les deux fonctions etaient inertes.
  //
  // POURQUOI PAS UN BUDGET MINUSCULE. Les deux controles de budget sont
  // places AVANT le travail (`if (budgetEpuise()) return suspendre("p0")`,
  // et la sentinelle de `callPartBudgete`). Un budget trop court ferait
  // suspendre sans rien produire. Le chronometre repartant a chaque
  // tranche, la PREMIERE unite de travail passe toujours — donc aucun
  // blocage possible — mais une valeur ridicule donnerait une trentaine
  // d'arrets pour une seule generation.
  //
  // D'OU CINQ MINUTES. Ancrage mesure : une generation complete a pris 53
  // minutes pour une trentaine d'appels, soit ~1,8 min par appel. Cinq
  // minutes laissent donc passer deux a trois etapes avant de rendre la
  // main — une dizaine de validations sur une generation, au lieu de
  // trente. Et surtout la PREMIERE tombe apres P0, avant le gros de la
  // depense : c'est elle qui compte.
  //
  // C'EST UN REGLAGE, PAS UNE LOI. Un seul chiffre : l'augmenter rend la
  // main moins souvent, le baisser plus souvent.
  budgetTrancheMs: 300_000,
  battementPerimeMs: 1_800_000,
  // Trou comptable n°2 : cout d'une tranche depossedee → total plateforme.
  journaliserOrphelin,
})

let vivant = true
process.on('SIGTERM', () => {
  console.log('SIGTERM — arret propre entre deux tranches.')
  vivant = false
})
process.on('SIGINT', () => {
  vivant = false
})

console.log(
  `travailleur heberge pret · table=${TABLE_GENERATIONS} · ` +
    `armement=${process.env.GO_EMISSION_IA === '1' ? 'ARME' : 'DESARME (zero appel possible)'} · ` +
    `plafond par ligne=${Number.isFinite(PLAFOND_LIGNE) ? `${String(PLAFOND_LIGNE)} $` : 'AUCUN (PLAFOND_USD_PAR_LIGNE absent)'}`,
)

await executerRondes({
  tranche: async () => {
    const r = await tournerUneTranche({ travailleur, env: process.env })
    if (!r.desarme && r.rapports[0] !== undefined && r.rapports[0].issue !== 'rien') {
      console.log(
        `tranche · ${r.rapports[0].issue} · ${String(r.rapports[0].id ?? '').slice(0, 8)} · ` +
          `attente ${String(prochaineAttenteMs(r))} ms`,
      )
    }
    return r
  },
  dormir: (ms) => new Promise((r) => setTimeout(r, ms)),
  continuer: () => vivant,
})
console.log('runner arrete proprement.')
