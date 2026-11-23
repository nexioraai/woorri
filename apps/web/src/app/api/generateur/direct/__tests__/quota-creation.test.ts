/**
 * ÉTAPE ② DU QUOTA · UNE APPLI GRATUITE PAR COMPTE (2026-11-19).
 *
 * La règle (verrou par compte : 6 créations simultanées → 1) est prouvée en
 * base par scripts/preuve-quota-sql.mjs. Ce fichier prouve ce que la ROUTE en
 * fait :
 * ① le compte a déjà une appli non payée → 402, la phrase, et le modèle n'est PAS appelé ;
 * ② compteur injoignable → 503, rien n'est payé ;
 * ③ une création livrée → la réservation est soldée « livree » avec l'appli ;
 * ④ une création qui échoue → la réservation est LIBÉRÉE ;
 * ⑤ un compte exempté → le compteur n'est jamais touché ;
 * ⑥ une création refusée AVANT le premier tour (cahier trop long pour le
 *   plafond, option B, 2026-11-21) → l'appli gratuite est RENDUE (libérée).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TABLE_GENERATIONS, TABLE_VERSIONS } from '@/lib/apps/journal'
import { TABLE_TENTATIVES } from '@/lib/apps/tentatives'

const etat = vi.hoisted(() => ({ texte: '', email: 'marchand@example.com', appels: 0 }))
const reserver = vi.fn()
const solder = vi.fn()
const gratuite = vi.fn()

vi.mock('@/lib/apps/quota', async (orig) => ({
  ...(await orig<typeof import('@/lib/apps/quota')>()),
  reserverCreation: (...a: unknown[]) => reserver(...a),
  etatDeLaGratuite: (...a: unknown[]) => gratuite(...a),
  solderCreation: (...a: unknown[]) => solder(...a),
}))
vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: etat.email }),
}))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  return {
    supabaseAdmin: {
      from: creerFrom(
        {
          [TABLE_GENERATIONS]: { reponse: { data: { id: 'g-1' }, error: null } },
          [TABLE_VERSIONS]: { reponse: { data: null, error: null } },
          [TABLE_TENTATIVES]: { reponse: { data: null, error: null } },
        },
        journalVierge(),
      ),
    },
  }
})
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      stream: () => ({
        finalMessage: () => {
          etat.appels += 1
          return { content: [{ type: 'text', text: etat.texte }], usage: { input_tokens: 100, output_tokens: 100 } }
        },
      }),
    }
  },
}))

import { POST } from '../route'
import { PHRASE_CREATION_EN_COURS, PHRASE_GRATUITE_UTILISEE } from '@/lib/apps/quota'

const BON = [
  '=== index.tsx ===',
  "import { facture } from './calcul'",
  'export const total = facture(159)',
  '=== calcul.ts ===',
  'export const facture = (k: number) => Math.min(k,150)*85 + Math.max(0,k-150)*125 + 402',
].join('\n')

const appel = (demande = 'calcule ma facture SNE') =>
  new Request('https://deribfy.test/api/generateur/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer j' },
    body: JSON.stringify({ demande, nom: 'Facture SNE' }),
  })
/** La route répond en flux : la dernière ligne non vide est le résultat. */
const fin = async (r: Response) => JSON.parse((await r.text()).trim().split('\n').filter((l) => l.trim() !== '').at(-1) ?? '{}') as Record<string, unknown>

beforeEach(() => {
  etat.appels = 0
  etat.email = 'marchand@example.com'
  etat.texte = BON
  reserver.mockReset().mockResolvedValue({ ok: true, id: 'resa-1' })
  gratuite.mockReset().mockResolvedValue({ appNonPayee: null, gratuiteSupprimee: false })
  solder.mockReset().mockResolvedValue({ ok: true })
  process.env.GENERATEUR_MOTEUR = 'direct'
  process.env.ANTHROPIC_API_KEY = 'cle-de-test'
})

describe('étape ② · une appli gratuite par compte', () => {
  it('① une appli non payée existe : 402, « Passez à l’abonnement », l’appli à abonner nommée, sans prix ni suppression ; le modèle n’est pas appelé', async () => {
    gratuite.mockResolvedValue({ appNonPayee: 'app-gratuite', gratuiteSupprimee: false })
    const r = await POST(appel())
    expect(r.status).toBe(402)
    const d = (await r.json()) as { error: string; gratuiteUtilisee: boolean; appAAbonner: string | null }
    expect(d).toMatchObject({ error: PHRASE_GRATUITE_UTILISEE, gratuiteUtilisee: true, appAAbonner: 'app-gratuite' })
    expect(d.error).toBe('Vous avez déjà utilisé votre application gratuite. Passez à l’abonnement pour en créer une autre.')
    expect(d.error, 'un prix ou une suppression est revenu').not.toMatch(/\$|US|mois|supprim/u)
    expect(etat.appels).toBe(0)
    expect(reserver).not.toHaveBeenCalled()
  })

  it('① bis B2 : l’appli gratuite a été SUPPRIMÉE sans avoir été payée → toujours refusé (supprimer ne rend rien)', async () => {
    gratuite.mockResolvedValue({ appNonPayee: null, gratuiteSupprimee: true })
    const r = await POST(appel())
    expect(r.status).toBe(402)
    expect(await r.json()).toMatchObject({ error: PHRASE_GRATUITE_UTILISEE, gratuiteUtilisee: true, appAAbonner: null })
    expect(etat.appels).toBe(0)
    expect(reserver).not.toHaveBeenCalled()
  })

  it('① ter une création déjà en cours : sa phrase à part, simple', async () => {
    reserver.mockResolvedValue({ ok: false, raison: 'occupee' })
    const r = await POST(appel())
    expect(r.status).toBe(409)
    expect(await r.json()).toMatchObject({ error: PHRASE_CREATION_EN_COURS, creationEnCours: true })
    expect(etat.appels).toBe(0)
  })

  it('① quater l’état de la gratuité illisible : 503, rien n’est payé', async () => {
    gratuite.mockResolvedValue(null)
    expect((await POST(appel())).status).toBe(503)
    expect(etat.appels).toBe(0)
    expect(reserver).not.toHaveBeenCalled()
  })

  it('② compteur injoignable : 503, rien n’est payé', async () => {
    reserver.mockResolvedValue({ ok: false, raison: 'indisponible' })
    const r = await POST(appel())
    expect(r.status).toBe(503)
    expect(etat.appels).toBe(0)
  })

  it('③ une création livrée : soldée « livree » avec l’appli', async () => {
    const d = await fin(await POST(appel()))
    expect(d.ok).toBe(true)
    expect(reserver).toHaveBeenCalledWith('u-1')
    expect(solder).toHaveBeenCalledWith('resa-1', 'u-1', 'livree', 'g-1')
  })

  it('④ une création qui échoue : la réservation est libérée', async () => {
    etat.texte = 'pas de fichiers ici'
    const d = await fin(await POST(appel()))
    expect(d.ok).toBe(false)
    expect(solder).toHaveBeenCalledWith('resa-1', 'u-1', 'liberee', null)
  })

  it('⑤ un compte exempté : le compteur n’est jamais touché', async () => {
    etat.email = 'issayamiyoussouf@gmail.com'
    await fin(await POST(appel()))
    expect(reserver).not.toHaveBeenCalled()
    expect(solder).not.toHaveBeenCalled()
  })

  it('⑥ refus avant le premier tour (cahier trop long pour le plafond) : le modèle n’est pas appelé, l’appli gratuite est RENDUE', async () => {
    delete process.env.GENERATEUR_FOURNISSEUR
    const d = await fin(await POST(appel('x'.repeat(300_000))))
    expect(etat.appels, 'le modèle a été appelé').toBe(0)
    expect(d.ok).toBe(false)
    expect(String(d.error)).toMatch(/Rien n’a été décompté/u)
    expect(reserver).toHaveBeenCalledWith('u-1')
    expect(solder, 'la réservation de l’appli gratuite n’a pas été libérée').toHaveBeenCalledWith('resa-1', 'u-1', 'liberee', null)
    expect(solder).not.toHaveBeenCalledWith('resa-1', 'u-1', 'livree', expect.anything())
  })
})
