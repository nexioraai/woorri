/**
 * LES CLÉS MONERAILS DANS /admin/mobile-money (2026-11-24) — le préfixe, jamais
 * la valeur, et pour le fondateur seul.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({ email: 'issayamiyoussouf@gmail.com' as string }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: async () => ({ ok: true, userId: 'u', email: etat.email }),
}))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const from = creerFrom({ mm_demandes: { reponse: { data: [], error: null } } }, journalVierge())
  return { supabaseAdmin: { from } }
})

import { etatDesCles, ligneCle } from '../cles'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { GET } from '@/app/api/admin/mobile-money/route'

const CLE_TEST = 'mr_test_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3'
const CLE_LIVE = 'mr_live_' + 'Z9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4J3i2H1g0F9e8D7'
const avant = { ...process.env }
beforeEach(() => { etat.email = 'issayamiyoussouf@gmail.com' })
afterEach(() => {
  for (const k of ['MONERAILS_CLE_TEST', 'MONERAILS_CLE_LIVE']) {
    if (avant[k] === undefined) delete process.env[k]
    else process.env[k] = avant[k]
  }
})

describe('etatDesCles — deux booléens, rien d’autre', () => {
  it('les deux bonnes clés : ✓ ✓', () => {
    expect(etatDesCles({ MONERAILS_CLE_TEST: CLE_TEST, MONERAILS_CLE_LIVE: CLE_LIVE })).toEqual({ test: true, live: true })
  })
  it('absentes ou vides : ✗ ✗', () => {
    expect(etatDesCles({})).toEqual({ test: false, live: false })
    expect(etatDesCles({ MONERAILS_CLE_TEST: '  ', MONERAILS_CLE_LIVE: '' })).toEqual({ test: false, live: false })
  })
  it('inversées (live dans test, test dans live) : ✗ ✗', () => {
    expect(etatDesCles({ MONERAILS_CLE_TEST: CLE_LIVE, MONERAILS_CLE_LIVE: CLE_TEST })).toEqual({ test: false, live: false })
  })
  it('le préfixe seul, sans clé derrière : ✗', () => {
    expect(etatDesCles({ MONERAILS_CLE_TEST: 'mr_test_', MONERAILS_CLE_LIVE: 'mr_live_' })).toEqual({ test: false, live: false })
  })
  it('une espace autour ne fait pas échouer une bonne clé', () => {
    expect(etatDesCles({ MONERAILS_CLE_TEST: ` ${CLE_TEST} `, MONERAILS_CLE_LIVE: `${CLE_LIVE}\n` })).toEqual({ test: true, live: true })
  })
  it('chaque côté est lu dans SA variable', () => {
    expect(etatDesCles({ MONERAILS_CLE_TEST: CLE_TEST })).toEqual({ test: true, live: false })
    expect(etatDesCles({ MONERAILS_CLE_LIVE: CLE_LIVE })).toEqual({ test: false, live: true })
  })
  it('la ligne affichée', () => {
    expect(ligneCle('test', true)).toBe('clé test : préfixe mr_test_ ✓')
    expect(ligneCle('live', false)).toBe('clé live : préfixe mr_live_ ✗')
  })
})

describe('GET /api/admin/mobile-money — les clés', () => {
  const appeler = () => GET(new Request('https://www.deribfy.com/api/admin/mobile-money', { headers: { Authorization: 'Bearer x' } }))

  it('le fondateur reçoit les deux booléens, et la réponse ne contient aucun morceau de clé', async () => {
    process.env.MONERAILS_CLE_TEST = CLE_TEST
    process.env.MONERAILS_CLE_LIVE = CLE_LIVE
    const r = await appeler()
    expect(r.status).toBe(200)
    const brut = await r.text()
    expect(JSON.parse(brut).cles).toEqual({ test: true, live: true })
    for (const cle of [CLE_TEST, CLE_LIVE]) {
      // Ni la clé, ni sa partie secrète, ni même un fragment de 6 caractères.
      for (let i = 8; i + 6 <= cle.length; i += 1) expect(brut).not.toContain(cle.slice(i, i + 6))
    }
    expect(brut).not.toMatch(/mr_(test|live)_/u)
  })

  it('une clé live absente se voit : live = false', async () => {
    process.env.MONERAILS_CLE_TEST = CLE_TEST
    delete process.env.MONERAILS_CLE_LIVE
    const d = (await (await appeler()).json()) as { cles: unknown }
    expect(d.cles).toEqual({ test: true, live: false })
  })

  it('un autre compte : 403, et rien sur les clés', async () => {
    etat.email = 'quelquun@exemple.com'
    process.env.MONERAILS_CLE_TEST = CLE_TEST
    const r = await appeler()
    expect(r.status).toBe(403)
    expect(await r.text()).not.toMatch(/cles|mr_test_/u)
  })
})

describe('la page /admin/mobile-money affiche les deux lignes', () => {
  const page = readFileSync(join(process.cwd(), 'src/app/admin/mobile-money/page.tsx'), 'utf8')
  it('lit `cles` de la réponse et rend la ligne de chaque côté avec son propre booléen', () => {
    expect(page).toMatch(motifTexte('setCles(d.cles ?? null)'))
    expect(page).toMatch(motifTexte("ligneCle('test', cles.test)"))
    expect(page).toMatch(motifTexte("ligneCle('live', cles.live)"))
  })
})
