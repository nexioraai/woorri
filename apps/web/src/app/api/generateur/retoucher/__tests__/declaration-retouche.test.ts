/**
 * LA RETOUCHE ET SA DÉCLARATION DE DONNÉES, AU NIVEAU DE LA ROUTE (2026-11-28).
 *
 * ① La sortie RÉELLE de 18:06 (JSON + prose) est livrée, sans relance, et la
 *   lecture par clé arrive dans le document — avant, elle était jetée et
 *   l'écran disait « Modifié ».
 * ② Un JSON cassé relance le modèle avec l'erreur exacte ; le corrigé est pris.
 * ③ Toujours cassé après 2 relances : échec. Rien n'est écrit (ni version, ni
 *   document), la modification est LIBÉRÉE (non décomptée), et l'écran dit
 *   « Échec : rien n'a été modifié » — jamais « Modifié ».
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

const etat = { reponses: [] as string[], appels: [] as { messages: { role: string; content: string }[] }[] }
const reserver = vi.fn()
const liberer = vi.fn()

vi.mock('@/lib/apps/quota', async (orig) => ({
  ...(await orig<typeof import('@/lib/apps/quota')>()),
  reserverModification: (...a: unknown[]) => reserver(...a),
  libererModification: (...a: unknown[]) => liberer(...a),
}))
vi.mock('@/lib/payments/abonnement-appli', () => ({ abonnementCarteOuvert: async () => false, lirePrixAppli: async () => null }))
vi.mock('@/lib/payments/mobile-money/encaissement', () => ({ mobileMoneyOuvert: async () => false }))
vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'marchand@example.com' }),
}))
const journal: { postgrest: JournalPostgrest } = { postgrest: journalVierge() }
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge: vierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS, TABLE_VERSIONS } = await import('@/lib/apps/journal')
  const { TABLE_TENTATIVES } = await import('@/lib/apps/tentatives')
  const j = vierge()
  journal.postgrest = j
  // L'appli « Suivi de colis » telle qu'en base AVANT la retouche : sa version 1
  // et ses entités, relues en lecture seule le 2026-11-28 (fixture).
  const { readFileSync: lire } = await import('node:fs')
  const { gunzipSync } = await import('node:zlib')
  const { join: joindre } = await import('node:path')
  const piece = JSON.parse(gunzipSync(lire(joindre(__dirname, '../../../../../lib/apps/__tests__/fixtures/retouche-0178c047-1806.json.gz'))).toString('utf8')) as { avant: { fichiers: Record<string, string>; entites: unknown[] } }
  const doc = { fichiers: piece.avant.fichiers, schema: '-- rien', politiques: '', entites: piece.avant.entites }
  return {
    supabaseAdmin: {
      from: creerFrom(
        {
          [TABLE_GENERATIONS]: { reponse: { data: { document: doc, nom: 'Suivi de colis', publie_le: null }, error: null } },
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
      stream: (args: { messages: { role: string; content: string }[] }) => ({
        finalMessage: () => {
          etat.appels.push({ messages: args.messages.map((m) => ({ ...m })) })
          const texte = etat.reponses.shift() ?? ''
          return Promise.resolve({ content: [{ type: 'text', text: texte }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } })
        },
      }),
    }
  },
}))

process.env.GENERATEUR_FOURNISSEUR = 'deepseek'
const { POST } = await import('../route')
const { TABLE_GENERATIONS, TABLE_VERSIONS } = await import('@/lib/apps/journal')
const { PHRASE_ECHEC_DECLARATION } = await import('@/lib/apps/relance-declaration')
const { messageDeRetouche } = await import('@/lib/apps/message-de-retouche')

// LA RÉPONSE BRUTE RÉELLE de 18:06 : le code (index.tsx) puis DONNEES.json (JSON + prose).
const PIECE = JSON.parse(gunzipSync(readFileSync(join(__dirname, '../../../../../lib/apps/__tests__/fixtures/retouche-0178c047-1806.json.gz'))).toString('utf8')) as { reponse: string }
const REPONSE_1806 = PIECE.reponse
const CODE = REPONSE_1806.slice(0, REPONSE_1806.indexOf('=== DONNEES.json ==='))
const BON = '[{"id":"ent_colis","name":"colis","lectureParCle":{"cle":"numero_suivi","champs":["numero_suivi","statut"]},"fields":[{"id":"fld_numero_suivi","name":"numero_suivi","type":"text","unique":true,"required":true}]}]'

const appel = () =>
  POST(new Request('https://x/api/generateur/retoucher?id=g1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demande: 'un numéro de suivi par colis' }),
  }))

const ecrites = (table: string) => (journal.postgrest.ecritures[table] ?? []) as { op: string; charge: unknown }[]

beforeEach(() => {
  etat.reponses = []
  etat.appels = []
  reserver.mockReset().mockResolvedValue({ ok: true, restantes: 36 })
  liberer.mockReset().mockResolvedValue({ ok: true })
  for (const k of Object.keys(journal.postgrest.ecritures)) journal.postgrest.ecritures[k] = []
})

describe('la retouche lit sa déclaration de données, la relance, ou échoue honnêtement', () => {
  it('① la sortie réelle de 18:06 (JSON + prose) est livrée sans relance, lecture par clé comprise', async () => {
    etat.reponses = [REPONSE_1806]
    expect(CODE).toMatch(motifTexte('=== index.tsx ==='))
    const r = await appel()
    const d = (await r.json()) as { ok?: boolean; declarationRejetee?: string; error?: string }
    expect(d.error).toBeUndefined()
    expect(d.ok).toBe(true)
    expect(d.declarationRejetee).toBeUndefined()
    expect(etat.appels).toHaveLength(1)
    const doc = (ecrites(TABLE_GENERATIONS).find((e) => e.op === 'update')?.charge as { document: { entites: { lectureParCle?: unknown }[]; fichiers: Record<string, string> } }).document
    expect(doc.entites[0]?.lectureParCle).toEqual({ cle: 'numero_suivi', champs: ['numero_suivi', 'statut', 'ville_destination'] })
    expect(Object.keys(doc.fichiers)).not.toContain('DONNEES.json')
    expect(liberer).not.toHaveBeenCalled()
  })

  it('② un JSON cassé relance le modèle avec l’erreur exacte, et le corrigé est livré', async () => {
    etat.reponses = [`${CODE}=== DONNEES.json ===\n[{"id": "ent_colis", cassé\n`, `=== DONNEES.json ===\n${BON}\n`]
    const r = await appel()
    const d = (await r.json()) as { ok?: boolean }
    expect(d.ok).toBe(true)
    expect(etat.appels).toHaveLength(2)
    const relance = etat.appels[1]!.messages
    // La conversation reprend : la demande, la réponse refusée, puis l'erreur exacte.
    expect(relance.map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
    expect(relance[2]!.content).toMatch(motifTexte('TA DÉCLARATION DONNEES.json A ÉTÉ REFUSÉE'))
    expect(relance[2]!.content).toMatch(/aucun\s+JSON\s+lisible\s+:\s+.*JSON/u)
    const doc = (ecrites(TABLE_GENERATIONS).find((e) => e.op === 'update')?.charge as { document: { entites: { lectureParCle?: { cle: string } }[] } }).document
    expect(doc.entites[0]?.lectureParCle?.cle).toBe('numero_suivi')
  })

  it('② bis un refus du contrat relance avec le chemin exact de zod', async () => {
    etat.reponses = [`${CODE}=== DONNEES.json ===\n[{"id":"ent_colis","name":"colis","inventee":1,"fields":[{"id":"fld_numero_suivi","name":"numero_suivi","type":"text"}]}]\n`, `=== DONNEES.json ===\n${BON}\n`]
    const d = (await (await appel()).json()) as { ok?: boolean }
    expect(d.ok).toBe(true)
    expect(etat.appels[1]!.messages[2]!.content).toMatch(motifTexte('refusé par le contrat'))
    expect(etat.appels[1]!.messages[2]!.content).toMatch(/inventee/u)
  })

  it('③ toujours cassé après 2 relances : échec, rien d’écrit, non décompté, jamais « Modifié »', async () => {
    etat.reponses = [`${CODE}=== DONNEES.json ===\n[{cassé\n`, '=== DONNEES.json ===\n[{encore\n', 'toujours [ rien']
    const r = await appel()
    expect(r.status).toBe(409)
    const d = (await r.json()) as { ok?: boolean; error?: string; relances?: number }
    expect(d.ok).toBeUndefined()
    expect(d.error).toBe(PHRASE_ECHEC_DECLARATION)
    expect(d.relances).toBe(2)
    expect(etat.appels).toHaveLength(3)
    // Aucune version, aucun document : l'appli reste à la version d'avant.
    expect(ecrites(TABLE_VERSIONS).filter((e) => e.op === 'insert')).toEqual([])
    expect(ecrites(TABLE_GENERATIONS).filter((e) => e.op === 'update')).toEqual([])
    // Non décomptée : la réservation est rendue.
    expect(liberer).toHaveBeenCalledWith('g1', 'u-1')
    // Ce que l'atelier affiche.
    const montre = messageDeRetouche(d, false, '')
    expect(montre.genre).toBe('erreur')
    expect(montre.texte).toMatch(/^Échec\s+:\s+rien\s+n’a\s+été\s+modifié/u)
    expect(montre.texte).not.toMatch(/Modifié\s+—/u)
  })
})
