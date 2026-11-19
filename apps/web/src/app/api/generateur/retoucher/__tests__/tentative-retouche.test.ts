/**
 * POINT 2 (2026-11-18) — CHAQUE RETOUCHE LAISSE SA LIGNE, ET SON VRAI COÛT.
 *
 * Mesuré : rien n'enregistrait les retouches, réussies ou refusées — les six
 * essais de pharma n'existaient que dans Vercel et l'export DeepSeek. Et le
 * coût ignorait l'entrée en cache, lue au tarif du modèle léger en dur.
 *
 * ① une retouche coupée : une ligne `retouche / refusee`, coût > 0, aucune version ;
 * ② une retouche livrée : une ligne `retouche / livree`, liée au rang de sa version ;
 * ③ le modèle en panne : une ligne `retouche / interrompue`, coût 0 ;
 * ④ le coût compte le cache, au tarif du modèle APPELÉ ;
 * ⑤ une trace perdue ne fait pas échouer la retouche — elle se dit ;
 * ⑥ cliquet : le régime de la génération (900 s, 65 536 jetons, en flux).
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'
import { CONFIGS, coutAppel, tarifDe } from '@/lib/apps/fournisseur'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

const etat = {
  stop: 'end_turn' as string,
  texte: '',
  panne: false,
  usage: { input_tokens: 1_000, output_tokens: 2_000, cache_read_input_tokens: 30_000 } as Record<string, number>,
  tentativeEnErreur: false,
}
const alertes: unknown[] = []

// Le compteur de modifications (étape ②, 2026-11-19) est hors sujet ici : il
// accepte. Sa règle a ses propres tests (quota-retouche.test.ts).
vi.mock('@/lib/apps/quota', async (orig) => ({
  ...(await orig<typeof import('@/lib/apps/quota')>()),
  reserverModification: async () => ({ ok: true, restantes: 10 }),
  libererModification: async () => ({ ok: true }),
}))
vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'a@b.c' }),
}))
const journal: { postgrest: JournalPostgrest } = { postgrest: journalVierge() }
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge: vierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS, TABLE_VERSIONS } = await import('@/lib/apps/journal')
  const { TABLE_TENTATIVES } = await import('@/lib/apps/tentatives')
  const j = vierge()
  journal.postgrest = j
  const doc = { fichiers: { 'index.tsx': 'export const a = 1' }, schema: '-- rien', politiques: '' }
  const from = creerFrom(
    {
      [TABLE_GENERATIONS]: { reponse: { data: { document: doc, nom: 'App' }, error: null } },
      [TABLE_VERSIONS]: { reponse: { data: [], error: null } },
      [TABLE_TENTATIVES]: { reponse: { data: [], error: null } },
    },
    j,
  )
  return {
    supabaseAdmin: {
      from: (t: string) => {
        if (t === TABLE_TENTATIVES && etat.tentativeEnErreur) throw new Error('base des tentatives en panne')
        return from(t)
      },
    },
  }
})
vi.mock('@/lib/alertes', () => ({ alerter: (a: unknown) => { alertes.push(a); return Promise.resolve(null) } }))
vi.mock('@/lib/apps/juge-execution', async () => {
  const { jugeMuet } = await import('@/lib/apps/__tests__/juge-muet')
  return { jugerExecution: jugeMuet }
})
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      stream: () => ({
        finalMessage: () =>
          etat.panne
            ? Promise.reject(new Error('fournisseur en panne'))
            : Promise.resolve({ content: [{ type: 'text', text: etat.texte }], stop_reason: etat.stop, usage: etat.usage }),
      }),
    }
  },
}))

process.env.GENERATEUR_FOURNISSEUR = 'deepseek'
const { POST } = await import('../route')
const { TABLE_TENTATIVES } = await import('@/lib/apps/tentatives')
const { TABLE_VERSIONS } = await import('@/lib/apps/journal')

const appel = () =>
  POST(new Request('https://x/api/generateur/retoucher?id=g1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demande: 'mets les boutons en vert' }),
  }))
type Ligne = Record<string, unknown>
const tentatives = (): Ligne[] =>
  (journal.postgrest.ecritures[TABLE_TENTATIVES] ?? []).flatMap((e) => {
    const l = (e as { op?: string; charge?: unknown }).op === 'insert' ? (e as { charge: unknown }).charge : []
    return Array.isArray(l) ? (l as Ligne[]) : [l as Ligne]
  })

describe('point 2 · la retouche laisse sa ligne', () => {
  beforeEach(() => {
    for (const k of Object.keys(journal.postgrest.ecritures)) journal.postgrest.ecritures[k] = []
    etat.panne = false
    etat.tentativeEnErreur = false
    alertes.length = 0
  })

  it('① coupée : refusee, payée, et aucune version', async () => {
    etat.stop = 'max_tokens'
    etat.texte = '=== index.tsx ===\nexport const a = '
    const r = await appel()
    expect(r.status).toBe(409)
    const t = tentatives()
    expect(t).toHaveLength(1)
    expect(t[0]).toMatchObject({ generation_id: 'g1', nature: 'retouche', issue: 'refusee', rang: 1 })
    expect(Number(t[0]!.cout_usd)).toBeGreaterThan(0)
    expect((t[0]!.trace as { tronquee?: boolean }).tronquee).toBe(true)
    expect(journal.postgrest.ecritures[TABLE_VERSIONS] ?? []).toEqual([])
  })

  it('② livrée : livree, liée au rang de sa version', async () => {
    etat.stop = 'end_turn'
    etat.texte = '=== index.tsx ===\nexport const a = 42'
    const r = await appel()
    const d = (await r.json()) as { ok?: boolean; rang?: number; error?: string }
    expect(d.ok, String(d.error)).toBe(true)
    const t = tentatives()
    expect(t).toHaveLength(1)
    expect(t[0]).toMatchObject({ nature: 'retouche', issue: 'livree', version_rang: d.rang })
  })

  it('③ modèle en panne : interrompue, rien de facturé', async () => {
    etat.panne = true
    const r = await appel()
    expect(r.status).toBe(502)
    expect(tentatives()[0]).toMatchObject({ nature: 'retouche', issue: 'interrompue', cout_usd: 0 })
  })

  it('④ le coût compte le cache, au tarif du modèle appelé', async () => {
    etat.stop = 'max_tokens'
    etat.texte = '=== index.tsx ===\nexport const a = '
    const avant = new Date()
    const r = await appel()
    const d = (await r.json()) as { coutUsd: number }
    const t = tarifDe(CONFIGS.deepseek.prixLeger, avant)
    expect(d.coutUsd).toBeCloseTo(coutAppel({ entree: 1_000, entreeCache: 30_000, sortie: 2_000 }, t), 8)
    // Sans le cache, le coût serait plus bas : c'est exactement l'oubli corrigé.
    expect(d.coutUsd).toBeGreaterThan((1_000 * t.entree + 2_000 * t.sortie) / 1e6)
    expect(tentatives()[0]).toMatchObject({ jetons_entree: 31_000, jetons_sortie: 2_000 })
  })

  it('⑤ une trace perdue ne fait pas échouer la retouche, et elle se dit', async () => {
    etat.tentativeEnErreur = true
    etat.stop = 'end_turn'
    etat.texte = '=== index.tsx ===\nexport const a = 42'
    const r = await appel()
    expect(((await r.json()) as { ok?: boolean }).ok).toBe(true)
    expect(alertes).toHaveLength(1)
  })

  it('⑥ cliquet : le régime de la génération', () => {
    const route = readFileSync(path.join(__dirname, '../route.ts'), 'utf8')
    expect(route).toMatch(motifTexte('export const maxDuration = 900'))
    expect(route).toMatch(motifTexte('export const SORTIE_MAX_RETOUCHE = 65_536'))
    expect(route).toMatch(motifTexte('await clientIA().messages.stream({'))
    expect(route).toMatch(motifTexte('tarifDe(tarifsDuModele(config, MODELE_LEGER), new Date())'))
    expect(route).not.toMatch(motifTexte('messages.create('))
  })

  it('⑦ cliquet : l’atelier compte le temps et ne promet plus « une vingtaine de secondes »', () => {
    const atelier = readFileSync(path.join(__dirname, '../../../../atelier/[id]/page.tsx'), 'utf8')
    expect(atelier).toMatch(motifTexte('const minuteur = window.setInterval(direAttente, 1000);'))
    expect(atelier).not.toMatch(motifTexte("setAvis('Modification en cours — une vingtaine de secondes.')"))
  })
})
