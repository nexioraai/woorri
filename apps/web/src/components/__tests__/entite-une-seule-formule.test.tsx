/**
 * UNE SEULE FORMULE POUR L'ENTITÉ, PARTOUT (décision du propriétaire, 2026-11-19).
 *
 * « Deribfy, un produit de Dougouma IA — contact@deribfy.com » (formule
 * retenue par le propriétaire le 2026-11-21 ; avant : « Deribfy est développé
 * par Dougouma IA ») — et rien d'autre : ni NEQ, ni
 * « immatriculée », ni ville, ni « exploité par ». Le propriétaire vérifie au
 * registre du Québec à qui appartient le NEQ ; tant qu'il n'a pas répondu,
 * aucune autre mention d'entité ne revient sur le site. Ce test rougit si
 * l'une d'elles revient, sur les quatre pages et dans le pied de page.
 *
 * Ce qu'il NE regarde PAS, exprès : les références au DROIT québécois (loi
 * applicable des Conditions, Loi 25, CAI) — ce ne sont pas des mentions
 * d'entité, et leur sort est une question posée au propriétaire.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/lib/translations'
import Footer from '../Footer'

vi.mock('@/components/Navbar', () => ({ default: () => null }))
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: () => {} }), useSearchParams: () => new URLSearchParams() }))

const PAGES = {
  conditions: async () => (await import('@/app/terms/page')).default,
  confidentialite: async () => (await import('@/app/privacy/page')).default,
  temoins: async () => (await import('@/app/cookies/page')).default,
  'a-propos': async () => (await import('@/app/about/AboutContent')).default,
  'pied-de-page': async () => Footer,
} as const

const FORMULE = { fr: 'Deribfy, un produit de Dougouma IA — contact@deribfy.com', en: 'Deribfy, a product of Dougouma IA — contact@deribfy.com' } as const
const INTERDITS = [/2281989782/u, /\bNEQ\b/u, /immatricul/iu, /registered in/iu, /exploité par Dougouma/u, /operated by Dougouma/u, /Dougouma IA \(/u, /© 2026 Dougouma/u, /développé par Dougouma/u, /developed by Dougouma/u]

describe('l’entité : une seule formule, rien d’autre', () => {
  for (const [nom, charger] of Object.entries(PAGES)) {
    it.each(['fr', 'en'] as const)(`${nom} (%s)`, async (langue) => {
      const Page = await charger()
      const html = renderToStaticMarkup(<LanguageProvider langueImposee={langue}><Page /></LanguageProvider>)
      expect(html).toContain(FORMULE[langue])
      for (const motif of INTERDITS) expect(html).not.toMatch(motif)
    })
  }
})
