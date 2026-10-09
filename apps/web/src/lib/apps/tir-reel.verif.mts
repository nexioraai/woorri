/**
 * LE PREMIER TIR REEL — go explicite du proprietaire (2026-10-09).
 *
 * Conditions tenues : table JUMELLE uniquement · demande neutre · vrai
 * moteur (premier appel qui paie) · cout journalise ligne a ligne dans la
 * table, avancement montre PAR TRANCHE.
 *
 * Garde-fou de conduite (pas un plafond moteur) : si le cout en base
 * depasse 6 $ — bien au-dela de l'estimation presentee (1,2-2,5 $) — on
 * CESSE de lancer de nouvelles tranches et on le dit. L'etat reste en
 * base, reprenable : rien de paye n'est perdu.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { creerTravailleur, type MoteurContinuation } from './travailleur.ts'
import { sauverEtatLocal, cheminEtatLocal } from './etat-local.ts'

const ICI = dirname(fileURLToPath(import.meta.url))
const RACINE = join(ICI, '..', '..', '..', '..', '..')
const JUMELLE = 'app_generations_test'
const JOURNAL = '/tmp/tir-reel.txt'
const DEMANDE = 'une application pour noter mes dépenses du jour et les consulter'

const env: Record<string, string> = {}
for (const l of readFileSync(join(RACINE, 'apps/web/.env.local'), 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=("?)(.*)\2$/.exec(l.trim())
  if (m) env[m[1]] = m[3]
}
const base = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

writeFileSync(JOURNAL, '')
const dire = (t: string): void => {
  console.log(t)
  writeFileSync(JOURNAL, t + '\n', { flag: 'a' })
}

// AUCUNE purge : une ligne payee ne se supprime jamais (lecon du
// 2026-10-09 — ce wipe a efface 6,87 $ d'etat gare). Le tir suit SA ligne
// par id, les anciennes lignes ne le genent pas.

const { creerMoteur } = (await import(join(RACINE, 'benchmarks/air-emission/moteur.mjs'))) as {
  creerMoteur: (o: { cleApi: string }) => Promise<{
    poursuivreEmission: MoteurContinuation['poursuivreEmission']
  }>
}
// UN moteur par tranche, comme en production : chaque invocation est un
// processus neuf, l'etat ne survit QUE par la table.
const moteurParTranche: MoteurContinuation = {
  poursuivreEmission: async (o) => {
    const m = await creerMoteur({ cleApi: env.ANTHROPIC_API_KEY })
    return m.poursuivreEmission(o)
  },
}

// LOCAL : tranches de 3600 s — un tour de reparation ENTIER tient dans une
// tranche (mesure : un tour sur 80 diagnostics depasse 600 s). En production
// l'appariement budget <= maxDuration - pire appel demeure, porte par le PLI.
const reglages = {
  table: JUMELLE,
  base,
  moteur: moteurParTranche,
  budgetTrancheMs: 3_600_000,
  battementPerimeMs: 1_800_000,
} as const

const id = await creerTravailleur(reglages).deposer({
  demande: DEMANDE, nom: 'depenses-du-jour', email: 'tir-reel@test',
})
// Le balayeur du tir ne voit que SA ligne — il ne peut pas saisir une
// ligne payee garee par un autre tir.
const w = creerTravailleur({ ...reglages, perimetre: { ligne: id } })
dire(`déposé ${id.slice(0, 8)} · « ${DEMANDE} »`)
dire(`sauvegarde continue de l'état : ${cheminEtatLocal(id)}`)

const depart = Date.now()
for (let tick = 1; tick <= 25; tick++) {
  const r = (await w.tourner())[0]
  const ligne = (await base.from(JUMELLE).select('*').eq('id', id).single()).data as Record<
    string,
    unknown
  >
  sauverEtatLocal(ligne) // l'etat paye a TOUJOURS une copie hors base
  dire(
    `tranche ${String(tick).padStart(2)} · ${String(Math.round((Date.now() - depart) / 1000)).padStart(4)} s · ` +
      `${r.issue.padEnd(9)} · étape ${String(r.etape ?? ligne.etape ?? '—').padEnd(12)} · ` +
      `coût ${Number(ligne.cout_usd).toFixed(4)} $ · jetons ${String(ligne.jetons_entree)}/${String(ligne.jetons_sortie)} · ` +
      `P0 ${String(ligne.tirages)} tirage(s) · reprises ${String(ligne.reprises)}` +
      (r.detail !== undefined ? ` · ${r.detail.slice(0, 90)}` : ''),
  )
  if (r.issue === 'livree' || r.issue === 'refusee') break
  if (r.issue === 'rien') { dire('plus rien à saisir — état final ci-dessous'); break }
  if (Number(ligne.cout_usd) > 10) {
    dire(`⛔ GARDE-FOU : ${Number(ligne.cout_usd).toFixed(4)} $ > 10 $ — plus de nouvelle tranche, état conservé en base`)
    break
  }
}

const fin = (await base.from(JUMELLE).select('*').eq('id', id).single()).data as Record<string, unknown>
sauverEtatLocal(fin)
dire('')
dire(`STATUT FINAL : ${String(fin.statut)} · coût total ${Number(fin.cout_usd).toFixed(4)} $ · durée ${String(Math.round((Date.now() - depart) / 1000))} s`)
dire(`document : ${fin.document === null ? 'absent' : 'PRÉSENT'} · diagnostics : ${JSON.stringify(fin.diagnostics)}`)
const journalFinal = fin.sections_acquises as {
  phase?: string
  tirages?: { tentative: number; arret: string; coutUsd: number; diagnostics: string[]; reparations: string[] }[]
  tours?: { n: number; avant: number; apres: number; coutUsd: number; rejet?: string; revelation: boolean; reveles: number; ampute: string[] }[]
}
if (journalFinal.phase === 'terminee') {
  for (const tir of journalFinal.tirages ?? []) {
    dire(`  tirage P0 ${String(tir.tentative)} — arrêt ${tir.arret} · ${String(tir.coutUsd)} $ · ${tir.diagnostics.join(', ') || '—'}`)
    for (const rep of tir.reparations ?? []) dire(`      réparé : ${rep}`)
  }
  for (const t of journalFinal.tours ?? []) {
    dire(
      `  tour ${String(t.n)} — ${String(t.avant)} → ${String(t.apres)} diagnostic(s) · ${String(t.coutUsd)} $` +
        (t.revelation ? ` · RÉVÉLATION (+${String(t.reveles)} révélés)` : '') +
        (t.rejet !== undefined ? ` · rejet: ${t.rejet}` : '') +
        (t.ampute.length > 0 ? ` · amputés: ${t.ampute.slice(0, 4).join(', ')}` : ''),
    )
  }
}
if (fin.document !== null) {
  const { projectAirSchema } = await import('@deribfy/air-schema')
  const strict = projectAirSchema.safeParse(fin.document)
  dire(`  schéma STRICT : ${strict.success ? 'PASSE' : 'REFUSÉ'}`)
  if (strict.success) {
    const d = fin.document as { entities: { name: string }[]; screens: { id: string }[] }
    dire(`  entités : ${d.entities.map((e) => e.name).join(', ')}`)
    dire(`  écrans  : ${d.screens.map((e) => e.id).join(', ')}`)
  }
}
if (fin.document !== null) {
  const d = fin.document as Record<string, unknown[]>
  dire(
    `  entités ${String((d.entities ?? []).length)} · écrans ${String((d.screens ?? []).length)} · ` +
      `actions ${String((d.actions ?? []).length)} · règles ${String((d.rules ?? []).length)} · ` +
      `capacités ${String((d.capabilities ?? []).length)} · intent ${d.intent !== undefined ? 'PRÉSENT' : 'absent'}`,
  )
}
dire('FINI')
