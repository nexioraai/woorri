import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// LOT 19 — « Mot de passe oublié » envoyé par Resend. Ce cliquet tient :
// la réponse ne trahit jamais si une adresse existe ; aucun courriel à une
// adresse inconnue ; un envoi par deux minutes ; le lien mène au SITE.

let ouvre = true
let existant: string | null = 'u-1'
let envoyeIlYa = 0
const generateLink = vi.fn<(a: unknown) => Promise<{ data: { properties: { hashed_token: string } }; error: null }>>(async () => ({ data: { properties: { hashed_token: 'h4sh' } }, error: null }))
const envois: { url: string; corps: Record<string, unknown> }[] = []

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {
  rpc: async () => ({ data: existant, error: null }),
  auth: { admin: {
    getUserById: async () => ({ data: { user: { recovery_sent_at: envoyeIlYa ? new Date(Date.now() - envoyeIlYa).toISOString() : null } } }),
    generateLink: (a: unknown) => generateLink(a),
  } },
} }))
vi.mock('@/app/sites/[slug]/acces/ouvreDesComptes', () => ({ ouvreDesComptes: async () => ouvre }))
vi.mock('@/app/sites/[slug]/themes/shared', () => ({
  fetchSite: async () => ({ id: 's1', slug: 'cpa', name: 'Centrale (CPA)', lang: 'fr', primary_color: '#1F6B4A' }),
  resolveSiteBaseUrl: () => 'https://cpa-tchad.deribfy.app',
}))

import { POST } from '../route'

const demander = (email = 'amina@exemple.td') =>
  POST(new Request('https://x.test/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) }), { params: Promise.resolve({ slug: 'cpa' }) })

beforeEach(() => {
  ouvre = true; existant = 'u-1'; envoyeIlYa = 0; envois.length = 0; generateLink.mockClear()
  process.env.RESEND_API_KEY = 'cle-test'
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: { body: string }) => { envois.push({ url, corps: JSON.parse(init.body) }); return new Response('{}', { status: 200 }) }))
})
afterEach(() => vi.unstubAllGlobals())

describe('mot de passe oublié', () => {
  it('🔴 adresse connue : UN courriel, par Resend, avec un lien vers le SITE', async () => {
    const r = await demander()
    expect(await r.json()).toEqual({ ok: true })
    expect(envois).toHaveLength(1)
    expect(envois[0].url).toBe('https://api.resend.com/emails')
    expect(envois[0].corps.to).toEqual(['amina@exemple.td'])
    expect(String(envois[0].corps.text)).toContain('https://cpa-tchad.deribfy.app/nouveau-mot-de-passe?jeton=h4sh')
    expect(String(envois[0].corps.from)).toContain('Centrale (CPA)')
  })

  it('🔴 adresse INCONNUE : la MÊME réponse, et aucun courriel', async () => {
    existant = null
    expect(await (await demander()).json()).toEqual({ ok: true })
    expect(envois).toHaveLength(0)
    expect(generateLink).not.toHaveBeenCalled()
  })

  it('🔴 site sans comptes : la même réponse, rien n’est envoyé', async () => {
    ouvre = false
    expect(await (await demander()).json()).toEqual({ ok: true })
    expect(envois).toHaveLength(0)
  })

  it('🔴 un envoi par deux minutes : recliquer ne remplit pas la boîte', async () => {
    envoyeIlYa = 30_000
    await demander()
    expect(envois).toHaveLength(0)
    envoyeIlYa = 3 * 60_000
    await demander()
    expect(envois).toHaveLength(1)
  })

  it('🔴 une adresse mal formée ne déclenche rien', async () => {
    expect(await (await demander('pas-une-adresse')).json()).toEqual({ ok: true })
    expect(envois).toHaveLength(0)
  })
})
