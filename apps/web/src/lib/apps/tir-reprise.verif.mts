/**
 * LA REPRISE D'UNE LIGNE RESSUSCITEE — pas de depot : le travailleur saisit
 * la ligne `en_attente` existante et CONTINUE depuis son etat.
 *
 * Surveillance explicite : si une tranche affiche l'etape `p0`, la
 * continuation a echoue et on REPAIERAIT un etat deja paye — le harnais
 * s'arrete immediatement et le dit.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { creerTravailleur, type MoteurContinuation } from './travailleur.ts'

const ICI = dirname(fileURLToPath(import.meta.url))
const RACINE = join(ICI, '..', '..', '..', '..', '..')
const JUMELLE = 'app_generations_test'
const JOURNAL = '/tmp/tir-reprise.txt'
const ID = process.env.REPRISE_ID ?? ''
if (ID === '') throw new Error('REPRISE_ID requis')

const env: Record<string, string> = {}
for (const l of readFileSync(join(RACINE, 'apps/web/.env.local'), 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=("?)(.*)\2$/.exec(l.trim())
  if (m) env[m[1]] = m[3]
}
const base = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
writeFileSync(JOURNAL, '')
const dire = (t: string): void => { console.log(t); writeFileSync(JOURNAL, t + '\n', { flag: 'a' }) }

const { creerMoteur } = (await import(join(RACINE, 'benchmarks/air-emission/moteur.mjs'))) as {
  creerMoteur: (o: { cleApi: string }) => Promise<{ poursuivreEmission: MoteurContinuation['poursuivreEmission'] }>
}
const moteurParTranche: MoteurContinuation = {
  poursuivreEmission: async (o) => {
    const m = await creerMoteur({ cleApi: env.ANTHROPIC_API_KEY })
    return m.poursuivreEmission(o)
  },
}
const w = creerTravailleur({
  table: JUMELLE, base, moteur: moteurParTranche,
  budgetTrancheMs: 120_000, battementPerimeMs: 600_000,
})

dire(`reprise de ${ID.slice(0, 8)} — aucune nouvelle ligne déposée`)
const depart = Date.now()
for (let tick = 1; tick <= 25; tick++) {
  const r = (await w.tourner())[0]
  const ligne = (await base.from(JUMELLE).select('*').eq('id', ID).single()).data as Record<string, unknown>
  const etape = String(r.etape ?? ligne.etape ?? '—')
  dire(
    `tranche ${String(tick).padStart(2)} · ${String(Math.round((Date.now() - depart) / 1000)).padStart(4)} s · ` +
      `${r.issue.padEnd(9)} · étape ${etape.padEnd(14)} · coût ${Number(ligne.cout_usd).toFixed(4)} $ · ` +
      `P0 ${String(ligne.tirages)} tirage(s) · reprises ${String(ligne.reprises)}` +
      (r.detail !== undefined ? ` · ${r.detail.slice(0, 90)}` : ''),
  )
  if (etape === 'p0') { dire('⛔ ARRÊT — la reprise est repartie à P0 : la continuation a échoué, on repayerait l’acquis'); break }
  if (r.issue === 'livree' || r.issue === 'refusee' || r.issue === 'rien') break
  if (Number(ligne.cout_usd) > 6) { dire('⛔ GARDE-FOU 6 $'); break }
}

const fin = (await base.from(JUMELLE).select('*').eq('id', ID).single()).data as Record<string, unknown>
dire('')
dire(`STATUT FINAL : ${String(fin.statut)} · coût ${Number(fin.cout_usd).toFixed(4)} $`)
dire(`diagnostics : ${JSON.stringify(fin.diagnostics)}`)
const j = fin.sections_acquises as { phase?: string; tours?: { n: number; avant: number; apres: number; coutUsd: number; rejet?: string; revelation: boolean; reveles: number; ampute: string[] }[] }
for (const t of j.tours ?? []) {
  dire(`  tour ${String(t.n)} — ${String(t.avant)} → ${String(t.apres)} · ${String(t.coutUsd)} $` +
    (t.revelation ? ` · RÉVÉLATION (+${String(t.reveles)})` : '') +
    (t.rejet !== undefined ? ` · rejet: ${t.rejet}` : ''))
}
if (fin.document !== null) {
  const { projectAirSchema } = await import('@deribfy/air-schema')
  const strict = projectAirSchema.safeParse(fin.document)
  dire(`schéma STRICT : ${strict.success ? 'PASSE' : 'REFUSÉ'}`)
  if (strict.success) {
    const d = fin.document as { entities: { name: string }[]; screens: { id: string }[] }
    dire(`entités : ${d.entities.map((e) => e.name).join(', ')}`)
    dire(`écrans  : ${d.screens.map((e) => e.id).join(', ')}`)
  }
}
dire('FINI')
