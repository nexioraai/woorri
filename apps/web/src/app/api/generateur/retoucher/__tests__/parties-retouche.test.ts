/**
 * LES PARTIES DE LA DEMANDE ET LA FACE PUBLIQUE, AU NIVEAU DE LA ROUTE (2026-11-28).
 *
 * Sur la VRAIE réponse de 18:06 (« Suivi de colis ») : la page publique lisait
 * `colis` en entier au montage, sans compte — le 401 vu en console sur
 * suivi-de-colis.deribfy.app. Le juge des faces ne tournait qu'à la génération.
 *
 * ① Le défaut repart au modèle avec le BON remède (base.rpc, jamais « déclare
 *   publique ») ; le corrigé est livré ; toutes les parties se disent faites.
 * ② Pas corrigé après deux essais : livré, mais « Fait en partie », la partie
 *   mesurée « ✗ », NON décompté, et le fondateur est alerté.
 * ③ Sans liste des parties (après relance) : jamais « Modifié », non décompté.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'
import { lireFichiers } from '@/lib/apps/ecriture-directe'
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
const alertes: { motif: string; detail?: string }[] = []
vi.mock('@/lib/alertes', () => ({ alerter: (a: { motif: string; detail?: string }) => { alertes.push(a); return Promise.resolve(null) } }))

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
const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
const { messageDeRetouche } = await import('@/lib/apps/message-de-retouche')

const PIECE = JSON.parse(gunzipSync(readFileSync(join(__dirname, '../../../../../lib/apps/__tests__/fixtures/retouche-0178c047-1806.json.gz'))).toString('utf8')) as { reponse: string }
const PARTIES = '\n=== PARTIES.json ===\n[{"partie":"un numéro de suivi attribué à chaque colis","faite":true},{"partie":"une page publique où le client suit son colis par son numéro","faite":true}]\n'
const INDEX = lireFichiers(PIECE.reponse).find((f) => f.chemin === 'index.tsx')!.contenu
// LA LECTURE AU MONTAGE, telle que le modèle l'a écrite à 18:06.
const MONTAGE = `    if (base) {
      rafraichir();
      base.auth.getSession().then(({ data }) => setSession(data.session));`
// LE CORRIGÉ : la liste ne se charge qu'une fois la session obtenue.
const CORRIGE = `=== index.tsx ===\n${INDEX.replace(MONTAGE, `    if (base) {
      base.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session) rafraichir(); });`)}${PARTIES}`

const appel = () =>
  POST(new Request('https://x/api/generateur/retoucher?id=g1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demande: 'un numéro de suivi par colis et une page publique de suivi' }),
  }))
const doc = () =>
  (journal.postgrest.ecritures[TABLE_GENERATIONS] ?? [] as { op: string; charge: unknown }[])
    .map((e) => e as { op: string; charge: unknown })
    .find((e) => e.op === 'update')?.charge as { document: { fichiers: Record<string, string> } } | undefined

beforeEach(() => {
  etat.reponses = []
  etat.appels = []
  alertes.length = 0
  reserver.mockReset().mockResolvedValue({ ok: true, restantes: 36 })
  liberer.mockReset().mockResolvedValue({ ok: true })
  for (const k of Object.keys(journal.postgrest.ecritures)) journal.postgrest.ecritures[k] = []
})

describe('la retouche dit toutes les parties, et répare sa face publique', () => {
  it('le témoin : la pièce de 18:06 lit bien la table au montage (sinon ce test ne mesure rien)', () => {
    expect(INDEX).toMatch(motifTexte(MONTAGE))
    expect(CORRIGE).not.toMatch(motifTexte(MONTAGE))
  })

  it('① la lecture au montage repart au modèle avec le bon remède ; le corrigé est livré, tout est fait', async () => {
    etat.reponses = [PIECE.reponse + PARTIES, CORRIGE]
    const r = await appel()
    const d = (await r.json()) as Record<string, unknown>
    expect(d.ok, String(d.error)).toBe(true)
    expect(etat.appels).toHaveLength(2)
    const reproche = etat.appels[1]!.messages.at(-1)!.content
    expect(reproche).toMatch(motifTexte("base.rpc('colis_par_cle'"))
    expect(reproche).toMatch(motifTexte('Ne la déclare PAS publique'))
    expect(reproche).not.toMatch(/"lecturePublique":\strue/u)
    expect(doc()?.document.fichiers['index.tsx']).not.toMatch(motifTexte(MONTAGE))
    expect(d.constats).toEqual([])
    const montre = messageDeRetouche(d, true, '')
    expect(montre.texte).toMatch(/^Fait\s—\s2\spartie\(s\)\ssur\s2\s:/u)
    expect(montre.texte).toMatch(motifTexte('✓ une page publique où le client suit son colis par son numéro'))
    expect(montre.texte).not.toMatch(/Modifié/u)
    expect(liberer).not.toHaveBeenCalled()
    expect(alertes).toEqual([])
  }, 20_000)

  it('② pas corrigé après deux essais : livré « en partie », la partie mesurée dite, non décompté, fondateur alerté', async () => {
    etat.reponses = [PIECE.reponse + PARTIES, 'je ne vois pas', 'toujours pas']
    const r = await appel()
    const d = (await r.json()) as Record<string, unknown>
    expect(d.ok).toBe(true)
    expect(etat.appels).toHaveLength(3)
    const montre = messageDeRetouche(d, true, '')
    expect(montre.texte).toMatch(/^Fait\sen\spartie\s—\s2\spartie\(s\)\ssur\s3\.\sCette\smodification\sn’est\spas\sdécomptée\./u)
    expect(montre.texte).toMatch(motifTexte('✓ un numéro de suivi attribué à chaque colis'))
    expect(montre.texte).toMatch(motifTexte('✗ La page publique ne lit, sans compte, que ce qu’elle montre — non faite : elle lit encore « colis »'))
    expect(liberer).toHaveBeenCalledTimes(1)
    expect(d.modificationsRestantes).toBe(37)
    expect(alertes.map((a) => a.motif)).toEqual(['livraison partielle : modification non faite en entier'])
  }, 20_000)

  it('③ sans liste des parties, même après relance : jamais « Modifié », non décompté', async () => {
    // La réparation de la face publique ne rend pas non plus la liste.
    etat.reponses = [PIECE.reponse, 'rien de lisible', CORRIGE.replace(PARTIES, '')]
    const r = await appel()
    const d = (await r.json()) as Record<string, unknown>
    expect(d.ok).toBe(true)
    expect(etat.appels[1]!.messages.at(-1)!.content).toMatch(motifTexte('Ton fichier PARTIES.json manque'))
    const montre = messageDeRetouche(d, true, '')
    expect(montre.texte).toMatch(/^Je\sn’ai\spas\spu\sétablir,\spartie\spar\spartie,\sce\squi\sa\sété\sfait/u)
    expect(montre.texte).not.toMatch(/Modifié/u)
    expect(liberer).toHaveBeenCalledTimes(1)
  }, 20_000)
})
