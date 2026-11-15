/**
 * POST /api/sites/<slug>/apercu — pose le cookie d'aperçu. 2026-11-15.
 * Le garde est celui de l'éditeur (`requireSiteOwner`) : on vérifie qu'il est
 * appelé et OBÉI, et la forme exacte du cookie.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

const garde = { resultat: { ok: true, site: { id: 's1' } } as unknown }
const appels: { slug: string; colonnes: string }[] = []
vi.mock('@/lib/auth/require-site-owner', () => ({
  requireSiteOwner: async (_req: Request, slug: string, colonnes: string) => {
    appels.push({ slug, colonnes })
    return garde.resultat
  },
}))

import { POST } from '../apercu/route'

function jwt(exp: number): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256' })}.${b64({ sub: 'u', exp })}.sig`
}
const appeler = (jeton: string, slug = 'goura-doula-1794663944227') =>
  POST(new Request(`http://x/api/sites/${slug}/apercu`, { method: 'POST', headers: { Authorization: `Bearer ${jeton}` } }), {
    params: Promise.resolve({ slug }),
  })

describe('POST /api/sites/<slug>/apercu', () => {
  beforeEach(() => { appels.length = 0; garde.resultat = { ok: true, site: { id: 's1' } } })

  it('propriétaire (ou administrateur) : cookie HttpOnly, limité à /sites/<slug>, durée du jeton', async () => {
    const jeton = jwt(Math.floor(Date.now() / 1000) + 900)
    const r = await appeler(jeton)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ adresse: '/sites/goura-doula-1794663944227' })
    expect(appels).toEqual([{ slug: 'goura-doula-1794663944227', colonnes: 'id' }])
    const c = r.headers.get('set-cookie') ?? ''
    expect(c).toContain(`deribfy_apercu=${jeton}`)
    expect(c).toMatch(/Path=\/sites\/goura-doula-1794663944227/)
    expect(c).toMatch(/HttpOnly/i)
    expect(c).toMatch(/SameSite=lax/i)
    const age = Number(/Max-Age=(\d+)/.exec(c)?.[1])
    expect(age).toBeGreaterThan(850)
    expect(age).toBeLessThanOrEqual(900)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
  })

  it('un refus du garde (pas propriétaire, pas connecté) est rendu tel quel, SANS cookie', async () => {
    garde.resultat = { ok: false, response: NextResponse.json({ error: 'Acces refuse.' }, { status: 403 }) }
    const r = await appeler(jwt(Math.floor(Date.now() / 1000) + 900))
    expect(r.status).toBe(403)
    expect(r.headers.get('set-cookie')).toBeNull()
  })

  it('un jeton déjà expiré : 401, aucun cookie', async () => {
    const r = await appeler(jwt(Math.floor(Date.now() / 1000) - 10))
    expect(r.status).toBe(401)
    expect(r.headers.get('set-cookie')).toBeNull()
  })
})
