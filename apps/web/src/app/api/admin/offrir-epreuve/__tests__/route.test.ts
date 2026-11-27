/**
 * « OFFRIR (ÉPREUVE) » (2026-11-27, O2).
 *
 * ① un compte non administrateur → 403, RIEN n'est écrit ni appelé ;
 * ② l'offre passe par la fonction unique du registre : fournisseur `offert`,
 *    montant 0, référence `epreuve-<id>`, `saisi_par` = l'adresse du jeton —
 *    jamais un fournisseur d'argent, jamais un montant reçu ;
 * ③ le propriétaire est LU EN BASE : un `owner` glissé dans le corps est ignoré ;
 * ④ une appli déjà payée et en cours → 409, rien n'est appelé ;
 * ⑤ une appli non livrée → 409 ;
 * ⑥ déjà offerte une fois → 409, dit ;
 * ⑦ la route ne touche pas la décision de publier (A1 intact) : aucune
 *    exemption par compte n'y entre.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const APP = '11111111-2222-3333-4444-555555555555'
const etat = vi.hoisted(() => ({
  email: 'issayamiyoussouf@gmail.com',
  appli: null as null | Record<string, unknown>,
  compteur: null as null | Record<string, unknown>,
  rpc: { data: { statut: 'enregistre', app_id: '', jusqu_au: '2026-12-27T00:00:00Z' } as unknown, error: null as null | { message: string } },
  appels: [] as { nom: string; args: Record<string, unknown> }[],
}))
vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: async () => ({ ok: true, userId: 'u-admin', email: etat.email }) }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
  return {
    supabaseAdmin: {
      from: creerFrom({
        [TABLE_GENERATIONS]: { reponse: () => ({ data: etat.appli, error: null }) },
        app_compteurs: { reponse: () => ({ data: etat.compteur, error: null }) },
      }, journalVierge()),
      rpc: async (nom: string, args: Record<string, unknown>) => { etat.appels.push({ nom, args }); return etat.rpc },
    },
  }
})
import { POST } from '../route'

const offrir = (corps: Record<string, unknown> = { appId: APP }) =>
  POST(new Request('https://www.deribfy.com/api/admin/offrir-epreuve', {
    method: 'POST', headers: { authorization: 'Bearer j', 'content-type': 'application/json' }, body: JSON.stringify(corps),
  }))

beforeEach(() => {
  etat.email = 'issayamiyoussouf@gmail.com'
  etat.appli = { id: APP, owner_id: 'u-proprietaire', statut: 'livree' }
  etat.compteur = null
  etat.rpc = { data: { statut: 'enregistre', app_id: APP, jusqu_au: '2026-12-27T00:00:00Z' }, error: null }
  etat.appels = []
})

describe('offrir pour épreuve', () => {
  it('① un compte ordinaire : 403, rien n’est appelé', async () => {
    etat.email = 'client@exemple.com'
    const r = await offrir()
    expect(r.status).toBe(403)
    expect(etat.appels).toEqual([])
  })

  it('② la ligne : offert, 0, epreuve-<id>, saisie par l’adresse du jeton', async () => {
    const r = await offrir()
    expect(r.status).toBe(200)
    expect(etat.appels).toHaveLength(1)
    expect(etat.appels[0]).toEqual({
      nom: 'enregistrer_paiement',
      args: {
        p_source: 'manuelle', p_fournisseur: 'offert', p_reference: `epreuve-${APP}`,
        p_app: APP, p_owner: 'u-proprietaire', p_objet: 'abonnement',
        p_montant: 0, p_devise: 'USD', p_jusqu_au: null, p_saisi_par: 'issayamiyoussouf@gmail.com',
      },
    })
  })

  it('③ un propriétaire ou un montant glissés dans le corps sont ignorés', async () => {
    await offrir({ appId: APP, owner: 'u-pirate', montant: 99, fournisseur: 'stripe' })
    expect(etat.appels[0]?.args).toMatchObject({ p_owner: 'u-proprietaire', p_montant: 0, p_fournisseur: 'offert' })
  })

  it('④ déjà payée et en cours : 409, rien n’est appelé', async () => {
    etat.compteur = { statut: 'abonnee', paye_jusqu_au: new Date(Date.now() + 86_400_000).toISOString() }
    expect((await offrir()).status).toBe(409)
    expect(etat.appels).toEqual([])
  })

  it('④ bis abonnement échu : l’offre passe', async () => {
    etat.compteur = { statut: 'abonnee', paye_jusqu_au: '2026-01-01T00:00:00Z' }
    expect((await offrir()).status).toBe(200)
  })

  it('⑤ appli non livrée : 409 ; inconnue : 404 ; id mal formé : 400', async () => {
    etat.appli = { id: APP, owner_id: 'u-proprietaire', statut: 'en_cours' }
    expect((await offrir()).status).toBe(409)
    etat.appli = null
    expect((await offrir()).status).toBe(404)
    expect((await offrir({ appId: 'x' })).status).toBe(400)
    expect(etat.appels).toEqual([])
  })

  it('⑥ déjà offerte une fois : 409, dit', async () => {
    etat.rpc = { data: { statut: 'deja_enregistre', app_id: APP, jusqu_au: null }, error: null }
    const r = await offrir()
    expect(r.status).toBe(409)
    expect(((await r.json()) as { dejaOfferte: boolean }).dejaOfferte).toBe(true)
  })

  it('⑦ A1 intact : la décision de publier ne lit aucune exemption par compte', () => {
    const src = readFileSync(join(__dirname, '../../../../../lib/apps/decision-publication.ts'), 'utf8')
    const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/u.test(l)).join('\n')
    expect(code).not.toMatch(/sansQuota|estAdmin|ADMIN_EMAILS|offrir-epreuve/u)
  })
})
