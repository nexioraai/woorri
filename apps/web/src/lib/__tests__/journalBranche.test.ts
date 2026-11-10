import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// LOT 14.3 — CHAQUE GESTE D'ADMINISTRATION ÉCRIT AU JOURNAL.
// Un journal que la moitié des routes oublie dit la moitié de l'histoire,
// et c'est toujours la moitié manquante qu'on cherchera.

const RACINE = join(__dirname, '..', '..', 'app', 'api', 'sites', '[slug]')
const code = (r: string) => readFileSync(join(RACINE, r, 'route.ts'), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const ATTENDU: [string, string[]][] = [
  ['comptes', ['compte.etat', 'compte.qualifier']],
  ['inscription', ['compte.inscrire']],
  ['mon-compte', ['compte.supprimer']],
  ['avis', ['avis.creer', 'avis.modifier', 'avis.publier', 'avis.etat']],
  ['offres', ['offre.decider', 'offre.repondre']],
  ['demandes', ['demande.etat', 'demande.repondre']],
]

describe('le journal est branché sur chaque geste', () => {
  for (const [route, actions] of ATTENDU) {
    it(`🔴 ${route} appelle journaliser() avec ses actions`, () => {
      const s = code(route)
      expect(s, `${route} n'écrit pas au journal`).toMatch(/await\s+journaliser\(/)
      for (const a of actions) expect(s.includes(`'${a}'`), `${route} : action ${a} absente`).toBe(true)
    })
  }

  it('🔴 la route de LECTURE du journal n’écrit rien et ne modifie rien', () => {
    const s = code('journal')
    expect(s).not.toMatch(/\.insert\(|\.update\(|\.delete\(|export\s+async\s+function\s+(POST|PATCH|DELETE)/)
  })

  it('🔴 chaque action respecte la forme imposée par la base', () => {
    for (const [, actions] of ATTENDU) for (const a of actions) expect(a).toMatch(/^[a-z_]+\.[a-z_]+$/)
  })
})
