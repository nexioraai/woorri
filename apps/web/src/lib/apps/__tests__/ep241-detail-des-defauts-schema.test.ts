/**
 * EP-241 · LE DETAIL D'UN DEFAUT DE SCHEMA SURVIT AU CHEMIN ASYNCHRONE.
 *
 * ── CE QUE LA LIGNE CONSERVAIT, ET CE QU'ELLE PERDAIT.
 *
 * La colonne `diagnostics` ne garde que `CODE@chemin`. Pour un defaut de
 * schema cela donne `SCHEMA@entities.1.fields.2` : on sait OU, jamais QUOI.
 * Le message de zod — « Unrecognized key: "x" », « Invalid input: expected
 * string, received number » — existe pourtant sur le diagnostic. Il mourait
 * dans le `map` du travailleur.
 *
 * ── CE QUE CE CLIQUET TIENT, ET CE QU'IL N'ESSAIE PAS DE TENIR.
 *
 * Il tient la CHAINE COMPLETE sans aucun appel paye : un document jouet qui
 * viole le vrai `projectAirSchema`, mappe exactement comme le fait le module
 * d'acceptation, puis ecrit par le VRAI travailleur dans une base en
 * memoire. Ce qu'on relit doit porter le chemin ET le message.
 *
 * Il ne pretend PAS capturer `issue.code` (`unrecognized_keys`) ni
 * `issue.keys` : ceux-la sont jetes dans `acceptation.mjs`, qui est SCELLE.
 * Le message porte la cle en clair — c'est ce qu'on garde, et on s'arrete la
 * plutot que d'ouvrir un scelle.
 */
import { describe, expect, it } from 'vitest'
import { detailDuDefaut } from '../journal'
import { creerTravailleur, type BaseGeneration } from '../travailleur'
import { projeter } from '@/lib/testing/postgrest'

const TABLE = 'app_generations_test'

/**
 * Base en memoire minimale : elle RETIENT, et elle HONORE `.select(...)`.
 *
 * La projection n'est pas un detail de confort : un harnais permissif rend
 * INVISIBLE le retrait d'un `.eq('owner_id', …)`, c'est-a-dire une fuite
 * entre comptes. Le cliquet d'architecture le refuse, et son plafond est
 * MONOTONE DECROISSANT — ma premiere version l'a fait passer de 40 a 41, et
 * c'est la suite complete d'apps/web qui me l'a appris.
 */
function baseEnMemoire(lignes: Record<string, unknown>[]) {
  const tables: Record<string, Record<string, unknown>[]> = { [TABLE]: lignes }
  const from = (table: string) => {
    const rows = (tables[table] ??= [])
    const filtres: ((l: Record<string, unknown>) => boolean)[] = []
    let action: { type: string; charge?: Record<string, unknown> } = { type: 'select' }
    let plafond: number | null = null
    let colonnes = '*'
    const trouver = () => {
      const out = rows.filter((l) => filtres.every((f) => f(l)))
      return plafond === null ? out : out.slice(0, plafond)
    }
    const executer = () => {
      if (action.type === 'update') {
        const vises = trouver()
        for (const l of vises) Object.assign(l, action.charge)
        // La projection s'applique APRES l'ecriture, comme PostgREST.
        return { data: projeter([...vises], colonnes), error: null }
      }
      return { data: projeter(trouver(), colonnes), error: null }
    }
    const b: Record<string, unknown> = {}
    b.select = (cols?: string) => { colonnes = typeof cols === 'string' ? cols : '*'; return b }
    b.update = (charge: Record<string, unknown>) => { action = { type: 'update', charge }; return b }
    b.insert = (charge: Record<string, unknown>) => { action = { type: 'insert', charge }; return b }
    b.eq = (c: string, v: unknown) => { filtres.push((l) => l[c] === v); return b }
    b.is = (c: string, v: unknown) => { filtres.push((l) => (l[c] ?? null) === v); return b }
    b.in = (c: string, v: unknown[]) => { filtres.push((l) => v.includes(l[c])); return b }
    b.lt = (c: string, v: unknown) => { filtres.push((l) => String(l[c] ?? '') < String(v)); return b }
    b.order = () => b
    b.limit = (n: number) => { plafond = n; return b }
    b.maybeSingle = async () => {
      const r = executer()
      return { data: (r.data as Record<string, unknown>[])[0] ?? null, error: r.error }
    }
    b.then = (suite: (r: unknown) => unknown) => Promise.resolve(executer()).then(suite)
    return b
  }
  return { base: { from } as unknown as BaseGeneration, tables }
}

describe('EP-241 · le détail d un défaut de schéma arrive jusqu à la ligne', () => {
  it("un vrai document jouet, un vrai zod : le chemin ET le message survivent", async () => {
    // ① LE DOCUMENT JOUET, et c est le VRAI schéma qui le refuse.
    const { projectAirSchema } = await import('@deribfy/air-schema')
    const lu = projectAirSchema.safeParse({ app: { nom: 'faux' }, cléInconnue: 1 })
    expect(lu.success, 'le document jouet DOIT être refusé, sinon rien n est prouvé').toBe(false)
    if (lu.success) return

    // ② LE MAPPING, à l identique de ce que fait le module d acceptation
    //    (scellé : on le REPRODUIT ici, on ne le modifie pas).
    const diagnostics = lu.error.issues.map((issue) => ({
      code: 'SCHEMA',
      path: issue.path.join('.'),
      message: issue.message,
    }))
    expect(diagnostics.length, 'zod n a rendu aucun défaut').toBeGreaterThan(0)

    // ③ CE QUE LA LIGNE CONSERVERA.
    const detail = diagnostics.map(detailDuDefaut)
    for (const d of detail) {
      expect(d.code).toBe('SCHEMA')
      expect(d.message, 'le message de zod est perdu — on ne saurait toujours pas QUOI').toBeTruthy()
    }
    // Au moins un défaut doit être localisé ET expliqué.
    expect(
      detail.some((d) => d.message.length > 0),
      'aucun message : la ligne ne dirait que « SCHEMA »',
    ).toBe(true)
  })

  it("le travailleur ÉCRIT ce détail dans le journal de la ligne", async () => {
    // Chaîne complète, sans un seul appel payant : un moteur jouet rend un
    // défaut de schéma porteur de son message, et on relit la ligne écrite.
    const { base, tables } = baseEnMemoire([
      {
        id: 'g-1', statut: 'en_attente', etape: 'p0', demande: 'une application',
        nom: 'application', owner_id: 'u-1', owner_email: 'x@y.z',
        created_at: '2026-10-16T00:00:00.000Z', battement: null,
        attente_validation: false, reprises: 0, sections_acquises: null,
        document: null, ok: false, cout_usd: 0,
      },
    ])
    const w = creerTravailleur({
      table: TABLE,
      base,
      moteur: {
        poursuivreEmission: () =>
          Promise.resolve({
            fini: true,
            resultat: {
              ok: false,
              raison: 'stagnation au tour 1 : 3 → 3 diagnostic(s)',
              document: null,
              tirages: [],
              diagnostics: [
                {
                  code: 'SCHEMA',
                  path: 'entities.1.fields.2',
                  message: 'Unrecognized key: "demoValues"',
                },
                {
                  code: 'SCHEMA',
                  path: 'screens.2.blocks.2.props.series.0',
                  message: 'Invalid input: expected object, received string',
                },
              ],
              coutUsd: 0,
              jetons: { entree: 0, sortie: 0 },
            },
          }) as never,
      },
      budgetTrancheMs: 60_000,
      battementPerimeMs: 900_000,
    })
    await w.tourner()

    const sa = (tables[TABLE][0].sections_acquises ?? {}) as {
      defauts?: { code: string; path: string; message: string }[]
    }
    expect(sa.defauts, 'aucun détail écrit : la ligne ne dira que « SCHEMA »').toBeDefined()
    expect(sa.defauts).toHaveLength(2)
    expect(sa.defauts?.[0]?.path).toBe('entities.1.fields.2')
    expect(sa.defauts?.[0]?.message).toBe('Unrecognized key: "demoValues"')
    expect(sa.defauts?.[1]?.message).toMatch(/expected object, received string/u)

    // CONTRÔLE NÉGATIF — ce que la colonne `diagnostics` garde, elle, reste
    // `CODE@chemin` : son contrat ne bouge pas, et c est voulu.
    const diag = tables[TABLE][0].diagnostics as string[]
    expect(diag).toContain('SCHEMA@entities.1.fields.2')
    expect(
      diag.join(' '),
      'le message ne doit PAS polluer `diagnostics` : son format est analysé ailleurs',
    ).not.toMatch(/Unrecognized key/u)
  })

  it('CONTRÔLE NÉGATIF — un diagnostic sans message ne fabrique pas de texte', () => {
    // Inventer un message serait pire que de ne rien dire : on saurait OÙ,
    // et on croirait savoir QUOI.
    expect(detailDuDefaut({ code: 'AIR_X', path: 'a.b' })).toEqual({
      code: 'AIR_X',
      path: 'a.b',
      message: '',
    })
  })

  it('les bornes tiennent : un chemin ou un message géant ne passe pas', () => {
    const d = detailDuDefaut({ code: 'SCHEMA', path: 'x'.repeat(500), message: 'y'.repeat(900) })
    expect(d.path.length).toBe(120)
    expect(d.message.length).toBe(240)
  })
})
