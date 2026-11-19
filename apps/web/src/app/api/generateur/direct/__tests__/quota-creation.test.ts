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
 * ⑤ un compte exempté → le compteur n'est jamais touché.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TABLE_GENERATIONS, TABLE_VERSIONS } from '@/lib/apps/journal'
import { TABLE_TENTATIVES } from '@/lib/apps/tentatives'

const etat = vi.hoisted(() => ({ texte: '', email: 'marchand@example.com', appels: 0 }))
const reserver = vi.fn()
const solder = vi.fn()

vi.mock('@/lib/apps/quota', async (orig) => ({
  ...(await orig<typeof import('@/lib/apps/quota')>()),
  reserverCreation: (...a: unknown[]) => reserver(...a),
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
import { PHRASE_CREATION_OCCUPEE } from '@/lib/apps/quota'

const BON = [
  '=== index.tsx ===',
  "import { facture } from './calcul'",
  'export const total = facture(159)',
  '=== calcul.ts ===',
  'export const facture = (k: number) => Math.min(k,150)*85 + Math.max(0,k-150)*125 + 402',
].join('\n')

const appel = () =>
  new Request('https://deribfy.test/api/generateur/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer j' },
    body: JSON.stringify({ demande: 'calcule ma facture SNE', nom: 'Facture SNE' }),
  })
/** La route répond en flux : la dernière ligne non vide est le résultat. */
const fin = async (r: Response) => JSON.parse((await r.text()).trim().split('\n').filter((l) => l.trim() !== '').at(-1) ?? '{}') as Record<string, unknown>

beforeEach(() => {
  etat.appels = 0
  etat.email = 'marchand@example.com'
  etat.texte = BON
  reserver.mockReset().mockResolvedValue({ ok: true, id: 'resa-1' })
  solder.mockReset().mockResolvedValue({ ok: true })
  process.env.GENERATEUR_MOTEUR = 'direct'
  process.env.ANTHROPIC_API_KEY = 'cle-de-test'
})

describe('étape ② · une appli gratuite par compte', () => {
  it('① une appli non payée existe : 402, la phrase, le modèle n’est pas appelé', async () => {
    reserver.mockResolvedValue({ ok: false, raison: 'occupee' })
    const r = await POST(appel())
    expect(r.status).toBe(402)
    expect(((await r.json()) as { error: string }).error).toBe(PHRASE_CREATION_OCCUPEE)
    expect(etat.appels).toBe(0)
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
})
