/**
 * RENOUVELER, PAS « PUBLIER » (2026-11-26) — un site ou une appli DÉJÀ EN
 * LIGNE ouvre la fenêtre de renouvellement ; une première publication garde
 * « Publier ». Ce que ce test ne voit pas : le rendu à l'œil (captures).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { DemandeFenetre } from '@/components/apps/publierAppli'

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })
beforeEach(() => { vi.unstubAllGlobals() })

const attendre = (ms = 20) => new Promise((r) => setTimeout(r, ms))
const repondre = (etat: Record<string, unknown>) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(etat), { status: 200 })))

const fenetreSite = async (enLigne: boolean): Promise<DemandeFenetre> => {
  repondre({ enLigne, lien: 'https://ma-vitrine.deribfy.app', moyens: ['carte', 'mobile_money'], payeJusquAu: enLigne ? '2026-11-20T00:00:00Z' : null, rappel: enLigne ? 'echu' : null })
  const { lancerPublicationSite } = await import('@/components/apps/publierSite')
  let d: DemandeFenetre | null = null
  void lancerPublicationSite({ slug: 'ma-vitrine', autorisation: 'Bearer j', ouvrirFenetre: (x) => { d = x }, ouvrir: vi.fn() })
  await attendre()
  expect(d, 'la fenêtre ne s’est pas ouverte').not.toBeNull()
  return d!
}

const fenetreAppli = async (adresse: string | null): Promise<DemandeFenetre> => {
  repondre({ action: 'payer', moyens: ['carte', 'mobile_money'], nom: 'stock', adresseProposee: null, adresse, nomModifiable: false, publicationAuto: null, lecturePublique: { listes: [], acceptee: true } })
  const { lancerPublication } = await import('@/components/apps/publierAppli')
  let d: DemandeFenetre | null = null
  void lancerPublication({ id: 'app-1', titre: 'Stock', demande: 'Gérer mon stock', autorisation: 'Bearer j', ouvrirFenetre: (x) => { d = x }, ouvrir: vi.fn() })
  await attendre()
  expect(d, 'la fenêtre ne s’est pas ouverte').not.toBeNull()
  return d!
}

describe('un site', () => {
  it('déjà en ligne : « Renouveler votre site », bouton « Renouveler », la phrase du renouvellement', async () => {
    const d = await fenetreSite(true)
    expect(d.titre).toBe('Renouveler votre site')
    expect(d.libelleBouton).toBe('Renouveler')
    expect(d.libelles?.apresMobileMoney).toBe('Dès que vous validez le paiement sur votre téléphone, votre site est renouvelé pour un mois.')
    expect(d.libelles?.adresse).toBe('Adresse de votre site')
  })
  it('première publication : « Publier votre site », bouton « Publier », la phrase de publication', async () => {
    const d = await fenetreSite(false)
    expect(d.titre).toBe('Publier votre site')
    expect(d.libelleBouton).toBe('Publier')
    expect(d.libelles?.apresMobileMoney).toBe('Dès que vous validez le paiement sur votre téléphone, votre site est publié.')
  })
})

describe('une appli', () => {
  it('déjà en ligne : « Renouveler votre application », bouton « Renouveler », la phrase du renouvellement', async () => {
    const d = await fenetreAppli('https://stock.deribfy.app')
    expect(d.titre).toBe('Renouveler votre application')
    expect(d.libelleBouton).toBe('Renouveler')
    expect(d.libelles?.apresMobileMoney).toBe('Dès que vous validez le paiement sur votre téléphone, votre application est renouvelée pour un mois.')
    expect(d.libelles?.adresse).toBe('Adresse de votre application')
  })
  it('première publication : « Publier votre application », bouton « Publier », phrases d’origine', async () => {
    const d = await fenetreAppli(null)
    expect(d.titre).toBe('Publier votre application')
    expect(d.libelleBouton).toBe('Publier')
    expect(d.libelles).toBeUndefined()
  })
})
