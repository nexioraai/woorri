import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
import { destinationDuBouton } from '@/app/sites/[slug]/themes/destinationBouton'

// LOT 18 — « Consulter les appels d'offres » menait à #contact (mesuré le
// 2026-11-10). Le bouton mène où il dit, et seulement là.
const site = (publie: boolean) => ({ publishes_tenders: publie, slug: 'cpa', custom_domain: 'cpa.td' }) as never

describe('le bouton principal', () => {
  it('🔴 « appels d’offres » sur un site qui en publie → la page des appels d’offres', () => {
    expect(destinationDuBouton(site(true), 'cpa.td', 'Consulter les appels d\'offres', false)).toMatch(/\/appels-offres$/)
    expect(destinationDuBouton(site(true), 'cpa.td', 'Consulter les appels d’offres', true)).toMatch(/\/appels-offres$/)
    expect(destinationDuBouton(site(true), 'cpa.td', 'View tenders', false)).toMatch(/\/appels-offres$/)
  })

  it('🔴 un site qui n’en publie pas ne pointe JAMAIS vers une page absente', () => {
    expect(destinationDuBouton(site(false), 'cpa.td', 'Consulter les appels d\'offres', false)).toBe('#contact')
  })

  it('🔴 un autre libellé garde son comportement : boutique ou contact', () => {
    expect(destinationDuBouton(site(true), 'cpa.td', 'Nous contacter', false)).toBe('#contact')
    expect(destinationDuBouton(site(true), 'cpa.td', 'Voir la boutique', true)).toBe('#shop')
  })
})
