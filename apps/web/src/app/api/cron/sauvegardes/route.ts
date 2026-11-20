import 'server-only'
/**
 * LE DÉCLENCHEUR DES SAUVEGARDES DE NUIT — Vercel, à la minute (2026-11-19).
 *
 * ── POURQUOI PAS LA PLANIFICATION DE GITHUB.
 *
 * Mesuré : la tâche planifiée à 03:17 UTC dans `nexioraai/deribfy-sauvegardes`
 * est partie à 11:42 le 18 novembre (8 h 25 de retard), et le 19 elle n'était
 * toujours pas partie à 06:31. Les tâches planifiées de Vercel, elles, partent
 * à la minute exacte (66 départs relevés sur 7 jours dans `cron_runs`). « Huit
 * heures de retard, ce n'est pas une sauvegarde de nuit » — le propriétaire.
 *
 * ── CE QUE FAIT CETTE ROUTE, ET RIEN D'AUTRE.
 *
 * Elle demande à GitHub de lancer les deux passages (`workflow_dispatch`) :
 * nexiora-ai et la base des applis. La sauvegarde elle-même — instantané,
 * restauration d'essai, comparaison, chiffrement, envoi — reste dans le dépôt
 * privé, inchangée. Le jeton ne sait que LANCER ces tâches : il ne lit aucune
 * donnée et n'a aucun droit sur le code (droits posés par le propriétaire).
 *
 * Son passage s'inscrit dans `cron_runs` : l'heure réelle de chaque départ se
 * relit, et le chien de garde alerte si une nuit manque.
 */
import { NextResponse } from 'next/server'
import { startCronRun, finishCronRun } from '@/lib/cron-tracker'

export const runtime = 'nodejs'

const DEPOT = 'nexioraai/deribfy-sauvegardes'
export const PASSAGES = ['sauvegarde-nexiora.yml', 'sauvegarde-oeuvres.yml'] as const

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const runId = await startCronRun('sauvegardes')
  const jeton = (process.env.GITHUB_SAUVEGARDES_TOKEN ?? '').trim()
  if (jeton === '') {
    await finishCronRun(runId, { itemsProcessed: 0, status: 'error', errorMessage: 'GITHUB_SAUVEGARDES_TOKEN absente' })
    return NextResponse.json({ error: 'GITHUB_SAUVEGARDES_TOKEN absente' }, { status: 503 })
  }

  const resultats: { passage: string; code: number }[] = []
  for (const passage of PASSAGES) {
    let code = 0
    try {
      const r = await fetch(`https://api.github.com/repos/${DEPOT}/actions/workflows/${passage}/dispatches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jeton}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main', inputs: { controle_negatif: 'non' } }),
      })
      code = r.status
    } catch {
      code = 0
    }
    resultats.push({ passage, code })
  }

  // GitHub répond 204 à un lancement accepté. Tout autre code est un échec,
  // et le journal le dit par son NUMÉRO — jamais le jeton, jamais une réponse.
  const lances = resultats.filter((r) => r.code === 204).length
  const echecs = resultats.filter((r) => r.code !== 204)
  await finishCronRun(runId, {
    itemsProcessed: lances,
    status: echecs.length === 0 ? 'success' : 'error',
    errorMessage: echecs.length === 0 ? undefined : echecs.map((r) => `${r.passage} → ${r.code === 0 ? 'réseau' : r.code}`).join(' ; '),
  })
  return NextResponse.json(
    { lances, resultats },
    { status: echecs.length === 0 ? 200 : 502, headers: { 'Cache-Control': 'no-store' } },
  )
}
