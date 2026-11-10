import { describe, it, expect } from 'vitest'
import { retourValable } from '@/app/sites/[slug]/acces/retour'

// LOT 19 — le retour après inscription ne doit JAMAIS mener hors du site :
// sinon une page de connexion devient un outil d'hameçonnage.
describe('le retour après entrée', () => {
  it('🔴 un chemin de ce site est accepté', () => {
    expect(retourValable('/appels-offres/aoi-001-2026')).toBe('/appels-offres/aoi-001-2026')
  })
  it('🔴 tout ce qui sort du site est refusé', () => {
    // `//evil` sans point : un navigateur le lit comme l'hôte « evil ».
    for (const r of ['//evil', '//evil.com', 'https://evil.com', '/\\evil.com', 'evil.com', '/a?x=1', '/a#b', '', undefined, 42]) {
      expect(retourValable(r), String(r)).toBeNull()
    }
  })
})
