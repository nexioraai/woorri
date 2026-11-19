import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }))

import CadreEspace, { initiales } from '../CadreEspace'

// LE CADRE DU TABLEAU DE BORD (CPA, 2026-11-19) — barre latérale, identité,
// puis la page. Il ne décide rien : tant que le compte n'est pas lu, il montre
// un squelette ; la page, elle, est TOUJOURS rendue.
describe('CadreEspace', () => {
  it('les initiales viennent du nom, sinon de la structure', () => {
    expect(initiales('Mahamat Ali Hassan', 'ONG TESA')).toBe('MH')
    expect(initiales(null, 'ONG TESA')).toBe('OT')
    expect(initiales('', '')).toBe('?')
  })

  it('au premier rendu : la barre latérale (squelette), le titre et la page', () => {
    const h = renderToStaticMarkup(
      <CadreEspace slug="cpa" base="https://cpa.test" accent="#003670" lang="fr" actif="mes-commandes" titre="Mes commandes">
        <p>contenu de la page</p>
      </CadreEspace>,
    )
    expect(h).toContain('class="ceBarre"')
    expect(h).toContain('ceSquelette')
    expect(h).toContain('Mes commandes')
    expect(h).toContain('contenu de la page')
  })
})
