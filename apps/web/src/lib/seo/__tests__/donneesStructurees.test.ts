// ============================================================
// CLIQUET — L'IDENTITÉ DE DERIBFY NE DÉBORDE JAMAIS SUR UNE BOUTIQUE.
//
// LE RISQUE QUE CE FICHIER TIENT FERMÉ : le layout racine enveloppe AUSSI les
// pages marchandes (`proxy.ts` y réécrit chaque domaine personnalisé). Un
// bloc `Organization` émis là dirait à Google que la boutique du client EST
// Deribfy — le défaut que `favicon` décrit comme « un marchand marqué à
// l'enseigne de son fournisseur », mais appliqué à l'identité elle-même.
//
// La garde est une seule condition ; c'est précisément pour ça qu'elle doit
// être testée dans les DEUX sens, et pas seulement dans le cas qui arrange.
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

const entetes = new Map<string, string>()
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (c: string) => entetes.get(c) ?? null }),
}))

const { donneesPlateforme, estPagePlateforme, organisation, siteWeb, navigation } =
  await import('../donneesStructurees')
const { SITE_URL, PAGES_PUBLIQUES } = await import('../metadata')

beforeEach(() => entetes.clear())

describe('la garde boutique marchande', () => {
  it('émet sur une page de la plateforme (aucun en-tête de site)', async () => {
    expect(await estPagePlateforme()).toBe(true)
  })

  it('N’ÉMET PAS dès que la requête sert un site marchand', async () => {
    entetes.set('x-deribfy-lang', 'en')
    expect(await estPagePlateforme()).toBe(false)
  })

  it('n’émet pas non plus quand le marchand est en français — c’est la PRÉSENCE qui compte', async () => {
    entetes.set('x-deribfy-lang', 'fr')
    expect(await estPagePlateforme()).toBe(false)
  })
})

describe('ce qui est déclaré aux moteurs', () => {
  it('l’organisation porte un identifiant stable et absolu', () => {
    const o = organisation()
    expect(o['@id']).toBe(`${SITE_URL}/#organisation`)
    expect(o.url).toBe(SITE_URL)
    expect(o.name).toBe('Deribfy')
  })

  it('le site est rattaché à l’organisation par cet identifiant', () => {
    expect(siteWeb().publisher).toEqual({ '@id': `${SITE_URL}/#organisation` })
  })

  it('aucune action de recherche n’est déclarée — Deribfy n’en expose pas', () => {
    expect(siteWeb()).not.toHaveProperty('potentialAction')
  })

  it('chaque section a une URL absolue et un libellé lisible', () => {
    for (const n of navigation()) {
      expect(n.url.startsWith(`${SITE_URL}/`)).toBe(true)
      expect(n.name.length).toBeGreaterThan(2)
      expect(n.description.length).toBeGreaterThan(20)
    }
  })

  it('les descriptions viennent du socle SEO — jamais d’une seconde version qui dériverait', () => {
    const tarifs = navigation().find((n) => n.url.endsWith('/pricing'))
    expect(tarifs?.description).toBe(PAGES_PUBLIQUES['/pricing'].description)
  })

  it('le tout forme un seul tableau : organisation, site, puis les sections', () => {
    const d = donneesPlateforme()
    expect(d[0]['@type']).toBe('Organization')
    expect(d[1]['@type']).toBe('WebSite')
    expect(d.slice(2).every((x) => x['@type'] === 'SiteNavigationElement')).toBe(true)
  })
})
