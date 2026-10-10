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
const moteurParTranche: MoteurContinuation = {
  poursuivreEmission: async (o) => {
    const { creerMoteur } = (await import(join(RACINE, 'benchmarks/air-emission/moteur.mjs'))) as {
      creerMoteur: (x: { cleApi: string }) => Promise<{
        poursuivreEmission: MoteurContinuation['poursuivreEmission']
      }>
    }
    const m = await creerMoteur({ cleApi: process.env.ANTHROPIC_API_KEY ?? '' })
    return m.poursuivreEmission(o)
  },
}

const travailleur = creerTravailleur({
  table: TABLE_GENERATIONS,
  production: true,
  base: base as unknown as BaseGeneration,
  moteur: moteurParTranche,
  // Le dimensionnement PROUVE au feu en local : un tour entier par tranche,
  // l'appel ecrans long passe — c'est toute la raison d'etre de ce service.
  budgetTrancheMs: 3_600_000,
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
    `armement=${process.env.GO_EMISSION_IA === '1' ? 'ARME' : 'DESARME (zero appel possible)'}`,
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
