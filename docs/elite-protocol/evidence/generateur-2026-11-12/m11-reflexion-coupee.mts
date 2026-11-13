// M11 — LA RÉFLEXION COUPÉE : `thinking.disabled` et `effort: low`, mesurés avant d'écrire le code.
//
// SUITE DE M10 (la réflexion mange la limite : 28 000 signes dans 2 rejeux sur
// 3, texte coupé au milieu des tables). La documentation du point d'accès
// (api-docs.deepseek.com/guides/anthropic_api) : `thinking.type` enabled /
// disabled honorés, `budget_tokens` IGNORÉ, `output_config.effort` seul
// réglage de profondeur. Deux variantes, 3 rejeux chacune, même appel exact
// que lire-brief/route.ts (même modèle, même consigne, même cahier 44ca6bbe),
// limite 8 000 :
//   A. thinking: { type: 'disabled' }
//   B. output_config: { effort: 'low' }
// CRITÈRE (du propriétaire) : résultat `reussie` 3/3 ET 8 tables ± 1 contre la
// référence (M10, rejeux 2 et 4 : 8 tables). On vérifie aussi que la variante
// est HONORÉE (présence et taille du bloc de réflexion) et que la devise
// déduite tient.
// PLAFOND DUR 0,04 $ (accord du 2026-11-13). DeepSeek seulement.
//
//   cd apps/web && GENERATEUR_FOURNISSEUR=deepseek TIR_PAYANT=oui npx tsx --env-file=.env.local ../../docs/elite-protocol/evidence/generateur-2026-11-12/m11-reflexion-coupee.mts
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { ICI } from './commun.mjs'
import { CONFIGS, tarifPlafond, tarifDe } from '@/lib/apps/fournisseur'
import { clientIA, MODELE_LEGER, FOURNISSEUR } from '@/lib/ia/client'
import { CONSIGNE } from '@/lib/apps/consigne-lire-brief'
import { lireEntites } from '@/lib/apps/entites-declarees'
import { projectAirSchema } from '@deribfy/air-schema'

const PLAFOND = 0.04
if (process.env.TIR_PAYANT !== 'oui') throw new Error('TIR_PAYANT=oui requis')
if (FOURNISSEUR !== 'deepseek') throw new Error(`ARRÊT : fournisseur ${FOURNISSEUR} ≠ deepseek`)

const cahier = readFileSync(join(ICI, 'brut', 'm10', 'cahier-44ca6bbe.txt'), 'utf8').trim()
const shaCahier = createHash('sha256').update(cahier).digest('hex')
const schemaEntite = projectAirSchema.shape.entities.element
const P = tarifPlafond(CONFIGS.deepseek.prixLeger)
const estimeEntree = (CONSIGNE.length + Math.min(cahier.length, 24_000)) / 2.5
let depense = 0
mkdirSync(join(ICI, 'brut', 'm11'), { recursive: true })

const VARIANTES = [
  { nom: 'A-thinking-disabled', extra: { thinking: { type: 'disabled' } } },
  { nom: 'B-effort-low', extra: { output_config: { effort: 'low' } } },
] as const

const rejeux = []
for (const v of VARIANTES) for (const rang of [1, 2, 3]) {
  const pire = (estimeEntree * P.entree + 8000 * P.sortie) / 1e6
  if (depense + pire > PLAFOND) { rejeux.push({ variante: v.nom, rang, interrompu: true, motif: `${depense.toFixed(4)} + ${pire.toFixed(4)} > ${PLAFOND}` }); continue }
  const t0 = Date.now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await clientIA().messages.create({ model: MODELE_LEGER, max_tokens: 8000, system: CONSIGNE, messages: [{ role: 'user', content: cahier.slice(0, 24_000) }], ...(v.extra as any) })
  const t = tarifDe(CONFIGS.deepseek.prixLeger, new Date())
  const u = r.usage as { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number }
  const usd = (u.input_tokens * t.entree + (u.cache_read_input_tokens ?? 0) * t.entreeCache + u.output_tokens * t.sortie) / 1e6
  depense += usd
  const blocs = r.content.map((b) => { const o = b as { type: string; text?: string; thinking?: string }; return { type: o.type, signes: (o.type === 'thinking' ? o.thinking ?? '' : o.text ?? '').length } })
  const texte = r.content.map((b) => ((b as { type: string }).type === 'text' ? (b as { text?: string }).text ?? '' : '')).join('')
  const reflexion = r.content.map((b) => ((b as { type: string }).type === 'thinking' ? (b as { thinking?: string }).thinking ?? '' : '')).join('')
  const d = texte.indexOf('{'), f = texte.lastIndexOf('}')
  let resultat: string, tables = 0, deduites: Record<string, unknown> = {}
  if (d === -1 || f <= d) resultat = r.stop_reason === 'max_tokens' ? 'tronquee' : 'illisible'
  else {
    try {
      const lu = JSON.parse(texte.slice(d, f + 1)) as Record<string, unknown>
      tables = lireEntites(lu.ENTITES, (e: unknown) => schemaEntite.safeParse(e).success).entites.length
      deduites = Object.fromEntries(Object.entries(lu).filter(([k, x]) => k !== 'ENTITES' && k !== 'QUESTIONS' && typeof x === 'string'))
      resultat = 'reussie'
    } catch { resultat = r.stop_reason === 'max_tokens' ? 'tronquee' : 'json_casse' }
  }
  writeFileSync(join(ICI, 'brut', 'm11', `${v.nom}-${String(rang)}.json.gz`), gzipSync(Buffer.from(JSON.stringify({ stop_reason: r.stop_reason, usage: r.usage, reflexion, texte })), { level: 9 }))
  rejeux.push({ variante: v.nom, rang, stop_reason: r.stop_reason, jetonsSortie: u.output_tokens, blocs, signesReflexion: reflexion.length, signesTexte: texte.length, resultatRoute: resultat, tables, deduites, ms: Date.now() - t0, usd: +usd.toFixed(5) })
  console.log(JSON.stringify(rejeux.at(-1)))
}
const sortie = { cahierSha256: shaCahier, reference: { tables: 8, source: 'M10 rejeux 2 et 4' }, modele: MODELE_LEGER, plafond: PLAFOND, depense: +depense.toFixed(4), rejeux }
writeFileSync(join(ICI, 'sortie', 'm11-reflexion-coupee.json'), JSON.stringify(sortie, null, 1) + '\n')
console.log(`\nDÉPENSE ${depense.toFixed(4)} $ (plafond ${PLAFOND} $)`)
