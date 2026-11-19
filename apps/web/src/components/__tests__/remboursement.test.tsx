/**
 * LA POLITIQUE DE REMBOURSEMENT (décision du propriétaire, 2026-11-19).
 *
 * `/remboursement` répondait 404 ; Stripe exige une politique visible. Ce test
 * tient les six règles du propriétaire, dans les deux langues, et le renvoi
 * depuis les Conditions — une règle qui disparaîtrait de la page rougit ici.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/lib/translations'

vi.mock('@/components/Navbar', () => ({ default: () => null }))
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: () => {} }), useSearchParams: () => new URLSearchParams() }))

const rendre = async (chemin: 'remboursement' | 'terms', langue: 'fr' | 'en') => {
  const Page = chemin === 'remboursement' ? (await import('@/app/remboursement/page')).default : (await import('@/app/terms/page')).default
  return renderToStaticMarkup(<LanguageProvider langueImposee={langue}><Page /></LanguageProvider>)
}

describe('la politique de remboursement', () => {
  it('fr : les six règles', async () => {
    const h = await rendre('remboursement', 'fr')
    for (const r of [
      'dans les 14 jours qui suivent votre premier paiement',
      'Les renouvellements ne sont pas remboursés',
      'n’est jamais décomptée',
      'expirent à la fin de la période d’abonnement en cours',
      'remboursée intégralement, sans condition',
      'examinée une à la fois',
    ]) expect(h, r).toContain(r.replace(/’/gu, '&#x27;'))
  })

  it('en : les six règles', async () => {
    const h = await rendre('remboursement', 'en')
    for (const r of ['within 14 days of your first payment', 'Renewals are not refunded', 'is never counted', 'expire at the end of the current subscription period', 'refunded in full, with no conditions', 'reviewed one at a time']) {
      expect(h, r).toContain(r)
    }
  })

  it('les Conditions renvoient à la politique, en fr et en en', async () => {
    expect(await rendre('terms', 'fr')).toContain('deribfy.com/remboursement')
    expect(await rendre('terms', 'en')).toContain('deribfy.com/remboursement')
  })
})
