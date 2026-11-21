/**
 * LE PRIX AFFICHÉ SUR « PUBLIER » EST CELUI DE STRIPE (2026-11-21).
 * Lu par `prices.retrieve(STRIPE_PRICE_APPLICATION)`, jamais écrit dans le code ;
 * illisible → `null`, et l'écran n'envoie personne chez Stripe.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({ lus: [] as string[], prix: { unit_amount: 2000, currency: 'usd' } as unknown, panne: false }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }))
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ prices: { retrieve: async (id: string) => { etat.lus.push(id); if (etat.panne) throw new Error('réseau'); return etat.prix } } }),
}))

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); etat.lus = []; etat.panne = false; etat.prix = { unit_amount: 2000, currency: 'usd' } })
const charger = async () => (await import('../abonnement-appli')).lirePrixAppli

describe('le prix de l’abonnement d’une appli', () => {
  it('2000 cents USD chez Stripe → 20 USD, lu UNE fois pour deux demandes (cache)', async () => {
    vi.stubEnv('STRIPE_PRICE_APPLICATION', 'price_ABC123')
    const lire = await charger()
    expect(await lire()).toEqual({ montant: 20, devise: 'USD' })
    expect(await lire()).toEqual({ montant: 20, devise: 'USD' })
    expect(etat.lus).toEqual(['price_ABC123'])
  })
  it('un autre prix chez Stripe → un autre affichage (rien n’est écrit en dur)', async () => {
    vi.stubEnv('STRIPE_PRICE_APPLICATION', 'price_ABC123')
    etat.prix = { unit_amount: 2500, currency: 'cad' }
    expect(await (await charger())()).toEqual({ montant: 25, devise: 'CAD' })
  })
  it('variable absente ou mal formée : null, Stripe n’est pas interrogé', async () => {
    vi.stubEnv('STRIPE_PRICE_APPLICATION', '')
    expect(await (await charger())()).toBeNull()
    vi.stubEnv('STRIPE_PRICE_APPLICATION', 'pas-un-prix')
    expect(await (await charger())()).toBeNull()
    expect(etat.lus).toEqual([])
  })
  it('Stripe en panne : null (et l’écran ne propose pas de payer)', async () => {
    vi.stubEnv('STRIPE_PRICE_APPLICATION', 'price_ABC123')
    etat.panne = true
    expect(await (await charger())()).toBeNull()
  })
})
