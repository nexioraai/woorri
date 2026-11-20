/**
 * S'ABONNER À UNE APPLI PAR CARTE — la route (2026-11-20).
 * ① l'appli d'un autre compte → 404 ; ② une appli non livrée → 409 ;
 * ③ la bonne appli → l'adresse de la page Stripe, et la route ne déclare rien de payé.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({ ligne: null as null | Record<string, unknown>, ouvertures: [] as unknown[], ouvert: true }))
vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'a@b.c' }) }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
  return { supabaseAdmin: { from: creerFrom({ [TABLE_GENERATIONS]: { reponse: () => ({ data: etat.ligne, error: null }) } }, journalVierge()) } }
})
vi.mock('@/lib/payments/abonnement-appli', () => ({
  ouvrirPaiementAppli: async (o: unknown) => { etat.ouvertures.push(o); return { ok: true, url: 'https://checkout.stripe.test/s' } },
  abonnementCarteOuvert: async () => etat.ouvert,
  PHRASE_CARTE_FERMEE: 'Le paiement par carte des applications n’est pas encore ouvert.',
}))
import { POST } from '../route'

const appel = () => POST(new Request('https://www.deribfy.com/api/generateur/abonnement?id=app-1', { method: 'POST', headers: { origin: 'https://www.deribfy.com' } }))
beforeEach(() => { etat.ligne = null; etat.ouvertures = []; etat.ouvert = true })

describe('s’abonner à une appli', () => {
  it('① l’appli d’un autre compte : 404, rien n’est ouvert', async () => {
    expect((await appel()).status).toBe(404)
    expect(etat.ouvertures).toEqual([])
  })
  it('② une appli non livrée : 409', async () => {
    etat.ligne = { id: 'app-1', statut: 'refusee' }
    expect((await appel()).status).toBe(409)
    expect(etat.ouvertures).toEqual([])
  })
  it('③ la bonne appli : l’adresse de la page Stripe', async () => {
    etat.ligne = { id: 'app-1', statut: 'livree' }
    const r = await appel()
    expect(await r.json()).toEqual({ url: 'https://checkout.stripe.test/s' })
    expect(etat.ouvertures).toEqual([{ app: 'app-1', proprietaire: 'u-1', email: 'a@b.c', origine: 'https://www.deribfy.com' }])
  })
})

describe('l’interrupteur du paiement par carte (éteint par défaut)', () => {
  it('éteint : un appel DIRECT à la route est refusé (403), aucune page de paiement ne s’ouvre', async () => {
    etat.ouvert = false
    etat.ligne = { id: 'app-1', statut: 'livree' }
    const r = await appel()
    expect(r.status).toBe(403)
    expect(etat.ouvertures).toEqual([])
  })
})
