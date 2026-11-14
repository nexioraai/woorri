/**
 * TIR · M13 — HAYINE RELU TROIS FOIS (2026-11-14, V4 bloc 3).
 *
 * Ordre du propriétaire : « relis Hayine 3 fois ; si « offre » va et vient,
 * propose une réparation déterministe (à juger) ». Le tir V4 (cdafe7d4) a lu
 * 6 tables sans « offre » ; 94cf0489 et 5b1c20bc en avaient 7, « offre » compris.
 *
 * ── LE CAHIER est celui que le propriétaire a DÉPOSÉ pour cdafe7d4, tel quel,
 * haché ; c'est la vraie route `lire-brief` qui est appelée (DeepSeek), seule
 * l'authentification est simulée.
 *
 * ── LE BUDGET : 0,01 $ ; mesuré 0,001246 $ par lecture (cdafe7d4). Les appels
 * sont faits l'un après l'autre ; au-delà du budget mesuré cumulé, arrêt.
 *
 *   GENERATEUR_FOURNISSEUR=deepseek TIR_PAYANT=oui CAHIER_M13=<fichier> node --env-file=.env.local \
 *     ../../node_modules/vitest/vitest.mjs run -c vitest.tir.config.ts src/tirs/m13-hayine.tir.ts
 */
import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
import { exigerFeuVert } from '../../vitest.tir.setup'
import { racineDepot } from '@/lib/apps/racine'
import { FOURNISSEUR } from '@/lib/ia/client'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'tir-m13', email: 'tir@deribfy.invalid' } }, error: null }) } },
}))

const BUDGET_USD = 0.01
const SHA = '9ee1ca865053'
const EVIDENCE = join(racineDepot(), 'docs', 'elite-protocol', 'evidence', 'generateur-2026-11-12')
const sha12 = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12)

describe('tir · M13 · Hayine relu trois fois', () => {
  it('la même lecture, trois fois : les tables', async () => {
    exigerFeuVert('trois lectures du cahier Hayine (DeepSeek, ≈ 0,0037 $)')
    if (FOURNISSEUR !== 'deepseek') throw new Error(`ARRÊT : fournisseur ${FOURNISSEUR} ≠ deepseek`)
    const demande = readFileSync(process.env.CAHIER_M13 ?? '', 'utf8')
    expect(sha12(demande)).toBe(SHA)
    const { POST } = await import('@/app/api/generateur/lire-brief/route')
    let cumul = 0
    const releve: unknown[] = []
    mkdirSync(join(EVIDENCE, 'brut', 'm13'), { recursive: true })
    for (let i = 1; i <= 3; i += 1) {
      if (cumul > BUDGET_USD) throw new Error(`ARRÊT AVANT la lecture ${String(i)} : ${cumul.toFixed(4)} $ > ${String(BUDGET_USD)} $`)
      const debut = Date.now()
      const res = await POST(new Request('https://deribfy.test/api/generateur/lire-brief', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tir' }, body: JSON.stringify({ demande }) }))
      const ms = Date.now() - debut
      const d = (await res.json()) as { entites?: { name?: string; id?: string; fields?: { name?: string }[] }[]; roles?: string[]; ecrans?: string[]; lecture?: { coutUsd?: number; resultat?: string } }
      writeFileSync(join(EVIDENCE, 'brut', 'm13', `lecture-${String(i)}.json.gz`), gzipSync(Buffer.from(JSON.stringify({ status: res.status, ms, sha12: SHA, reponse: d })), { level: 9 }))
      cumul += d.lecture?.coutUsd ?? 0
      const r = { i, status: res.status, ms, coutUsd: d.lecture?.coutUsd, resultat: d.lecture?.resultat, tables: (d.entites ?? []).map((e) => e.name), colonnes: Object.fromEntries((d.entites ?? []).map((e) => [e.name, (e.fields ?? []).map((f) => f.name)])), ecrans: d.ecrans?.length, roles: d.roles }
      releve.push(r)
      process.stdout.write(`\n  lecture ${String(i)} · ${String(res.status)} · ${String(ms)} ms · ${JSON.stringify({ tables: r.tables, coutUsd: r.coutUsd })}`)
    }
    writeFileSync(join(EVIDENCE, 'sortie', 'm13-hayine.json'), JSON.stringify({ quand: new Date().toISOString(), cumulUsd: Number(cumul.toFixed(5)), budgetUsd: BUDGET_USD, releve }, null, 1) + '\n')
    process.stdout.write(`\n  coût mesuré cumulé : ${cumul.toFixed(5)} $\n`)
  }, 600_000)
})
