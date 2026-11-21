/**
 * ÉTAPE ② DU QUOTA · LA RETOUCHE RÉSERVE AVANT DE PAYER (2026-11-19).
 *
 * La règle elle-même (une instruction, deux clics → un seul passe) est prouvée
 * en base par scripts/preuve-quota-sql.mjs. Ce fichier prouve ce que la ROUTE
 * en fait :
 * ① plus de modification → 402 avec la phrase, et le modèle n'est PAS appelé ;
 * ② compteur injoignable → 503, rien n'est fait ni décompté (fermé par défaut) ;
 * ③ une retouche refusée (coupée) → la modification est LIBÉRÉE ;
 * ④ une retouche livrée → décomptée, et la réponse dit combien il en reste ;
 * ⑤ un compte exempté → le compteur n'est jamais touché.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'

const etat = { stop: 'end_turn' as string, texte: '', email: 'marchand@example.com', appels: 0, carte: false, prixLus: 0 }
const reserver = vi.fn()
const liberer = vi.fn()
const lire = vi.fn()

vi.mock('@/lib/apps/quota', async (orig) => ({
  ...(await orig<typeof import('@/lib/apps/quota')>()),
  reserverModification: (...a: unknown[]) => reserver(...a),
  libererModification: (...a: unknown[]) => liberer(...a),
  lireCompteur: (...a: unknown[]) => lire(...a),
}))
vi.mock('@/lib/payments/abonnement-appli', () => ({ abonnementCarteOuvert: async () => etat.carte, lirePrixAppli: async () => { etat.prixLus += 1; return { montant: 20, devise: 'USD' } } }))
vi.mock('@/lib/payments/mobile-money/encaissement', () => ({ mobileMoneyOuvert: async () => false }))
vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: etat.email }),
}))
const journal: { postgrest: JournalPostgrest } = { postgrest: journalVierge() }
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge: vierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS, TABLE_VERSIONS } = await import('@/lib/apps/journal')
  const { TABLE_TENTATIVES } = await import('@/lib/apps/tentatives')
  const j = vierge()
  journal.postgrest = j
  const doc = { fichiers: { 'index.tsx': 'export const a = 1' }, schema: '-- rien', politiques: '' }
  return {
    supabaseAdmin: {
      from: creerFrom(
        {
          [TABLE_GENERATIONS]: { reponse: { data: { document: doc, nom: 'App' }, error: null } },
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
        finalMessage: () => {
          etat.appels += 1
          return Promise.resolve({ content: [{ type: 'text', text: etat.texte }], stop_reason: etat.stop, usage: { input_tokens: 10, output_tokens: 10 } })
        },
      }),
    }
  },
}))

process.env.GENERATEUR_FOURNISSEUR = 'deepseek'
const { POST, GET } = await import('../route')
const { PHRASE_EPUISE } = await import('@/lib/apps/quota')

const appel = () =>
  POST(new Request('https://x/api/generateur/retoucher?id=g1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demande: 'mets les boutons en vert' }),
  }))

beforeEach(() => {
  etat.appels = 0
  etat.email = 'marchand@example.com'
  reserver.mockReset().mockResolvedValue({ ok: true, restantes: 36 })
  liberer.mockReset().mockResolvedValue({ ok: true })
  for (const k of Object.keys(journal.postgrest.ecritures)) journal.postgrest.ecritures[k] = []
})

describe('étape ② · la retouche réserve avant de payer', () => {
  it('① plus de modification : 402, la phrase, et le modèle n’est pas appelé', async () => {
    reserver.mockResolvedValue({ ok: false, raison: 'epuise' })
    const r = await appel()
    expect(r.status).toBe(402)
    expect(((await r.json()) as { error: string }).error).toBe(PHRASE_EPUISE)
    expect(etat.appels).toBe(0)
  })

  it('② compteur injoignable : 503, rien n’est fait', async () => {
    reserver.mockResolvedValue({ ok: false, raison: 'indisponible', detail: 'x' })
    const r = await appel()
    expect(r.status).toBe(503)
    expect(etat.appels).toBe(0)
  })

  it('③ une retouche refusée (coupée) : la modification est libérée', async () => {
    etat.stop = 'max_tokens'
    etat.texte = '=== index.tsx ===\nexport const a = '
    const r = await appel()
    expect(r.status).toBe(409)
    expect(reserver).toHaveBeenCalledWith('g1', 'u-1')
    expect(liberer).toHaveBeenCalledWith('g1', 'u-1')
  })

  it('④ une retouche livrée : décomptée, la réponse dit combien il en reste', async () => {
    etat.stop = 'end_turn'
    etat.texte = '=== index.tsx ===\nexport const a = 42'
    const r = await appel()
    const d = (await r.json()) as { ok?: boolean; modificationsRestantes?: number }
    expect(d.ok).toBe(true)
    expect(d.modificationsRestantes).toBe(36)
    expect(liberer).not.toHaveBeenCalled()
  })

  it('⑤ un compte exempté : le compteur n’est jamais touché', async () => {
    etat.email = 'issayamiyoussouf@gmail.com'
    etat.stop = 'end_turn'
    etat.texte = '=== index.tsx ===\nexport const a = 42'
    await appel()
    expect(reserver).not.toHaveBeenCalled()
    expect(liberer).not.toHaveBeenCalled()
  })
})

describe('étape ③ · ce que l’atelier lit avant de cliquer', () => {
  const lecture = () => GET(new Request('https://x/api/generateur/retoucher?id=g1'))
  it('un commerçant : le compteur, et PAS le plafond en dollars', async () => {
    lire.mockResolvedValue({ exempte: false, formule: 'gratuite', restantes: 10, payeJusquAu: null, actif: false })
    const d = (await (await lecture()).json()) as Record<string, unknown>
    expect(d.compteur).toEqual({ exempte: false, formule: 'gratuite', restantes: 10, payeJusquAu: null, actif: false })
    expect(d.plafond).toBeUndefined()
    expect(lire).toHaveBeenCalledWith('g1', 'u-1')
    // ÉTEINT par défaut : le bouton « S'abonner » ne se montre pas.
    expect(d.abonnementCarte).toBe(false)
    // Paiement par carte FERMÉ : aucun prix rendu, et Stripe n'est même pas interrogé.
    expect(d.prixCarte).toBeNull()
    expect(etat.prixLus).toBe(0)
    expect(d.prixMensuelXaf).toBeUndefined()
    expect(d.moyensPaiement).toBeUndefined()
    // ÉTEINT par défaut : le formulaire mobile money ne se montre pas.
    expect(d.mobileMoney).toBe(false)
  })
  it('paiement par carte OUVERT pour ce compte : le prix LU CHEZ STRIPE est rendu (celui que « Publier » affiche)', async () => {
    lire.mockResolvedValue({ exempte: false, formule: 'gratuite', restantes: 10, payeJusquAu: null, actif: false })
    etat.carte = true
    etat.prixLus = 0
    const d = (await (await lecture()).json()) as Record<string, unknown>
    etat.carte = false
    expect(d.abonnementCarte).toBe(true)
    expect(d.prixCarte).toEqual({ montant: 20, devise: 'USD' })
    expect(etat.prixLus).toBe(1)
  })
  it('le propriétaire : exempté, avec son plafond en dollars', async () => {
    etat.email = 'issayamiyoussouf@gmail.com'
    lire.mockClear()
    const d = (await (await lecture()).json()) as Record<string, unknown>
    expect(d.compteur).toEqual({ exempte: true })
    expect(typeof d.plafond).toBe('string')
    expect(lire).not.toHaveBeenCalled()
  })
})
