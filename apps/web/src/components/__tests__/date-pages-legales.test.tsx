/**
 * LA DATE DES PAGES LÉGALES, DANS LA LANGUE DE LA PAGE (2026-11-18).
 *
 * MESURÉ en production : la version anglaise affichait « Last updated: 2 août
 * 2026 » — la date française recopiée. Une seule date, écrite dans chaque
 * langue ; ce test rend les trois pages en anglais et en français.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/lib/translations'

// La barre du haut (et son client Supabase) est hors sujet ici.
vi.mock('@/components/Navbar', () => ({ default: () => null }))
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: () => {} }), useSearchParams: () => new URLSearchParams() }))

const PAGES = {
  terms: () => import('@/app/terms/page'),
  privacy: () => import('@/app/privacy/page'),
  cookies: () => import('@/app/cookies/page'),
} as const

describe('la date des pages légales suit la langue', () => {
  it.each(Object.keys(PAGES) as (keyof typeof PAGES)[])('%s', async (nom) => {
    const Page = (await PAGES[nom]()).default
    const en = renderToStaticMarkup(<LanguageProvider langueImposee="en"><Page /></LanguageProvider>)
    const fr = renderToStaticMarkup(<LanguageProvider langueImposee="fr"><Page /></LanguageProvider>)
    expect(en).toContain('Last updated: November 19, 2026')
    expect(en).not.toContain('novembre')
    expect(fr).toContain('Dernière mise à jour : 19 novembre 2026')
  })
})
