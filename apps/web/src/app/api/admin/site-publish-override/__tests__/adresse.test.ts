/**
 * LA MISE EN LIGNE HORS STRIPE DONNE L'ADRESSE (2026-11-19).
 *
 * Le bouton admin « mise en ligne — paiement hors ligne » est le chemin de
 * publication des sept sites payés comptant (mesuré, journal checkout_anomalies).
 * ① publier → l'adresse <nom>.deribfy.app est assurée, et rendue ;
 * ② retirer → aucune adresse demandée ;
 * ③ l'adresse échoue → la mise en ligne reste faite, l'échec est journalisé.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const assurer = vi.fn()
vi.mock('@/lib/sites/adresse-site', () => ({ assurerAdresseSite: (...a: unknown[]) => assurer(...a) }))
const anomalies: unknown[] = []
vi.mock('@/lib/anomaly', () => ({ logAnomaly: async (a: unknown) => { anomalies.push(a) } }))
import { creerFrom, journalVierge } from '@/lib/testing/postgrest'
let journal = journalVierge()
const SITE = { id: 's1', slug: 'goura-doula-1', name: 'Goura Doula', published: false, archived_at: null, subscription_status: null, owner_email: 'x@y.z' }
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: { getUser: async () => ({ data: { user: { email: 'issayamiyoussouf@gmail.com' } }, error: null }) },
    // Le double FIDÈLE : la projection honorée, les écritures notées.
    from: (t: string) => creerFrom({ sites: { reponse: { data: SITE, error: null } } }, journal)(t),
  },
}))
const mises = () => (journal.ecritures.sites ?? []).filter((e) => (e as { op: string }).op === 'update').map((e) => (e as { charge: unknown }).charge)

import { POST } from '../route'

const appel = (publish: boolean) =>
  new NextRequest('https://www.deribfy.com/api/admin/site-publish-override', {
    method: 'POST',
    headers: { authorization: 'Bearer t' },
    body: JSON.stringify({ slug: 'goura-doula-1', publish, reason: 'payé comptant, reçu 001' }),
  })

beforeEach(() => { assurer.mockReset(); anomalies.length = 0; journal = journalVierge() })

describe('mise en ligne hors Stripe', () => {
  it('① publier → l’adresse est assurée et rendue', async () => {
    assurer.mockResolvedValue({ ok: true, nom: 'goura-doula', lien: 'https://goura-doula.deribfy.app' })
    const r = await POST(appel(true))
    expect(assurer).toHaveBeenCalledWith('goura-doula-1', 'Goura Doula')
    expect(await r.json()).toMatchObject({ published: true, adresse: 'https://goura-doula.deribfy.app' })
  })

  it('② retirer → aucune adresse demandée', async () => {
    await POST(appel(false))
    expect(assurer).not.toHaveBeenCalled()
  })

  it('③ l’adresse échoue → la mise en ligne reste faite, l’échec est journalisé', async () => {
    assurer.mockResolvedValue({ ok: false, status: 502, erreur: 'Vercel refuse' })
    const r = await POST(appel(true))
    expect(r.status).toBe(200)
    expect(mises()).toEqual([{ published: true, subscription_status: 'offline' }])
    expect(JSON.stringify(anomalies)).toContain('site_adresse_non_attribuee')
  })
})
