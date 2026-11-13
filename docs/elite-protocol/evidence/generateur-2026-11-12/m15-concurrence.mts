// M15 — CONCURRENCE DEEPSEEK (3c, mesure a) : N appels flash lancés EN MÊME TEMPS,
// on compte ceux qui réussissent, les 429 / erreurs, et les latences.
// Paliers 4 puis 8 (le propriétaire a demandé 4 ; 8 dit s'il y a de la marge).
// Prompt minuscule, max_tokens 8, réflexion coupée : ≈ 60 jetons par appel.
// PLAFOND 0,01 $ — vérifié au pire cas avant le premier appel.
//   cd apps/web && GENERATEUR_FOURNISSEUR=deepseek TIR_PAYANT=oui npx tsx --env-file=.env.local ../../docs/elite-protocol/evidence/generateur-2026-11-12/m15-concurrence.mts
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { ICI } from './commun.mjs'
import { CONFIGS, tarifPlafond } from '@/lib/apps/fournisseur'
import { clientIA, FOURNISSEUR, MODELE_LEGER } from '@/lib/ia/client'

if (process.env.TIR_PAYANT !== 'oui') throw new Error('TIR_PAYANT=oui requis')
if (FOURNISSEUR !== 'deepseek') throw new Error(`ARRÊT : fournisseur ${FOURNISSEUR} ≠ deepseek`)
const PLAFOND = 0.01
const P = tarifPlafond(CONFIGS.deepseek.prixLeger)
const PALIERS = [4, 8]
const appels = PALIERS.reduce((s, n) => s + n, 0)
const pireCas = (appels * (60 * P.entree + 8 * P.sortie)) / 1e6
console.log(`appels ${String(appels)} · pire cas ${pireCas.toFixed(5)} $ (plafond ${String(PLAFOND)} $)`)
if (pireCas > PLAFOND) throw new Error('ARRÊT AVANT APPEL : pire cas au-dessus du plafond')

type Mesure = { palier: number; rang: number; ok: boolean; status: number | null; ms: number; erreur?: string; jetons?: { entree: number; sortie: number } }
const mesures: Mesure[] = []
let depense = 0
for (const n of PALIERS) {
  const t0 = Date.now()
  const resultats = await Promise.all(
    Array.from({ length: n }, async (_, i) => {
      const debut = Date.now()
      try {
        const r = await clientIA().messages.create({ model: MODELE_LEGER, max_tokens: 8, thinking: { type: 'disabled' }, messages: [{ role: 'user', content: `Réponds uniquement « ok ${String(i + 1)} ».` }] } as never)
        const u = (r as { usage: { input_tokens: number; output_tokens: number } }).usage
        depense += (u.input_tokens * P.entree + u.output_tokens * P.sortie) / 1e6
        return { palier: n, rang: i + 1, ok: true, status: 200, ms: Date.now() - debut, jetons: { entree: u.input_tokens, sortie: u.output_tokens } } satisfies Mesure
      } catch (e: unknown) {
        const o = e as { status?: number; message?: string }
        return { palier: n, rang: i + 1, ok: false, status: o.status ?? null, ms: Date.now() - debut, erreur: String(o.message ?? e).slice(0, 160) } satisfies Mesure
      }
    }),
  )
  mesures.push(...resultats)
  const reussis = resultats.filter((m) => m.ok).length
  console.log(`palier ${String(n)} : ${String(reussis)}/${String(n)} réussis · mur ${String(Date.now() - t0)} ms · latences ${resultats.map((m) => String(m.ms)).join(' ')} ms · statuts ${resultats.map((m) => String(m.status)).join(' ')}`)
  for (const m of resultats.filter((m) => !m.ok)) console.log(`   ✗ ${String(m.rang)} : ${String(m.status)} ${m.erreur ?? ''}`)
}
const sortie = { quand: new Date().toISOString(), modele: MODELE_LEGER, paliers: PALIERS, depenseUsd: Number(depense.toFixed(5)), mesures }
writeFileSync(join(ICI, 'sortie', 'm15-concurrence.json'), JSON.stringify(sortie, null, 1) + '\n')
console.log(`DÉPENSE ${depense.toFixed(5)} $`)
