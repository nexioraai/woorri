import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ============================================================
// « LA CRÉATION DE COMPTE DDM DOIT UNIQUEMENT SE FAIRE DEPUIS LE TABLEAU DE
// BORD DE LA CPA » (propriétaire, 2026-11-19, souligné).
//
// Cliquet : toute route qui ÉCRIT un compte d'agent du service `ddm` doit
// être gardée par `requireSiteOwner` (le propriétaire, connecté à son
// tableau de bord Deribfy). Une route d'inscription ou de compte visiteur
// qui l'écrirait ferait rougir ce test.
// ============================================================

const API = join(__dirname, '..', '..', 'app', 'api')
const routes = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n)
  return statSync(p).isDirectory() ? routes(p) : n === 'route.ts' ? [p] : []
})

describe('un agent DDM ne naît que depuis le tableau de bord CPA', () => {
  it('🔴 toute route qui écrit `service: \'ddm\'` est gardée par le propriétaire', () => {
    const ecrivent = routes(API).filter((f) => /service:\s*'ddm'/.test(readFileSync(f, 'utf8')))
    expect(ecrivent.length, 'au moins la route des agents').toBeGreaterThan(0)
    for (const f of ecrivent) expect(readFileSync(f, 'utf8'), f).toContain('requireSiteOwner(req, slug)')
  })

  it('🔴 l’inscription du site ne connaît ni « agent » ni le service', () => {
    const s = readFileSync(join(API, 'sites', '[slug]', 'inscription', 'route.ts'), 'utf8')
    expect(s).toMatch(/ROLES_INSCRIPTION = \['fournisseur', 'structure'\]/)
    expect(s).not.toMatch(/service:/)
  })
})
