/**
 * MANQUE 4 — CLIQUET DE COMPORTEMENT : une tentative = une ligne, jamais réécrite.
 *
 * Les cinq suites de l'état des lieux (docs/elite-protocol/PLAN_MANQUE4.md,
 * pièces dans evidence/manque4-etat-des-lieux/), rejouées sur les VRAIES
 * poignées : seuls l'authentification, Supabase (base EN MÉMOIRE À ÉTAT) et
 * le réseau vers DeepSeek sont remplacés. L'adaptateur réel tourne.
 *
 * La base en mémoire REFUSE toute mise à jour d'une tentative, comme le
 * déclencheur de `supabase/sql/app_generation_attempts.sql` : une route qui
 * en réécrirait une échouerait ici.
 *
 * Aucun appel payant, aucune écriture en base réelle.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { TABLE_GENERATIONS, TABLE_VERSIONS } from '@/lib/apps/journal'
import { TABLE_TENTATIVES } from '@/lib/apps/tentatives'

type Ligne = Record<string, unknown>
const { base } = vi.hoisted(() => ({ base: { tables: new Map<string, Ligne[]>(), misesAJourRefusees: 0 } }))

vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'a@b.c' }),
}))

/** Base PostgREST minimale À ÉTAT : select/insert/update/delete + eq/neq/in/order. */
vi.mock('@/lib/supabase-admin', () => {
  const table = (nom: string): Ligne[] => {
    if (!base.tables.has(nom)) base.tables.set(nom, [])
    return base.tables.get(nom)!
  }
  const from = (nom: string) => {
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let charge: Ligne | Ligne[] | null = null
    let colonnes: string | null = null
    const filtres: ((l: Ligne) => boolean)[] = []
    const projeter = (l: Ligne): Ligne => {
      if (colonnes === null || colonnes.trim() === '*') return structuredClone(l)
      const o: Ligne = {}
      for (const c of colonnes.split(',').map((x) => x.trim())) o[c] = structuredClone(l[c] ?? null)
      return o
    }
    const executer = (): { data: Ligne[]; error: null } => {
      const t = table(nom)
      if (op === 'insert') {
        const lignes = (Array.isArray(charge) ? charge : [charge!]).map((c) => ({
          id: randomUUID(),
          created_at: new Date().toISOString(),
          cree_le: new Date().toISOString(),
          ...structuredClone(c),
        }))
        t.push(...lignes)
        return { data: lignes.map(projeter), error: null }
      }
      const touchees = t.filter((l) => filtres.every((f) => f(l)))
      if (op === 'update' && nom === 'app_generation_attempts') {
        // LE DÉCLENCHEUR D'AJOUT SEUL, rejoué : la mise à jour est refusée.
        base.misesAJourRefusees += 1
        return { data: [], error: { message: 'app_generation_attempts est en ajout seul' } } as unknown as { data: Ligne[]; error: null }
      }
      if (op === 'update') {
        for (const l of touchees) Object.assign(l, structuredClone(charge as Ligne))
        return { data: touchees.map(projeter), error: null }
      }
      if (op === 'delete') {
        base.tables.set(nom, t.filter((l) => !touchees.includes(l)))
        return { data: [], error: null }
      }
      return { data: touchees.map(projeter), error: null }
    }
    const b = {
      select(c?: string) { colonnes = c ?? '*'; return b },
      insert(c: Ligne | Ligne[]) { op = 'insert'; charge = c; return b },
      update(c: Ligne) { op = 'update'; charge = c; return b },
      delete() { op = 'delete'; return b },
      eq(k: string, v: unknown) { filtres.push((l) => l[k] === v); return b },
      neq(k: string, v: unknown) { filtres.push((l) => l[k] !== v); return b },
      in(k: string, v: unknown[]) { filtres.push((l) => v.includes(l[k])); return b },
      order() { return b },
      limit() { return b },
      maybeSingle() { const r = executer(); return Promise.resolve({ data: r.data[0] ?? null, error: null }) },
      single() { const r = executer(); return Promise.resolve({ data: r.data[0] ?? null, error: null }) },
      then(ok: (r: unknown) => unknown, ko?: (e: unknown) => unknown) {
        return Promise.resolve(executer()).then(ok, ko)
      },
    }
    return b
  }
  return { supabaseAdmin: { from } }
})

// ── FAUX DEEPSEEK, au niveau du réseau : l'adaptateur réel tourne.
const reseau = { reponses: [] as (() => Response)[], i: 0, appels: 0 }
const deepseek = (contenu: string, finish = 'stop') => () =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: contenu }, finish_reason: finish }],
      usage: { prompt_tokens: 1200, completion_tokens: 3400 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
vi.stubGlobal('fetch', async (url: unknown) => {
  if (!String(url).startsWith('https://api.deepseek.com/')) throw new Error(`réseau inattendu : ${String(url)}`)
  reseau.appels += 1
  const f = reseau.reponses[Math.min(reseau.i++, reseau.reponses.length - 1)]
  return f!()
})

import { POST } from '../route'

const BON = [
  '=== index.tsx ===',
  "import { facture } from './calcul'",
  'export const total = facture(159)',
  '=== calcul.ts ===',
  'export const facture = (k: number) => Math.min(k,150)*85 + Math.max(0,k-150)*125 + 402',
].join('\n')
// Code qui ne s'assemble pas : la forme d'échec réellement mesurée
// (« Expected } but found EOF », fournisseur.ts:32-40).
const CASSE = ['=== index.tsx ===', 'export const total = { a: 1,'].join('\n')


// ── LE CRITÈRE DU PROPRIÉTAIRE (2026-11-15) : après un échec suivi d'une
// réussite, il existe deux tentatives de régénération, et la première a
// gardé ses trois tours et son coût.

const H = { 'Content-Type': 'application/json', Authorization: 'Bearer j' }
const generer = (id?: string) =>
  POST(new Request(`https://deribfy.test/api/generateur/direct${id === undefined ? '' : `?id=${id}`}`, {
    method: 'POST', headers: H,
    body: JSON.stringify(id === undefined ? { demande: 'calcule ma facture SNE', nom: 'Facture SNE' } : { demande: '' }),
  }))
const ligneDe = (id: string): Ligne | null => {
  const l = (base.tables.get(TABLE_GENERATIONS) ?? []).find((x) => x.id === id)
  return l === undefined ? null : structuredClone(l)
}
const tentativesDe = (id: string) =>
  (base.tables.get(TABLE_TENTATIVES) ?? [])
    .filter((t) => t.generation_id === id)
    .sort((a, b) => Number(a.rang) - Number(b.rang))
const toursDe = (t: Ligne | undefined) => (((t?.trace ?? {}) as Ligne).tours ?? []) as Ligne[]
const versionsDe = (id: string) =>
  (base.tables.get(TABLE_VERSIONS) ?? []).filter((v) => v.generation_id === id).map((v) => v.rang)

const reponseDe = (s: 'ok' | 'A' | 'B') =>
  s === 'ok' ? [deepseek(BON)]
    : s === 'A' ? [deepseek(CASSE)]
      : [() => new Response('{"error":{"message":"Service unavailable"}}', { status: 503 })]

async function oeuvreLivree(): Promise<string> {
  reseau.reponses = reponseDe('ok')
  const d = (await (await generer()).json()) as { ok?: boolean; id?: string }
  expect(d.ok).toBe(true)
  return d.id!
}
async function regenerer(id: string, s: 'ok' | 'A' | 'B') {
  reseau.i = 0
  reseau.reponses = reponseDe(s)
  return (await (await generer(id)).json()) as { ok?: boolean }
}

beforeEach(() => {
  base.tables = new Map()
  base.misesAJourRefusees = 0
  reseau.reponses = []
  reseau.i = 0
  reseau.appels = 0
  process.env.GENERATEUR_MOTEUR = 'direct'
  process.env.GENERATEUR_FOURNISSEUR = 'deepseek'
  process.env.DEEPSEEK_API_KEY = 'cle-de-test'
  delete process.env.RESEND_API_KEY
  // Les scénarios S1–S6 régénèrent : l'interrupteur (fermé par défaut) est
  // ouvert ICI, explicitement. S7 le referme.
  process.env.NEXT_PUBLIC_REGENERATION_OUVERTE = '1'
})

describe('Manque 4 · une tentative = une ligne, jamais réécrite', () => {
  it('S0 · la génération initiale laisse sa tentative « generation / livree », liée à la version 1', async () => {
    const id = await oeuvreLivree()
    const t = tentativesDe(id)
    expect(t.map((x) => [x.rang, x.nature, x.issue, x.version_rang])).toEqual([[1, 'generation', 'livree', 1]])
    expect(toursDe(t[0])).toHaveLength(1)
    expect(Number(t[0]!.cout_usd)).toBeGreaterThan(0)
    expect(Date.parse(String(t[0]!.fin_le))).toBeGreaterThanOrEqual(Date.parse(String(t[0]!.debut_le)))
  })

  it('S1 · une régénération réussie ajoute une tentative liée à la version 2', async () => {
    const id = await oeuvreLivree()
    expect((await regenerer(id, 'ok')).ok).toBe(true)
    expect(tentativesDe(id).map((x) => [x.rang, x.nature, x.issue, x.version_rang])).toEqual([
      [1, 'generation', 'livree', 1],
      [2, 'regeneration', 'livree', 2],
    ])
    expect(versionsDe(id)).toEqual([1, 2])
  })

  it('S2 · un échec de régénération ne touche PAS la ligne de l’œuvre, et garde sa trace complète', async () => {
    const id = await oeuvreLivree()
    const avant = ligneDe(id)
    expect((await regenerer(id, 'A')).ok).toBe(false)
    expect(ligneDe(id)).toEqual(avant)
    const echec = tentativesDe(id)[1]!
    expect([echec.nature, echec.issue, echec.version_rang, echec.tirages]).toEqual(['regeneration', 'non_convergee', null, 3])
    expect(toursDe(echec)).toHaveLength(3)
    expect(Number(echec.cout_usd)).toBe(0.0226)
    expect(echec.diagnostics).toEqual(['Non convergé en 3 tours.'])
  })

  it('S3 · LE CRITÈRE : un échec PUIS une réussite — l’échec garde ses 3 tours et son coût', async () => {
    const id = await oeuvreLivree()
    const avant = ligneDe(id)
    expect((await regenerer(id, 'A')).ok).toBe(false)
    expect(ligneDe(id)).toEqual(avant)
    expect((await regenerer(id, 'ok')).ok).toBe(true)
    const regenerations = tentativesDe(id).filter((x) => x.nature === 'regeneration')
    expect(regenerations).toHaveLength(2)
    const [echec, reussite] = regenerations
    expect(echec!.issue).toBe('non_convergee')
    expect(toursDe(echec)).toHaveLength(3)
    expect(Number(echec!.cout_usd)).toBe(0.0226)
    expect([reussite!.issue, reussite!.version_rang]).toEqual(['livree', 2])
    expect(toursDe(reussite)).toHaveLength(1)
  })

  it('S4 · deux réussites : deux tentatives distinctes, versions 2 et 3', async () => {
    // L'ŒUVRE DE DÉPART EST ENSEMENCÉE, pas produite : le sujet de S4 est les
    // DEUX régénérations, qui passent toutes deux par la vraie route. Un
    // troisième assemblage réel portait ce cas à 1,9 s, au-delà de la marge
    // exigée par `verifier-marge-tests.mjs` (un test qui calcule s'allège).
    const id = '44444444-4444-4444-4444-444444444444'
    base.tables.set(TABLE_GENERATIONS, [{
      id, owner_id: 'u-1', demande: 'calcule ma facture SNE', nom: 'Facture SNE',
      statut: 'livree', ok: true, document: { fichiers: {} }, version_courante: 1,
    }])
    base.tables.set(TABLE_VERSIONS, [{ generation_id: id, rang: 1, etape: 'livraison', etat: {} }])
    base.tables.set(TABLE_TENTATIVES, [{
      generation_id: id, rang: 1, nature: 'generation', issue: 'livree', version_rang: 1, trace: {},
    }])
    await regenerer(id, 'ok')
    await regenerer(id, 'ok')
    expect(tentativesDe(id).map((x) => [x.rang, x.issue, x.version_rang])).toEqual([
      [1, 'livree', 1],
      [2, 'livree', 2],
      [3, 'livree', 3],
    ])
  })

  it('S5 · une boucle qui jette : la ligne de l’œuvre intacte, la carte « refusee » GARDÉE, la tentative va à l’œuvre', async () => {
    const id = await oeuvreLivree()
    const avant = ligneDe(id)
    expect((await regenerer(id, 'B')).ok).toBe(false)
    expect(ligneDe(id)).toEqual(avant)
    const lignes = base.tables.get(TABLE_GENERATIONS) ?? []
    expect(lignes.filter((x) => x.id !== id).map((x) => x.statut)).toEqual(['refusee'])
    const t = tentativesDe(id)
    expect(t.map((x) => [x.rang, x.nature, x.issue])).toEqual([
      [1, 'generation', 'livree'],
      [2, 'regeneration', 'interrompue'],
    ])
    expect(String(((t[1]!.trace ?? {}) as Ligne).erreur)).toContain('503')
  })

  it('S6 · aucune tentative n’est jamais mise à jour, et toutes les écritures ont abouti', async () => {
    const id = await oeuvreLivree()
    await regenerer(id, 'A')
    await regenerer(id, 'ok')
    await regenerer(id, 'B')
    expect(base.misesAJourRefusees).toBe(0)
    expect(tentativesDe(id).map((x) => x.rang)).toEqual([1, 2, 3, 4])
  })

  it('S7 · interrupteur fermé : « Régénérer » est refusé (409) sans rien payer ni écrire, la génération neuve passe', async () => {
    // L'ŒUVRE DE DÉPART EST ENSEMENCÉE, comme en S4 : une seule génération
    // réelle tient dans la marge de `verifier-marge-tests.mjs` (deux : 1,9 s).
    const id = '77777777-7777-7777-7777-777777777777'
    base.tables.set(TABLE_GENERATIONS, [{
      id, owner_id: 'u-1', demande: 'calcule ma facture SNE', nom: 'Facture SNE',
      statut: 'livree', ok: true, document: { fichiers: {} }, version_courante: 1,
    }])
    base.tables.set(TABLE_VERSIONS, [{ generation_id: id, rang: 1, etape: 'livraison', etat: {} }])
    base.tables.set(TABLE_TENTATIVES, [{
      generation_id: id, rang: 1, nature: 'generation', issue: 'livree', version_rang: 1, trace: {},
    }])
    const avant = ligneDe(id)
    const appelsAvant = reseau.appels
    for (const v of [undefined, '', '0', 'true']) {
      if (v === undefined) delete process.env.NEXT_PUBLIC_REGENERATION_OUVERTE
      else process.env.NEXT_PUBLIC_REGENERATION_OUVERTE = v
      reseau.reponses = reponseDe('ok')
      const r = await generer(id)
      expect(r.status).toBe(409)
      expect(((await r.json()) as { error?: string }).error).toContain('régénération est fermée')
    }
    expect(reseau.appels).toBe(appelsAvant)
    expect(ligneDe(id)).toEqual(avant)
    expect(tentativesDe(id).map((x) => x.nature)).toEqual(['generation'])
    expect(versionsDe(id)).toEqual([1])
    // LA GÉNÉRATION NEUVE N'EST PAS CONCERNÉE par cet interrupteur.
    delete process.env.NEXT_PUBLIC_REGENERATION_OUVERTE
    const neuve = await oeuvreLivree()
    expect(tentativesDe(neuve).map((x) => [x.nature, x.issue])).toEqual([['generation', 'livree']])
  })
})
