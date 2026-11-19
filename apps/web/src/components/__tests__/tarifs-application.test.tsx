/**
 * LA PAGE TARIFS : QUATRE PRODUITS, UNE SEULE DEVISE (décision du propriétaire, 2026-11-19).
 *
 * « Je veux que Deribfy soit universel » : le dollar US est la devise de base,
 * Stripe affichera la monnaie locale du visiteur. Prix définitifs (2026-11-19) :
 * Vitrine 10, Boutique 15, Dropshipping 15, Application 20 — ceux des prix Stripe. Mesuré avant de
 * changer : le seul abonné payant était le propriétaire lui-même.
 *
 * Chaque carte porte une ancre (`/pricing#application`…) : c'est là que mène la
 * colonne « Produit » du pied de page.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/lib/translations'
import PricingContent from '@/app/pricing/PricingContent'

vi.mock('@/components/Navbar', () => ({ default: () => null }))

const rendre = (langue: 'fr' | 'en') =>
  renderToStaticMarkup(<LanguageProvider langueImposee={langue}><PricingContent /></LanguageProvider>)

/** Chaque carte : son ancre, son titre et la ligne de prix qui le suit, au MÊME format. */
const cartes = (html: string) =>
  [...html.matchAll(/id="([a-z]+)"[^>]*>(?:<span[^>]*>[^<]*<\/span>)?<h2 class="text-xl font-bold">([^<]+)<\/h2><div[^>]*><span[^>]*>\$(\d+)<\/span><span[^>]*>([^<]+)<\/span><\/div><p/gu)]
    .map((m) => `#${m[1]} ${m[2]} ${m[3]} ${m[4]}`)

describe('la page Tarifs', () => {
  it('fr : quatre cartes en USD, même format, aucune trace de CAD', () => {
    const html = rendre('fr')
    expect(cartes(html)).toEqual([
      '#vitrine Vitrine 10 USD/mois',
      '#boutique Boutique 15 USD/mois',
      '#dropshipping Dropshipping 15 USD/mois',
      '#application Application 20 USD/mois',
    ])
    expect(html).toContain('Tous les prix sont en dollars américains (USD), par mois.')
    expect(html).toContain('Prix par application publiée')
    expect(html).toContain('50 modifications par mois incluses')
    expect(html).not.toMatch(/CAD|canadiens/u)
  })

  it('en : la même chose', () => {
    const html = rendre('en')
    expect(cartes(html)).toEqual([
      '#vitrine Showcase 10 USD/mo',
      '#boutique Store 15 USD/mo',
      '#dropshipping Dropshipping 15 USD/mo',
      '#application Application 20 USD/mo',
    ])
    expect(html).not.toMatch(/CAD|Canadian/u)
  })
})
