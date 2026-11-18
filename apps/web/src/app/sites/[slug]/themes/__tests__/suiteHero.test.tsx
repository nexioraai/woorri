import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import EditorialTheme from '../EditorialTheme'
import { CartProvider } from '../CartContext'
import type { Site } from '../shared'

// ============================================================
// SOUS LE HERO (CPA, 2026-11-18) — « après le hero, le mot du directeur avec
// sa photo ». Les blocs de `accueil-hero` après le premier se rendent sous le
// hero, chacun dans un repère `accueil-bloc-<rang stocké>` que l'éditeur
// visuel sélectionne. Sans eux : l'accueil d'avant, sans section en plus.
// ============================================================

const site = {
  id: 's', slug: 'cpa', name: 'CPA', mode: 1, lang: 'fr', hidden_sections: [],
  hero_title: 'CPA', about: 'À propos de la Centrale.', contact: {}, social_links: {},
  testimonials: [], sections: [], products: [], gallery: [], faq: [],
} as unknown as Site

const rendre = (p: Record<string, unknown>) =>
  renderToStaticMarkup(<CartProvider><EditorialTheme site={site} {...p} /></CartProvider>)

const MOT = { type: 'citation' as const, photo: 'https://exemple.org/dg.jpg', titre: 'Mot du Directeur général', texte: 'Bienvenue.\n\nSuite du mot.', auteur: 'Le Directeur général', fonction: 'CPA' }

describe('les blocs posés sous le hero', () => {
  it('le mot du directeur se rend, avec sa photo, sous le hero et avant « À propos »', () => {
    const html = rendre({ suiteHero: [{ i: 1, bloc: MOT }] })
    expect(html).toContain('id="accueil-bloc-1"')
    expect(html).toContain('Mot du Directeur général')
    expect(html).toContain('src="https://exemple.org/dg.jpg"')
    expect(html.indexOf('id="home"')).toBeLessThan(html.indexOf('id="accueil-suite"'))
    expect(html.indexOf('id="accueil-suite"')).toBeLessThan(html.indexOf('id="about"'))
  })

  it('le mot avec photo prend la forme de l’accueil ; sans photo, le rendu des pages', () => {
    expect(rendre({ suiteHero: [{ i: 1, bloc: MOT }] })).toContain('class="motAccueil"')
    const sansPhoto = rendre({ suiteHero: [{ i: 1, bloc: { ...MOT, photo: '' } }] })
    expect(sansPhoto).not.toContain('motAccueil')
    expect(sansPhoto).toContain('Bienvenue.')
  })

  it('le repère porte le RANG STOCKÉ, pas le rang affiché', () => {
    const html = rendre({ suiteHero: [{ i: 3, bloc: MOT }] })
    expect(html).toContain('id="accueil-bloc-3"')
    expect(html).not.toContain('id="accueil-bloc-1"')
  })

  it('sans bloc sous le hero, aucune section en plus (rendu d’avant)', () => {
    expect(rendre({})).not.toContain('accueil-suite')
    expect(rendre({ suiteHero: [] })).not.toContain('accueil-suite')
  })
})
