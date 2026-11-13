/**
 * TIR · TROIS LECTURES RÉELLES POUR LA PREUVE V2 (2026-11-14).
 *
 * Ordre du propriétaire : « Lectures manquantes : autorisées, ~0,006 $ — lis
 * école, pièces auto et CPA avec la vraie route, et refais la preuve V2 sur
 * 4 lectures réelles (plus les 2 Hayine). »
 *
 * ── C'EST LA ROUTE QUI EST APPELÉE : `POST` de `lire-brief/route.ts`, le VRAI
 * DeepSeek. Seule l'authentification est simulée (on n'ouvre de session au nom
 * de personne).
 *
 * ── LES CAHIERS SONT CEUX DE LA BASE, TELS QU'ILS Y SONT, HACHÉS :
 *   · école (« Complexe Scolaire La Renaissance », ligne a13f8f9f) : 1 000 signes,
 *     COUPÉS en plein mot par l'ancien maxLength — c'est la seule version qui
 *     existe ; on ne reconstruit pas un cahier manquant ;
 *   · pièces auto (« Logone Pièces Auto », ligne c4522e43) : 1 000 signes, coupés
 *     de même ;
 *   · CPA (institution, ligne fa0ede2c) : 20 658 signes, entier.
 *
 * ── LE BUDGET : les appels sont faits l'un après l'autre ; si le coût MESURÉ
 * cumulé dépasse 0,006 $, le tir s'arrête avant l'appel suivant.
 *
 *   GENERATEUR_FOURNISSEUR=deepseek TIR_PAYANT=oui node --env-file=.env.local \
 *     ../../node_modules/vitest/vitest.mjs run -c vitest.tir.config.ts src/tirs/lectures-v2.tir.ts
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
  supabase: { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'tir-v2', email: 'tir@deribfy.invalid' } }, error: null }) } },
}))

const BUDGET_USD = 0.006
const EVIDENCE = join(racineDepot(), 'docs', 'elite-protocol', 'evidence', 'generateur-2026-11-12')
const sha12 = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12)
const CAHIERS = [
  { id: 'cpa-fa0ede2c', sha: '88fc434f0e76' },
  { id: 'ecole-a13f8f9f', sha: '429c0e117bf9' },
  { id: 'pieces-c4522e43', sha: '969897b6a998' },
] as const

describe('tir · trois lectures réelles pour V2', () => {
  it('école, pièces auto, CPA — la route, le vrai modèle, sous budget', async () => {
    exigerFeuVert('trois lectures de cahier (DeepSeek, ≈ 0,006 $)')
    if (FOURNISSEUR !== 'deepseek') throw new Error(`ARRÊT : fournisseur ${FOURNISSEUR} ≠ deepseek`)
    const source = JSON.parse(readFileSync(process.env.CAHIERS_V2 ?? '', 'utf8')) as Record<string, string>
    process.env.GENERATEUR_FOURNISSEUR = 'deepseek'
    const { POST } = await import('@/app/api/generateur/lire-brief/route')
    let cumul = 0
    const releve: Record<string, unknown> = {}
    mkdirSync(join(EVIDENCE, 'brut', 'v2'), { recursive: true })
    for (const c of CAHIERS) {
      if (cumul > BUDGET_USD) throw new Error(`ARRÊT AVANT ${c.id} : coût mesuré ${cumul.toFixed(4)} $ > budget ${String(BUDGET_USD)} $`)
      const demande = source[c.id]!
      expect(sha12(demande), c.id).toBe(c.sha)
      const debut = Date.now()
      const res = await POST(new Request('https://deribfy.test/api/generateur/lire-brief', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tir' }, body: JSON.stringify({ demande }),
      }))
      const ms = Date.now() - debut
      const d = (await res.json()) as { entites: unknown[]; roles: string[]; ecrans: string[]; lecture: { coutUsd?: number; resultat: string } }
      writeFileSync(join(EVIDENCE, 'brut', 'v2', `${c.id}.json.gz`), gzipSync(Buffer.from(JSON.stringify({ status: res.status, ms, signes: demande.length, sha12: c.sha, reponse: d })), { level: 9 }))
      cumul += d.lecture?.coutUsd ?? 0
      releve[c.id] = { status: res.status, ms, signes: demande.length, resultat: d.lecture?.resultat, coutUsd: d.lecture?.coutUsd, tables: d.entites?.length, ecrans: d.ecrans?.length, roles: d.roles }
      process.stdout.write(`\n  ${c.id} · ${String(res.status)} · ${String(ms)} ms · ${JSON.stringify(releve[c.id])}`)
    }
    writeFileSync(join(EVIDENCE, 'sortie', 'v2-lectures.json'), JSON.stringify({ quand: new Date().toISOString(), cumulUsd: Number(cumul.toFixed(5)), budgetUsd: BUDGET_USD, releve }, null, 1) + '\n')
    process.stdout.write(`\n  coût mesuré cumulé : ${cumul.toFixed(5)} $\n`)
    for (const c of CAHIERS) expect((releve[c.id] as { status: number }).status, c.id).toBe(200)
  }, 600_000)
})
