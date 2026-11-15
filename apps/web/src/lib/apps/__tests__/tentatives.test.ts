/**
 * CLIQUET — la table des tentatives et son module disent la MÊME chose.
 *
 * Le DDL vit dans `supabase/sql/app_generation_attempts.sql` ; le nom et les
 * colonnes dans `lib/apps/tentatives.ts`. Deux sources, donc une égalité à
 * tenir : une colonne ajoutée d'un seul côté doit casser ICI, pas en
 * production à la première génération (manque 4, 2026-11-15).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  COLONNES_ECRITES,
  COLONNES_TENTATIVE,
  ISSUES,
  LIMITE_TRACE_OCTETS,
  NATURES,
  TABLE_TENTATIVES,
  bornerTrace,
  ecrireTentative,
  ligneDeTentative,
} from '../tentatives'
// LE NOM DE LA TABLE DES ŒUVRES VIENT DE SA SOURCE UNIQUE : le cliquet
// `travailleur-isolation` interdit de l'écrire nu ailleurs que dans journal.ts.
import { TABLE_GENERATIONS, TABLE_VERSIONS } from '../journal'
import { motifTexte } from './motif-texte'

const SQL = readFileSync(join(__dirname, '../../../../supabase/sql/app_generation_attempts.sql'), 'utf8')
const ANNULATION = readFileSync(
  join(__dirname, '../../../../supabase/sql/app_generation_attempts_annulation.sql'),
  'utf8',
)

/** Les colonnes déclarées dans le `create table`, lues dans le fichier SQL. */
function colonnesDuSql(): string[] {
  const debut = SQL.indexOf(`create table if not exists public.${TABLE_TENTATIVES} (`)
  expect(debut).toBeGreaterThan(-1)
  const corps = SQL.slice(debut, SQL.indexOf('\n);', debut))
  return corps
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('--') && !l.startsWith('constraint') && !l.startsWith('references') && !l.startsWith('on ') && !l.startsWith('check'))
    .map((l) => l.split(/\s+/)[0]!)
}

const entree = {
  generationId: '11111111-1111-1111-1111-111111111111',
  rang: 1,
  nature: 'regeneration' as const,
  issue: 'non_convergee' as const,
  debut: new Date('2026-11-15T20:00:00Z'),
  fin: new Date('2026-11-15T20:01:30Z'),
  versionRang: null,
  fournisseur: 'deepseek',
  deploiement: { commit: 'abc1234', environnement: 'production', branche: 'main' },
  coutUsd: 0.022572,
  jetonsEntree: 3600,
  jetonsSortie: 10200,
  tirages: 3,
  diagnostics: ['Non convergé en 3 tours.'],
  trace: { tours: [{ rang: 1, ok: false, motif: 'm', source: { 'index.tsx': 'x' } }] },
}

describe('Manque 4 · la table des tentatives', () => {
  it('① les colonnes du module sont EXACTEMENT celles du fichier SQL, dans le même ordre', () => {
    expect(colonnesDuSql()).toEqual([...COLONNES_TENTATIVE])
  })

  it('② la ligne construite porte EXACTEMENT les colonnes écrites — ni plus, ni moins', () => {
    expect(Object.keys(ligneDeTentative(entree)).sort()).toEqual([...COLONNES_ECRITES].sort())
  })

  it('③ les issues et les natures admises par la base sont celles du module', () => {
    const issues = /issue in \(([^)]*)\)/.exec(SQL)?.[1] ?? ''
    expect(issues.split(',').map((x) => x.trim().replace(/'/g, ''))).toEqual([...ISSUES])
    const natures = /nature in \(([^)]*)\)/.exec(SQL)?.[1] ?? ''
    expect(natures.split(',').map((x) => x.trim().replace(/'/g, ''))).toEqual([...NATURES])
  })

  it('④ la base refuse toute mise à jour (déclencheur), et la table est fermée au navigateur', () => {
    // motifTexte : la phrase tolère un repli de ligne du SQL (EP-364).
    expect(SQL).toMatch(motifTexte(`before update on public.${TABLE_TENTATIVES}`))
    expect(SQL).toMatch(motifTexte(`raise exception '${TABLE_TENTATIVES} est en ajout seul`))
    expect(SQL).toMatch(motifTexte(`revoke all on public.${TABLE_TENTATIVES} from anon, authenticated, public;`))
    expect(SQL).toMatch(motifTexte(`alter table public.${TABLE_TENTATIVES} enable row level security;`))
    expect(SQL).toMatch(motifTexte(`alter table public.${TABLE_TENTATIVES} force row level security;`))
    expect(SQL).toMatch(
      motifTexte(`references public.${TABLE_GENERATIONS} (id) on update restrict on delete restrict`),
    )
  })

  it('⑤ la migration ne réécrit AUCUNE donnée existante, et l’annulation ne touche que sa table', () => {
    const sansCommentaires = (t: string) => t.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    const existantes = `(${TABLE_GENERATIONS}|${TABLE_VERSIONS})`
    expect(sansCommentaires(SQL)).not.toMatch(
      new RegExp(`\\b(update|delete|insert|truncate)\\s+(from\\s+|into\\s+)?public\\.${existantes}\\b`, 'i'),
    )
    expect(sansCommentaires(ANNULATION)).not.toMatch(new RegExp(`\\b${existantes}\\b`))
  })

  it('⑥ la ligne garde la mesure de CETTE tentative, et la durée vient des deux dates', () => {
    const l = ligneDeTentative(entree)
    expect(l.cout_usd).toBe(0.0226)
    expect(l.duree_ms).toBe(90_000)
    expect(l.trace_tronquee).toBe(false)
    expect(l.consigne).toBeNull()
  })

  it('⑦ une trace trop grande est ABRÉGÉE et le dit — jamais perdue', () => {
    const gros = 'x'.repeat(LIMITE_TRACE_OCTETS)
    const b1 = bornerTrace({ tours: [{ rang: 1, ok: false, motif: 'm', source: { 'a.tsx': gros } }], dernierTexte: gros })
    expect(b1.tronquee).toBe(true)
    expect(JSON.stringify(b1.trace)).not.toContain('"source"')
    expect(Buffer.byteLength(JSON.stringify(b1.trace))).toBeLessThanOrEqual(LIMITE_TRACE_OCTETS)
    const b2 = bornerTrace({ tours: [{ rang: 1, ok: false, motif: 'm' }], juge: gros + gros })
    expect(b2.tronquee).toBe(true)
    expect((b2.trace.tours as unknown[]).length).toBe(1)
    expect(bornerTrace({ tours: [] })).toEqual({ trace: { tours: [] }, tronquee: false })
  })

  it('⑧ le rang est LU, et une collision est rejouée une fois', async () => {
    const insertions: Record<string, unknown>[] = []
    const lectures: string[] = []
    let collisions = 1
    const client = {
      from: (table: string) => ({
        // LA PROJECTION ET LE FILTRE SONT ASSERTÉS, pas ignorés : le rang
        // se lit sur CETTE œuvre, et seulement la colonne `rang`.
        select: (colonnes: string) => ({
          eq: async (cle: string, valeur: unknown) => {
            lectures.push(`${table}:${colonnes}:${cle}=${String(valeur)}`)
            return { data: [{ rang: 1 }, { rang: 2 }], error: null }
          },
        }),
        insert: async (l: Record<string, unknown>) => {
          if (collisions-- > 0) return { error: { message: 'duplicate', code: '23505' } }
          insertions.push(l)
          return { error: null }
        },
      }),
    }
    const { rang: _rang, ...sansRang } = entree
    void _rang
    expect(await ecrireTentative(client, sansRang)).toEqual({ ok: true, rang: 3 })
    expect(insertions).toHaveLength(1)
    expect(lectures).toEqual([
      `${TABLE_TENTATIVES}:rang:generation_id=${entree.generationId}`,
      `${TABLE_TENTATIVES}:rang:generation_id=${entree.generationId}`,
    ])
    const refus = {
      from: () => ({
        select: (_colonnes: string) => ({ eq: async (_cle: string, _valeur: unknown) => ({ data: [], error: null }) }),
        insert: async () => ({ error: { message: 'relation does not exist', code: '42P01' } }),
      }),
    }
    expect(await ecrireTentative(refus, sansRang)).toEqual({ ok: false, cause: 'relation does not exist' })
  })
})
