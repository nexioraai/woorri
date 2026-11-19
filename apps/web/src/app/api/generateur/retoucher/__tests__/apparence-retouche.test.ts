/**
 * SURCHARGE DE THÈME, BOUT EN BOUT DANS LA ROUTE (2026-11-18).
 *
 * « Mets les boutons en vert » était refusée deux fois sur deux : le modèle
 * réécrivait `systeme/ui.tsx` et la réponse était coupée.
 *
 * ① le modèle ne rend QUE `APPARENCE.json` : la retouche passe, le document
 *   et la version portent la couleur, les fichiers sont INCHANGÉS et ne
 *   contiennent pas `APPARENCE.json` ;
 * ② une couleur illisible est refusée avec sa raison, et rien n'est écrit ;
 * ③ une retouche sans couleur GARDE celle du document ;
 * ④ ⑤ `systeme/` est fermé à la réécriture (consigne + refus dans la route).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

const etat = { texte: '', apparenceAvant: null as null | { couleur: string } }

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
const ligne: { document: Record<string, unknown>; nom: string } = { document: {}, nom: 'Pharma' }
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge: vierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS, TABLE_VERSIONS } = await import('@/lib/apps/journal')
  const { TABLE_TENTATIVES } = await import('@/lib/apps/tentatives')
  const j = vierge()
  journal.postgrest = j
  return {
    supabaseAdmin: {
      from: creerFrom(
        {
          [TABLE_GENERATIONS]: { reponse: { data: ligne, error: null } },
          [TABLE_VERSIONS]: { reponse: { data: [], error: null } },
          [TABLE_TENTATIVES]: { reponse: { data: [], error: null } },
        },
        j,
      ),
    },
  }
})
vi.mock('@/lib/alertes', () => ({ alerter: () => Promise.resolve(null) }))
vi.mock('@/lib/apps/juge-execution', async () => {
  const { jugeMuet } = await import('@/lib/apps/__tests__/juge-muet')
  return { jugerExecution: jugeMuet }
})
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      stream: () => ({
        finalMessage: () => Promise.resolve({
          content: [{ type: 'text', text: etat.texte }], stop_reason: 'end_turn',
          usage: { input_tokens: 1_000, output_tokens: 20 },
        }),
      }),
    }
  },
}))

process.env.GENERATEUR_FOURNISSEUR = 'deepseek'
const { POST } = await import('../route')
const { TABLE_GENERATIONS, TABLE_VERSIONS } = await import('@/lib/apps/journal')

const FICHIERS = { 'index.tsx': 'export const a = 1', 'systeme/ui.tsx': 'export const b = 2' }
const appel = () =>
  POST(new Request('https://x/api/generateur/retoucher?id=g1', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demande: 'mets les boutons en vert' }),
  }))
const ecrits = (table: string, op: string) =>
  (journal.postgrest.ecritures[table] ?? [])
    .filter((e) => (e as { op?: string }).op === op)
    .map((e) => (e as { charge: Record<string, unknown> }).charge)

describe('surcharge de thème · la route', () => {
  beforeEach(() => {
    for (const k of Object.keys(journal.postgrest.ecritures)) journal.postgrest.ecritures[k] = []
    ligne.document = { fichiers: { ...FICHIERS }, schema: '-- rien', politiques: '', ...(etat.apparenceAvant ? { apparence: etat.apparenceAvant } : {}) }
  })

  it('① seulement APPARENCE.json : la couleur passe, le code ne bouge pas', async () => {
    etat.apparenceAvant = null
    ligne.document = { fichiers: { ...FICHIERS }, schema: '-- rien', politiques: '' }
    etat.texte = '=== APPARENCE.json ===\n{"couleur":"#2f7d4f"}'
    const r = await appel()
    const d = (await r.json()) as { ok?: boolean; couleur?: string; error?: string }
    expect(d.ok, String(d.error)).toBe(true)
    expect(d.couleur).toBe('#2f7d4f')
    const doc = ecrits(TABLE_GENERATIONS, 'update')[0]!.document as { fichiers: Record<string, string>; apparence?: unknown }
    expect(doc.apparence).toEqual({ couleur: '#2f7d4f' })
    expect(doc.fichiers).toEqual(FICHIERS)
    const version = ecrits(TABLE_VERSIONS, 'insert')[0]!.etat as { fichiers: Record<string, string>; apparence?: unknown }
    expect(version.apparence).toEqual({ couleur: '#2f7d4f' })
    expect(Object.keys(version.fichiers)).not.toContain('APPARENCE.json')
  })

  it('② une couleur illisible est refusée avec sa raison, rien n’est écrit', async () => {
    etat.texte = '=== APPARENCE.json ===\n{"couleur":"#1f8a5b"}'
    const r = await appel()
    const d = (await r.json()) as { error?: string }
    expect(r.status).toBe(409)
    expect(d.error).toMatch(motifTexte('texte blanc des boutons deviendrait illisible'))
    expect(ecrits(TABLE_GENERATIONS, 'update')).toEqual([])
    expect(ecrits(TABLE_VERSIONS, 'insert')).toEqual([])
  })

  it('④ systeme/ est fermé : une retouche qui le réécrit est refusée, rien n’est écrit', async () => {
    etat.texte = '=== systeme/ui.tsx ===\nexport const b = 3\n=== index.tsx ===\nexport const a = 9'
    const r = await appel()
    const d = (await r.json()) as { error?: string }
    expect(r.status).toBe(409)
    expect(d.error).toMatch(motifTexte('composants fournis par Deribfy (systeme/ui.tsx)'))
    expect(ecrits(TABLE_GENERATIONS, 'update')).toEqual([])
    expect(ecrits(TABLE_VERSIONS, 'insert')).toEqual([])
  })

  it('⑤ la consigne ferme systeme/ et n’invite plus à retoucher le composant partagé', async () => {
    const { CONSIGNE_RETOUCHE } = await import('@/lib/apps/retouche')
    expect(CONSIGNE_RETOUCHE).toMatch(motifTexte('LES FICHIERS DE `systeme/` SONT FOURNIS PAR DERIBFY : tu ne les rends'))
    expect(CONSIGNE_RETOUCHE).not.toMatch(motifTexte('retouche ce composant et lui seul'))
  })

  it('③ une retouche sans couleur garde celle du document', async () => {
    ligne.document = { fichiers: { ...FICHIERS }, schema: '-- rien', politiques: '', apparence: { couleur: '#6b46c1' } }
    etat.texte = '=== index.tsx ===\nexport const a = 42'
    const r = await appel()
    expect(((await r.json()) as { ok?: boolean }).ok).toBe(true)
    const doc = ecrits(TABLE_GENERATIONS, 'update')[0]!.document as { apparence?: unknown }
    expect(doc.apparence).toEqual({ couleur: '#6b46c1' })
  })
})
