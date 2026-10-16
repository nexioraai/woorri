/**
 * EP-253 · LOT 2 — LE MOTEUR COMPILE CE QU'IL PRODUIT.
 *
 * ── CE QU'AUCUN JUGE NE VOYAIT.
 *
 * Les cinq juges d'acceptation lisent le DOCUMENT. Aucun ne compile. Mesuré
 * le 2026-10-16 : `compileProject` et `compileWeb` n'étaient appelés NULLE
 * PART pendant la génération — seulement à la LIVRAISON et à l'APERÇU,
 * c'est-à-dire devant l'utilisateur.
 *
 * Conséquence : un document pouvait être valide, passer tous les juges, et
 * ne produire aucune application. Personne ne s'en apercevait avant que le
 * propriétaire clique sur « télécharger » et reçoive une erreur 500.
 *
 * ── D'OÙ VIENT CETTE IDÉE, ET ELLE N'EST PAS DE MOI.
 *
 * Base44, observé le même jour sur le cahier CONTERAK : il écrit son code,
 * puis « Capture d'écran en cours » → « Capture effectuée — Vérification ».
 * Il REGARDE son propre travail. Deribfy jugeait un document sans jamais
 * regarder ce qu'il devenait.
 *
 * ── CE QUE CE CLIQUET TIENT, ET CE QU'IL NE PRÉTEND PAS.
 *
 * Il tient que la compilation a LIEU, qu'un échec devient un diagnostic
 * NOMMÉ, et qu'une œuvre qui ne compile pas n'est pas promise comme
 * téléchargeable.
 *
 * Il ne prétend PAS monter les écrans : cela demanderait un moteur de rendu
 * et une transpilation de TSX, que cette fonction ne peut pas porter. La
 * compilation est ce qu'on peut vérifier ici, gratuitement et partout — et
 * c'est déjà la différence entre « le document semble bon » et
 * « l'application existe ».
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { creerTravailleur, type BaseGeneration } from '../travailleur'
import { projeter } from '@/lib/testing/postgrest'
import { migrateAirDocument } from '@deribfy/air-schema'

const TABLE = 'app_generations_test'

/**
 * Un VRAI document AIR — pas un jouet : c'est tout l'objet de ce fichier.
 *
 * MIGRÉ avant usage, et il faut dire pourquoi : le corpus doré est écrit
 * dans une version ANTÉRIEURE du format, et `projectAirSchema` ne connaît
 * que la version courante. Le moteur, lui, émet toujours du courant — la
 * migration remet donc la fixture dans l'état réel de ce qui sort de lui,
 * au lieu de mesurer une incompatibilité de corpus.
 */
const documentReel = (): unknown =>
  migrateAirDocument(
    JSON.parse(
      readFileSync(
        join(__dirname, '..', '..', '..', '..', '..', '..', 'packages', 'golden-corpus', 'corpus-v3', 'bus-intercites.air.json'),
        'utf8',
      ),
    ) as Record<string, unknown>,
  )

function baseEnMemoire(lignes: Record<string, unknown>[]): {
  base: BaseGeneration
  tables: Record<string, Record<string, unknown>[]>
} {
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

const ligneNeuve = (): Record<string, unknown> => ({
  id: 'g-1', statut: 'en_attente', etape: 'p0', demande: 'une application',
  nom: 'application', owner_id: 'u-1', owner_email: 'x@y.z',
  created_at: '2026-10-16T00:00:00.000Z', battement: null,
  attente_validation: false, reprises: 0, sections_acquises: null,
  document: null, ok: false, cout_usd: 0,
})

/** Un moteur à blanc qui rend CE document et CE verdict. Aucun appel payant. */
const moteurQuiRend = (document: unknown, ok: boolean, diagnostics: unknown[] = []) => ({
  poursuivreEmission: () =>
    Promise.resolve({
      fini: true,
      resultat: {
        ok,
        document,
        diagnostics,
        tirages: [],
        coutUsd: 0,
        jetons: { entree: 0, sortie: 0 },
      },
    }) as never,
})

const tourner = async (document: unknown, ok: boolean, diagnostics: unknown[] = []) => {
  const { base, tables } = baseEnMemoire([ligneNeuve()])
  const w = creerTravailleur({
    table: TABLE,
    base,
    moteur: moteurQuiRend(document, ok, diagnostics),
    budgetTrancheMs: 60_000,
    battementPerimeMs: 900_000,
  })
  const r = await w.tourner()
  return { issue: r[0]?.issue, ligne: tables[TABLE][0] as Record<string, unknown> }
}

describe('EP-253 · le moteur compile ce qu il produit', () => {
  it('UN VRAI DOCUMENT COMPILE, et il est LIVRÉ', async () => {
    const { issue, ligne } = await tourner(documentReel(), true)
    expect(issue, 'un document du corpus n est pas livré').toBe('livree')
    expect(ligne.statut).toBe('livree')
    expect(ligne.document, 'l œuvre a été jetée').not.toBeNull()
  })

  it("LE DÉFAUT D'ORIGINE EST FERMÉ — des réserves ne détruisent plus l œuvre", async () => {
    // ── LE CONTRÔLE QUI COMPTE, ET CE QU IL A COÛTÉ D ÊTRE ABSENT.
    //
    // Douze générations sur CONTERAK, ~29 $, un tir à 22 sections sur 22 —
    // et jamais une application à l écran. Le moteur RENDAIT un document ;
    // quatre lignes le jetaient dès qu un diagnostic restait.
    const { issue, ligne } = await tourner(documentReel(), false, [
      { code: 'DERIVATION_TRAVERSEE_ACTEUR', path: 'ecrans[ecr_entree]' },
    ])
    expect(issue, 'une œuvre avec réserves est encore refusée').toBe('livree')
    expect(ligne.document, 'l œuvre a été jetée malgré sa validité').not.toBeNull()

    // ET LES JUGES GARDENT LA PAROLE : le verdict exact survit.
    expect(ligne.ok, 'le verdict des juges a été maquillé en conforme').toBe(false)
    expect(
      JSON.stringify(ligne.diagnostics ?? []),
      'le diagnostic des juges a disparu de la ligne',
    ).toContain('DERIVATION_TRAVERSEE_ACTEUR')
  })

  it('UN DOCUMENT QUI NE COMPILE PAS N EST PAS PROMIS — et le grief est NOMMÉ', async () => {
    // Promettre une application qu on ne peut pas prendre serait pire qu un
    // refus franc : la route de livraison compile et rend 500. Le grief
    // ouvre la liste des diagnostics — c est la première chose à lire.
    const { issue, ligne } = await tourner({ jouet: true }, true)
    expect(issue, 'un document incompilable a été promis comme livrable').toBe('refusee')
    expect(ligne.document, 'une ligne refusée porte un document : la contrainte tombe').toBeNull()

    const diag = JSON.stringify(ligne.diagnostics ?? [])
    expect(diag, 'l échec de compilation est muet : on ne saura pas pourquoi').toMatch(/COMPILE_/u)

    // ET CE QUI N EST PAS LIVRABLE SURVIT, pour la reprise : on ne repaye pas.
    const sa = (ligne.sections_acquises ?? {}) as Record<string, unknown>
    expect(sa.acquis, 'la base a été détruite : il faudra tout repayer').not.toBeNull()
  })

  it('LA COMPILATION A LIEU DANS LE TRAVAILLEUR, pas seulement à la livraison', () => {
    // Un contrôle de branchement : la règle peut être vraie et débranchée.
    const src = readFileSync(join(__dirname, '..', 'travailleur.ts'), 'utf8')
    expect(src, 'le travailleur ne compile pas').toMatch(/compileProject/u)
    expect(src, 'le grief de compilation n ouvre pas les diagnostics').toMatch(
      /compile\.ok \? \[\] : \[compile\.grief\]/u,
    )
  })
})
