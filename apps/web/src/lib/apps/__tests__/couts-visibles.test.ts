/**
 * B3 · LE COÛT N'EST JAMAIS MONTRÉ À UN CLIENT (prouvé le 2026-11-22).
 *
 * Constat : les écrans le cachaient à un client, mais les RÉPONSES des routes
 * le portaient (coutUsd des modifications, des versions, de « Mes projets »,
 * de la lecture du cahier, de la compréhension, de la création, de son état).
 * Ces tests tiennent la fermeture côté serveur ; le cliquet ③ dit qu'aucune
 * route du générateur ne peut en émettre un sans passer par elle.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { motifTexte } from './motif-texte'

vi.mock('server-only', () => ({}))
const compte = vi.hoisted(() => ({ email: 'client@exemple.com' as string }))
vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: async () => ({ ok: true, userId: 'u-1', email: compte.email }) }))
import { porteUnCout, reserverLesCoutsAuFondateur, retirerCouts } from '../couts-visibles'

beforeEach(() => { compte.email = 'client@exemple.com' })
const route = (corps: unknown, init: ResponseInit = {}) => async () => Response.json(corps, init)
const req = new Request('https://www.deribfy.com/api/generateur/version?id=a')

describe('B3 · le coût reste au fondateur', () => {
  it('retirerCouts ôte les champs de coût à toute profondeur, et rien d’autre', () => {
    const v = { ok: true, coutUsd: 0.1, versions: [{ rang: 1, coutUsd: 0.09, cout_usd: 0.09 }], lecture: { plafondUsd: 0.5, tables: 2 } }
    expect(retirerCouts(v)).toEqual({ ok: true, versions: [{ rang: 1 }], lecture: { tables: 2 } })
    expect(porteUnCout(v)).toBe(true)
    expect(porteUnCout(retirerCouts(v))).toBe(false)
  })

  it('un CLIENT ne reçoit aucun coût ; le statut et le reste de la réponse sont intacts', async () => {
    const r = await reserverLesCoutsAuFondateur(route({ versions: [{ rang: 1, coutUsd: 0.104 }], error: 'x' }, { status: 409 }))(req)
    expect(r.status).toBe(409)
    const t = await r.text()
    expect(t, 'un coût part chez un client').not.toMatch(/cout|plafond|0\.104/iu)
    expect(JSON.parse(t)).toEqual({ versions: [{ rang: 1 }], error: 'x' })
  })

  it('le FONDATEUR (compte exempté) les reçoit, tels quels', async () => {
    compte.email = 'issayamiyoussouf@gmail.com'
    const r = await reserverLesCoutsAuFondateur(route({ coutUsd: 0.104 }))(req)
    expect(await r.json()).toEqual({ coutUsd: 0.104 })
  })

  it('une réponse qui n’est pas du JSON (flux, page) passe sans être lue', async () => {
    const flux = new Response('\n\n', { headers: { 'content-type': 'text/plain' } })
    expect(await reserverLesCoutsAuFondateur(async () => flux)(req)).toBe(flux)
  })
})

describe('③ CLIQUET — aucune route du générateur n’émet un coût sans la porte', () => {
  const RACINE = join(__dirname, '..', '..', '..', 'app', 'api', 'generateur')
  const routes: string[] = []
  const marcher = (d: string): void => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) { if (n !== '__tests__') marcher(p); continue }
      if (n === 'route.ts') routes.push(p)
    }
  }
  marcher(RACINE)
  // La sonde est réservée au secret des crons (surveillance), jamais à un compte.
  const DEROGATIONS = new Set(['sonde'])
  // Le GET de la création est la sonde de déploiement, réservée au même secret.
  const DEROGATIONS_VERBE = new Set(['direct:GET'])
  it('chaque route qui manipule un coût exporte ses verbes par reserverLesCoutsAuFondateur', () => {
    expect(routes.length, 'le relevé ne trouve plus les routes').toBeGreaterThan(15)
    const fautes: string[] = []
    for (const p of routes) {
      const nom = p.split('/').slice(-2, -1)[0] ?? ''
      if (DEROGATIONS.has(nom)) continue
      const src = readFileSync(p, 'utf8')
      const manipule = /\bcoutUsd\b|\bcout_usd\b|etatGeneration\(/u.test(src)
      if (!manipule) continue
      for (const verbe of ['GET', 'POST']) {
        if (new RegExp(`export async function ${verbe}\\b`, 'u').test(src) && !DEROGATIONS_VERBE.has(`${nom}:${verbe}`)) fautes.push(`${nom}:${verbe}`)
      }
      // CHAQUE verbe exporté passe par la porte, pas seulement l'un d'eux.
      const exports = [...src.matchAll(/export const (GET|POST) = ([^\n]*)/gu)]
      if (exports.length === 0 && !DEROGATIONS_VERBE.has(`${nom}:GET`)) fautes.push(nom)
      for (const [, verbe, valeur] of exports) if (!(valeur ?? '').startsWith('reserverLesCoutsAuFondateur(')) fautes.push(`${nom}:${verbe}`)
    }
    expect(fautes, 'ces routes peuvent montrer un coût à un client').toEqual([])
  })
  it('la création, en flux, retire les coûts de son résultat pour un client', () => {
    const src = readFileSync(join(RACINE, 'direct', 'route.ts'), 'utf8')
    expect(src).toMatch(motifTexte('JSON.stringify(sansQuota(garde.email) ? fin : retirerCouts(fin))'))
  })
})
