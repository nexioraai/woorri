import { describe, it, expect } from 'vitest'
import { choisir, texteDe, BUDGET_CARACTERES } from '../assistant/contexte'

// LOT 16 — ce que l'assistant lit : le texte, dans le budget chiffré.

describe('le contexte de l’assistant', () => {
  it('🔴 les adresses et les clés techniques ne sont pas du texte', () => {
    const t = texteDe({ type: 'image', url: 'https://x/y.png', titre: 'Notre entrepôt', logo: '/l.png' })
    expect(t).toBe('Notre entrepôt')
  })

  it('🔴 la page la plus proche de la question passe en premier', () => {
    const r = choisir([
      { chemin: '/a', titre: 'Histoire', texte: 'fondée en 1990' },
      { chemin: '/b', titre: 'Appels d’offres', texte: 'date limite des offres' },
    ], 'quelle est la date limite des offres ?')
    expect(r[0].chemin).toBe('/b')
  })

  it('🔴 le budget n’est JAMAIS dépassé — c’est lui qui borne la facture', () => {
    const gros = Array.from({ length: 60 }, (_, i) => ({ chemin: `/p${i}`, titre: `Page ${i}`, texte: 'x'.repeat(2000) }))
    const r = choisir(gros, 'page')
    const total = r.reduce((n, f) => n + f.titre.length + f.texte.length + f.chemin.length + 20, 0)
    expect(total).toBeLessThanOrEqual(BUDGET_CARACTERES)
    expect(r.length).toBeGreaterThan(0)
  })
})
